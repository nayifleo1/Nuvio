import React, { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Dimensions, useColorScheme, ActivityIndicator, View, Platform, TouchableOpacity, Text } from 'react-native';
import { useEffect, useCallback, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ThemedView } from '@/components/ThemedView';
import { ExpandedPlayer } from '@/components/BottomSheet/ExpandedPlayer';
import { useRootScale } from '@/contexts/RootScaleContext';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    runOnJS,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import catalogService, { StreamingContent } from '@/services/catalogService';
import tmdbService, { TMDBPerson } from '@/services/tmdbService';
import axios from 'axios';

const SCALE_FACTOR = 0.83;
const DRAG_THRESHOLD = Math.min(Dimensions.get('window').height * 0.20, 150);
const HORIZONTAL_DRAG_THRESHOLD = Math.min(Dimensions.get('window').width * 0.51, 80);
const DIRECTION_LOCK_ANGLE = 45; // Angle in degrees to determine horizontal vs vertical movement
const ENABLE_HORIZONTAL_DRAG_CLOSE = Platform.OS === 'ios';

// Fallback movie in case content isn't found
const FALLBACK_MOVIE = {
    id: "fallback",
    title: "Content Not Found",
    imageUrl: "https://via.placeholder.com/300x450?text=Not+Found",
    year: "",
    duration: "",
    rating: "",
    description: "The requested content could not be found. Please try another selection.",
    cast: [],
    director: "",
    ranking_text: ""
};

export default function MovieScreen() {
    const { id, tmdbId: tmdbIdParam, mediaType: mediaTypeParam } = useLocalSearchParams<{ id: string, tmdbId?: string, mediaType?: string }>();
    const router = useRouter();
    const { setScale } = useRootScale();
    const translateY = useSharedValue(0);
    const isClosing = useRef(false);
    const statusBarStyle = useSharedValue<'light' | 'dark'>('light');
    const scrollOffset = useSharedValue(0);
    const isDragging = useSharedValue(false);
    const translateX = useSharedValue(0);
    const initialGestureX = useSharedValue(0);
    const initialGestureY = useSharedValue(0);
    const isHorizontalGesture = useSharedValue(false);
    const isScrolling = useSharedValue(false);
    const colorScheme = useColorScheme();
    const blurIntensity = useSharedValue(20);
    const contentOpacity = useSharedValue(0); // Add shared value for content opacity
    const [isReady, setIsReady] = useState(false);

    const [movie, setMovie] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [castMembers, setCastMembers] = useState<string[]>([]);

    // Fetch movie details from TMDB and Stremio
    useEffect(() => {
        const fetchMovieDetails = async () => {
            setIsLoading(true);
            contentOpacity.value = 0; // Reset opacity for new content load
            try {
                // --- START: Prioritize direct TMDB ID/Type if passed ---
                if (tmdbIdParam && mediaTypeParam) {
                    console.log(`Fetching directly using TMDB ID: ${tmdbIdParam}, Type: ${mediaTypeParam}`);
                    const directTmdbId = parseInt(tmdbIdParam, 10);
                    const isShow = mediaTypeParam === 'tv' || mediaTypeParam === 'series';
                    let fetchedMovieData: any = { id: id, tmdbId: directTmdbId, type: isShow ? 'series' : 'movie' }; // Start with basic info

                    try {
                        // Fetch Core Details (Movie or TV)
                        if (isShow) {
                            const details = await tmdbService.getTVShowDetails(directTmdbId);
                            if (details) {
                                fetchedMovieData = {
                                    ...fetchedMovieData,
                                    title: details.name,
                                    imageUrl: tmdbService.getImageUrl(details.poster_path),
                                    backdropUrl: tmdbService.getImageUrl(details.backdrop_path),
                                    year: details.first_air_date?.substring(0, 4) || '',
                                    duration: details.episode_run_time?.[0] ? `${details.episode_run_time[0]} min` : '',
                                    // rating: details.vote_average?.toFixed(1) || '', // vote_average not directly on TMDBShow type
                                    rating: '', // Set initial rating to empty, rely on Stremio or episode data later if needed
                                    description: details.overview || '',
                                    seasons: details.number_of_seasons,
                                    episodes: details.number_of_episodes,
                                    // TODO: Add logic to determine/fetch current episode details if needed
                                    currentSeason: 1,
                                    currentEpisode: 1,
                                };
                            }
                        } else {
                            const details = await tmdbService.getMovieDetails(directTmdbId); // This method should now exist
                             if (details) {
                                fetchedMovieData = {
                                    ...fetchedMovieData,
                                    title: details.title,
                                    imageUrl: tmdbService.getImageUrl(details.poster_path),
                                    backdropUrl: tmdbService.getImageUrl(details.backdrop_path),
                                    year: details.release_date?.substring(0, 4) || '',
                                    duration: details.runtime ? `${details.runtime} min` : '',
                                    rating: details.vote_average?.toFixed(1) || '',
                                    description: details.overview || '',
                                };
                            }
                        }

                        // Fetch Credits (Cast/Director/Creators)
                        const credits = await tmdbService.getCredits(directTmdbId, isShow ? 'tv' : 'movie');
                        fetchedMovieData.cast = credits.cast.map((actor: TMDBPerson) => actor.name) || [];
                        
                        if (isShow) {
                            const creators = credits.crew?.filter((p: TMDBPerson) => 
                                p.job === 'Creator' || 
                                p.known_for_department === 'Creating' ||
                                p.department === 'Creating'
                            );
                            fetchedMovieData.director = creators?.map(c => c.name).join(', ') || 'Unknown Creator';
                        } else {
                            const directors = credits.crew.filter((person: TMDBPerson) => 
                                person.job === 'Director'
                            );
                            if (directors.length > 0) {
                                fetchedMovieData.director = directors.map(director => director.name).join(', ');
                            } else {
                                fetchedMovieData.director = 'Unknown Director';
                            }
                        }

                        setMovie(fetchedMovieData);

                    } catch (fetchError) {
                         console.error(`Error fetching details directly for TMDB ID ${directTmdbId}:`, fetchError);
                         setMovie(FALLBACK_MOVIE); // Fallback on error
                    } finally {
                         setIsLoading(false);
                         runOnJS(requestAnimationFrame)(() => {
                             contentOpacity.value = withTiming(1, { duration: 300 });
                         });
                    }
                    return; // Exit early, we used the direct TMDB ID
                }
                // --- END: Prioritize direct TMDB ID/Type ---

                // Original logic starts here if tmdbIdParam/mediaTypeParam are not present
                // Check if it's a Stremio content ID (contains "tt" for IMDb IDs)
                const contentId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '';
                console.log("Original content ID:", contentId);
                
                let stremioContent: StreamingContent | null = null;
                let tmdbId: number | null = null;
                let contentType = 'movie';
                let imdbId = '';
                let castNames: string[] = [];
                let directorName = '';
                
                if (contentId.includes('tt')) {
                    // Extract the IMDb ID part - it always starts with 'tt' followed by numbers
                    const match = contentId.match(/tt\d+/);
                    if (match) {
                        imdbId = match[0];
                    } else {
                        imdbId = contentId; // Fallback to the original ID
                    }
                    
                    // Determine type - if it starts with 'series:', it's a show
                    if (contentId.startsWith('series:')) {
                        contentType = 'series';
                    } else if (contentId.includes(':') && !contentId.startsWith('movie:')) {
                        // If it has colons but doesn't start with movie:, check format
                        // Format could be tt1234567:1:2 which means series with season and episode
                        contentType = 'series';
                    } else {
                        // Check if it's a TV show by looking up the content first
                        try {
                            const stremioContent = await catalogService.getContentDetails('series', imdbId);
                            if (stremioContent) {
                                contentType = 'series';
                            }
                        } catch (error) {
                            console.log('Content not found as series, trying as movie');
                        }
                    }
                    
                    console.log(`Extracted type: ${contentType}, IMDb ID: ${imdbId}`);
                    stremioContent = await catalogService.getContentDetails(contentType, imdbId);
                } else {
                    // For legacy IDs, search by ID
                    const results = await catalogService.searchContent(contentId);
                    
                    if (results && results.length > 0) {
                        stremioContent = results[0];
                        contentType = stremioContent.type === 'series' ? 'series' : 'movie';
                    }
                }
                
                if (stremioContent) {
                    // We have basic content from Stremio, now enrich it with TMDB data
                    const stremioImdbId = stremioContent.id; // This might contain the full Stremio ID
                    // Extract just the IMDb ID part (tt followed by numbers)
                    const match = stremioImdbId.match(/tt\d+/);
                    const cleanImdbId = match ? match[0] : stremioImdbId;
                    
                    const isShow = contentType === 'series' || stremioContent.type === 'series';
                    
                    console.log(`Looking up TMDB ID for IMDb ID: ${cleanImdbId}, type: ${isShow ? 'series' : 'movie'}`);
                    
                    // Find TMDB ID from IMDb ID
                    tmdbId = await tmdbService.findTMDBIdByIMDbId(cleanImdbId, isShow ? 'series' : 'movie');
                    
                    if (tmdbId) {
                        // Get cast information
                        const credits = await tmdbService.getCredits(tmdbId, isShow ? 'series' : 'movie');
                        castNames = credits.cast.slice(0, 8).map((actor: any) => actor.name);
                        setCastMembers(castNames);
                        
                        // Get director information (for movies) or creators (for TV shows)
                        if (isShow) {
                            // For TV shows, try to get the creators from the credits
                            try {
                                const tvCredits = credits;
                                
                                // Look for creators in crew
                                if (tvCredits && tvCredits.crew) {
                                    const creators = tvCredits.crew.filter((person: any) => 
                                        person.job === 'Creator' || 
                                        person.known_for_department === 'Creating' ||
                                        person.department === 'Creating'
                                    );
                                    
                                    if (creators.length > 0) {
                                        directorName = creators.map((creator: any) => creator.name).join(', ');
                                    } else {
                                        // If no creators, try executive producers or showrunners
                                        const producers = tvCredits.crew.filter((person: any) => 
                                            person.job === 'Executive Producer' || 
                                            person.job === 'Showrunner'
                                        );
                                        
                                        if (producers.length > 0) {
                                            directorName = producers.slice(0, 2).map((producer: any) => producer.name).join(', ');
                                        }
                                    }
                                }

                                // Get TV show details including seasons and episodes
                                const tvDetails = await tmdbService.getTVShowDetails(tmdbId);
                                if (tvDetails) {
                                    // Get episode details for the current episode
                                    const episodeDetails = await tmdbService.getEpisodeDetails(
                                        tmdbId,
                                        1, // Default to first season
                                        1  // Default to first episode
                                    );

                                    // Get episode image URL
                                    const episodeImageUrl = episodeDetails ? tmdbService.getEpisodeImageUrl(episodeDetails, tvDetails) : null;

                                    // Get runtime for the specific episode, falling back to TV show average runtime if needed
                                    let episodeRuntime = 0;
                                    if (episodeDetails && episodeDetails.runtime) {
                                        episodeRuntime = episodeDetails.runtime;
                                        console.log(`Got episode runtime from episode details: ${episodeRuntime} min`);
                                    } else if (tvDetails.episode_run_time && tvDetails.episode_run_time.length > 0) {
                                        episodeRuntime = tvDetails.episode_run_time[0];
                                        console.log(`Using average runtime from show: ${episodeRuntime} min`);
                                    } else {
                                        episodeRuntime = 45; // Default runtime if none available
                                        console.log(`No runtime available, using default: ${episodeRuntime} min`);
                                    }

                                    const enrichedMovie = {
                                        id: stremioContent.id,
                                        title: stremioContent.name,
                                        imageUrl: stremioContent.poster,
                                        backdropUrl: episodeImageUrl || stremioContent.banner,
                                        year: stremioContent.year?.toString() || '',
                                        duration: `${episodeRuntime} min`,
                                        rating: stremioContent.imdbRating || '',
                                        description: stremioContent.description || '',
                                        cast: castNames,
                                        director: directorName || 'Unknown Creator',
                                        ranking_text: '',
                                        tmdbId: tmdbId,
                                        type: 'series',
                                        seasons: tvDetails.number_of_seasons,
                                        episodes: tvDetails.number_of_episodes,
                                        currentSeason: 1, // Default to first season
                                        currentEpisode: 1, // Default to first episode
                                        episodeTitle: episodeDetails?.name || '',
                                        episodeDescription: episodeDetails?.overview || '',
                                        episodeRuntime: `${episodeRuntime}`,
                                        episodeAirDate: episodeDetails?.air_date || '',
                                        episodeRating: episodeDetails?.vote_average?.toString() || '',
                                        episodeImageUrl: episodeImageUrl,
                                    };
                                    
                                    setMovie(enrichedMovie);
                                    return;
                                }
                            } catch (error) {
                                console.error('Failed to fetch TV show details:', error);
                            }
                        } else {
                            // For movies, get the crew data
                            const directors = credits.crew.filter((person: any) => 
                                person.job === 'Director'
                            );
                            if (directors.length > 0) {
                                directorName = directors.map((director: any) => director.name).join(', ');
                            } else {
                                directorName = 'Unknown Director';
                            }
                        }
                        
                        // Create enriched movie object with data from both sources
                        const enrichedMovie = {
                            id: stremioContent.id,
                            title: stremioContent.name,
                            imageUrl: stremioContent.poster,
                            backdropUrl: stremioContent.banner,
                            year: stremioContent.year?.toString() || '',
                            duration: stremioContent.runtime || '',
                            rating: stremioContent.imdbRating || '',
                            description: stremioContent.description || '',
                            cast: castNames,
                            director: directorName || (isShow ? 'Unknown Creator' : 'Unknown Director'),
                            ranking_text: '',
                            tmdbId: tmdbId,
                            type: isShow ? 'series' : 'movie'
                        };
                        
                        setMovie(enrichedMovie);
                    } else {
                        // Format the title for better search results
                        const formatTitleForSearch = (title: string) => {
                            // Remove any non-alphanumeric characters except spaces
                            return title.replace(/[^\w\s]/gi, ' ')
                                .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
                                .trim();
                        };

                        // Fallback: Search by title when TMDB ID lookup fails
                        console.log(`TMDB ID lookup failed for ${cleanImdbId}, trying title search with: ${stremioContent.name}`);

                        // Try to find by title search
                        let foundTmdbId = null;
                        const searchTitle = formatTitleForSearch(stremioContent.name);

                        if (isShow) {
                            const tvResults = await tmdbService.searchTVShow(searchTitle);
                            if (tvResults && tvResults.length > 0) {
                                foundTmdbId = tvResults[0].id;
                                console.log(`Found TV show by title search: ${searchTitle} -> ID: ${foundTmdbId}`);
                                
                                // Get TV show details
                                const tvDetails = await tmdbService.getTVShowDetails(foundTmdbId);
                                if (tvDetails) {
                                    const enrichedMovie = {
                                        id: stremioContent.id,
                                        title: stremioContent.name,
                                        imageUrl: stremioContent.poster,
                                        backdropUrl: stremioContent.banner,
                                        year: stremioContent.year?.toString() || '',
                                        duration: stremioContent.runtime || '',
                                        rating: stremioContent.imdbRating || '',
                                        description: stremioContent.description || '',
                                        cast: castNames,
                                        director: directorName || 'Unknown Creator',
                                        ranking_text: '',
                                        tmdbId: foundTmdbId,
                                        type: 'series',
                                        seasons: tvDetails.number_of_seasons,
                                        episodes: tvDetails.number_of_episodes,
                                        currentSeason: 1,
                                        currentEpisode: 1,
                                    };
                                    
                                    setMovie(enrichedMovie);
                                    return;
                                }
                            }
                        } else {
                            // Try movie search using the new method
                            const movieResults = await tmdbService.searchMovie(
                                searchTitle, 
                                stremioContent.year
                            );
                            
                            if (movieResults && movieResults.length > 0) {
                                foundTmdbId = movieResults[0].id;
                                console.log(`Found movie by title search: ${searchTitle} -> ID: ${foundTmdbId}`);
                            }
                        }
                        
                        if (foundTmdbId) {
                            // Use the found TMDB ID to proceed with metadata enrichment
                            const tmdbId = foundTmdbId;
                            
                            // Get cast information
                            const credits = await tmdbService.getCredits(tmdbId, isShow ? 'series' : 'movie');
                            castNames = credits.cast.slice(0, 8).map((actor: any) => actor.name);
                            setCastMembers(castNames);
                            
                            // Get director information (for movies) or creators (for TV shows)
                            if (isShow) {
                                // For TV shows, try to get the creators from the credits
                                try {
                                    const tvCredits = credits;
                                    
                                    // Look for creators in crew
                                    if (tvCredits && tvCredits.crew) {
                                        const creators = tvCredits.crew.filter((person: any) => 
                                            person.job === 'Creator' || 
                                            person.known_for_department === 'Creating' ||
                                            person.department === 'Creating'
                                        );
                                        
                                        if (creators.length > 0) {
                                            directorName = creators.map((creator: any) => creator.name).join(', ');
                                        } else {
                                            // If no creators, try executive producers or showrunners
                                            const producers = tvCredits.crew.filter((person: any) => 
                                                person.job === 'Executive Producer' || 
                                                person.job === 'Showrunner'
                                            );
                                            
                                            if (producers.length > 0) {
                                                directorName = producers.slice(0, 2).map((producer: any) => producer.name).join(', ');
                                            }
                                        }
                                    }
                                } catch (error) {
                                    console.error('Failed to fetch TV credits:', error);
                                }
                            } else {
                                // For movies, get the crew data
                                const directors = credits.crew.filter((person: any) => 
                                    person.job === 'Director'
                                );
                                if (directors.length > 0) {
                                    directorName = directors.map((director: any) => director.name).join(', ');
                                } else {
                                    directorName = 'Unknown Director';
                                }
                            }
                            
                            // Create enriched movie object with data from both sources
                            const enrichedMovie = {
                                id: stremioContent.id,
                                title: stremioContent.name,
                                imageUrl: stremioContent.poster,
                                backdropUrl: stremioContent.banner,
                                year: stremioContent.year?.toString() || '',
                                duration: stremioContent.runtime || '',
                                rating: stremioContent.imdbRating || '',
                                description: stremioContent.description || '',
                                cast: castNames,
                                director: directorName || (isShow ? 'Unknown Creator' : 'Unknown Director'),
                                ranking_text: '',
                                tmdbId: tmdbId,
                                type: isShow ? 'series' : 'movie'
                            };
                            
                            setMovie(enrichedMovie);
                        } else {
                            // If we couldn't find any metadata, use the basic Stremio content
                            const basicMovie = {
                                id: stremioContent.id,
                                title: stremioContent.name,
                                imageUrl: stremioContent.poster,
                                backdropUrl: stremioContent.banner,
                                year: stremioContent.year?.toString() || '',
                                duration: stremioContent.runtime || '',
                                rating: stremioContent.imdbRating || '',
                                description: stremioContent.description || '',
                                type: isShow ? 'series' : 'movie'
                            };
                            
                            setMovie(basicMovie);
                        }
                    }
                } else {
                    // If we couldn't find any content, use the fallback
                    setMovie(FALLBACK_MOVIE);
                }
            } catch (error) {
                console.error('Error fetching content:', error);
                setMovie(FALLBACK_MOVIE);
            } finally {
                setIsLoading(false);
                // Fade in content once loading is complete
                runOnJS(requestAnimationFrame)(() => { // Ensure animation runs smoothly
                    contentOpacity.value = withTiming(1, { duration: 300 });
                });
            }
        };

        fetchMovieDetails();
    }, [id]);

    // alert(JSON.stringify(movie))
    const handleHapticFeedback = useCallback(() => {
        if (Platform.OS === 'ios') {
            try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } catch (error) {
                console.log('Haptics not available:', error);
            }
        }
    }, []);

    const goBack = useCallback(() => {
        if (!isClosing.current) {
            isClosing.current = true;
            handleHapticFeedback();
            
            if (Platform.OS === 'android') {
                router.back();
            } else {
                // iOS behavior unchanged
                requestAnimationFrame(() => {
                    router.back();
                });
            }
        }
    }, [router, handleHapticFeedback]);

    const handleScale = useCallback((newScale: number) => {
        if (Platform.OS === 'ios') {
            try {
                setScale(newScale);
            } catch (error) {
                console.log('Scale error:', error);
            }
        }
    }, [setScale]);

    const calculateGestureAngle = (x: number, y: number) => {
        'worklet';
        const angle = Math.abs(Math.atan2(y, x) * (180 / Math.PI));
        return angle;
    };

    // Define gestures only for iOS
    const gestures = Platform.OS === 'ios' ? {
        panGesture: Gesture.Pan()
            .onStart((event) => {
                'worklet';
                initialGestureX.value = event.x;
                initialGestureY.value = event.y;
                isHorizontalGesture.value = false;

                if (scrollOffset.value <= 0) {
                    isDragging.value = true;
                }
            })
            .onUpdate((event) => {
                'worklet';
                const dx = event.translationX;
                const dy = event.translationY;
                const angle = calculateGestureAngle(dx, dy);

                if (ENABLE_HORIZONTAL_DRAG_CLOSE && !isHorizontalGesture.value && !isScrolling.value) {
                    if (Math.abs(dx) > 10) {
                        if (angle < DIRECTION_LOCK_ANGLE) {
                            isHorizontalGesture.value = true;
                        }
                    }
                }

                if (ENABLE_HORIZONTAL_DRAG_CLOSE && isHorizontalGesture.value) {
                    translateX.value = dx;
                    translateY.value = dy;
                    blurIntensity.value = Math.max(0, 20 - (Math.abs(dx) / 10));

                    if (Math.abs(dx) / 300 > 0.2) {
                        statusBarStyle.value = 'dark';
                    } else {
                        statusBarStyle.value = 'light';
                    }
                }
                else if (scrollOffset.value <= 0 && isDragging.value) {
                    translateY.value = Math.max(0, dy);
                    blurIntensity.value = Math.max(0, 20 - (dy / 20));

                    if (dy / 600 > 0.5) {
                        statusBarStyle.value = 'dark';
                    } else {
                        statusBarStyle.value = 'light';
                    }
                }
            })
            .onEnd((event) => {
                'worklet';
                isDragging.value = false;

                if (ENABLE_HORIZONTAL_DRAG_CLOSE && isHorizontalGesture.value) {
                    const dx = event.translationX;
                    const dy = event.translationY;
                    const totalDistance = Math.sqrt(dx * dx + dy * dy);
                    const shouldClose = totalDistance > HORIZONTAL_DRAG_THRESHOLD;

                    if (shouldClose) {
                        const exitX = dx * 2;
                        const exitY = dy * 2;

                        translateX.value = withTiming(exitX, { duration: 300 });
                        translateY.value = withTiming(exitY, { duration: 300 });
                        runOnJS(handleScale)(1);
                        runOnJS(handleHapticFeedback)();
                        runOnJS(goBack)();
                    } else {
                        translateX.value = withSpring(0, {
                            damping: 15,
                            stiffness: 150,
                        });
                        translateY.value = withSpring(0, {
                            damping: 15,
                            stiffness: 150,
                        });
                        runOnJS(handleScale)(SCALE_FACTOR);
                    }
                }
                else if (scrollOffset.value <= 0) {
                    const shouldClose = event.translationY > DRAG_THRESHOLD;

                    if (shouldClose) {
                        translateY.value = withTiming(event.translationY + 100, {
                            duration: 300,
                        });
                        runOnJS(handleScale)(1);
                        runOnJS(handleHapticFeedback)();
                        runOnJS(goBack)();
                    } else {
                        translateY.value = withSpring(0, {
                            damping: 15,
                            stiffness: 150,
                        });
                        runOnJS(handleScale)(SCALE_FACTOR);
                    }
                }
            })
            .onFinalize(() => {
                'worklet';
                isDragging.value = false;
                isHorizontalGesture.value = false;
            }),

        scrollGesture: Gesture.Native()
            .onBegin(() => {
                'worklet';
                isScrolling.value = true;
                if (!isDragging.value) {
                    translateY.value = 0;
                }
            })
            .onEnd(() => {
                'worklet';
                isScrolling.value = false;
            })
    } : null;

    const composedGestures = gestures ? Gesture.Simultaneous(gestures.panGesture, gestures.scrollGesture) : undefined;

    // Define ScrollComponent with special Android handling
    const ScrollComponent = useCallback((props: any) => {
        if (Platform.OS === 'android') {
            return (
                <Animated.ScrollView
                    {...props}
                    scrollEventThrottle={16}
                    bounces={false}
                    scrollEnabled={true}
                    showsVerticalScrollIndicator={true}
                    contentContainerStyle={{ 
                        flexGrow: 1,
                    }}
                    style={{ flex: 1 }}
                    overScrollMode="never"
                    keyboardShouldPersistTaps="handled"
                />
            );
        }
        
        // iOS uses the gesture system
        return composedGestures ? (
            <GestureDetector gesture={composedGestures}>
                <Animated.ScrollView
                    {...props}
                    onScroll={(event) => {
                        'worklet';
                        scrollOffset.value = event.nativeEvent.contentOffset.y;
                        if (!isDragging.value && translateY.value !== 0) {
                            translateY.value = 0;
                        }
                        props.onScroll?.(event);
                    }}
                    scrollEventThrottle={16}
                    bounces={false}
                />
            </GestureDetector>
        ) : (
            <Animated.ScrollView {...props} />
        );
    }, [composedGestures]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: Platform.OS === 'ios' ? [
            { translateY: translateY.value },
            { translateX: translateX.value }
        ] : [],
        opacity: contentOpacity.value,
    }));

    useEffect(() => {
        const timeout = setTimeout(() => {
            try {
                if (Platform.OS === 'ios') {
                    setScale(SCALE_FACTOR);
                }
                setIsReady(true);
            } catch (error) {
                console.log('Initial scale error:', error);
            }
        }, 100);

        return () => {
            clearTimeout(timeout);
            try {
                if (Platform.OS === 'ios') {
                    setScale(1);
                }
            } catch (error) {
                console.log('Cleanup scale error:', error);
            }
        };
    }, [setScale]);

    useEffect(() => {
        if (!isLoading && isReady) {
            contentOpacity.value = withTiming(1, {
                duration: 150
            });
        } else {
            contentOpacity.value = 0;
        }
    }, [isLoading, isReady, contentOpacity]);

    // Show loading indicator
    if (isLoading || !isReady) {
        return (
            <ThemedView style={styles.loadingContainer}>
                <StatusBar style="light" />
                <View style={styles.loadingContent}>
                    <ActivityIndicator size="large" color="#e50914" />
                    <TouchableOpacity 
                        style={styles.cancelButton}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </ThemedView>
        );
    }
    
    // Render movie details when loaded
    if (Platform.OS === 'android') {
        return (
            <ThemedView style={styles.androidContainer}>
                <StatusBar style="light" />
                <ExpandedPlayer
                    movie={movie} 
                    scrollComponent={ScrollComponent}
                    onClose={goBack}
                />
            </ThemedView>
        );
    }

    // iOS Bottom Sheet
    return (
        <ThemedView style={[styles.container, { opacity: 0.99 }]} pointerEvents="box-none">
            <StatusBar style={statusBarStyle.value === 'light' ? 'light' : 'dark'} />
            <Animated.View style={[animatedStyle, styles.playerContainer]} pointerEvents="box-none">
                <ExpandedPlayer
                    movie={movie} 
                    scrollComponent={ScrollComponent}
                    onClose={goBack}
                />
            </Animated.View>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    androidContainer: {
        flex: 1,
        backgroundColor: '#000000',
    },
    playerContainer: {
        ...StyleSheet.absoluteFillObject,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    loadingContent: {
        alignItems: 'center',
        gap: 20,
    },
    cancelButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    cancelButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
    }
});
