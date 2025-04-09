import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { View, Dimensions, ActivityIndicator, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle, NativeScrollEvent, NativeSyntheticEvent, Animated as RNAnimated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  withTiming,
} from 'react-native-reanimated';
import { styles } from '@/styles';
import { AnimatedHeader } from '@/components/Header/AnimatedHeader';
import { FeaturedContent } from '@/components/FeaturedContent/FeaturedContent';
import { HomeScreen } from '@/components/HomeScreen'; // Updated import name
import { useDeviceMotion } from '@/hooks/useDeviceMotion';
import { MoviesData, FeaturedMovie, MovieRow, Movie } from '@/types/movie';
import { TAB_SCREENS } from '@/app/(tabs)/_layout';
import { useVisionOS } from '@/hooks/useVisionOS';
import { VisionContainer } from '@/components/ui/VisionContainer';
import catalogService, { StreamingContent, CatalogContent } from '../../services/catalogService';
import { stremioService } from '../../services/stremioService';

// Fallback featured movie in case API fetching fails
const FALLBACK_FEATURED_MOVIE = {
  id: 'dont-move',
  title: "Don't Move",
  thumbnail: 'https://occ-0-8407-2219.1.nflxso.net/dnm/api/v6/E8vDc_W8CLv7-yMQu8KMEC7Rrr8/AAAABWsjI5VID3ChnY1bGlkeXfdS0qY19EszZmC9vOQjb72s7hyKAfD-5Yy1OAceR9CfLqyxRMWPu15X6_zAf5ELM4gLbXcJL_2B2e8E.jpg?r=bb0',
  categories: ['Soapy', 'Suspensful', 'Sci-Fi Mystery'],
  logo: 'https://occ-0-8407-2219.1.nflxso.net/dnm/api/v6/tx1O544a9T7n8Z_G12qaboulQQE/AAAABeTZx41tm9x0TT2G_c3gmJOoK_1n9hhvRhzE76D5f3vwwNaWOEBJDLRl5mU1R3BVXhYYU_okqrGzn_qM-3nUJNqUK8QAETNIh4RZy2M7V7726S4tlW3gvd6KtIF_utcjO714L4rQ7ib3sM2ZhnDLF111_nkdewygq9av5vHduwqf1MgPoP5NIQ.png?r=867'
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Featured movie IDs from Cinemeta to try (popular movies/shows)
const FEATURED_MOVIE_IDS = [
  { type: 'movie', id: 'tt1375666' }, // Inception
  { type: 'movie', id: 'tt1745960' }, // Top Gun: Maverick
  { type: 'movie', id: 'tt14998742' }, // Oppenheimer 
  { type: 'movie', id: 'tt10366206' }, // John Wick 4
  { type: 'series', id: 'tt5491994' }, // Stranger Things
  { type: 'series', id: 'tt2442560' }  // Peaky Blinders
];

// Convert StreamingContent to Movie
const convertToMovie = (content: StreamingContent): Movie => ({
  id: content.id,
  title: content.name, // Add title property
  imageUrl: content.poster || 'https://via.placeholder.com/200x300?text=No+Image'
});

// Update styles with empty state styling
const localStyles = StyleSheet.create({
  emptyState: {
    padding: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginTop: 100,
  },
  emptyStateText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center' as const,
    opacity: 0.8,
  },
  contentPadding: {
    paddingBottom: 100, // Add padding to prevent content from hiding under nav
  }
});

// Temporary type assertion for FeaturedContent props to fix TypeScript error
// The real fix would be to update the FeaturedContent component's props type
// but we don't have access to that file in this conversation
interface TempFeaturedContentProps {
  movie: FeaturedMovie;
  imageStyle: any;
  categoriesStyle: any;
  buttonsStyle: any;
  topMargin: number;
}

// Memoized empty state component
const EmptyState = React.memo(() => (
  <View style={localStyles.emptyState}>
    <Text style={localStyles.emptyStateText}>
      No content available. Enable catalogs in the Addons tab.
    </Text>
  </View>
));

export default function Page() {
  const insets = useSafeAreaInsets();
  const { tiltX, tiltY } = useDeviceMotion();
  const { isVisionOS } = useVisionOS();
  const [featuredMovie, setFeaturedMovie] = useState<FeaturedMovie>(FALLBACK_FEATURED_MOVIE);
  const [isLoading, setIsLoading] = useState(true);
  const [movieRows, setMovieRows] = useState<MovieRow[]>([]);
  const [visibleRowCount, setVisibleRowCount] = useState(3); // Initially render only first 3 rows
  
  // Lazy load additional rows as user scrolls
  const loadMoreRows = useCallback(() => {
    if (visibleRowCount < movieRows.length) {
      // Add 2 more rows at a time
      setVisibleRowCount(prev => Math.min(prev + 2, movieRows.length));
    }
  }, [visibleRowCount, movieRows.length]);

  // Fetch featured content from Cinemeta
  useEffect(() => {
    let isMounted = true;
    const fetchFeaturedContent = async () => {
      setIsLoading(true);
      try {
        // Get a random featured movie ID from our predefined list
        const randomIndex = Math.floor(Math.random() * FEATURED_MOVIE_IDS.length);
        const { type, id } = FEATURED_MOVIE_IDS[randomIndex];
        
        // Fetch the content details from Cinemeta
        const content = await catalogService.getContentDetails(type, id);
        
        if (content && isMounted) {
          // Convert StreamingContent to FeaturedMovie
          const movie: FeaturedMovie = {
            id: content.id,
            title: content.name,
            thumbnail: content.banner || content.poster,
            categories: content.genres || ['Drama'],
            logo: content.logo
          };
          
          setFeaturedMovie(movie);
        }
      } catch (error) {
        console.error('Failed to fetch featured content:', error);
        // Use fallback on error
        if (isMounted) {
          setFeaturedMovie(FALLBACK_FEATURED_MOVIE);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchFeaturedContent();
    return () => { isMounted = false; };
  }, []);

  // Fetch movie catalogs for home screen
  const fetchCatalogData = useCallback(() => {
    let isMounted = true;
    console.log('Fetching catalog data...');
    
    const fetchData = async () => {
      try {
        // Get catalogs from Cinemeta or other addons
        const catalogs = await catalogService.getHomeCatalogs();
        
        if (catalogs && catalogs.length > 0 && isMounted) {
          // Batch process to avoid UI jank
          const processCatalogs = () => {
            // Convert catalogs to movie rows for our UI
            const rows: MovieRow[] = catalogs
              .filter(catalog => 
                // Make sure catalog has items
                catalog.items && 
                catalog.items.length > 0 &&
                // Make sure items have poster images
                catalog.items.some(item => item.poster)
              )
              .map(catalog => {
                // Filter out items without posters
                const validItems = catalog.items
                  .filter(item => item.poster)
                  .map(convertToMovie);
                
                // Only include rows with enough items to display
                if (validItems.length < 3) return null;
                
                return {
                  rowTitle: catalog.name,
                  // Limit to 10 items per row initially for better performance
                  movies: validItems.slice(0, 10),
                  type: catalog.id.includes('top') ? 'top_10' : 'normal'
                };
              })
              .filter(Boolean) as MovieRow[]; // Filter out null rows
            
            if (isMounted) {
              // Show all rows
              setMovieRows(rows);
              // Reset visible rows to initial count when data changes
              setVisibleRowCount(3);
            }
          };
          
          // Use requestAnimationFrame to process data off the main thread
          requestAnimationFrame(processCatalogs);
        } else if (isMounted) {
          console.warn('No catalogs returned or enabled');
          setMovieRows([]);
        }
      } catch (error) {
        console.error('Failed to fetch catalog data:', error);
        // Set empty rows on error
        if (isMounted) {
          setMovieRows([]);
        }
      }
    };
    
    // Start the fetch process
    fetchData();
    
    // Return cleanup function
    return () => { 
      isMounted = false; 
    };
  }, []);

  // Listen for catalog preferences changes and addon changes
  useEffect(() => {
    // Initial fetch
    const cleanupFn = fetchCatalogData();
    
    // Subscribe to catalog preference changes
    const unsubscribeCatalogPrefs = stremioService.addCatalogPrefsListener(() => {
      console.log('Catalog preferences changed, reloading data...');
      fetchCatalogData();
    });
    
    // Subscribe to addon changes (add/remove)
    const unsubscribeAddonChanges = stremioService.addAddonChangeListener(() => {
      console.log('Addon changes detected, reloading data...');
      fetchCatalogData();
    });
    
    // Cleanup subscriptions on unmount
    return () => {
      cleanupFn();
      unsubscribeCatalogPrefs();
      unsubscribeAddonChanges();
    };
  }, [fetchCatalogData]);

  // Scroll animation values
  const SCROLL_THRESHOLD = 4;
  const SLIDE_ACTIVATION_POINT = 90;
  const scrollY = useSharedValue(0);
  const lastScrollY = useSharedValue(0);
  const scrollDirection = useSharedValue(0);
  
  // For native animated
  const nativeScrollY = useRef(new RNAnimated.Value(0)).current;
  
  // Track scroll position for lazy loading more content
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    // Check if user has scrolled far enough to load more rows
    const offsetY = event.nativeEvent.contentOffset.y;
    const contentHeight = event.nativeEvent.contentSize.height;
    const scrollViewHeight = event.nativeEvent.layoutMeasurement.height;
    
    // Load more when user scrolls past 70% of current content
    if (offsetY > (contentHeight - scrollViewHeight) * 0.7) {
      loadMoreRows();
    }

    // Handle animation logic for Reanimated
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const prevScrollY = lastScrollY.value;
    const scrollDelta = currentScrollY - prevScrollY;
    
    // Update shared values for animations
    lastScrollY.value = currentScrollY;
    scrollY.value = currentScrollY;
    
    // Handle header animation logic
    if (currentScrollY >= SLIDE_ACTIVATION_POINT) {
      if (scrollDelta > SCROLL_THRESHOLD) {
        scrollDirection.value = withTiming(1, { duration: 400 });
      } else if (scrollDelta < -SCROLL_THRESHOLD) {
        scrollDirection.value = withTiming(0, { duration: 400 });
      }
    } else {
      scrollDirection.value = withTiming(0, { duration: 400 });
    }
  }, [loadMoreRows, lastScrollY, scrollY, scrollDirection, SLIDE_ACTIVATION_POINT, SCROLL_THRESHOLD]);

  // Create scroll event handler using React Native's Animated, not Reanimated
  const scrollEventHandler = RNAnimated.event(
    [{ nativeEvent: { contentOffset: { y: nativeScrollY } } }],
    { 
      useNativeDriver: true,
      listener: handleScroll 
    }
  );

  // Memoize animated values
  const headerAnimatedProps = useAnimatedProps(() => {
    return {
      intensity: interpolate(
        scrollY.value,
        [0, 90],
        [0, 85],
        'clamp'
      )
    };
  });

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tiltX.value * 0.7 },
      { translateY: tiltY.value * 0.7 },
      { scale: 1.05 },
    ],
  }));

  const categoriesStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tiltX.value * -0.35 },
      { translateY: tiltY.value * -0.35 },
    ],
  }));

  const buttonsStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tiltX.value * -0.45 },
      { translateY: tiltY.value * -0.45 },
    ],
  }));

  const scrollViewRef = useRef(null);
  
  // Memoize the FeaturedContent props to prevent unnecessary re-renders
  const featuredContentProps = useMemo(() => ({
    movie: featuredMovie,
    imageStyle,
    categoriesStyle,
    buttonsStyle,
    topMargin: insets.top + 90
  }), [featuredMovie, imageStyle, categoriesStyle, buttonsStyle, insets.top]);

  // Memoize gradient colors and locations - moved before conditional rendering
  const gradientColors = useMemo(() => 
    ['#202036', '#11111d', '#07070c'] as const, 
  []);
  const gradientLocations = useMemo(() => 
    [0, 0.4, 0.8] as const, 
  []);

  // Container style for loading state
  const loadingContainerStyle = useMemo(() => 
    [styles.container, { justifyContent: 'center', alignItems: 'center' }],
  []);

  // Show loading indicator while content is being fetched
  if (isLoading && movieRows.length === 0) {
    return (
      <VisionContainer style={loadingContainerStyle}>
        <ActivityIndicator size="large" color="#e50914" />
      </VisionContainer>
    );
  }

  return (
    <VisionContainer style={styles.container}>
      <StatusBar style="light" />
      <AnimatedHeader
        headerAnimatedProps={headerAnimatedProps}
        title="For Saúl"
        scrollDirection={scrollDirection}
      />

      <RNAnimated.ScrollView
        ref={scrollViewRef}
        style={[
          styles.scrollView,
          isVisionOS && { paddingHorizontal: 20 }
        ]}
        onScroll={scrollEventHandler}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.scrollViewContent, 
          localStyles.contentPadding
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
        removeClippedSubviews={true}
        overScrollMode="never"
      >
        <LinearGradient
          colors={gradientColors}
          locations={gradientLocations}
          style={[styles.gradient, { height: SCREEN_HEIGHT * 0.8 }]}
        />

        <FeaturedContent
          {...featuredContentProps as TempFeaturedContentProps}
        />

        <View style={{ marginTop: 5 }}>
          {movieRows.length > 0 ? (
            // Only render visible rows
            movieRows.slice(0, visibleRowCount).map((row) => (
              <HomeScreen key={row.rowTitle} {...row} />
            ))
          ) : (
            <EmptyState />
          )}
        </View>
      </RNAnimated.ScrollView>
    </VisionContainer>
  );
}


