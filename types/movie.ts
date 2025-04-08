export interface Movie {
    id: string;
    title: string;
    imageUrl: string;
    videoUrl?: string;
    year?: string;
    duration?: string;
    rating?: string;
    description?: string;
    cast?: string[];
    director?: string;
    ranking_text?: string;
    backdropUrl?: string;
    tmdbId?: number;
    type?: 'movie' | 'series';
    // TV show specific fields
    seasons?: number;
    episodes?: number;
    currentSeason?: number;
    currentEpisode?: number;
    episodeTitle?: string;
    episodeDescription?: string;
    episodeRuntime?: string;
    episodeAirDate?: string;
    episodeRating?: string;
}

export interface MovieRow {
    rowTitle: string;
    movies: Movie[];
    type?: 'normal' | 'top_10' | 'games';
}

export interface MoviesData {
    movies: MovieRow[];
}

export interface FeaturedMovie {
    id: string;
    title: string;
    thumbnail: string;
    categories: string[];
    logo?: string;
}

export type DeviceMotionData = {
    rotation: {
        alpha: number;
        beta: number;
        gamma: number;
    };
};

export interface MovieData {
    id: string;
    title: string;
    imageUrl: string;
    backdropUrl?: string;
    year: string;
    duration: string;
    rating: string;
    description: string;
    cast: string[];
    director: string;
    ranking_text: string;
    tmdbId?: number;
    type: 'movie' | 'series';
    seasons?: number;
    episodes?: number;
    currentSeason?: number;
    currentEpisode?: number;
    episodeTitle?: string;
    episodeDescription?: string;
    episodeRuntime?: string;
    episodeAirDate?: string;
    episodeRating?: string;
} 