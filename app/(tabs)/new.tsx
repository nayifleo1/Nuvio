import React, { useEffect, useState } from 'react';
import { Text, View, Pressable, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { newStyles } from '@/styles/new';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TAB_SCREENS } from '@/app/(tabs)/_layout';
import { TabScreenWrapper } from '@/components/TabScreenWrapper';
import { usePathname } from 'expo-router';
import { useRef } from 'react';
import { Image as ExpoImage } from 'expo-image';
import tmdbService, { TMDBMovieSearchResult, TMDBTVSearchResult } from '@/services/tmdbService';
import Animated, { 
    useSharedValue, 
    useAnimatedScrollHandler,
    useAnimatedRef,
    scrollTo,
    measure,
    runOnJS,
    useAnimatedStyle,
    withTiming,
    withSpring,
    interpolateColor
} from 'react-native-reanimated';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';

// Fix type issues by ensuring media_type is properly typed
type TMDBContent = 
  | (TMDBMovieSearchResult & { media_type: 'movie' }) 
  | (TMDBTVSearchResult & { media_type: 'tv' });

// Type for display items
interface DisplayItem {
  id: number;
  title: string;
  imageUrl: string;
  backdropUrl: string;
  logoUrl?: string;
  logoWidth: number;
  logoHeight: number;
  subText: string;
  type?: string;
  description: string;
  rated: string;
  releaseDate: string;
  tmdbId: number;
  mediaType: 'movie' | 'tv';
}

// Add a new type for combined upcoming items
type CombinedUpcomingItem = (TMDBMovieSearchResult & { media_type: 'movie' }) | (TMDBTVSearchResult & { media_type: 'tv' });

// Add type for router params
type ExtendedPlayerParams = {
    id: number;
    type: 'movie' | 'tv';
    title: string;
    imageUrl: string;
    backdropUrl: string;
    description: string;
    releaseDate: string;
    rated: string;
};

const TAB_OPTIONS = [
    {
        id: 'coming-soon',
        icon: require('../../assets/images/replace-these/coming-soon.png'),
        label: 'Coming Soon',
    },
    {
        id: 'everyone-watching',
        icon: require('../../assets/images/replace-these/everyone-watching.webp'),
        label: "Everyone's Watching"
    },
    {
        id: 'top-10-shows',
        icon: require('../../assets/images/replace-these/top10.png'),
        label: 'Top 10 TV Shows'
    },
    {
        id: 'top-10-movies',
        icon: require('../../assets/images/replace-these/top10.png'),
        label: 'Top 10 Movies'
    }
];

export default function NewScreen() {
    const pathname = usePathname();
    const isActive = pathname === '/new';

    const currentTabIndex = TAB_SCREENS.findIndex(screen =>
        screen.name === 'new'
    );
    const activeTabIndex = TAB_SCREENS.findIndex(screen =>
        pathname === `/${screen.name}` || (screen.name === 'index' && pathname === '/')
    );

    const slideDirection = activeTabIndex > currentTabIndex ? 'right' : 'left';

    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState('coming-soon');
    const [isLoading, setIsLoading] = useState(true);
    const [content, setContent] = useState<{
        comingSoon: DisplayItem[];
        everyoneWatching: DisplayItem[];
        top10Shows: DisplayItem[];
        top10Movies: DisplayItem[];
    }>({
        comingSoon: [],
        everyoneWatching: [],
        top10Shows: [],
        top10Movies: []
    });

    const scrollViewRef = useRef(null);
    const [contentLogos, setContentLogos] = useState<{[key: string]: string}>({});

    const tabsScrollViewRef = useRef<ScrollView>(null);
    const contentScrollViewRef = useAnimatedRef<Animated.ScrollView>();
    const translateX = useSharedValue(0);
    const screenWidth = Dimensions.get('window').width;
    
    // Track active tab for animation
    const [activeTabId, setActiveTabId] = useState('coming-soon');
    const tabAnimations = TAB_OPTIONS.reduce((acc, tab) => {
        acc[tab.id] = useSharedValue(tab.id === 'coming-soon' ? 1 : 0);
        return acc;
    }, {} as Record<string, Animated.SharedValue<number>>);
    
    // Track tab content transitions to eliminate stutter
    const contentTransitionProgress = useSharedValue(0);
    const contentOpacity = useSharedValue(1);
    
    // Switch tabs with optimized animation
    const onTabChange = (tabId: string) => {
        if (tabId === activeTab) return; // Don't animate if the same tab
        
        // Update active tab state
        setActiveTab(tabId);
        setActiveTabId(tabId);
        
        // Animate tab indicators immediately for a responsive feel
        Object.keys(tabAnimations).forEach(id => {
            tabAnimations[id].value = withTiming(id === tabId ? 1 : 0, { 
                duration: 200
            });
        });
        
        // Scroll to the selected tab to ensure it's visible
        const tabIndex = TAB_OPTIONS.findIndex(tab => tab.id === tabId);
        if (tabIndex !== -1 && tabsScrollViewRef.current) {
            tabsScrollViewRef.current.scrollTo({
                x: Math.max(0, (tabIndex * 150) - 50), // Center the tab
                animated: true
            });
        }
    };
    
    // Animation style for the content with transform
    const contentAnimatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                // Add subtle translation effect during swipe
                { translateX: translateX.value * 0.15 } // Only move 15% of the swipe amount
            ]
        };
    });
    
    // Gesture handlers for swiping between tabs and scrolling content
    
    // Vertical scrolling gesture (native scroll behavior)
    const scrollGesture = Gesture.Native();
    
    // Horizontal swipe gesture for tab switching
    const swipeGesture = Gesture.Pan()
        .minDistance(10) 
        .activeOffsetX([-15, 15]) // Less strict horizontal activation
        .failOffsetY([-20, 20]) // More permissive for vertical movement
        .onBegin(() => {
            translateX.value = 0;
        })
        .onUpdate((event) => {
            // Only update for primarily horizontal gestures
            const horizontalMovement = Math.abs(event.translationX);
            const verticalMovement = Math.abs(event.translationY);
            
            // Less strict requirement - 1.5x more horizontal than vertical
            if (horizontalMovement > verticalMovement * 1.5) {
                translateX.value = event.translationX;
            }
        })
        .onEnd((event) => {
            const currentTabIndex = TAB_OPTIONS.findIndex(tab => tab.id === activeTab);
            
            // Less strict condition
            const horizontalMovement = Math.abs(event.translationX);
            const verticalMovement = Math.abs(event.translationY);
            
            // More permissive check - allow more vertical movement
            if (horizontalMovement > verticalMovement * 1.5) {
                // Lower threshold for tab switching
                const isSignificantSwipe = horizontalMovement > screenWidth * 0.15;
                const hasHighVelocity = Math.abs(event.velocityX) > 300;
                
                if ((isSignificantSwipe || hasHighVelocity) && event.velocityX !== 0) {
                    if (event.translationX > 0 && currentTabIndex > 0) {
                        runOnJS(onTabChange)(TAB_OPTIONS[currentTabIndex - 1].id);
                    } else if (event.translationX < 0 && currentTabIndex < TAB_OPTIONS.length - 1) {
                        runOnJS(onTabChange)(TAB_OPTIONS[currentTabIndex + 1].id);
                    }
                }
            }
            
            translateX.value = withTiming(0, { duration: 150 });
        });
    
    // Compose gestures with both working simultaneously but with constraints
    const composedGestures = Gesture.Simultaneous(scrollGesture, swipeGesture);

    // Fetch movie logos after content is loaded
    useEffect(() => {
        const fetchMovieLogos = async () => {
            const allItems = [
                ...content.comingSoon,
                ...content.everyoneWatching,
                ...content.top10Shows,
                ...content.top10Movies
            ];
            
            // Only fetch logos for movies
            const movieItems = allItems.filter(item => item.mediaType === 'movie');
            
            const logoPromises = movieItems.map(async (item) => {
                try {
                    const ids = await tmdbService.getExternalIds(item.tmdbId, 'movie');
                    if (ids?.imdb_id) {
                        return { 
                            id: item.tmdbId, 
                            logoUrl: `https://images.metahub.space/logo/medium/${ids.imdb_id}/img` 
                        };
                    }
                } catch (error) {
                    console.error(`Failed to fetch logo for movie ${item.title}:`, error);
                }
                return null;
            });
            
            const results = await Promise.all(logoPromises);
            const newLogos: {[key: string]: string} = {};
            
            results.forEach(result => {
                if (result) {
                    newLogos[result.id] = result.logoUrl;
                }
            });
            
            // Update logos in state
            setContentLogos(newLogos);
            
            // Update all content with logos
            if (Object.keys(newLogos).length > 0) {
                setContent(prevContent => {
                    // Function to update items with logos
                    const updateItemsWithLogos = (items: DisplayItem[]) => {
                        return items.map(item => {
                            if (newLogos[item.tmdbId]) {
                                return {
                                    ...item,
                                    logoUrl: newLogos[item.tmdbId]
                                };
                            }
                            return item;
                        });
                    };
                    
                    // Update all content sections
                    return {
                        comingSoon: updateItemsWithLogos(prevContent.comingSoon),
                        everyoneWatching: updateItemsWithLogos(prevContent.everyoneWatching),
                        top10Shows: updateItemsWithLogos(prevContent.top10Shows),
                        top10Movies: updateItemsWithLogos(prevContent.top10Movies)
                    };
                });
            }
        };
        
        if (!isLoading && content.comingSoon.length > 0) {
            fetchMovieLogos();
        }
    }, [isLoading, content.comingSoon.length]);

    // Convert TMDB data to display items - without looking up logos on each conversion
    const convertToDisplayItem = (item: TMDBMovieSearchResult | TMDBTVSearchResult): DisplayItem => {
        const isMovie = item.media_type === 'movie';
        const releaseDate = isMovie 
            ? (item as TMDBMovieSearchResult).release_date 
            : (item as TMDBTVSearchResult).first_air_date;
        
        // Format the date for display
        const formattedDate = releaseDate ? new Date(releaseDate) : null;
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        let subText = '';
        if (formattedDate) {
            // Check if the date is in the past, present, or future
            if (formattedDate < today) {
                // Already released - just show the date without "Coming" prefix
                subText = tmdbService.formatAirDate(releaseDate);
            } else if (formattedDate.toDateString() === today.toDateString()) {
                subText = 'New Today';
            } else if (formattedDate.toDateString() === tomorrow.toDateString()) {
                subText = 'Coming Tomorrow';
            } else {
                subText = `Coming ${tmdbService.formatAirDate(releaseDate)}`;
            }
        }

        return {
            id: item.id,
            title: isMovie ? (item as TMDBMovieSearchResult).title : (item as TMDBTVSearchResult).name,
            imageUrl: tmdbService.getImageUrl(item.backdrop_path, 'w500') || tmdbService.getImageUrl(item.poster_path, 'w500') || '',
            backdropUrl: tmdbService.getImageUrl(item.backdrop_path, 'original') || '',
            logoUrl: undefined, // Will be populated later by the useEffect
            logoWidth: 180,
            logoHeight: 80,
            subText,
            type: isMovie ? 'FILM' : 'SERIES',
            description: item.overview,
            rated: 'TV-MA',
            releaseDate: releaseDate || '',
            tmdbId: item.id,
            mediaType: isMovie ? 'movie' : 'tv'
        };
    };

    // Load content from TMDB
    useEffect(() => {
        const fetchContent = async () => {
            setIsLoading(true);
            try {
                const [upcomingMovies, upcomingTVEpisodes, popularTVShows, topRatedShows, topRatedMovies] = await Promise.all([
                    tmdbService.getUpcomingMovies(),
                    tmdbService.getUpcomingTVEpisodes(),
                    tmdbService.getPopularTVShows(),
                    tmdbService.getTopRatedTVShows(),
                    tmdbService.getTopRatedMovies()
                ]);

                // Combine upcoming movies and TV episodes for the "Coming Soon" section
                const combinedUpcoming: CombinedUpcomingItem[] = [
                    ...upcomingMovies.map(item => ({ ...item, media_type: 'movie' as const })),
                    ...upcomingTVEpisodes.map(item => ({ ...item, media_type: 'tv' as const }))
                ].sort((a, b) => {
                    const dateA = a.media_type === 'movie' 
                        ? a.release_date 
                        : a.first_air_date;
                    const dateB = b.media_type === 'movie' 
                        ? b.release_date 
                        : b.first_air_date;
                    return new Date(dateA).getTime() - new Date(dateB).getTime();
                });

                setContent({
                    comingSoon: combinedUpcoming.map(convertToDisplayItem),
                    everyoneWatching: popularTVShows.map(convertToDisplayItem),
                    top10Shows: topRatedShows.slice(0, 10).map(convertToDisplayItem),
                    top10Movies: topRatedMovies.slice(0, 10).map(convertToDisplayItem)
                });
            } catch (error) {
                console.error("Error fetching TMDB content:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchContent();
    }, []);

    // Get current content based on active tab
    const getCurrentContent = () => {
        switch (activeTab) {
            case 'coming-soon':
                return content.comingSoon;
            case 'everyone-watching':
                return content.everyoneWatching;
            case 'top-10-shows':
                return content.top10Shows;
            case 'top-10-movies':
                return content.top10Movies;
            default:
                return content.comingSoon;
        }
    };

    const renderComingSoonItem = (item: DisplayItem, index: number) => (
        <Pressable
            key={`${item.id}-${index}`}
            onPress={() => {
                // Navigate to the movie screen with correct parameters
                router.push({
                    pathname: "/movie/[id]",
                    params: {
                        id: item.id.toString(), // Use as route parameter
                        tmdbId: item.tmdbId.toString(), // TMDB ID for API calls
                        mediaType: item.mediaType, // 'movie' or 'tv'
                        title: item.title
                    }
                });
            }}
        >
            <View style={newStyles.comingSoonItem}>
                <View style={newStyles.contentContainer}>
                    <View style={newStyles.previewCard}>
                        <View style={newStyles.ratedContainer}>
                            <Text style={newStyles.rated}>{item.rated}</Text>
                        </View>

                        <Pressable
                            style={newStyles.soundButton}
                            onPress={(e) => {
                                e.stopPropagation(); // Prevent parent press event
                            }}
                        >
                            <Ionicons
                                name={"volume-mute"}
                                size={18}
                                color="white"
                            />
                        </Pressable>

                        <ExpoImage
                            source={{ uri: item.imageUrl }}
                            style={newStyles.previewImage}
                            cachePolicy="memory-disk"
                            transition={200}
                        />
                    </View>

                    <View style={newStyles.featuredContainer}>
                        <View style={{ gap: 6 }}>
                            {item.logoUrl ? (
                                <ExpoImage
                                    source={{ uri: item.logoUrl }}
                                    style={{ width: item.logoWidth, height: item.logoHeight, marginRight: 4, marginLeft: 12 }}
                                    cachePolicy="memory-disk"
                                    contentFit="contain"
                                    transition={200}
                                    onError={() => {
                                        // If logo fails to load, update the item to use text title
                                        setContent(prevContent => {
                                            const updateItems = (items: DisplayItem[]) => {
                                                return items.map(i => {
                                                    if (i.id === item.id) {
                                                        return { ...i, logoUrl: undefined };
                                                    }
                                                    return i;
                                                });
                                            };
                                            
                                            return {
                                                comingSoon: updateItems(prevContent.comingSoon),
                                                everyoneWatching: updateItems(prevContent.everyoneWatching),
                                                top10Shows: updateItems(prevContent.top10Shows),
                                                top10Movies: updateItems(prevContent.top10Movies)
                                            };
                                        });
                                    }}
                                />
                            ) : (
                                <Text style={[newStyles.title, { marginLeft: 12 }]}>{item.title}</Text>
                            )}
                        </View>
                    </View>

                    <View style={newStyles.titleContainer}>
                        <Text style={newStyles.eventDate}>{item.subText}</Text>

                        {item.type && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, marginBottom: 2 }}>
                                <ExpoImage
                                    source={{ uri: 'https://loodibee.com/wp-content/uploads/Netflix-N-Symbol-logo.png' }}
                                    style={{ width: 20, height: 20, top: -4, position: 'absolute', left: 0 }}
                                    cachePolicy="memory-disk"
                                    transition={200}
                                />
                                <Text style={newStyles.netflixTag}>{item.type}</Text>
                            </View>
                        )}

                        <Text style={newStyles.description}>{item.description}</Text>
                    </View>

                    <View style={newStyles.actionButtons}>
                        <Pressable 
                            style={newStyles.actionButton}
                            onPress={(e) => {
                                e.stopPropagation(); // Prevent parent press event
                            }}
                        >
                            <Ionicons name="notifications-outline" size={20} color="#000" />
                            <Text style={newStyles.actionButtonText}>Remind Me</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Pressable>
    );

    const renderTab = (tab: typeof TAB_OPTIONS[0]) => {
        // Create optimized animated styles for this tab
        const tabAnimatedStyle = useAnimatedStyle(() => {
            const scale = tabAnimations[tab.id].value > 0.5 ? 1.05 : 1;
            
            return {
                transform: [{ scale: withTiming(scale, { duration: 150 }) }],
                backgroundColor: interpolateColor(
                    tabAnimations[tab.id].value,
                    [0, 1],
                    ['#242424', '#333333']
                ),
                borderColor: interpolateColor(
                    tabAnimations[tab.id].value,
                    [0, 1],
                    ['transparent', '#E50914']
                ),
                borderBottomWidth: withTiming(tabAnimations[tab.id].value > 0.5 ? 2 : 0, { duration: 150 })
            };
        }, []);
        
        const textAnimatedStyle = useAnimatedStyle(() => {
            return {
                fontWeight: tabAnimations[tab.id].value > 0.5 ? '700' as '700' : '400' as '400',
                color: interpolateColor(
                    tabAnimations[tab.id].value,
                    [0, 1],
                    ['#AAAAAA', '#FFFFFF']
                )
            };
        }, []);
        
        return (
            <Pressable
                key={tab.id}
                onPress={() => onTabChange(tab.id)}
            >
                <Animated.View style={[newStyles.categoryTab, tabAnimatedStyle]}>
                    <ExpoImage
                        source={tab.icon}
                        style={[newStyles.tabIcon]}
                        cachePolicy="memory-disk"
                    />
                    <Animated.Text style={[newStyles.categoryTabText, textAnimatedStyle]}>
                        {tab.label}
                    </Animated.Text>
                </Animated.View>
            </Pressable>
        );
    };

    return (
        <TabScreenWrapper isActive={isActive} slideDirection={slideDirection}>
            <GestureHandlerRootView style={{ flex: 1 }}>
                <View style={newStyles.container}>
                    <StatusBar style="light" />
                    <SafeAreaView style={{ flex: 1 }}>
                        <View style={[newStyles.header]}>
                            <View style={newStyles.headerContent}>
                                <Text style={newStyles.headerTitle}>New & Hot</Text>
                                <View style={newStyles.headerRight}>
                                    <Pressable onPress={() => router.push('/downloads')}>
                                        <ExpoImage
                                            source={require('../../assets/images/replace-these/download-netflix-icon.png')}
                                            style={{ width: 24, height: 24 }}
                                            cachePolicy="memory-disk"
                                            contentFit="contain"
                                        />
                                    </Pressable>
                                    <Pressable onPress={() => router.push('/search')}>
                                        <Ionicons name="search" size={24} color="#fff" />
                                    </Pressable>
                                </View>
                            </View>

                            <ScrollView
                                ref={tabsScrollViewRef}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={newStyles.categoryTabs}
                            >
                                {TAB_OPTIONS.map(renderTab)}
                            </ScrollView>
                        </View>

                        {isLoading ? (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 }}>
                                <ActivityIndicator size="large" color="#E50914" />
                            </View>
                        ) : (
                            <GestureDetector gesture={composedGestures}>
                                <Animated.ScrollView
                                    ref={contentScrollViewRef}
                                    showsVerticalScrollIndicator={false}
                                    style={contentAnimatedStyle}
                                    scrollEventThrottle={16}
                                >
                                    <View style={newStyles.comingSoonList}>
                                        {getCurrentContent().map((item, index) => renderComingSoonItem(item, index))}
                                    </View>
                                </Animated.ScrollView>
                            </GestureDetector>
                        )}
                    </SafeAreaView>
                </View>
            </GestureHandlerRootView>
        </TabScreenWrapper>
    );
}


