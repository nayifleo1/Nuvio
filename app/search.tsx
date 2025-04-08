import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    Text,
    Dimensions,
    ActivityIndicator,
    FlatList,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useDebounce } from 'use-debounce';
import { tmdbService, TMDBSearchResultItem, TMDBMovieSearchResult, TMDBTVSearchResult } from '../services/tmdbService';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width / 3 - 16;
const NUM_COLUMNS = 3;

// Current date for comparing with release dates
const CURRENT_DATE = new Date();
// Consider shows with episodes in the last 30 days as "new episodes"
const NEW_EPISODES_THRESHOLD_DAYS = 30;

export default function Search() {
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [searchResults, setSearchResults] = useState<TMDBSearchResultItem[]>([]);
    const [trendingContent, setTrendingContent] = useState<TMDBSearchResultItem[]>([]);
    const [isTrendingLoading, setIsTrendingLoading] = useState(true);
    const [debouncedSearchTerm] = useDebounce(searchQuery, 500);
    const inputRef = useRef<TextInput>(null);
    const router = useRouter();

    // Fetch trending content when component mounts
    useEffect(() => {
        const fetchTrendingContent = async () => {
            setIsTrendingLoading(true);
            try {
                // Fetch both trending movies and TV shows
                const [trendingMovies, trendingTVShows] = await Promise.all([
                    tmdbService.getTrending('movie'),
                    tmdbService.getTrending('tv')
                ]);

                // Process results to include imdbId where possible
                const processedMovies = await Promise.all(
                    trendingMovies.map(async (movie) => {
                        try {
                            const externalIds = await tmdbService.getExternalIds(movie.id, 'movie');
                            return {
                                ...movie,
                                imdb_id: externalIds?.imdb_id || null
                            };
                        } catch (error) {
                            return { ...movie, imdb_id: null };
                        }
                    })
                );

                const processedTVShows = await Promise.all(
                    trendingTVShows.map(async (show) => {
                        try {
                            const externalIds = await tmdbService.getExternalIds(show.id, 'tv');
                            return {
                                ...show,
                                imdb_id: externalIds?.imdb_id || null
                            };
                        } catch (error) {
                            return { ...show, imdb_id: null };
                        }
                    })
                );

                // Combine and sort by popularity
                const combined = [...processedMovies, ...processedTVShows]
                    .sort((a, b) => b.popularity - a.popularity)
                    .slice(0, 20); // Limit to top 20

                setTrendingContent(combined);
            } catch (error) {
                console.error('Failed to fetch trending content:', error);
            } finally {
                setIsTrendingLoading(false);
            }
        };

        fetchTrendingContent();
    }, []);

    useEffect(() => {
        if (debouncedSearchTerm !== searchQuery) {
            setIsLoading(true);
        }
    }, [searchQuery]);

    useEffect(() => {
        const fetchAndSortResults = async () => {
            if (!debouncedSearchTerm.trim() || debouncedSearchTerm.trim().length < 2) {
                setSearchResults([]);
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                // Fetch both movie and TV results from TMDB
                const [movieResults, tvResults] = await Promise.all([
                    tmdbService.searchMovie(debouncedSearchTerm),
                    tmdbService.searchTVShow(debouncedSearchTerm)
                ]);

                // Process results to include imdbId where possible
                // This will enable proper navigation to content with addon support
                const processedMovies = await Promise.all(
                    movieResults.map(async (movie) => {
                        try {
                            // Attempt to get external IDs (including IMDb ID)
                            const externalIds = await tmdbService.getExternalIds(movie.id, 'movie');
                            return {
                                ...movie,
                                imdb_id: externalIds?.imdb_id || null
                            };
                        } catch (error) {
                            console.log(`Failed to get external IDs for movie ${movie.id}:`, error);
                            return { ...movie, imdb_id: null };
                        }
                    })
                );

                const processedTvShows = await Promise.all(
                    tvResults.map(async (show) => {
                        try {
                            // Attempt to get external IDs (including IMDb ID)
                            const externalIds = await tmdbService.getExternalIds(show.id, 'tv');
                            return {
                                ...show,
                                imdb_id: externalIds?.imdb_id || null
                            };
                        } catch (error) {
                            console.log(`Failed to get external IDs for TV show ${show.id}:`, error);
                            return { ...show, imdb_id: null };
                        }
                    })
                );

                // Combine results
                const combinedResults = [
                    ...processedMovies.map(m => ({ ...m, media_type: 'movie' as const })),
                    ...processedTvShows.map(tv => ({ ...tv, media_type: 'tv' as const }))
                ];

                // Sort combined results using TMDB data
                sortTMDBResults(combinedResults, debouncedSearchTerm);

            } catch (error) {
                console.error('Search error:', error);
                setSearchResults([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAndSortResults();
    }, [debouncedSearchTerm]);

    // Updated getRelevanceScore to work with TMDB result structure
    const getRelevanceScore = (item: TMDBSearchResultItem, query: string): number => {
        const title = item.media_type === 'movie' ? item.title : item.name;
        if (!title) return 0;
        
        const normalizedTitle = title.toLowerCase().trim();
        const normalizedQuery = query.toLowerCase().trim();
        
        // Exact match gets highest score
        if (normalizedTitle === normalizedQuery) return 100;
        
        // Title starts with query gets high score
        if (normalizedTitle.startsWith(normalizedQuery)) return 80;
        
        // Words in title start with query
        const words = normalizedTitle.split(' ');
        const wordStartsWithQuery = words.some(word => word.startsWith(normalizedQuery));
        if (wordStartsWithQuery) return 60;
        
        // Title contains query as substring
        if (normalizedTitle.includes(normalizedQuery)) return 40;
        
        // For extremely popular content (high vote count), be more lenient with matching
        const isVeryPopular = item.vote_count > 10000 && item.popularity > 50;
        
        // Check for each word in the query (for multi-word searches like "breaking bad")
        if (normalizedQuery.includes(' ')) {
            const queryWords = normalizedQuery.split(' ').filter(w => w.length > 0);
            let matchCount = 0;
            
            for (const queryWord of queryWords) {
                if (queryWord.length < 2) continue; // Skip very short words
                
                if (normalizedTitle.includes(queryWord)) {
                    matchCount++;
                }
            }
            
            // If all significant query words are found in the title
            if (matchCount === queryWords.length) {
                // Higher score for very popular content
                return isVeryPopular ? 75 : 55;
            }
            
            // If at least half of the query words match
            if (matchCount >= queryWords.length / 2 && matchCount > 0) {
                return isVeryPopular ? 65 : 45;
            }
        }
        
        // Check for partial word matches (like "brea" matching "Breaking")
        for (const word of words) {
            let matchLength = 0;
            const minLength = Math.min(word.length, normalizedQuery.length);
            
            for (let i = 0; i < minLength; i++) {
                if (word[i] === normalizedQuery[i]) {
                    matchLength++;
                } else {
                    break;
                }
            }
            
            // Increase the threshold for popular content - require fewer matching characters
            const matchThreshold = isVeryPopular ? 1 : 2;
            
            if (matchLength >= matchThreshold) {
                const matchPercentage = matchLength / normalizedQuery.length;
                // Higher score for very popular content
                const baseScore = isVeryPopular ? 40 : 30;
                return Math.min(baseScore + (matchPercentage * 30), isVeryPopular ? 65 : 55);
            }
        }
        
        // Levenshtein-inspired approach for typos
        const maxDistance = Math.min(3, Math.floor(normalizedQuery.length / 2));
        let minDistance = Number.MAX_SAFE_INTEGER;
        
        for (const word of words) {
            if (Math.abs(word.length - normalizedQuery.length) <= maxDistance) {
                let distance = 0;
                for (let i = 0; i < Math.min(word.length, normalizedQuery.length); i++) {
                    if (word[i] !== normalizedQuery[i]) distance++;
                }
                minDistance = Math.min(minDistance, distance);
            }
        }
        
        if (minDistance <= maxDistance) {
            // Higher base score for very popular content
            return Math.max(isVeryPopular ? 20 : 10, 30 - (minDistance * 10));
        }
        
        // Special case for very popular content - give a minimum score
        // This ensures popular content stays somewhat relevant even with weak matches
        if (isVeryPopular && normalizedQuery.length >= 3) {
            return 5;
        }
        
        return 0;
    };
    
    // Sort results based on TMDB popularity, vote count, relevance, and language
    const sortTMDBResults = (results: TMDBSearchResultItem[], query: string) => {
        // First, precompute relevance scores to avoid recalculating
        const resultsWithScores = results.map(item => {
            return {
                ...item,
                _relevanceScore: getRelevanceScore(item, query),
                _isEnglish: item.original_language === 'en',
                _isVeryPopular: item.vote_count > 10000 && item.popularity > 50,
                _isPopular: item.vote_count > 3000 && item.popularity > 20,
                _title: item.media_type === 'movie' ? item.title : item.name
            };
        });
        
        const sortedResults = [...resultsWithScores].sort((a, b) => {
            // Special case: If one item is EXTREMELY popular (top-tier shows/movies)
            // and has at least some relevance, prioritize it
            if (a._isVeryPopular && !b._isVeryPopular && a._relevanceScore > 0) {
                return -1;
            }
            if (b._isVeryPopular && !a._isVeryPopular && b._relevanceScore > 0) {
                return 1;
            }
            
            // Strong relevance difference takes precedence (direct matches or strong partial matches)
            if (Math.abs(a._relevanceScore - b._relevanceScore) > 30) {
                return b._relevanceScore - a._relevanceScore;
            }
            
            // For moderately popular content with similar relevance
            if (a._isPopular && !b._isPopular && a._relevanceScore > 10) {
                return -1;
            }
            if (b._isPopular && !a._isPopular && b._relevanceScore > 10) {
                return 1;
            }
            
            // For similarly relevant items with some popularity
            if (a._relevanceScore > 0 && b._relevanceScore > 0) {
                // If relevance is close, check popularity
                if (Math.abs(a._relevanceScore - b._relevanceScore) <= 20) {
                    // If one is English and the other is not, prefer English
                    if (a._isEnglish && !b._isEnglish) return -1;
                    if (b._isEnglish && !a._isEnglish) return 1;
                    
                    // Check significant popularity difference
                    const popDiff = b.popularity - a.popularity;
                    const popThreshold = Math.max(a.popularity, b.popularity) * 0.3; // 30% difference
                    
                    if (Math.abs(popDiff) > popThreshold) {
                        return popDiff;
                    }
                    
                    // If popularity is similar, check vote count
                    const votesDiff = b.vote_count - a.vote_count;
                    const votesThreshold = Math.max(100, Math.max(a.vote_count, b.vote_count) * 0.3);
                    
                    if (Math.abs(votesDiff) > votesThreshold) {
                        return votesDiff;
                    }
                }
                
                // If all else is similar, return to relevance score
                return b._relevanceScore - a._relevanceScore;
            }
            
            // If only one has relevance, it wins
            if (a._relevanceScore > 0 && b._relevanceScore === 0) return -1;
            if (b._relevanceScore > 0 && a._relevanceScore === 0) return 1;
            
            // If neither has relevance, sort by popularity and then by English language
            if (a._relevanceScore === 0 && b._relevanceScore === 0) {
                if (a._isEnglish && !b._isEnglish) return -1;
                if (b._isEnglish && !a._isEnglish) return 1;
                
                return b.popularity - a.popularity;
            }
            
            // Fallback to simple alphabetical
            return a._title.localeCompare(b._title);
        });
        
        // Clean up internal properties before setting state
        setSearchResults(sortedResults.map(({_relevanceScore, _isEnglish, _isVeryPopular, _isPopular, _title, ...item}) => item));
    };

    // Updated hasNewEpisodes to use TMDB dates
    const hasNewEpisodes = (item: TMDBSearchResultItem): boolean => {
        if (item.media_type !== 'tv' || !item.first_air_date) return false;

        try {
            const firstAirDate = new Date(item.first_air_date);
            // Simple check: if first aired within last N days (e.g., 60)
            // A more robust check would involve fetching season details for last_air_date
            const daysSinceFirstAir = Math.floor((CURRENT_DATE.getTime() - firstAirDate.getTime()) / (1000 * 60 * 60 * 24));
            return daysSinceFirstAir <= 60; // Consider recent shows (e.g., within 60 days)
        } catch (e) {
            return false;
        }
    };

    const NoResultsView = () => (
        <View style={styles.noResults}>
            <Text style={styles.noResultsTitle}>Oh darn. We don't have that.</Text>
            <Text style={styles.noResultsSubtitle}>
                Try searching for another movie, show, actor, director, or genre.
            </Text>
        </View>
    );

    const TrendingContentList = () => {
        const renderTrendingItem = ({ item }: { item: TMDBSearchResultItem & { imdb_id?: string | null } }) => {
            const title = item.media_type === 'movie' ? item.title : item.name;
            const imageUrl = tmdbService.getImageUrl(item.poster_path, 'w185');
            
            // Determine content ID for navigation
            let contentId;
            if (item.imdb_id) {
                contentId = item.media_type === 'movie' 
                    ? item.imdb_id 
                    : `series:${item.imdb_id}`;
            } else {
                contentId = `tmdb:${item.id}`;
            }
            
            return (
                <TouchableOpacity
                    style={styles.trendingItem}
                    onPress={() => router.push(`/movie/${encodeURIComponent(contentId)}?tmdbId=${item.id}&mediaType=${item.media_type}`)}
                >
                    <Image
                        source={{ uri: imageUrl || 'https://via.placeholder.com/185x278?text=Not+Found' }}
                        style={styles.trendingItemImage}
                    />
                    <View style={styles.trendingItemInfo}>
                        <Text style={styles.trendingItemTitle} numberOfLines={1}>{title}</Text>
                        {item.media_type === 'tv' && item.first_air_date && (
                            <Text style={styles.trendingItemDetail}>
                                {new Date(item.first_air_date).getFullYear()}
                            </Text>
                        )}
                        {item.media_type === 'movie' && item.release_date && (
                            <Text style={styles.trendingItemDetail}>
                                {new Date(item.release_date).getFullYear()}
                            </Text>
                        )}
                    </View>
                    <TouchableOpacity 
                        style={styles.playButton}
                        onPress={() => router.push(`/movie/${encodeURIComponent(contentId)}?tmdbId=${item.id}&mediaType=${item.media_type}`)}
                    >
                        <Ionicons name="play-circle-outline" size={36} color="white" />
                    </TouchableOpacity>
                </TouchableOpacity>
            );
        };

        if (isTrendingLoading) {
            return (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#fff" />
                </View>
            );
        }

        return (
            <View style={styles.trendingContainer}>
                <Text style={styles.categoryTitle}>Movies & TV</Text>
                <FlatList
                    data={trendingContent}
                    renderItem={renderTrendingItem}
                    keyExtractor={(item) => `trending-${item.media_type}-${item.id}`}
                    contentContainerStyle={styles.trendingList}
                />
            </View>
        );
    };

    const renderItem = ({ item, index }: { item: TMDBSearchResultItem & { imdb_id?: string | null }, index: number }) => {
        const title = item.media_type === 'movie' ? item.title : item.name;
        const imageUrl = tmdbService.getImageUrl(item.poster_path, 'w300');
        
        // Use IMDb ID if available (compatible with Cinemata), otherwise fall back to TMDB ID format
        let contentId;
        if (item.imdb_id) {
            // Use the actual IMDb ID for addons like Cinemata
            contentId = item.media_type === 'movie' 
                ? item.imdb_id  // Movie format, just the IMDb ID (e.g., "tt1234567")
                : `series:${item.imdb_id}`; // Series format with prefix (e.g., "series:tt1234567")
        } else {
            // No IMDb ID available, use TMDB ID as fallback with correct format
            contentId = item.media_type === 'movie' 
                ? `tmdb:${item.id}` // Movie format with tmdb prefix
                : `tmdb:${item.id}`; // Series format with tmdb prefix
        }
        
        console.log(`Navigation for ${title}: Using ID ${contentId} (IMDb: ${item.imdb_id}, TMDB: ${item.id})`);
        
        return (
            <TouchableOpacity
                key={`${item.media_type}-${index}-${item.id}`}
                style={styles.card}
                // Navigate using the contentId that works with addons
                onPress={() => router.push(`/movie/${encodeURIComponent(contentId)}?tmdbId=${item.id}&mediaType=${item.media_type}`)}
            >
                <Image
                    source={{ uri: imageUrl || 'https://via.placeholder.com/300x450?text=Not+Found' }}
                    style={styles.cardImage}
                />
                {item.vote_average >= 8 && item.vote_count > 1000 && (
                     <View style={styles.topTenBadge}>
                         <Text style={styles.topTenText}>TOP 10</Text>
                     </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="white" />
                </TouchableOpacity>
                <View style={styles.searchInputContainer}>
                    <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                    <TextInput
                        ref={inputRef}
                        style={styles.searchInput}
                        placeholder="Search movies, TV shows..."
                        placeholderTextColor="#6b6b6b"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={20} color="#666" />
                        </TouchableOpacity>
                    )}
                </View>
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.cancelButton}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                )}
            </View>

            {isLoading ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#fff" />
                </View>
            ) : searchQuery.trim() !== '' && searchResults.length === 0 ? (
                <NoResultsView />
            ) : searchQuery.trim() === '' ? (
                <TrendingContentList />
            ) : (
                <View style={styles.content}>
                    <View style={styles.categoryHeader}>
                        <Text style={styles.categoryTitle}>Movies & TV</Text>
                    </View>
                    <FlatList
                        data={searchResults}
                        renderItem={renderItem}
                        keyExtractor={(item) => `${item.media_type}-${item.id}`}
                        numColumns={NUM_COLUMNS}
                        contentContainerStyle={styles.gridContainer}
                        columnWrapperStyle={styles.columnWrapper}
                    />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 50,
        paddingHorizontal: 16,
        paddingBottom: 10,
    },
    backButton: {
        marginRight: 12,
    },
    searchInputContainer: {
        flex: 1,
        height: 36,
        backgroundColor: '#212121',
        borderRadius: 4,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        color: 'white',
        fontSize: 16,
    },
    cancelButton: {
        marginLeft: 12,
    },
    cancelText: {
        color: 'white',
        fontSize: 16,
    },
    content: {
        flex: 1,
    },
    categoryHeader: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 0.5,
        borderBottomColor: '#333',
    },
    categoryTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    gridContainer: {
        padding: 8,
    },
    columnWrapper: {
        justifyContent: 'space-between',
        paddingHorizontal: 8,
    },
    card: {
        width: CARD_WIDTH,
        marginBottom: 16,
        position: 'relative',
    },
    cardImage: {
        width: CARD_WIDTH,
        height: CARD_WIDTH * 1.5,
        borderRadius: 4,
        backgroundColor: '#333',
    },
    newEpisodesBadge: {
        position: 'absolute',
        bottom: 8,
        left: 0,
        backgroundColor: '#E50914',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 2,
    },
    newEpisodesText: {
        color: 'white',
        fontSize: 9,
        fontWeight: 'bold',
    },
    topTenBadge: {
        position: 'absolute',
        top: 6,
        right: 6,
        backgroundColor: 'rgba(229, 9, 20, 0.8)',
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 3,
    },
    topTenText: {
        color: 'white',
        fontSize: 9,
        fontWeight: 'bold',
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    noResults: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 80,
    },
    noResultsTitle: {
        color: 'white',
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 8,
    },
    noResultsSubtitle: {
        color: '#6b6b6b',
        fontSize: 18,
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    // Trending content styles
    trendingContainer: {
        flex: 1,
        paddingTop: 10,
    },
    trendingList: {
        paddingBottom: 20,
    },
    trendingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderBottomWidth: 0.5,
        borderBottomColor: '#333',
    },
    trendingItemImage: {
        width: 56,
        height: 80,
        borderRadius: 4,
        backgroundColor: '#333',
    },
    trendingItemInfo: {
        flex: 1,
        marginLeft: 12,
    },
    trendingItemTitle: {
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 4,
    },
    trendingItemDetail: {
        color: '#aaa',
        fontSize: 14,
    },
    playButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
