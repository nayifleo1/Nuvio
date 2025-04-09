import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Text, Image, Pressable, Dimensions, ScrollView, FlatList, TouchableOpacity, Modal, Platform, ActivityIndicator, BackHandler, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StatusBar as NativeStatusBar } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av'; // Keep for fallback if needed, or remove if image fallback is sufficient
import { WebView } from 'react-native-webview';
import { expandedPlayerStyles as styles } from '@/styles/expanded-player';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import movies from '@/data/movies.json';
import { Slider } from 'react-native-awesome-slider';
import { useSharedValue } from 'react-native-reanimated';
import { newStyles } from '@/styles/new';
import { Image as ExpoImage } from 'expo-image';
import tmdbService from '@/services/tmdbService';
import stremioService from '@/services/stremioService';
import { useUser } from '@/contexts/UserContext';

interface MovieData {
    id: string | number;
    title: string;
    imageUrl: string;
    video_url?: string;
    year?: string;
    duration?: string;
    rating?: string;
    description?: string;
    cast?: string[];
    director?: string;
    ranking_text?: string;
    type?: 'movie' | 'series';
    quality?: string;
    // TV show specific fields
    seasons?: number;
    episodes?: number;
    currentSeason?: number;
    currentEpisode?: number;
    currentEpisodeImdbId?: string | null;
    episodeTitle?: string;
    episodeDescription?: string;
    episodeRuntime?: string;
    episodeAirDate?: string;
    episodeRating?: string;
    episodeImageUrl?: string;
    tmdbId?: number | null;
}

interface ExpandedPlayerProps {
    scrollComponent: (props: any) => React.ReactElement;
    movie: MovieData;
    onClose?: () => void;
}

interface VideoRef {
    setOnPlaybackStatusUpdate: (callback: (status: AVPlaybackStatus) => void) => void;
    setPositionAsync: (position: number) => void;
}

interface Stream {
    name?: string;
    title?: string;
    url: string;
    addon?: string;
    addonId?: string;
    addonName?: string;
    description?: string;
    infoHash?: string;
    fileIdx?: number;
    behaviorHints?: {
        bingeGroup?: string;
        notWebReady?: boolean;
        [key: string]: any;
    };
    size?: number;
    isFree?: boolean;
    isDebrid?: boolean;
}

interface StreamResponse {
    streams: Stream[];
    addon: string;
    addonName: string;
}

interface GroupedStreams {
    [addonId: string]: {
        addonName: string;
        streams: Stream[];
    };
}

const EpisodeInfo = ({ movie }: { movie: MovieData }) => {
    if (movie.type !== 'series' || !movie.currentSeason || !movie.currentEpisode) return null;

    return (
        <View style={styles.episodeInfo}>
            <Text style={styles.episodeTitle}>
                S{movie.currentSeason} E{movie.currentEpisode} • {movie.episodeTitle || 'Untitled Episode'}
            </Text>
            {movie.episodeDescription && (
                <Text style={styles.episodeDescription}>
                    {movie.episodeDescription}
                </Text>
            )}
            <View style={styles.episodeMeta}>
                {movie.episodeRuntime && (
                    <Text style={styles.episodeMetaText}>
                        {movie.episodeRuntime} min
                    </Text>
                )}
                {movie.episodeAirDate && (
                    <Text style={styles.episodeMetaText}>
                        • {new Date(movie.episodeAirDate).toLocaleDateString()}
                    </Text>
                )}
                {movie.episodeRating && (
                    <Text style={styles.episodeMetaText}>
                        • {movie.episodeRating} Rating
                    </Text>
                )}
            </View>
        </View>
    );
};

// Update TabsSection component
const TabsSection = ({ activeTab, onTabChange, movieType }: { activeTab: string, onTabChange: (tab: string) => void, movieType: 'movie' | 'series' }) => {
    let tabs = ['Episodes', 'More Like This'];
    if (movieType === 'movie') {
        tabs = tabs.filter(tab => tab !== 'Episodes'); // Remove Episodes tab for movies
    }
    
    return (
        <View style={styles.tabsContainer}>
            {tabs.map((tab) => (
                <TouchableOpacity 
                    key={tab} 
                    style={[
                        styles.tabButton, 
                        activeTab === tab && styles.activeTabButton
                    ]}
                    onPress={() => onTabChange(tab)}
                >
                    <Text 
                        style={[
                            styles.tabButtonText, 
                            activeTab === tab && styles.activeTabButtonText
                        ]}
                    >
                        {tab}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
};

// Add SeasonPickerModal component
const SeasonPickerModal = ({ 
    visible, 
    onClose, 
    currentSeason, 
    totalSeasons, 
    onSeasonSelect 
}: { 
    visible: boolean;
    onClose: () => void;
    currentSeason: number;
    totalSeasons: number;
    onSeasonSelect: (season: number) => void;
}) => {
    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <BlurView
                intensity={140}
                tint="dark"
                style={StyleSheet.absoluteFill} // Make BlurView cover the whole screen behind the modal
            >
                {/* Pressable overlay to close modal when tapping background */}
                <Pressable
                    style={styles.modalOverlay} // Use overlay style for centering
                    onPress={onClose}
                >
                    {/* Modal Content Box */}
                    <View style={styles.modalContent}
                        // Prevent press event from bubbling up to the background Pressable
                        onStartShouldSetResponder={() => true}
                    >
                        <Text style={styles.modalTitle}>Select Season</Text>
                        <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                            <Ionicons name="close" size={24} color="#fff" />
                        </TouchableOpacity>
                        <FlatList
                            data={Array.from({ length: totalSeasons }, (_, i) => i + 1)}
                            keyExtractor={(item) => `season-${item}`}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.seasonOption,
                                        currentSeason === item && styles.selectedSeasonOption
                                    ]}
                                    onPress={() => {
                                        onSeasonSelect(item);
                                        onClose();
                                    }}
                                >
                                    <Text style={[
                                        styles.seasonOptionText,
                                        currentSeason === item && styles.selectedSeasonOptionText
                                    ]}>
                                        Season {item}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </Pressable>
            </BlurView>
        </Modal>
    );
};

// Update SeasonSelector component
const SeasonSelector = ({ 
    currentSeason, 
    totalSeasons, 
    onSeasonChange 
}: { 
    currentSeason: number, 
    totalSeasons: number, 
    onSeasonChange: (season: number) => void 
}) => {
    const [modalVisible, setModalVisible] = useState(false);

    return (
        <>
            <TouchableOpacity 
                style={styles.seasonSelectorContainer}
                onPress={() => setModalVisible(true)}
            >
                <Text style={styles.seasonSelectorText}>
                    Season {currentSeason}
                </Text>
                <MaterialIcons name="arrow-drop-down" size={24} color="white" />
            </TouchableOpacity>
            <SeasonPickerModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                currentSeason={currentSeason}
                totalSeasons={totalSeasons}
                onSeasonSelect={onSeasonChange}
            />
        </>
    );
};

// New component for episode item
const EpisodeItem = ({ 
    episode,
    isSelected,
    onPress
}: { 
    episode: {
        number: number;
        title: string;
        description: string;
        duration: string;
        imageUrl: string;
        imdbId?: string | null;
    },
    isSelected: boolean,
    onPress: () => void
}) => {
    return (
        <TouchableOpacity 
            style={[styles.episodeItemContainer, isSelected && styles.selectedEpisodeItem]} 
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.episodeTopRow}>
                <View style={styles.episodeThumb}>
                    <ExpoImage
                        source={{ uri: episode.imageUrl }}
                        style={styles.episodeThumbImage}
                        contentFit="cover"
                    />
                </View>
                <View style={styles.episodeHeader}>
                    <Text style={[
                        styles.episodeNumberText,
                        isSelected && styles.selectedEpisodeNumberText
                    ]}>
                        {episode.number}. {episode.title}
                    </Text>
                    <Text style={[
                        styles.episodeDurationText,
                        isSelected && styles.selectedEpisodeDurationText
                    ]}>
                        {episode.duration}
                    </Text>
                </View>
            </View>
            <Text style={[
                styles.episodeDescriptionText,
                isSelected && styles.selectedEpisodeDescriptionText
            ]} numberOfLines={2}>
                {episode.description || "Episode details are included here. Typically, this description is around 3-4 lines long, providing a concise yet attention-grabbing summary of the episode's main events."}
            </Text>
        </TouchableOpacity>
    );
};

export function ExpandedPlayer({ scrollComponent, movie, onClose }: ExpandedPlayerProps) {
    const { preferredPlayer } = useUser();
    const isAndroid = Platform.OS === 'android';
    const insets = useSafeAreaInsets();
    const router = useRouter(); // Initialize router
    const videoRef = useRef<Video | null>(null);
    const [isMuted, setIsMuted] = useState(true);
    const progress = useSharedValue(0);
    const min = useSharedValue(0);
    const max = useSharedValue(100);
    const [duration, setDuration] = useState(0);
    const [activeTab, setActiveTab] = useState(movie.type === 'series' ? 'Episodes' : 'More Like This'); // Default to More Like This for movies
    const [currentSeason, setCurrentSeason] = useState(movie.currentSeason || 1);
    const [episodes, setEpisodes] = useState<any[]>([]);
    const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);
    const [similarContent, setSimilarContent] = useState<any[]>([]);
    const [isLoadingSimilar, setIsLoadingSimilar] = useState(false);
    const [isLoadingTrailers, setIsLoadingTrailers] = useState(false);
    const [isLoadingCollection, setIsLoadingCollection] = useState(false);
    const [selectedEpisodeInList, setSelectedEpisodeInList] = useState(movie.currentEpisode || 1);
    const [trailerKey, setTrailerKey] = useState<string | null>(null);
    const [trailers, setTrailers] = useState<any[]>([]);
    const [collection, setCollection] = useState<any[]>([]);
    
    // State for streaming modal
    const [showStreamingModal, setShowStreamingModal] = useState(false);
    const [streamingLinks, setStreamingLinks] = useState<GroupedStreams>({});
    const [loadingStreams, setLoadingStreams] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState<string>('all');
    const [availableProviders, setAvailableProviders] = useState<Set<string>>(new Set());
    const [streamError, setStreamError] = useState<string | null>(null);
    const [currentEpisodeInfo, setCurrentEpisodeInfo] = useState({
        title: movie.title,
        season: movie.currentSeason || 1,
        episode: movie.currentEpisode || 1,
        episodeTitle: movie.episodeTitle || ''
    });
    
    const [videoQuality, setVideoQuality] = useState<string>('VISION');
    
    // Status bar handling for Android
    const statusBarHeight = Platform.OS === 'android' ? NativeStatusBar.currentHeight || 0 : 0;
    
    // Configure the scroll component
    const ScrollComponentToUse = React.useMemo(() => {
        const Component = scrollComponent;
        return (props: any) => (
            <Component
                {...props}
                pointerEvents={isAndroid ? "auto" : "box-none"}
                scrollEnabled={true}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
                contentInsetAdjustmentBehavior="automatic"
                style={[
                    props.style, 
                    styles.scrollView,
                    isAndroid && { 
                        height: Dimensions.get('window').height,
                        backgroundColor: '#000000'
                    }
                ]}
            />
        );
    }, [scrollComponent, isAndroid]);

    const defaultMovieData = {
        ...movie,
        id: movie.id || 'default',
        video_url: movie.video_url || 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        year: movie.year || '2024',
        duration: movie.duration || '2h 30m',
        rating: movie.rating || 'PG-13',
        description: movie.description || 'No description available',
        cast: movie.cast || ['Cast not available'],
        director: movie.director || 'Unknown Director',
        // ranking_text: movie.ranking_text || '#1 in Movies Today', // Removed default
        title: movie.title || 'Untitled',
        imageUrl: movie.imageUrl || '',
        type: movie.type || 'movie',
        tmdbId: movie.tmdbId || null,
        // TV show specific fields
        seasons: movie.seasons || 0,
        episodes: movie.episodes || 0,
        currentSeason: movie.currentSeason || 1,
        currentEpisode: movie.currentEpisode || 1,
        episodeTitle: movie.episodeTitle || '',
        episodeDescription: movie.episodeDescription || '',
        episodeRuntime: movie.episodeRuntime || '',
        episodeAirDate: movie.episodeAirDate || '',
        episodeRating: movie.episodeRating || '',
        episodeImageUrl: movie.episodeImageUrl || '',
    };

    const movieData = {
        ...defaultMovieData,
        ...Object.fromEntries(
            Object.entries(movie).filter(([_, value]) =>
                value !== null && value !== undefined && value !== ''
            )
        )
    };

    // Fetch episodes for the current season when season changes
    useEffect(() => {
        const fetchEpisodes = async () => {
            if (movieData.type !== 'series' || !movieData.tmdbId) return;
            
            setIsLoadingEpisodes(true);
            try {
                const seasonDetails = await tmdbService.getSeasonDetails(
                    movieData.tmdbId, 
                    currentSeason
                );
                
                if (seasonDetails && seasonDetails.episodes) {
                    // Process episodes in batches to get IMDb IDs
                    const episodePromises = seasonDetails.episodes.map(async (ep) => {
                        const episodeImg = tmdbService.getEpisodeImageUrl(ep);
                        let imdbId = null;
                        
                        try {
                            // Get external IDs for the episode (including IMDb ID)
                            const externalIds = await tmdbService.getEpisodeExternalIds(
                                movieData.tmdbId!, 
                                currentSeason, 
                                ep.episode_number
                            );
                            imdbId = externalIds?.imdb_id || null;
                            
                            if (imdbId) {
                                console.log(`Found IMDb ID ${imdbId} for S${currentSeason}E${ep.episode_number}`);
                            } else {
                                console.log(`No IMDb ID found for S${currentSeason}E${ep.episode_number}`);
                            }
                        } catch (error) {
                            console.error(`Failed to get IMDb ID for S${currentSeason}E${ep.episode_number}:`, error);
                        }
                        
                        // Fetch detailed episode information to get runtime
                        let runtime = '30-60';
                        try {
                            const episodeDetails = await tmdbService.getEpisodeDetails(
                                movieData.tmdbId!,
                                currentSeason,
                                ep.episode_number
                            );
                            
                            if (episodeDetails && episodeDetails.runtime) {
                                runtime = episodeDetails.runtime.toString();
                                console.log(`Found runtime ${runtime} min for S${currentSeason}E${ep.episode_number}`);
                            } else {
                                // Fallback to show's average runtime if episode-specific runtime is not available
                                const showDetails = await tmdbService.getTVShowDetails(movieData.tmdbId!);
                                if (showDetails && showDetails.episode_run_time && showDetails.episode_run_time.length > 0) {
                                    runtime = showDetails.episode_run_time[0].toString();
                                    console.log(`Using show's average runtime ${runtime} min for S${currentSeason}E${ep.episode_number}`);
                                } else {
                                    console.log(`No runtime found for S${currentSeason}E${ep.episode_number}, using default value`);
                                }
                            }
                        } catch (error) {
                            console.error(`Failed to get runtime for S${currentSeason}E${ep.episode_number}:`, error);
                        }
                        
                        return {
                            number: ep.episode_number,
                            title: ep.name,
                            description: ep.overview,
                            duration: `${runtime} min`,
                            imageUrl: episodeImg || movieData.imageUrl,
                            imdbId: imdbId
                        };
                    });
                    
                    // Process episodes in parallel
                    const formattedEpisodes = await Promise.all(episodePromises);
                    setEpisodes(formattedEpisodes);
                }
            } catch (error) {
                console.error('Failed to fetch episodes:', error);
                // Set some dummy episodes as fallback
                setEpisodes([
                    {
                        number: 1,
                        title: 'Episode 1',
                        description: 'No description available',
                        duration: '45 min',
                        imageUrl: movieData.imageUrl,
                        imdbId: null
                    },
                    {
                        number: 2,
                        title: 'Episode 2',
                        description: 'No description available',
                        duration: '45 min',
                        imageUrl: movieData.imageUrl,
                        imdbId: null
                    }
                ]);
            } finally {
                setIsLoadingEpisodes(false);
            }
        };

        fetchEpisodes();
    }, [currentSeason, movieData.tmdbId]);

    // Fetch similar content
    useEffect(() => {
        const fetchSimilarContent = async () => {
            if (!movieData.tmdbId) return;
            
            setIsLoadingSimilar(true);
            try {
                const similar = await tmdbService.getSimilar(
                    movieData.tmdbId,
                    movieData.type === 'series' ? 'tv' : 'movie'
                );
                setSimilarContent(similar);
            } catch (error) {
                console.error('Failed to fetch similar content:', error);
            } finally {
                setIsLoadingSimilar(false);
            }
        };

        if (activeTab === 'More Like This') {
            fetchSimilarContent();
        }
    }, [activeTab, movieData.tmdbId]);

    // Fetch collection (if part of a collection)
    useEffect(() => {
        const fetchCollection = async () => {
            if (!movieData.tmdbId) return;
            
            setIsLoadingCollection(true);
            try {
                const collectionData = await tmdbService.getCollection(movieData.tmdbId);
                setCollection(collectionData);
            } catch (error) {
                console.error('Failed to fetch collection:', error);
            } finally {
                setIsLoadingCollection(false);
            }
        };

        if (activeTab === 'Collection') {
            fetchCollection();
        }
    }, [activeTab, movieData.tmdbId]);

    // Fetch trailers and videos
    useEffect(() => {
        const fetchTrailers = async () => {
            if (!movieData.tmdbId) return;
            
            setIsLoadingTrailers(true);
            try {
                const videos = await tmdbService.getVideos(
                    movieData.tmdbId,
                    movieData.type === 'series' ? 'tv' : 'movie'
                );
                setTrailers(videos);
            } catch (error) {
                console.error('Failed to fetch trailers:', error);
            } finally {
                setIsLoadingTrailers(false);
            }
        };

        if (activeTab === 'Trailers & More') {
            fetchTrailers();
        }
    }, [activeTab, movieData.tmdbId]);

    // Fetch trailer key
    useEffect(() => {
        const fetchTrailer = async () => {
            if (!movieData.tmdbId) return;
            try {
                const videos = await tmdbService.getVideos(
                    movieData.tmdbId,
                    movieData.type === 'series' ? 'tv' : 'movie'
                );
                // Find the first YouTube trailer
                const trailer = videos.find(video => video.site === 'YouTube' && video.type === 'Trailer');
                if (trailer) {
                    setTrailerKey(trailer.key);
                } else {
                    setTrailerKey(null); // Explicitly set to null if no trailer found
                }
            } catch (error) {
                console.error('Failed to fetch trailers:', error);
                setTrailerKey(null);
            }
        };
        fetchTrailer();
    }, [movieData.tmdbId, movieData.type]);

    // onPlaybackStatusUpdate and related useEffect removed as they are not needed for WebView

    const handleSeasonChange = (season: number) => {
        setCurrentSeason(season);
    };

    const handleEpisodePress = (episodeNumber: number) => {
        // Update the UI state to reflect the selection
        setSelectedEpisodeInList(episodeNumber);
        
        // Find the selected episode to get its IMDb ID and other details
        const selectedEpisode = episodes.find(ep => ep.number === episodeNumber);
        
        // Extract runtime from the episode's duration (remove the " min" suffix)
        const runtime = selectedEpisode?.duration ? selectedEpisode.duration.replace(' min', '') : '0';
        
        // Update current episode info state for the streaming modal
        setCurrentEpisodeInfo({
            title: movieData.title,
            season: currentSeason,
            episode: episodeNumber,
            episodeTitle: selectedEpisode?.title || ''
        });
        
        // Update current episode in movieData for streaming
        const updatedMovieData = {
            ...movieData,
            currentEpisode: episodeNumber,
            currentEpisodeImdbId: selectedEpisode?.imdbId || null,
            episodeTitle: selectedEpisode?.title || '',
            episodeDescription: selectedEpisode?.description || '',
            episodeRuntime: runtime,
            episodeImageUrl: selectedEpisode?.imageUrl || movieData.imageUrl
        };
        
        // Update the movieData object with all episode information
        movieData.currentEpisode = episodeNumber;
        movieData.currentEpisodeImdbId = selectedEpisode?.imdbId || null;
        movieData.episodeTitle = selectedEpisode?.title || '';
        movieData.episodeDescription = selectedEpisode?.description || '';
        movieData.episodeRuntime = runtime;
        movieData.episodeImageUrl = selectedEpisode?.imageUrl || movieData.imageUrl;
        
        console.log(`Selected episode ${episodeNumber} from season ${currentSeason}, title: ${movieData.episodeTitle}, runtime: ${runtime} min${selectedEpisode?.imdbId ? `, IMDb ID: ${selectedEpisode.imdbId}` : ''}`);
        
        // Open streaming modal and fetch links for the selected episode
        setShowStreamingModal(true);
        
        // Clear the previous links before loading new ones
        setStreamingLinks({});
        
        // Load streaming links for the selected episode
        loadStreamingLinks();
    };

    const renderTabContent = () => {
        // If on Android, use direct rendering to avoid layout issues
        if (isAndroid) {
            switch (activeTab) {
                case 'Episodes':
                    return (
                        <View style={styles.episodesContainer}>
                            <SeasonSelector
                                currentSeason={currentSeason}
                                totalSeasons={movieData.seasons || 1}
                                onSeasonChange={handleSeasonChange}
                            />
                            {isLoadingEpisodes ? (
                                <View style={styles.loadingContainer}>
                                    <Text style={styles.loadingText}>Loading episodes...</Text>
                                </View>
                            ) : (
                                <FlatList
                                    data={episodes}
                                    keyExtractor={(item) => `episode-${item.number}`}
                                    renderItem={({ item }) => (
                                        <EpisodeItem
                                            episode={item}
                                            isSelected={item.number === selectedEpisodeInList}
                                            onPress={() => handleEpisodePress(item.number)}
                                        />
                                    )}
                                    contentContainerStyle={styles.episodesList}
                                />
                            )}
                        </View>
                    );
                case 'More Like This':
                    return (
                        <View>
                            {isLoadingSimilar ? (
                                <View style={styles.loadingContainer}>
                                    <Text style={styles.loadingText}>Loading similar content...</Text>
                                </View>
                            ) : (
                                <FlatList
                                    horizontal
                                    data={similarContent}
                                    keyExtractor={(item) => `similar-${item.id}`}
                                    renderItem={({ item }) => {
                                        const mediaType = movieData.type === 'series' ? 'tv' : 'movie';
                                        const routeKey = `tmdb-${mediaType}-${item.id}`;
                                        return (
                                            <TouchableOpacity
                                                style={styles.horizontalListItem}
                                                onPress={() => router.push({
                                                    pathname: `/movie/[id]`,
                                                    params: {
                                                        id: routeKey,
                                                        tmdbId: item.id,
                                                        mediaType: mediaType
                                                    }
                                                })}
                                            >
                                                <ExpoImage
                                                    source={{ uri: tmdbService.getImageUrl(item.poster_path) }}
                                                    style={styles.horizontalListImage}
                                                    contentFit="cover"
                                                />
                                            </TouchableOpacity>
                                        );
                                    }}
                                    contentContainerStyle={styles.horizontalListContainer}
                                    showsHorizontalScrollIndicator={false}
                                />
                            )}
                        </View>
                    );
                default:
                    return null;
            }
        }
        
        // iOS rendering (no changes)
        return (
            <>
                {/* Episodes Tab Content */}
                <View style={[activeTab !== 'Episodes' ? { height: 0, overflow: 'hidden' } : {}]}>
                    <View style={styles.episodesContainer}>
                        <SeasonSelector
                            currentSeason={currentSeason}
                            totalSeasons={movieData.seasons || 1}
                            onSeasonChange={handleSeasonChange}
                        />
                        {isLoadingEpisodes ? (
                            <View style={styles.loadingContainer}>
                                <Text style={styles.loadingText}>Loading episodes...</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={episodes}
                                keyExtractor={(item) => `episode-${item.number}`}
                                renderItem={({ item }) => (
                                    <EpisodeItem
                                        episode={item}
                                        isSelected={item.number === selectedEpisodeInList}
                                        onPress={() => handleEpisodePress(item.number)}
                                    />
                                )}
                                contentContainerStyle={styles.episodesList}
                            />
                        )}
                    </View>
                </View>

                {/* More Like This Tab Content */}
                <View style={[activeTab !== 'More Like This' ? { height: 0, overflow: 'hidden' } : {}]}>
                    {isLoadingSimilar ? (
                        <View style={styles.loadingContainer}>
                            <Text style={styles.loadingText}>Loading similar content...</Text>
                        </View>
                    ) : (
                        <FlatList
                            horizontal
                            data={similarContent}
                            keyExtractor={(item) => `similar-${item.id}`}
                            renderItem={({ item }) => {
                                const mediaType = movieData.type === 'series' ? 'tv' : 'movie';
                                const routeKey = `tmdb-${mediaType}-${item.id}`;
                                return (
                                    <TouchableOpacity
                                        style={styles.horizontalListItem}
                                        onPress={() => router.push({
                                            pathname: `/movie/[id]`,
                                            params: {
                                                id: routeKey,
                                                tmdbId: item.id,
                                                mediaType: mediaType
                                            }
                                        })}
                                    >
                                        <ExpoImage
                                            source={{ uri: tmdbService.getImageUrl(item.poster_path) }}
                                            style={styles.horizontalListImage}
                                            contentFit="cover"
                                        />
                                    </TouchableOpacity>
                                );
                            }}
                            contentContainerStyle={styles.horizontalListContainer}
                            showsHorizontalScrollIndicator={false}
                        />
                    )}
                </View>
            </>
        );
    };

    // New function to load streaming links
    const loadStreamingLinks = async () => {
        try {
            setLoadingStreams(true);
            setStreamError(null);
            setStreamingLinks({});
            
            let mediaType = movieData.type || 'movie';
            
            // Debug installed addons
            const installedAddons = stremioService.getInstalledAddons();
            console.log(`Found ${installedAddons.length} installed addons:`, 
                installedAddons.map(addon => addon.id));
            
            // Determine the best ID to use for fetching streams
            let hasImdbId = typeof movieData.id === 'string' && movieData.id.includes('tt');
            
            // Use multiple ID formats to increase chances of success
            const streamSources = [];
            
            // Extract the raw IMDb ID (tt12345) from the movie ID if it exists
            let rawImdbId = '';
            if (hasImdbId) {
                const match = (movieData.id as string).match(/tt\d+/);
                if (match) {
                    rawImdbId = match[0];
                    console.log(`Extracted raw IMDb ID: ${rawImdbId}`);
                }
            }
            
            // Format 1: TMDB ID (if available)
            if (movieData.tmdbId) {
                let tmdbSource = `tmdb:${movieData.tmdbId}`;
                if (mediaType === 'series' && movieData.currentSeason && movieData.currentEpisode) {
                    tmdbSource = `${tmdbSource}:${movieData.currentSeason}:${movieData.currentEpisode}`;
                }
                streamSources.push({
                    id: tmdbSource,
                    name: 'TMDB'
                });
            }
            
            // Format 2: IMDb ID with series/movie prefix
            if (rawImdbId) {
                // For TV shows, try all possible formats
                if (mediaType === 'series') {
                    if (movieData.currentSeason && movieData.currentEpisode) {
                        // Check if we have an IMDb ID for the specific episode - use it if available
                        if (movieData.currentEpisodeImdbId) {
                            // Highest priority: actual episode IMDb ID (if available)
                            streamSources.unshift({
                                id: movieData.currentEpisodeImdbId,
                                name: 'Episode IMDb ID'
                            });
                        }
                        
                        // Format: "series:tt1234567:1:2" for series with season/episode
                        streamSources.push({
                            id: `series:${rawImdbId}:${movieData.currentSeason}:${movieData.currentEpisode}`,
                            name: 'Series prefix with episode'
                        });
                        
                        // Format: "tt1234567:1:2" (raw IMDb ID with season/episode)
                        streamSources.push({
                            id: `${rawImdbId}:${movieData.currentSeason}:${movieData.currentEpisode}`,
                            name: 'Raw IMDb with episode'
                        });
                    } else {
                        // Just the series without episode
                        streamSources.push({
                            id: `series:${rawImdbId}`,
                            name: 'Series prefix'
                        });
                    }
                } else {
                    // For movies, just use the IMDb ID with 'movie:' prefix
                    streamSources.push({
                        id: `movie:${rawImdbId}`,
                        name: 'Movie prefix'
                    });
                    
                    // Also try raw IMDb ID
                    streamSources.push({
                        id: rawImdbId,
                        name: 'Raw IMDb'
                    });
                }
            }
            
            console.log(`Trying to load streams for ${mediaType}${mediaType === 'series' ? ` Season ${movieData.currentSeason} Episode ${movieData.currentEpisode}` : ''}`);
            console.log(`Will try the following ID formats:`, streamSources.map(s => `${s.name}: ${s.id}`));
            
            const providers = new Set<string>();
            
            // Function to update streams for a single source
            const updateStreamsForSource = (sourceId: string, sourceName: string, newStreams: Stream[]) => {
                if (newStreams.length > 0) {
                    console.log(`Received ${newStreams.length} streams from ${sourceName}`);
                    
                    setStreamingLinks(prev => {
                        // Create a new object with the same properties as prev
                        const updatedStreams = { ...prev };
                        
                        // Add the new source
                        updatedStreams[sourceId] = {
                            addonName: sourceName,
                            streams: newStreams
                        };
                        
                        // Sort by installed addon order
                        const installedAddons = stremioService.getInstalledAddons();
                        const sortedKeys = Object.keys(updatedStreams).sort((a, b) => {
                            const indexA = installedAddons.findIndex(addon => addon.id === a);
                            const indexB = installedAddons.findIndex(addon => addon.id === b);
                            
                            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                            if (indexA !== -1) return -1;
                            if (indexB !== -1) return 1;
                            return 0;
                        });
                        
                        // Create a new object with the sorted keys
                        const sortedStreams: GroupedStreams = {};
                        sortedKeys.forEach(key => {
                            sortedStreams[key] = updatedStreams[key];
                        });
                        
                        return sortedStreams;
                    });
                    
                    providers.add(sourceId);
                    setAvailableProviders(new Set(providers));
                }
            };
            
            // Try each source format until we find streams
            let foundStreams = false;
            for (const source of streamSources) {
                if (foundStreams) break;
                
                try {
                    console.log(`Trying ID format: ${source.name} - ${source.id}`);
                    
                    // Extract mediaType from the ID if it's a prefixed format
                    let queryType = mediaType;
                    let queryId = source.id;
                    
                    if (source.id.startsWith('series:') || source.id.startsWith('movie:')) {
                        queryType = source.id.startsWith('series:') ? 'series' : 'movie';
                        queryId = source.id;
                    }
                    
                    const streamResponses = await stremioService.getStreams(queryType, queryId);
                    console.log(`Received ${streamResponses.length} stream responses for ${source.name}`);
                    
                    if (streamResponses.length > 0 && streamResponses.some(r => r.streams && r.streams.length > 0)) {
                        foundStreams = true;
                        
                        // Group streams by addon
                        streamResponses.forEach(response => {
                            const addonId = response.addon;
                            if (addonId && response.streams && response.streams.length > 0) {
                                console.log(`Processing ${response.streams.length} streams from addon ${addonId}`);
                                const streamsWithAddon = response.streams.map(stream => ({
                                    ...stream,
                                    name: stream.name || stream.title || 'Unnamed Stream',
                                    addonId: response.addon,
                                    addonName: response.addonName
                                }));
                                updateStreamsForSource(addonId, response.addonName, streamsWithAddon);
                            }
                        });
                    }
                } catch (error) {
                    console.error(`Failed to load streams with ${source.name}:`, error);
                }
            }
            
            // Add fallback streams if needed for testing
            if (Object.keys(streamingLinks).length === 0) {
                console.log("No streams found, adding fallback test streams");
                updateStreamsForSource('test_addon', 'Test Addon', [
                    { 
                        name: 'Test Stream 1080p',
                        title: 'Test Stream 1080p',
                        url: 'https://example.com/test1',
                        addonId: 'test_addon',
                        addonName: 'Test Addon'
                    },
                    {
                        name: 'Test Stream 720p',
                        title: 'Test Stream 720p',
                        url: 'https://example.com/test2',
                        addonId: 'test_addon',
                        addonName: 'Test Addon'
                    }
                ]);
            }
        } catch (error) {
            console.error('Failed to load streaming links:', error);
            setStreamError('Failed to load streams');
        } finally {
            setLoadingStreams(false);
        }
    };
    
    // Handler for play button click
    const handlePlayPress = () => {
        // Update current episode info based on current movieData
        setCurrentEpisodeInfo({
            title: movieData.title,
            season: movieData.currentSeason || 1,
            episode: movieData.currentEpisode || 1,
            episodeTitle: movieData.episodeTitle || ''
        });
        
        setShowStreamingModal(true);
        // Only load streaming links if not already loaded or if empty
        if (Object.keys(streamingLinks).length === 0) {
            loadStreamingLinks();
        }
    };
    
    // New function to close modal
    const handleCloseModal = () => {
        setShowStreamingModal(false);
        // Don't clear streaming links when closing to keep them cached
    };
    
    // Helper function to navigate to the built-in player
    const navigateToPlayer = (stream: Stream) => {
        router.push({
            pathname: `/player/[url]` as any,
            params: { 
                url: encodeURIComponent(stream.url),
                title: encodeURIComponent(movieData.title)
            }
        });
    };
    
    // Handler for stream selection
    const handleStreamSelect = (stream: Stream) => {
        // Determine if this is a direct stream (non-torrent) or a magnet/torrent
        const isTorrent = stream.url?.startsWith('magnet:');
        
        // Detect quality information
        const quality = stream.title?.match(/(\d+)p/)?.[1] || null;
        const isHDR = stream.title?.toLowerCase().includes('hdr');
        const isDolby = stream.title?.toLowerCase().includes('dolby');
        const isDolbyVision = stream.title?.toLowerCase().includes('vision');
        
        // Update video quality for display in the video badge
        if (isDolbyVision) {
            setVideoQuality('VISION');
        } else if (isHDR) {
            setVideoQuality('HDR');
        } else if (quality && parseInt(quality) >= 2160) {
            setVideoQuality('4K');
        } else if (quality && parseInt(quality) >= 1080) {
            setVideoQuality('HD');
        } else {
            setVideoQuality('SD');
        }
        
        console.log(`Selected stream: ${stream.name || stream.title}`);
        
        // Close the streaming modal
        setShowStreamingModal(false);
        
        // For iOS, try to open with the preferred external player
        if (Platform.OS === 'ios' && preferredPlayer !== 'internal') {
            try {
                // Format the URL for the selected player
                const streamUrl = encodeURIComponent(stream.url);
                let externalPlayerUrls: string[] = [];
                
                // Configure URL formats based on the selected player
                switch (preferredPlayer) {
                    case 'vlc':
                        externalPlayerUrls = [
                            `vlc://${stream.url}`,
                            `vlc-x-callback://x-callback-url/stream?url=${streamUrl}`,
                            `vlc://${streamUrl}`
                        ];
                        break;
                        
                    case 'outplayer':
                        externalPlayerUrls = [
                            `outplayer://${stream.url}`,
                            `outplayer://${streamUrl}`,
                            `outplayer://play?url=${streamUrl}`,
                            `outplayer://stream?url=${streamUrl}`,
                            `outplayer://play/browser?url=${streamUrl}`
                        ];
                        break;
                        
                    case 'infuse':
                        externalPlayerUrls = [
                            `infuse://x-callback-url/play?url=${streamUrl}`,
                            `infuse://play?url=${streamUrl}`,
                            `infuse://${streamUrl}`
                        ];
                        break;
                        
                    case 'vidhub':
                        externalPlayerUrls = [
                            `vidhub://play?url=${streamUrl}`,
                            `vidhub://${streamUrl}`
                        ];
                        break;
                        
                    default:
                        // If no matching player or the setting is somehow invalid, use internal player
                        navigateToPlayer(stream);
                        return;
                }
                
                console.log(`Attempting to open stream in ${preferredPlayer}`);
                
                // Try each URL format in sequence
                const tryNextUrl = (index: number) => {
                    if (index >= externalPlayerUrls.length) {
                        console.log(`All ${preferredPlayer} formats failed, falling back to direct URL`);
                        // Try direct URL as last resort
                        Linking.openURL(stream.url)
                            .then(() => console.log('Opened with direct URL'))
                            .catch(() => {
                                console.log('Direct URL failed, falling back to built-in player');
                                navigateToPlayer(stream);
                            });
                        return;
                    }
                    
                    const url = externalPlayerUrls[index];
                    console.log(`Trying ${preferredPlayer} URL format ${index + 1}: ${url}`);
                    
                    Linking.openURL(url)
                        .then(() => console.log(`Successfully opened stream with ${preferredPlayer} format ${index + 1}`))
                        .catch(err => {
                            console.log(`Format ${index + 1} failed: ${err.message}`, err);
                            tryNextUrl(index + 1);
                        });
                };
                
                // Start with the first URL format
                tryNextUrl(0);
                
            } catch (error) {
                console.error(`Error with ${preferredPlayer}:`, error);
                // Fallback to the built-in player
                navigateToPlayer(stream);
            }
        } 
        // For Android with external player preference
        else if (Platform.OS === 'android' && preferredPlayer === 'external') {
            try {
                console.log('Opening stream with Android native app chooser');
                
                // For Android, determine if the URL is a direct http/https URL or a magnet link
                const isMagnet = stream.url.startsWith('magnet:');
                
                if (isMagnet) {
                    // For magnet links, open directly which will trigger the torrent app chooser
                    console.log('Opening magnet link directly');
                    Linking.openURL(stream.url)
                        .then(() => console.log('Successfully opened magnet link'))
                        .catch(err => {
                            console.error('Failed to open magnet link:', err);
                            // No good fallback for magnet links
                            navigateToPlayer(stream);
                        });
                } else {
                    // For direct video URLs, use the S.Browser.ACTION_VIEW approach
                    // This is a more reliable way to force Android to show all video apps
                    
                    // Strip query parameters if they exist as they can cause issues with some apps
                    let cleanUrl = stream.url;
                    if (cleanUrl.includes('?')) {
                        cleanUrl = cleanUrl.split('?')[0];
                    }
                    
                    // Create an Android intent URL that forces the chooser
                    // Set component=null to ensure chooser is shown
                    // Set action=android.intent.action.VIEW to open the content
                    const intentUrl = `intent:${cleanUrl}#Intent;action=android.intent.action.VIEW;category=android.intent.category.DEFAULT;component=;type=video/*;launchFlags=0x10000000;end`;
                    
                    console.log(`Using intent URL: ${intentUrl}`);
                    
                    Linking.openURL(intentUrl)
                        .then(() => console.log('Successfully opened with intent URL'))
                        .catch(err => {
                            console.error('Failed to open with intent URL:', err);
                            
                            // First fallback: Try direct URL with regular Linking API
                            console.log('Trying plain URL as fallback');
                            Linking.openURL(stream.url)
                                .then(() => console.log('Opened with direct URL'))
                                .catch(directErr => {
                                    console.error('Failed to open direct URL:', directErr);
                                    
                                    // Final fallback: Use built-in player
                                    console.log('All external player attempts failed, using built-in player');
                                    navigateToPlayer(stream);
                                });
                        });
                }
            } catch (error) {
                console.error('Error with external player:', error);
                // Fallback to the built-in player
                navigateToPlayer(stream);
            }
        }
        else {
            // For internal player or if other options failed, use the built-in player
            navigateToPlayer(stream);
        }
    };
    
    // Function to render a stream card
    const renderStreamCard = (stream: Stream) => {
        // Extract quality information from stream title if available
        const quality = stream.title?.match(/(\d+)p/)?.[1] || null;
        const isHDR = stream.title?.toLowerCase().includes('hdr');
        const isDolby = stream.title?.toLowerCase().includes('dolby');
        const isTorrent = stream.url?.startsWith('magnet:');
        const isDebrid = stream.behaviorHints?.cached;
        
        // Detect language
        const langMatch = stream.title?.match(/\b(english|spanish|french|german|italian|russian|korean|japanese|chinese|hindi)\b/i);
        const language = langMatch ? langMatch[0].charAt(0).toUpperCase() + langMatch[0].slice(1) : null;
        
        // Detect seeds/peers info
        const seedsMatch = stream.title?.match(/(\d+)\s*seeds?/i);
        const seeds = seedsMatch ? seedsMatch[1] : null;
        
        // Format file size
        const formatFileSize = (bytes?: number) => {
            if (!bytes) return '';
            if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
            if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
            return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
        };
        
        // Get file size if available
        const fileSize = formatFileSize(stream.size);
        
        // Get shorter title for the main display
        const displayTitle = stream.name || stream.title || 'Unnamed Stream';
        
        // Get full description for the subtitle
        const fullDescription = stream.title || stream.description || '';
        
        return (
            <TouchableOpacity
                onPress={() => handleStreamSelect(stream)}
                style={styles.streamCard}
                activeOpacity={0.7}
            >
                {/* Stream type indicator */}
                <View style={styles.streamCardLeft}>
                    <View style={styles.streamTypeContainer}>
                        <MaterialIcons 
                            name={isTorrent ? 'downloading' : 'play-circle-outline'} 
                            size={22} 
                            color="white" 
                        />
                        {isDebrid && (
                            <MaterialIcons 
                                name="cloud-done" 
                                size={14} 
                                color="#4caf50"
                                style={styles.debridIcon}
                            />
                        )}
                    </View>
                    
                    {/* Stream content */}
                    <View style={styles.streamContent}>
                        {/* Main title */}
                        <Text 
                            style={styles.streamTitle}
                            numberOfLines={1}
                        >
                            {displayTitle}
                        </Text>
                        
                        {/* Full description/title from Torrentio */}
                        <Text
                            style={styles.streamDescription}
                            numberOfLines={2}
                        >
                            {fullDescription}
                        </Text>
                        
                        {/* Quality tags */}
                        <View style={styles.primaryTags}>
                            {quality && (
                                <View style={[styles.qualityTag, { backgroundColor: quality >= '1080' ? '#1976d2' : '#607d8b' }]}>
                                    <Text style={styles.tagText}>{quality}p</Text>
                                </View>
                            )}
                            {fileSize && (
                                <View style={[styles.qualityTag, { backgroundColor: '#388e3c' }]}>
                                    <Text style={styles.tagText}>{fileSize}</Text>
                                </View>
                            )}
                            {seeds && (
                                <View style={[styles.qualityTag, { backgroundColor: '#ff9800' }]}>
                                    <Text style={styles.tagText}>{seeds} Seeds</Text>
                                </View>
                            )}
                            {isHDR && (
                                <View style={[styles.qualityTag, { backgroundColor: '#ff9800' }]}>
                                    <Text style={styles.tagText}>HDR</Text>
                                </View>
                            )}
                            {isDolby && (
                                <View style={[styles.qualityTag, { backgroundColor: '#7b1fa2' }]}>
                                    <Text style={styles.tagText}>DOLBY</Text>
                                </View>
                            )}
                            {language && (
                                <View style={[styles.qualityTag, { backgroundColor: '#009688' }]}>
                                    <Text style={styles.tagText}>{language}</Text>
                                </View>
                            )}
                            {isTorrent && (
                                <View style={[styles.qualityTag, { backgroundColor: '#607d8b' }]}>
                                    <Text style={styles.tagText}>TORRENT</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
                
                {/* Right side - Play button */}
                <View style={styles.streamCardRight}>
                    <MaterialIcons 
                        name="play-arrow" 
                        size={22} 
                        color="white" 
                    />
                </View>
            </TouchableOpacity>
        );
    };
    
    // Filter the streams based on selected provider
    const getFilteredStreams = () => {
        if (selectedProvider === 'all') {
            return Object.entries(streamingLinks).map(([addonId, { addonName, streams }]) => ({
                addonId,
                addonName,
                streams
            }));
        } else {
            const providerStreams = streamingLinks[selectedProvider];
            return providerStreams ? [{
                addonId: selectedProvider,
                addonName: providerStreams.addonName,
                streams: providerStreams.streams
            }] : [];
        }
    };
    
    // Render the provider filter chips
    const renderProviderFilters = () => {
        const providers = ['all', ...Array.from(availableProviders)];
        
        return (
            <View style={{ marginBottom: 10 }}>
                {/* Used FlatList instead of ScrollView to avoid nesting VirtualizedLists */}
                <FlatList
                    horizontal
                    data={providers}
                    keyExtractor={(provider) => provider}
                    renderItem={({ item: provider }) => (
                        <TouchableOpacity
                            style={[
                                styles.providerFilterChip,
                                selectedProvider === provider && styles.providerFilterChipSelected
                            ]}
                            onPress={() => setSelectedProvider(provider)}
                        >
                            <Text style={[
                                styles.providerFilterText,
                                selectedProvider === provider && styles.providerFilterTextSelected
                            ]}>
                                {provider === 'all' 
                                    ? 'All Providers' 
                                    : streamingLinks[provider]?.addonName || provider
                                }
                            </Text>
                        </TouchableOpacity>
                    )}
                    showsHorizontalScrollIndicator={false}
                    style={styles.providerFilterContainer}
                    contentContainerStyle={styles.providerFilterContent}
                />
            </View>
        );
    };

    // Set appropriate status bar for Android
    useEffect(() => {
        if (Platform.OS === 'android') {
            // For Android, manage the status bar explicitly
            NativeStatusBar.setBackgroundColor('transparent');
            NativeStatusBar.setTranslucent(true);
            return () => {
                // Reset when component unmounts
                NativeStatusBar.setBackgroundColor('#000');
                NativeStatusBar.setTranslucent(false);
            };
        }
    }, []);

    // Set initial video quality based on movie data
    useEffect(() => {
        // Default to HD for most content
        const defaultQuality = movie.quality || 'HD';
        setVideoQuality(defaultQuality);
    }, [movie]);

    // Handle Android back button
    useEffect(() => {
        if (Platform.OS === 'android') {
            const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
                if (showStreamingModal) {
                    setShowStreamingModal(false);
                    return true;
                }
                if (onClose) {
                    onClose();
                    return true;
                }
                return false;
            });
            
            return () => backHandler.remove();
        }
    }, [onClose, showStreamingModal]);

    // Use View instead of BlurView on Android to fix touch issues
    const ContainerComponent = isAndroid ? View : BlurView;
    
    // Define container props with proper type handling for BlurView vs View
    const containerProps = isAndroid ? {
        style: styles.rootContainer,
    } : {
        intensity: 70,
        tint: 'dark' as 'dark', // Type assertion to avoid prop type mismatch
        style: styles.rootContainer,
    };

    return (
        <View
            style={[
                styles.rootContainer,
                isAndroid && {
                    height: Dimensions.get('window').height,
                    width: Dimensions.get('window').width,
                }
            ]}
        >
            <StatusBar style="light" />
            {isAndroid && (
                <View 
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 24, // Match status bar height
                        backgroundColor: '#000000', // Solid black for status bar area
                        zIndex: 10 // Higher than other elements
                    }}
                />
            )}
            
            <ScrollComponentToUse
                contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                keyboardShouldPersistTaps="handled"
                overScrollMode={isAndroid ? "never" : undefined}
            >
                <View style={styles.videoContainer}>
                    {trailerKey ? (
                        <WebView
                            style={[
                                styles.video,
                                Platform.OS === 'android' && {
                                    width: Dimensions.get('window').width,
                                    height: 300
                                }
                            ]}
                            javaScriptEnabled={true}
                            domStorageEnabled={true}
                            allowsInlineMediaPlayback={true}
                            mediaPlaybackRequiresUserAction={false}
                            source={{ uri: `https://www.youtube.com/embed/${trailerKey}?autoplay=1&playsinline=1&modestbranding=1&showinfo=0&rel=0` }}
                            onError={(syntheticEvent) => {
                                const { nativeEvent } = syntheticEvent;
                                console.warn('WebView error: ', nativeEvent);
                            }}
                        />
                    ) : (
                        // Fallback: Show poster image if no trailer key
                        <ExpoImage
                            source={{ uri: movieData.imageUrl }}
                            style={[
                                styles.video,
                                Platform.OS === 'android' && {
                                    width: Dimensions.get('window').width,
                                    height: 300
                                }
                            ]}
                            contentFit="cover"
                        />
                    )}
                    
                    {/* Keep the video overlay with the X button hidden on Android */}
                    <View style={styles.videoOverlay}>
                        <Pressable
                            style={styles.closeButton}
                            onPress={onClose}
                            android_ripple={{ color: '#ffffff33', borderless: true }}
                            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                            accessibilityRole="button"
                            accessibilityLabel="Close player"
                        >
                            <Ionicons name="close" size={Platform.OS === 'android' ? 20 : 22} color="white" />
                        </Pressable>
                    </View>
                </View>

                <View style={styles.contentContainer}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: -4, marginBottom: 8 }}>
                        <ExpoImage
                            source={{ uri: 'https://loodibee.com/wp-content/uploads/Netflix-N-Symbol-logo.png' }}
                            style={{ width: 20, height: 20, top: -4, position: 'absolute', left: 0 }}
                            cachePolicy="memory-disk"
                        />
                        <Text style={newStyles.netflixTag}>
                            {movieData.type === 'series' ? 'SERIES' : 'FILM'}
                        </Text>
                    </View>
                    <ThemedText style={styles.title}>{movieData.title}</ThemedText>

                    <View style={styles.metaInfo}>
                        <ThemedText style={styles.year}>{movieData.year}</ThemedText>
                        {movieData.type === 'series' ? (
                            <>
                                <ThemedText style={styles.duration}>
                                    {movieData.seasons} {movieData.seasons === 1 ? 'Season' : 'Seasons'}
                                </ThemedText>
                                {movieData.currentSeason && movieData.currentEpisode && (
                                    <ThemedText style={styles.duration}>
                                        S{movieData.currentSeason}E{movieData.currentEpisode}
                                    </ThemedText>
                                )}
                            </>
                        ) : (
                        <ThemedText style={styles.duration}>{movieData.duration}</ThemedText>
                        )}
                        <ThemedText style={styles.rating}>{movieData.rating}</ThemedText>
                    </View>

                    {/* EpisodeInfo removed as requested */}

                    {/* Conditionally render ranking info */}
                    {movieData.ranking_text && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 18 }}>
                        <ExpoImage
                            source={{ uri: 'https://www.netflix.com/tudum/top10/images/top10.png' }}
                            style={{ width: 24, height: 24, left: 0, borderRadius: 4 }}
                            cachePolicy="memory-disk"
                        />
                        <Text style={newStyles.trendingTag}>{movieData.ranking_text}</Text>
                    </View>
                    )}

                    {/* Play/Download buttons */}
                    <View style={styles.buttonContainer}>
                        <Pressable
                            style={[
                                styles.playButton,
                                Platform.OS === 'android' && { elevation: 3 }
                            ]}
                            onPress={handlePlayPress}
                            android_ripple={{ color: '#333333', borderless: false, foreground: true }}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            accessibilityRole="button"
                            accessibilityLabel="Play"
                        >
                            <Ionicons name="play" size={20} color="#000000" />
                            <Text style={styles.playButtonText}>Play</Text>
                        </Pressable>
                        
                        <Pressable
                            style={[
                                styles.downloadButton,
                                Platform.OS === 'android' && { elevation: 2 }
                            ]}
                            onPress={() => {
                                // Handle download press
                                setShowStreamingModal(true);
                            }}
                            android_ripple={{ color: '#444444', borderless: false, foreground: true }}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            accessibilityRole="button"
                            accessibilityLabel="Download"
                        >
                            <Ionicons name="download-outline" size={20} color="white" />
                            <Text style={styles.downloadButtonText}>Download</Text>
                        </Pressable>
                    </View>

                    <ThemedText style={styles.description}>
                        {movieData.description}
                    </ThemedText>

                    <View style={styles.castInfo}>
                        <ThemedText style={styles.castLabel}>Cast: </ThemedText>
                        <ThemedText style={styles.castText}>
                            {movieData.cast?.join(', ')}
                        </ThemedText>
                    </View>

                    <View style={styles.directorInfo}>
                        <ThemedText style={styles.directorLabel}>
                            {movieData.type === 'series' ? 'Creators: ' : 'Director: '}
                        </ThemedText>
                        <ThemedText style={styles.directorText}>
                            {movieData.director}
                        </ThemedText>
                    </View>

                    <View style={styles.actionButtons}>
                        <Pressable style={[styles.actionButton, {
                            width: Platform.OS === 'android' ? 80 : 100,
                            borderBottomWidth: 4,
                            borderBottomColor: '#db0000',
                        }]}>
                            <Ionicons name="add" size={Platform.OS === 'android' ? 20 : 24} color="white" />
                            <ThemedText style={styles.actionButtonText}>My List</ThemedText>
                        </Pressable>
                        <Pressable style={styles.actionButton}>
                            <Ionicons name="thumbs-up-outline" size={Platform.OS === 'android' ? 20 : 24} color="white" />
                            <ThemedText style={styles.actionButtonText}>Rate</ThemedText>
                        </Pressable>
                        <Pressable style={styles.actionButton}>
                            <Ionicons name="send-outline" size={Platform.OS === 'android' ? 18 : 20} color="white" style={{
                                marginBottom: Platform.OS === 'android' ? 2 : 4,
                                transform: [{ rotate: '320deg' }]
                            }} />
                            <ThemedText style={styles.actionButtonText}>Share</ThemedText>
                        </Pressable>
                    </View>
                </View>

                {/* Tabs Section */}
                <TabsSection activeTab={activeTab} onTabChange={setActiveTab} movieType={movieData.type} />

                {/* Tab Content */}
                {renderTabContent()}

            </ScrollComponentToUse>

            {/* Streaming Links Modal */}
            <Modal
                visible={showStreamingModal}
                transparent={true}
                animationType="fade"
                onRequestClose={handleCloseModal}
            >
                {isAndroid ? (
                    <View style={[StyleSheet.absoluteFill, {backgroundColor: '#000000'}]}>
                        <StatusBar style="light" />
                        <View style={styles.streamingModalContainer}>
                            <View style={styles.streamingModalHeader}>
                                <Text style={styles.streamingModalTitle}>Streaming Sources</Text>
                                <TouchableOpacity 
                                    style={styles.streamingModalCloseButton}
                                    onPress={handleCloseModal}
                                >
                                    <Ionicons name="close" size={22} color="white" />
                                </TouchableOpacity>
                            </View>
                            
                            {/* Content Title Info */}
                            <View style={styles.contentTitleContainer}>
                                {movieData.type === 'series' ? (
                                    <>
                                        <Text style={styles.contentTitle}>
                                            {currentEpisodeInfo.title} • S{currentEpisodeInfo.season}E{currentEpisodeInfo.episode}
                                        </Text>
                                        {currentEpisodeInfo.episodeTitle && (
                                            <Text style={[styles.contentTitle, { fontWeight: '400', marginTop: 2, fontSize: 14 }]}>
                                                {currentEpisodeInfo.episodeTitle}
                                            </Text>
                                        )}
                                    </>
                                ) : (
                                    <Text style={styles.contentTitle}>
                                        {movieData.title} {movieData.year ? `(${movieData.year})` : ''}
                                    </Text>
                                )}
                            </View>
                            
                            {renderProviderFilters()}
                            
                            {loadingStreams ? (
                                <View style={styles.streamingModalLoading}>
                                    <ActivityIndicator size="large" color="#E50914" />
                                    <Text style={styles.streamingModalLoadingText}>
                                        Loading streaming sources...
                                    </Text>
                                    <TouchableOpacity 
                                        style={styles.streamingModalCancelButton}
                                        onPress={handleCloseModal}
                                    >
                                        <Text style={styles.streamingModalCancelButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : streamError ? (
                                <View style={styles.streamingModalError}>
                                    <MaterialIcons name="error-outline" size={48} color="#E50914" />
                                    <Text style={styles.streamingModalErrorText}>{streamError}</Text>
                                    <TouchableOpacity 
                                        style={styles.streamingModalRetryButton}
                                        onPress={loadStreamingLinks}
                                    >
                                        <Text style={styles.streamingModalRetryButtonText}>Retry</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : Object.keys(streamingLinks).length === 0 ? (
                                <View style={styles.streamingModalEmpty}>
                                    <MaterialIcons name="search-off" size={48} color="#999" />
                                    <Text style={styles.streamingModalEmptyText}>
                                        No streaming sources found
                                    </Text>
                                </View>
                            ) : (
                                <FlatList
                                    data={getFilteredStreams()}
                                    keyExtractor={(item) => item.addonId}
                                    renderItem={({ item }) => (
                                        <View style={styles.streamGroup}>
                                            <Text style={styles.streamGroupTitle}>{item.addonName}</Text>
                                            {item.streams.map((stream, index) => 
                                                React.cloneElement(renderStreamCard(stream), { key: `${item.addonId}-${index}` })
                                            )}
                                        </View>
                                    )}
                                    style={styles.streamingModalContent}
                                    contentContainerStyle={styles.streamingModalContentContainer}
                                    showsVerticalScrollIndicator={false}
                                />
                            )}
                        </View>
                    </View>
                ) : (
                    <BlurView
                        intensity={140}
                        tint="dark"
                        style={StyleSheet.absoluteFill}
                    >
                        <StatusBar style="light" />
                        <View style={styles.streamingModalContainer}>
                            <View style={styles.streamingModalHeader}>
                                <Text style={styles.streamingModalTitle}>Streaming Sources</Text>
                                <TouchableOpacity 
                                    style={styles.streamingModalCloseButton}
                                    onPress={handleCloseModal}
                                >
                                    <Ionicons name="close" size={22} color="white" />
                                </TouchableOpacity>
                            </View>
                            
                            {/* Content Title Info */}
                            <View style={styles.contentTitleContainer}>
                                {movieData.type === 'series' ? (
                                    <>
                                        <Text style={styles.contentTitle}>
                                            {currentEpisodeInfo.title} • S{currentEpisodeInfo.season}E{currentEpisodeInfo.episode}
                                        </Text>
                                        {currentEpisodeInfo.episodeTitle && (
                                            <Text style={[styles.contentTitle, { fontWeight: '400', marginTop: 2, fontSize: 14 }]}>
                                                {currentEpisodeInfo.episodeTitle}
                                            </Text>
                                        )}
                                    </>
                                ) : (
                                    <Text style={styles.contentTitle}>
                                        {movieData.title} {movieData.year ? `(${movieData.year})` : ''}
                                    </Text>
                                )}
                            </View>
                            
                            {renderProviderFilters()}
                            
                            {loadingStreams ? (
                                <View style={styles.streamingModalLoading}>
                                    <ActivityIndicator size="large" color="#E50914" />
                                    <Text style={styles.streamingModalLoadingText}>
                                        Loading streaming sources...
                                    </Text>
                                    <TouchableOpacity 
                                        style={styles.streamingModalCancelButton}
                                        onPress={handleCloseModal}
                                    >
                                        <Text style={styles.streamingModalCancelButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : streamError ? (
                                <View style={styles.streamingModalError}>
                                    <MaterialIcons name="error-outline" size={48} color="#E50914" />
                                    <Text style={styles.streamingModalErrorText}>{streamError}</Text>
                                    <TouchableOpacity 
                                        style={styles.streamingModalRetryButton}
                                        onPress={loadStreamingLinks}
                                    >
                                        <Text style={styles.streamingModalRetryButtonText}>Retry</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : Object.keys(streamingLinks).length === 0 ? (
                                <View style={styles.streamingModalEmpty}>
                                    <MaterialIcons name="search-off" size={48} color="#999" />
                                    <Text style={styles.streamingModalEmptyText}>
                                        No streaming sources found
                                    </Text>
                                </View>
                            ) : (
                                <FlatList
                                    data={getFilteredStreams()}
                                    keyExtractor={(item) => item.addonId}
                                    renderItem={({ item }) => (
                                        <View style={styles.streamGroup}>
                                            <Text style={styles.streamGroupTitle}>{item.addonName}</Text>
                                            {item.streams.map((stream, index) => 
                                                React.cloneElement(renderStreamCard(stream), { key: `${item.addonId}-${index}` })
                                            )}
                                        </View>
                                    )}
                                    style={styles.streamingModalContent}
                                    contentContainerStyle={styles.streamingModalContentContainer}
                                    showsVerticalScrollIndicator={false}
                                />
                            )}
                        </View>
                    </BlurView>
                )}
            </Modal>
        </View>
    );
}