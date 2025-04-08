import axios from 'axios';

// TMDB API configuration
const API_KEY = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0MzljNDc4YTc3MWYzNWMwNTAyMmY5ZmVhYmNjYTAxYyIsIm5iZiI6MTcwOTkxMTEzNS4xNCwic3ViIjoiNjVlYjJjNWYzODlkYTEwMTYyZDgyOWU0Iiwic2NvcGVzIjpbImFwaV9yZWFkIl0sInZlcnNpb24iOjF9.gosBVl1wYUbePOeB9WieHn8bY9x938-GSGmlXZK_UVM';
const BASE_URL = 'https://api.themoviedb.org/3';

// --- TMDB API Response Types ---

export interface TMDBMovieSearchResult {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  release_date: string;
  popularity: number;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  original_language: string;
  media_type?: 'movie'; // Optional: Useful when combining results
}

export interface TMDBTVSearchResult {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  first_air_date: string;
  popularity: number;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  origin_country: string[];
  original_language: string;
  media_type?: 'tv'; // Optional: Useful when combining results
}

// Combined type for search results
export type TMDBSearchResultItem = (TMDBMovieSearchResult & { media_type: 'movie' }) | (TMDBTVSearchResult & { media_type: 'tv' });

// Types for TMDB responses
export interface TMDBEpisode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  air_date: string;
  vote_average: number;
  runtime?: number;
  imdb_id?: string;
  imdb_rating?: number;
  season_poster_path?: string | null;
}

export interface TMDBSeason {
  id: number;
  name: string;
  overview: string;
  season_number: number;
  episodes: TMDBEpisode[];
  poster_path: string | null;
  air_date: string;
}

export interface TMDBShow {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  last_air_date: string;
  number_of_seasons: number;
  number_of_episodes: number;
  episode_run_time: number[];
  seasons: {
    id: number;
    name: string;
    season_number: number;
    episode_count: number;
    poster_path: string | null;
    air_date: string;
  }[];
}

export interface TMDBGenre {
    id: number;
    name: string;
}

export interface TMDBPerson {
  id: number;
  name: string;
  character?: string;
  profile_path: string | null;
  order: number;
  job?: string;
  known_for_department?: string;
  department?: string;
  total_episode_count?: number; // Add this field for TV shows
}

export interface TMDBCredits {
  cast: TMDBPerson[];
  crew: TMDBPerson[];
}

export class TMDBService {
  private static instance: TMDBService;
  private static ratingCache: Map<string, number | null> = new Map();

  private constructor() {}

  static getInstance(): TMDBService {
    if (!TMDBService.instance) {
      TMDBService.instance = new TMDBService();
    }
    return TMDBService.instance;
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    };
  }

  private generateRatingCacheKey(showName: string, seasonNumber: number, episodeNumber: number): string {
    return `${showName.toLowerCase()}_s${seasonNumber}_e${episodeNumber}`;
  }

  /**
   * Search for a TV show by name
   */
  async searchTVShow(query: string): Promise<TMDBTVSearchResult[]> {
    try {
      const response = await axios.get<{ results: TMDBTVSearchResult[] }>(`${BASE_URL}/search/tv`, {
        headers: this.getHeaders(),
        params: {
          query,
          include_adult: false,
          language: 'en-US',
          page: 1,
        },
      });
      // Add media_type for easier handling later
      return response.data.results.map(item => ({ ...item, media_type: 'tv' })) || [];
    } catch (error) {
      console.error('Failed to search TV show:', error);
      return [];
    }
  }

  /**
   * Get TV show details by TMDB ID
   */
  async getTVShowDetails(tmdbId: number): Promise<TMDBShow | null> {
    try {
      const response = await axios.get(`${BASE_URL}/tv/${tmdbId}`, {
        headers: this.getHeaders(),
        params: {
          language: 'en-US',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get TV show details:', error);
      return null;
    }
  }

  /**
   * Get external IDs for an episode (including IMDb ID)
   */
  async getEpisodeExternalIds(
    tmdbId: number,
    seasonNumber: number,
    episodeNumber: number
  ): Promise<{ imdb_id: string | null } | null> {
    try {
      const response = await axios.get(
        `${BASE_URL}/tv/${tmdbId}/season/${seasonNumber}/episode/${episodeNumber}/external_ids`,
        {
          headers: this.getHeaders(),
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get episode external IDs:', error);
      return null;
    }
  }

  /**
   * Get IMDb rating for an episode using OMDB API with caching
   */
  async getIMDbRating(showName: string, seasonNumber: number, episodeNumber: number): Promise<number | null> {
    const cacheKey = this.generateRatingCacheKey(showName, seasonNumber, episodeNumber);
    
    // Check cache first
    if (TMDBService.ratingCache.has(cacheKey)) {
      return TMDBService.ratingCache.get(cacheKey) ?? null;
    }

    try {
      const OMDB_API_KEY = '20e793df';
      const response = await axios.get(`http://www.omdbapi.com/`, {
        params: {
          apikey: OMDB_API_KEY,
          t: showName,
          Season: seasonNumber,
          Episode: episodeNumber
        }
      });
      
      let rating: number | null = null;
      if (response.data && response.data.imdbRating && response.data.imdbRating !== 'N/A') {
        rating = parseFloat(response.data.imdbRating);
      }

      // Store in cache
      TMDBService.ratingCache.set(cacheKey, rating);
      return rating;
    } catch (error) {
      console.error('Failed to get IMDb rating:', error);
      // Cache the failed result too to prevent repeated failed requests
      TMDBService.ratingCache.set(cacheKey, null);
      return null;
    }
  }

  /**
   * Get season details including all episodes with IMDb ratings
   */
  async getSeasonDetails(tmdbId: number, seasonNumber: number, showName?: string): Promise<TMDBSeason | null> {
    try {
      const response = await axios.get(`${BASE_URL}/tv/${tmdbId}/season/${seasonNumber}`, {
        headers: this.getHeaders(),
        params: {
          language: 'en-US',
        },
      });

      const season = response.data;

      // If show name is provided, fetch IMDb ratings for each episode in batches
      if (showName) {
        // Process episodes in batches of 5 to avoid rate limiting
        const batchSize = 5;
        const episodes = [...season.episodes];
        const episodesWithRatings = [];

        for (let i = 0; i < episodes.length; i += batchSize) {
          const batch = episodes.slice(i, i + batchSize);
          const batchPromises = batch.map(async (episode: TMDBEpisode) => {
            const imdbRating = await this.getIMDbRating(
              showName,
              episode.season_number,
              episode.episode_number
            );

            return {
              ...episode,
              imdb_rating: imdbRating
            };
          });

          const batchResults = await Promise.all(batchPromises);
          episodesWithRatings.push(...batchResults);
        }

        return {
          ...season,
          episodes: episodesWithRatings,
        };
      }

      return season;
    } catch (error) {
      console.error('Failed to get season details:', error);
      return null;
    }
  }

  /**
   * Get episode details
   */
  async getEpisodeDetails(
    tmdbId: number,
    seasonNumber: number,
    episodeNumber: number
  ): Promise<TMDBEpisode | null> {
    try {
      const response = await axios.get(
        `${BASE_URL}/tv/${tmdbId}/season/${seasonNumber}/episode/${episodeNumber}`,
        {
          headers: this.getHeaders(),
          params: {
            language: 'en-US',
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get episode details:', error);
      return null;
    }
  }

  /**
   * Extract TMDB ID from Stremio ID
   * Stremio IDs for series are typically in the format: tt1234567:1:1 (imdbId:season:episode)
   * or just tt1234567 for the series itself
   */
  extractTMDBIdFromStremioId(stremioId: string): number | null {
    // For now, we'll need to search by name since we don't have direct TMDB IDs
    // In a real implementation, you might want to use an external service to convert IMDB to TMDB IDs
    return null;
  }

  /**
   * Find TMDB ID by IMDb ID
   */
  async findTMDBIdByIMDbId(imdbId: string, type: 'movie' | 'series'): Promise<number | null> {
    try {
      const response = await axios.get(`${BASE_URL}/find/${imdbId}`, {
        headers: this.getHeaders(),
        params: {
          external_source: 'imdb_id',
          language: 'en-US',
        },
      });

      // Check both movie and TV results
      const movieResults = response.data.movie_results || [];
      const tvResults = response.data.tv_results || [];

      if (type === 'movie' && movieResults.length > 0) {
        return movieResults[0].id;
      } else if (type === 'series' && tvResults.length > 0) {
        return tvResults[0].id;
      }

      // If no results found for the specified type, try the other type
      if (type === 'movie' && tvResults.length > 0) {
        return tvResults[0].id;
      } else if (type === 'series' && movieResults.length > 0) {
        return movieResults[0].id;
      }

      return null;
    } catch (error) {
      console.error('Failed to find TMDB ID by IMDb ID:', error);
      return null;
    }
  }

  /**
   * Get image URL for TMDB images
   */
  getImageUrl(path: string | null, size: 'original' | 'w500' | 'w300' | 'w185' | 'profile' = 'original'): string | null {
    if (!path) return null;
    return `https://image.tmdb.org/t/p/${size}${path}`;
  }

  /**
   * Get all episodes for a TV show
   */
  async getAllEpisodes(tmdbId: number): Promise<{ [seasonNumber: number]: TMDBEpisode[] }> {
    try {
      // First get the show details to know how many seasons there are
      const showDetails = await this.getTVShowDetails(tmdbId);
      if (!showDetails) return {};

      const allEpisodes: { [seasonNumber: number]: TMDBEpisode[] } = {};
      
      // Get episodes for each season (in parallel)
      const seasonPromises = showDetails.seasons
        .filter(season => season.season_number > 0) // Filter out specials (season 0)
        .map(async season => {
          const seasonDetails = await this.getSeasonDetails(tmdbId, season.season_number);
          if (seasonDetails && seasonDetails.episodes) {
            allEpisodes[season.season_number] = seasonDetails.episodes;
          }
        });
      
      await Promise.all(seasonPromises);
      return allEpisodes;
    } catch (error) {
      console.error('Failed to get all episodes:', error);
      return {};
    }
  }

  /**
   * Get episode image URL with fallbacks
   */
  getEpisodeImageUrl(episode: TMDBEpisode, show: TMDBShow | null = null, size: 'original' | 'w500' | 'w300' | 'w185' = 'w300'): string | null {
    // Try episode still image first
    if (episode.still_path) {
      return this.getImageUrl(episode.still_path, size);
    }
    
    // Try season poster as fallback
    if (show && show.seasons) {
      const season = show.seasons.find(s => s.season_number === episode.season_number);
      if (season && season.poster_path) {
        return this.getImageUrl(season.poster_path, size);
      }
    }
    
    // Use show poster as last resort
    if (show && show.poster_path) {
      return this.getImageUrl(show.poster_path, size);
    }
    
    return null;
  }

  /**
   * Convert TMDB air date to a more readable format
   */
  formatAirDate(airDate: string | null): string {
    if (!airDate) return 'Unknown';
    
    try {
      const date = new Date(airDate);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return airDate;
    }
  }

  async getCredits(tmdbId: number, type: string): Promise<TMDBCredits> {
    try {
      const response = await axios.get(`${BASE_URL}/${type === 'series' ? 'tv' : 'movie'}/${tmdbId}/credits`, {
        headers: this.getHeaders(),
        params: {
          language: 'en-US',
        },
      });
      
      // For TV shows, sort by total_episode_count first, then by order
      // For movies, just sort by order
      const sortedCast = (response.data.cast || [])
        .sort((a: TMDBPerson, b: TMDBPerson) => {
          if (type === 'series') {
            // For TV shows, prioritize actors with more episodes
            const aEpisodes = a.total_episode_count || 0;
            const bEpisodes = b.total_episode_count || 0;
            if (aEpisodes !== bEpisodes) {
              return bEpisodes - aEpisodes;
            }
          }
          // Fall back to order for movies or when episode counts are equal
          return a.order - b.order;
        })
        .slice(0, 8); // Get top 8 cast members
      
      return {
        cast: sortedCast,
        crew: response.data.crew || []
      };
    } catch (error) {
      console.error('Failed to fetch credits:', error);
      return { cast: [], crew: [] };
    }
  }

  async getPersonDetails(personId: number) {
    try {
      const response = await axios.get(`${BASE_URL}/person/${personId}`, {
        headers: this.getHeaders(),
        params: {
          language: 'en-US',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch person details:', error);
      return null;
    }
  }

  /**
   * Get external IDs for a TV show (including IMDb ID)
   */
  async getShowExternalIds(tmdbId: number): Promise<{ imdb_id: string | null } | null> {
    try {
      const response = await axios.get(
        `${BASE_URL}/tv/${tmdbId}/external_ids`,
        {
          headers: this.getHeaders(),
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get show external IDs:', error);
      return null;
    }
  }

  /**
   * Get external IDs for a movie (including IMDb ID)
   */
  async getMovieExternalIds(tmdbId: number): Promise<{ imdb_id: string | null } | null> {
    try {
      const response = await axios.get(
        `${BASE_URL}/movie/${tmdbId}/external_ids`,
        {
          headers: this.getHeaders(),
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get movie external IDs:', error);
      return null;
    }
  }

  /**
   * Get external IDs for either a movie or TV show
   */
  async getExternalIds(tmdbId: number, type: 'movie' | 'tv'): Promise<{ imdb_id: string | null } | null> {
    if (type === 'movie') {
      return this.getMovieExternalIds(tmdbId);
    } else {
      return this.getShowExternalIds(tmdbId);
    }
  }

  /**
   * Get crew information for a movie
   */
  async getMovieCrew(tmdbId: number) {
    try {
      const response = await axios.get(`${BASE_URL}/movie/${tmdbId}/credits`, {
        headers: this.getHeaders(),
        params: {
          language: 'en-US',
        },
      });
      return response.data.crew || [];
    } catch (error) {
      console.error('Failed to fetch movie crew:', error);
      return [];
    }
  }

  /**
   * Get TV show credits including cast and crew
   */
  async getTVCredits(tmdbId: number) {
    try {
      const response = await axios.get(`${BASE_URL}/tv/${tmdbId}/credits`, {
        headers: this.getHeaders(),
        params: {
          language: 'en-US',
        },
      });
      return {
        cast: response.data.cast || [],
        crew: response.data.crew || []
      };
    } catch (error) {
      console.error('Failed to fetch TV credits:', error);
      return { cast: [], crew: [] };
    }
  }

  /**
   * Search for a movie by title
   */
  async searchMovie(query: string, year?: number): Promise<TMDBMovieSearchResult[]> {
    try {
      const params: any = {
        query,
        include_adult: false,
        language: 'en-US',
        page: 1,
      };
      
      if (year) {
        params.primary_release_year = year; // Use primary_release_year for TMDB
      }
      
      const response = await axios.get<{ results: TMDBMovieSearchResult[] }>(`${BASE_URL}/search/movie`, {
        headers: this.getHeaders(),
        params
      });
      
      // Add media_type for easier handling later
      return response.data.results.map(item => ({ ...item, media_type: 'movie' })) || [];
    } catch (error) {
      console.error('Failed to search movie:', error);
      return [];
    }
  }
    
    /**
     * Get movie details by TMDB ID
     */
    async getMovieDetails(tmdbId: number): Promise<any | null> { // Using 'any' for now, define a proper type later if needed
      try {
        const response = await axios.get(`${BASE_URL}/movie/${tmdbId}`, {
          headers: this.getHeaders(),
          params: {
            language: 'en-US',
          },
        });
        return response.data;
      } catch (error) {
        console.error('Failed to get movie details:', error);
        return null;
      }
    }

  async getSimilar(id: number, type: 'movie' | 'tv'): Promise<any[]> {
    try {
      const response = await axios.get(
        `${BASE_URL}/${type}/${id}/similar`,
        {
          headers: this.getHeaders(),
          params: {
            language: 'en-US',
            page: 1
          }
        }
      );
      return response.data.results.map((item: any) => ({
        id: item.id,
        title: item.title || item.name,
        poster_path: this.getImageUrl(item.poster_path, 'w500'),
        release_date: item.release_date || item.first_air_date,
        vote_average: item.vote_average,
      }));
    } catch (error) {
      console.error('Error fetching similar content:', error);
      return [];
    }
  }

  async getCollection(movieId: number): Promise<any[]> {
    try {
      // First get the movie details to get the collection ID
      const movieResponse = await axios.get(
        `${BASE_URL}/movie/${movieId}`,
        {
          headers: this.getHeaders(),
          params: {
            language: 'en-US'
          }
        }
      );

      if (!movieResponse.data.belongs_to_collection) {
        return [];
      }

      const collectionId = movieResponse.data.belongs_to_collection.id;
      const response = await axios.get(
        `${BASE_URL}/collection/${collectionId}`,
        {
          headers: this.getHeaders(),
          params: {
            language: 'en-US'
          }
        }
      );

      return response.data.parts.map((item: any) => ({
        id: item.id,
        title: item.title,
        poster_path: this.getImageUrl(item.poster_path, 'w500'),
        release_date: item.release_date,
        vote_average: item.vote_average,
      }));
    } catch (error) {
      console.error('Error fetching collection:', error);
      return [];
    }
  }

  async getVideos(id: number, type: 'movie' | 'tv'): Promise<any[]> {
    try {
      const response = await axios.get(
        `${BASE_URL}/${type}/${id}/videos`,
        {
          headers: this.getHeaders(),
          params: {
            language: 'en-US'
          }
        }
      );
      return response.data.results.map((item: { // Add explicit type for item
          id: string;
          key: string;
          name: string;
          site: string;
          type: string;
      }) => ({
        id: item.id,
        name: item.name,
        key: item.key,
        site: item.site,
        type: item.type,
        thumbnail: item.site === 'YouTube'
          ? `https://img.youtube.com/vi/${item.key}/maxresdefault.jpg`
          : null,
        duration: 'N/A', // YouTube API would be needed for actual duration
      })).filter((item: { thumbnail: string | null }) => item.thumbnail !== null); // Add explicit type for item in filter
    } catch (error) {
      console.error('Error fetching videos:', error);
      return [];
    }
  }

  /**
   * Get trending content for the week
   */
  async getTrending(type: 'movie' | 'tv', timeWindow: 'day' | 'week' = 'week'): Promise<TMDBSearchResultItem[]> {
    try {
      const response = await axios.get<{ results: (TMDBMovieSearchResult | TMDBTVSearchResult)[] }>(`${BASE_URL}/trending/${type}/${timeWindow}`, {
        headers: this.getHeaders(),
        params: {
          language: 'en-US',
          page: 1,
        },
      });
      // Ensure media_type is correctly set based on the input type
      return response.data.results.map(item => {
        if (type === 'movie') {
          // Explicitly type the item as a movie result
          return { ...(item as TMDBMovieSearchResult), media_type: 'movie' };
        } else {
          // Explicitly type the item as a TV result
          return { ...(item as TMDBTVSearchResult), media_type: 'tv' };
        }
      }) || [];
    } catch (error) {
      console.error(`Failed to get trending ${type}:`, error);
      return [];
    }
  }

  async getGenres(type: 'movie' | 'tv'): Promise<TMDBGenre[]> {
    try {
      const response = await axios.get(`${BASE_URL}/genre/${type}/list`, {
        headers: this.getHeaders(),
        params: {
          language: 'en-US'
        }
      });
      return response.data.genres || [];
    } catch (error) {
      console.error('Failed to fetch genres:', error);
      return [];
    }
  }

  /**
   * Get upcoming movies with accurate dates
   */
  async getUpcomingMovies(): Promise<TMDBMovieSearchResult[]> {
    try {
      const response = await axios.get<{ results: TMDBMovieSearchResult[] }>(`${BASE_URL}/movie/upcoming`, {
        headers: this.getHeaders(),
        params: {
          language: 'en-US',
          page: 1,
          region: 'US',
          'primary_release_date.gte': new Date().toISOString().split('T')[0], // Only future dates
          sort_by: 'primary_release_date.asc' // Sort by release date
        },
      });
      
      // Filter out any movies with release dates in the past
      const currentDate = new Date();
      const upcomingMovies = response.data.results.filter(movie => {
        if (!movie.release_date) return false;
        const releaseDate = new Date(movie.release_date);
        return releaseDate >= currentDate;
      });
      
      return upcomingMovies.map(item => ({ ...item, media_type: 'movie' })) || [];
    } catch (error) {
      console.error('Failed to get upcoming movies:', error);
      return [];
    }
  }

  /**
   * Get upcoming TV show episodes
   */
  async getUpcomingTVEpisodes(): Promise<TMDBTVSearchResult[]> {
    try {
      const response = await axios.get<{ results: TMDBTVSearchResult[] }>(`${BASE_URL}/tv/on_the_air`, {
        headers: this.getHeaders(),
        params: {
          language: 'en-US',
          page: 1,
          'air_date.gte': new Date().toISOString().split('T')[0], // Only future dates
          sort_by: 'first_air_date.asc' // Sort by air date
        },
      });
      
      // Filter out any shows with air dates in the past
      const currentDate = new Date();
      const upcomingShows = response.data.results.filter(show => {
        if (!show.first_air_date) return false;
        const airDate = new Date(show.first_air_date);
        return airDate >= currentDate;
      });
      
      return upcomingShows.map(item => ({ ...item, media_type: 'tv' })) || [];
    } catch (error) {
      console.error('Failed to get upcoming TV episodes:', error);
      return [];
    }
  }

  /**
   * Get popular TV shows with recent episodes
   */
  async getPopularTVShows(): Promise<TMDBTVSearchResult[]> {
    try {
      const response = await axios.get<{ results: TMDBTVSearchResult[] }>(`${BASE_URL}/tv/popular`, {
        headers: this.getHeaders(),
        params: {
          language: 'en-US',
          page: 1,
          'first_air_date.gte': new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 30 days
          sort_by: 'popularity.desc'
        },
      });
      
      return response.data.results.map(item => ({ ...item, media_type: 'tv' })) || [];
    } catch (error) {
      console.error('Failed to get popular TV shows:', error);
      return [];
    }
  }

  /**
   * Get top rated TV shows with recent episodes
   */
  async getTopRatedTVShows(): Promise<TMDBTVSearchResult[]> {
    try {
      const response = await axios.get<{ results: TMDBTVSearchResult[] }>(`${BASE_URL}/tv/top_rated`, {
        headers: this.getHeaders(),
        params: {
          language: 'en-US',
          page: 1,
          'first_air_date.gte': new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 90 days
          sort_by: 'vote_average.desc'
        },
      });
      
      return response.data.results.map(item => ({ ...item, media_type: 'tv' })) || [];
    } catch (error) {
      console.error('Failed to get top rated TV shows:', error);
      return [];
    }
  }

  /**
   * Get top rated movies with recent releases
   */
  async getTopRatedMovies(): Promise<TMDBMovieSearchResult[]> {
    try {
      const response = await axios.get<{ results: TMDBMovieSearchResult[] }>(`${BASE_URL}/movie/top_rated`, {
        headers: this.getHeaders(),
        params: {
          language: 'en-US',
          page: 1,
          'primary_release_date.gte': new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 90 days
          sort_by: 'vote_average.desc'
        },
      });
      
      return response.data.results.map(item => ({ ...item, media_type: 'movie' })) || [];
    } catch (error) {
      console.error('Failed to get top rated movies:', error);
      return [];
    }
  }
}

export const tmdbService = TMDBService.getInstance();
export default tmdbService; 