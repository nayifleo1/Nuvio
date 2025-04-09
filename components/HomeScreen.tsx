import React, { memo } from 'react';
import { View, Text, Pressable, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { styles } from '@/styles';
import { Movie, MovieRow } from '@/types/movie';
import { useVisionOS } from '@/hooks/useVisionOS';
import { HoverableView } from '@/components/ui/VisionContainer';
import { Image as ExpoImage } from 'expo-image';

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

const MovieItem = memo(({ item, router, index, isTop10 }: {
    item: Movie;
    router: any;
    index: number;
    isTop10: boolean;
}) => (
    <Pressable
        onPress={() => router.push({
            pathname: '/movie/[id]',
            params: { id: item.id }
        })}
        style={[
            styles.contentItem,
            isTop10 && styles.top10Item,
            { marginHorizontal: 1 }
        ]}
    >
        {isTop10 && <NumberBackground number={index + 1} />}
        <ExpoImage
            source={{ uri: item.imageUrl }}
            style={[
                styles.thumbnail,
                isTop10 && styles.top10Thumbnail
            ]}
            cachePolicy="memory-disk"
            contentFit="cover"
            transition={200}
        />
    </Pressable>
));

const getItemLayout = (_: any, index: number) => ({
    length: 160, // Adjust this value based on your item width
    offset: 160 * index,
    index,
});

export const HomeScreen = memo(({ rowTitle, movies, type }: MovieRow) => {
    const router = useRouter();
    const isTop10 = type === 'top_10';
    const { isVisionOS } = useVisionOS();

    const renderItem = ({ item, index }: { item: Movie; index: number }) => (
        <HoverableView style={{}}>
            <MovieItem
                item={item}
                router={router}
                index={index}
                isTop10={isTop10}
            />
        </HoverableView>
    );

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
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[
                    styles.contentList,
                    isTop10 && styles.top10List
                ]}
                ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
                getItemLayout={getItemLayout}
                removeClippedSubviews={true}
                maxToRenderPerBatch={6}
                windowSize={5}
                initialNumToRender={4}
            />
        </View>
    );
}); 