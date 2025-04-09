import React, { memo, useCallback, useState } from 'react';
import { View, Text, Pressable, Image, FlatList, StyleSheet } from 'react-native';
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
            <Image
                source={{ uri }}
                style={[style, imageLoaded ? null : { opacity: 0 }]}
                onLoad={() => setImageLoaded(true)}
                fadeDuration={200}
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

    const keyExtractor = useCallback((item: Movie, index: number) => `${item.id}-${index}`, []);

    // Handle which items are currently visible for better memory usage
    const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
        const visibleIndices = viewableItems.map((item: any) => item.index);
        setViewableItems(visibleIndices);
    }, []);

    const viewabilityConfig = {
        itemVisiblePercentThreshold: 50,
        minimumViewTime: 200,
    };

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
                windowSize={2}
                maxToRenderPerBatch={4}
                initialNumToRender={4}
                removeClippedSubviews={true}
                getItemLayout={(data, index) => ({
                    length: 110,
                    offset: 110 * index + (index * 8),
                    index,
                })}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                updateCellsBatchingPeriod={50}
            />
        </View>
    );
}); 