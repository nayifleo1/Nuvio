import React, { useEffect, useState, memo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
    FadeIn, 
    FadeOut,
    withTiming, 
    useAnimatedStyle, 
    withSequence,
    cancelAnimation,
    runOnJS,
    useSharedValue
} from 'react-native-reanimated';
import { styles } from '@/styles';
import { FeaturedMovie } from '@/types/movie';
import { useRouter } from 'expo-router';
import { TMDBService, TMDBMovieSearchResult, TMDBTVSearchResult, TMDBGenre } from '@/services/tmdbService';
import { Image as ExpoImage } from 'expo-image';

interface FeaturedContentProps {
    imageStyle: any;
    categoriesStyle: any;
    buttonsStyle: any;
    topMargin: number;
    movie: FeaturedMovie;
}

const AnimatedExpoImage = Animated.createAnimatedComponent(ExpoImage);

export const FeaturedContent = memo(({
    imageStyle,
    categoriesStyle,
    buttonsStyle,
    topMargin,
    movie
}: FeaturedContentProps) => {
    const router = useRouter();
    const [currentMovie, setCurrentMovie] = useState(movie);
    const fadeAnim = useSharedValue(1);

    useEffect(() => {
        // Cleanup animations when component unmounts
        return () => {
            cancelAnimation(fadeAnim);
        };
    }, []);

    const handlePlayPress = () => {
        if (!currentMovie) return;
        
        router.push({
            pathname: `/movie/[id]`,
            params: {
                id: currentMovie.id,
                title: currentMovie.title,
                thumbnail: currentMovie.thumbnail
            }
        });
    };

    return (
        <View style={[styles.featuredContent, { marginTop: topMargin }]}>
            <View style={styles.featuredWrapper}>
                <View style={styles.featuredImageContainer}>
                    <AnimatedExpoImage
                        key={currentMovie.id}
                        source={{ uri: currentMovie.thumbnail }}
                        style={[styles.featuredImage, imageStyle]}
                        entering={FadeIn.duration(500)}
                        exiting={FadeOut.duration(500)}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={300}
                    />
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.8)']}
                        style={styles.featuredGradient}
                    />
                    {currentMovie.logo ? (
                        <AnimatedExpoImage 
                            key={`${currentMovie.id}-logo`}
                            source={{ uri: currentMovie.logo }} 
                            style={styles.featuredLogo}
                            entering={FadeIn.duration(500).delay(300)}
                            exiting={FadeOut.duration(500)}
                            contentFit="contain"
                            cachePolicy="memory-disk"
                            transition={300}
                        />
                    ) : (
                        <Animated.View 
                            key={`${currentMovie.id}-title`}
                            style={styles.featuredTitleContainer}
                            entering={FadeIn.duration(500).delay(300)}
                            exiting={FadeOut.duration(500)}
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
}); 