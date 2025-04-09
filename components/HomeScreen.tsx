import React, { memo, useCallback, useState } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { styles } from '@/styles';
import { Movie, MovieRow } from '@/types/movie';
import Svg, { Path } from 'react-native-svg';
import { useVisionOS } from '@/hooks/useVisionOS';
import { HoverableView } from '@/components/ui/VisionContainer';

const NumberBackground = memo(({ number }: { number: number }) => {
    const num = (number).toString().padStart(2, '0');

    return (
        <View style={styles.numberContainer}>
            <Text style={[styles.numberText, {
                color: 'white',
                opacity: 0.15,
                fontSize: 200,
                fontFamily: 'arialic',
            }]}>{num}</Text>
        </View>
    );
});

// Custom placeholder component for better performance
const ImagePlaceholder = memo(() => (
    <View style={posterStyles.placeholder} />
));

// Progressive image component
const ProgressiveImage = memo(({ uri, style }: { uri: string, style: any }) => {
    const [imageLoaded, setImageLoaded] = useState(false);

    return (
        <View style={style}>
            {!imageLoaded && <ImagePlaceholder />}
            <ExpoImage 
                source={{ uri }}
                style={[style, imageLoaded ? null : { opacity: 0 }]}
                onLoad={() => setImageLoaded(true)}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
            />
        </View>
    );
});

const MovieItem = memo(({ item, router, index, isTop10 }: {
    item: Movie;
    router: any;
    index: number;
    isTop10: boolean;
}) => {
    const handlePress = useCallback(() => {
        router.push({
            pathname: '/movie/[id]',
            params: { id: item.id }
        });
    }, [router, item.id]);

    return (
        <Pressable
            onPress={handlePress}
            style={[
                styles.contentItem,
                isTop10 && styles.top10Item,
                { marginHorizontal: 1 }
            ]}
        >
            {isTop10 && <NumberBackground number={index + 1} />}
            <ProgressiveImage
                uri={item.imageUrl}
                style={[
                    styles.thumbnail,
                    isTop10 && styles.top10Thumbnail
                ]}
            />
        </Pressable>
    );
});

const ItemSeparator = memo(() => <View style={{ width: 8 }} />);

// Custom styles for placeholders
const posterStyles = StyleSheet.create({
    placeholder: {
        width: '100%',
        height: '100%',
        backgroundColor: '#1a1a1a',
        borderRadius: 6,
    }
});

export const HomeScreen = memo(({ rowTitle, movies, type }: MovieRow) => {
    const router = useRouter();
    const isTop10 = type === 'top_10';
    const { isVisionOS } = useVisionOS();
    const [viewableItems, setViewableItems] = useState<number[]>([]);

    const renderItem = useCallback(({ item, index }: { item: Movie; index: number }) => (
        <HoverableView style={{}}>
            <MovieItem
                item={item}
                router={router}
                index={index}
                isTop10={isTop10}
            />
        </HoverableView>
    ), [router, isTop10]);

    const keyExtractor = useCallback((item: Movie) => item.id, []);

    // Create a container style based on platform
    const containerStyle = [
        styles.container,
        { marginBottom: 5 }
    ];

    return (
        <View style={containerStyle}>
            <Text style={styles.sectionTitle}>{rowTitle}</Text>
            <FlatList
                horizontal
                data={movies}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[
                    styles.contentList,
                    isTop10 && styles.top10List
                ]}
                ItemSeparatorComponent={ItemSeparator}
                windowSize={21}
                maxToRenderPerBatch={movies.length}
                initialNumToRender={movies.length}
                removeClippedSubviews={false}
                getItemLayout={(data, index) => ({
                    length: 110,
                    offset: 110 * index + (index * 8),
                    index,
                })}
            />
        </View>
    );
}); 