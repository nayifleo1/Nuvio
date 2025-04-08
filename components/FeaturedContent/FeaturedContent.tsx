import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, withTiming, useAnimatedStyle, withSequence } from 'react-native-reanimated';
import { styles } from '@/styles';
import { FeaturedMovie } from '@/types/movie';
import { useRouter } from 'expo-router';
import { TMDBService, TMDBMovieSearchResult, TMDBTVSearchResult, TMDBGenre } from '@/services/tmdbService';

interface FeaturedContentProps {
    imageStyle: any;
    categoriesStyle: any;
    buttonsStyle: any;
    topMargin: number;
}

type TMDBSearchResultItem = TMDBMovieSearchResult | TMDBTVSearchResult;

export function FeaturedContent({
    imageStyle,
    categoriesStyle,
    buttonsStyle,
    topMargin
}: FeaturedContentProps) {
    const router = useRouter();
    const [currentMovie, setCurrentMovie] = useState<FeaturedMovie | null>(null);
    const [trendingContent, setTrendingContent] = useState<TMDBSearchResultItem[]>([]);
    const currentIndexRef = useRef(0);
    const [isLoading, setIsLoading] = useState(true);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastRotationTime = useRef<number>(Date.now());
    const tmdbService = TMDBService.getInstance();

    const getGenreNames = async (genreIds: number[], type: 'movie' | 'tv'): Promise<string[]> => {
        try {
            const genres = await tmdbService.getGenres(type);
            return genreIds
                .map(id => genres.find((g: TMDBGenre) => g.id === id)?.name)
                .filter((name): name is string => name !== undefined);
        } catch (error) {
            console.error('Failed to fetch genres:', error);
            return ['Drama']; // Fallback genre
        }
    };

    const fetchTrendingContent = async () => {
        try {
            setIsLoading(true);
            
            // Fetch both trending movies and TV shows
            const [trendingMovies, trendingShows] = await Promise.all([
                tmdbService.getTrending('movie'),
                tmdbService.getTrending('tv')
            ]);

            console.log(`[FeaturedContent] Fetched ${trendingMovies.length} movies and ${trendingShows.length} shows`);

            // Combine and sort by popularity
            const combinedContent = [...trendingMovies, ...trendingShows]
                .sort((a, b) => b.popularity - a.popularity)
                .slice(0, 10); // Take top 10 most popular

            console.log(`[FeaturedContent] Combined content length: ${combinedContent.length}`);
            console.log(`[FeaturedContent] First item:`, combinedContent[0]);

            if (combinedContent.length > 0) {
                setTrendingContent(combinedContent);
                
                // Set initial movie
                const firstContent = combinedContent[0];
                const thumbnail = tmdbService.getImageUrl(firstContent.backdrop_path, 'original');
                
                const isTVShow = 'media_type' in firstContent && firstContent.media_type === 'tv';
                const title = isTVShow ? (firstContent as TMDBTVSearchResult).name : (firstContent as TMDBMovieSearchResult).title;
                
                // Get IMDb ID for logo
                const externalIds = await tmdbService.getExternalIds(firstContent.id, isTVShow ? 'tv' : 'movie');
                const imdbId = externalIds?.imdb_id;
                const logo = imdbId ? `https://images.metahub.space/logo/medium/${imdbId}/img` : undefined;
                
                // Get genre names
                const genres = await getGenreNames(firstContent.genre_ids, isTVShow ? 'tv' : 'movie');
                
                setCurrentMovie({
                    id: firstContent.id.toString(),
                    title,
                    thumbnail: thumbnail || '',
                    categories: genres,
                    logo
                });
                console.log(`[FeaturedContent] Initial movie set: ${title}`);
            }
        } catch (error) {
            console.error('Failed to fetch trending content:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const updateCurrentMovie = async (index: number) => {
        if (trendingContent.length > 0) {
            const content = trendingContent[index];
            const isTVShow = 'media_type' in content && content.media_type === 'tv';
            const title = isTVShow ? (content as TMDBTVSearchResult).name : (content as TMDBMovieSearchResult).title;
            console.log(`[FeaturedContent] Updating movie to: ${title}`);
            
            const thumbnail = tmdbService.getImageUrl(content.backdrop_path, 'original');
            
            // Get IMDb ID for logo
            const externalIds = await tmdbService.getExternalIds(content.id, isTVShow ? 'tv' : 'movie');
            const imdbId = externalIds?.imdb_id;
            const logo = imdbId ? `https://images.metahub.space/logo/medium/${imdbId}/img` : undefined;
            
            // Get genre names
            const genres = await getGenreNames(content.genre_ids, isTVShow ? 'tv' : 'movie');
            
            setCurrentMovie({
                id: content.id.toString(),
                title,
                thumbnail: thumbnail || '',
                categories: genres,
                logo
            });
            console.log(`[FeaturedContent] Movie updated successfully with thumbnail: ${thumbnail}`);
        }
    };

    useEffect(() => {
        // Initial fetch of trending content
        fetchTrendingContent();

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []); // Empty dependency array for initial setup

    useEffect(() => {
        // Only start the interval after content is loaded
        if (!isLoading && trendingContent.length > 0) {
            // Clear any existing interval
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }

            // Set up interval to cycle through content
            intervalRef.current = setInterval(() => {
                const nextIndex = (currentIndexRef.current + 1) % trendingContent.length;
                console.log(`[FeaturedContent] Rotating to index ${nextIndex} (current: ${currentIndexRef.current})`);
                currentIndexRef.current = nextIndex;
                updateCurrentMovie(nextIndex);
            }, 15000); // Rotate every 15 seconds
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isLoading, trendingContent.length]); // Only restart interval when loading state or content length changes

    const handlePlayPress = () => {
        if (!currentMovie) return;
        
        // Get the current content from trendingContent based on currentIndexRef
        const currentContent = trendingContent[currentIndexRef.current];
        const isTVShow = 'media_type' in currentContent && currentContent.media_type === 'tv';
        const mediaType = isTVShow ? 'tv' : 'movie';
        
        router.push({
            pathname: `/movie/[id]`,
            params: {
                id: currentMovie.id,
                tmdbId: currentContent.id,
                mediaType: mediaType,
                title: currentMovie.title,
                thumbnail: currentMovie.thumbnail
            }
        });
    };

    if (!currentMovie) {
        return null;
    }

    return (
        <View style={[styles.featuredContent, { marginTop: topMargin }]}>
            <View style={styles.featuredWrapper}>
                <View style={styles.featuredImageContainer}>
                    <Animated.Image
                        key={currentMovie.id}
                        source={{ uri: currentMovie.thumbnail }}
                        style={[styles.featuredImage, imageStyle]}
                        entering={FadeIn.duration(1000).delay(500)}
                        exiting={FadeOut.duration(1000)}
                    />
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.8)']}
                        style={styles.featuredGradient}
                    />
                    {currentMovie.logo && (
                        <Animated.Image 
                            key={`${currentMovie.id}-logo`}
                            source={{ uri: currentMovie.logo }} 
                            style={styles.featuredLogo}
                            entering={FadeIn.duration(1000).delay(1000)}
                            exiting={FadeOut.duration(1000)}
                        />
                    )}
                    {!currentMovie.logo && (
                        <Animated.View 
                            key={`${currentMovie.id}-title`}
                            style={styles.featuredTitleContainer}
                            entering={FadeIn.duration(1000).delay(1000)}
                            exiting={FadeOut.duration(1000)}
                        >
                            <Text style={styles.featuredTitle}>{currentMovie.title}</Text>
                        </Animated.View>
                    )}
                </View>

                <View style={styles.featuredOverlay}>
                    <Animated.View style={[styles.featuredCategories, categoriesStyle]}>
                        <Text style={[styles.categoriesText, { 
                            color: '#B3B3B3',
                            fontFamily: 'System',
                            fontWeight: '300',
                            letterSpacing: 0.5
                        }]}>
                            {currentMovie.categories.join(' • ')}
                        </Text>
                    </Animated.View>

                    {/* <View
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, marginBottom: 2 }}>
                        <Animated.Image
                            source={{ uri: 'https://loodibee.com/wp-content/uploads/Netflix-N-Symbol-logo.png' }}
                            style={{ width: 20, height: 20, top: -4, position: 'absolute', left: 0 }}
                        />
                        {movie.type && <Text style={styles.netflixTag}>{movie.type}</Text>}
                    </View> */}


                    <Animated.View style={[styles.featuredButtons, buttonsStyle]}>
                        <Pressable style={styles.playButton} onPress={handlePlayPress}>
                            <Ionicons name="play" size={24} color="#000" />
                            <Text style={styles.playButtonText}>Play</Text>
                        </Pressable>
                        <Pressable style={styles.myListButton}>
                            <Ionicons name="add" size={24} color="#fff" />
                            <Text style={styles.myListButtonText}>My List</Text>
                        </Pressable>
                    </Animated.View>
                </View>
            </View>
        </View>
    );
} 