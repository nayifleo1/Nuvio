import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
    AnimatedProps,
    useAnimatedStyle,
    interpolate
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { styles } from '@/styles';
import { CategoriesListModal } from '../CategoriesListModal/CategoriesListModal';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);
const AnimatedView = Animated.createAnimatedComponent(View);

interface AnimatedHeaderProps {
    headerAnimatedProps: AnimatedProps<any>;
    title: string;
    scrollDirection: Animated.SharedValue<number>;
}

export function AnimatedHeader({ headerAnimatedProps, title, scrollDirection }: AnimatedHeaderProps) {
    const [showCategories, setShowCategories] = useState(false);
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const onCategoryPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowCategories(true);
    };

    const headerTitleStyle = useAnimatedStyle(() => {
        return {
            transform: [
                {
                    scale: interpolate(
                        scrollDirection.value,
                        [0, 1],
                        [1, 0.96],
                        'clamp'
                    )
                }
            ]
        };
    });

    const gradientStyle = useAnimatedStyle(() => {
        return {
            opacity: interpolate(
                scrollDirection.value,
                [0, 0.3],
                [0, 1],
                'clamp'
            )
        };
    });

    const backgroundOpacityStyle = useAnimatedStyle(() => {
        return {
            opacity: interpolate(
                headerAnimatedProps.intensity ? headerAnimatedProps.intensity.value : 0,
                [0, 85],
                [0, 0.85],
                'clamp'
            )
        };
    });

    const tabsAnimatedStyle = useAnimatedStyle(() => {
        return {
            opacity: interpolate(
                scrollDirection.value,
                [0, 0.5, 1],
                [1, 0.8, 0],
                'clamp'
            ),
            transform: [
                {
                    translateY: interpolate(
                        scrollDirection.value,
                        [0, 1],
                        [0, -40],
                        'clamp'
                    )
                }
            ],
            overflow: 'hidden',
            height: interpolate(
                scrollDirection.value,
                [0, 1],
                [47, 0],
                'clamp'
            ),
        };
    });

    // Use different components based on platform for better performance and visual consistency
    const renderHeaderBackground = () => {
        if (Platform.OS === 'ios') {
            return (
                <>
                    <AnimatedLinearGradient
                        colors={['rgba(0,0,0,0.8)', 'transparent']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={[
                            {
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: insets.top + 50 + 47, // Status bar + title + tabs height
                                zIndex: 0,
                            },
                            gradientStyle
                        ]}
                    />
                    <AnimatedBlurView
                        tint="systemThickMaterialDark"
                        style={[styles.blurContainer, { paddingTop: insets.top, zIndex: 2 }]}
                        animatedProps={headerAnimatedProps}
                    >
                        {renderHeaderContent()}
                    </AnimatedBlurView>
                </>
            );
        } else {
            // Android-specific implementation
            return (
                <>
                    <AnimatedLinearGradient
                        colors={['rgba(0,0,0,0.8)', 'transparent']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={[
                            {
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: insets.top + 50 + 47, // Status bar + title + tabs height
                                zIndex: 0,
                            },
                            gradientStyle
                        ]}
                    />
                    <AnimatedView
                        style={[
                            styles.blurContainer, 
                            { 
                                paddingTop: insets.top, 
                                zIndex: 2,
                                backgroundColor: 'transparent'
                            }
                        ]}
                    >
                        <Animated.View 
                            style={[
                                StyleSheet.absoluteFill, 
                                { backgroundColor: '#000', zIndex: -1 },
                                backgroundOpacityStyle
                            ]} 
                        />
                        {renderHeaderContent()}
                    </AnimatedView>
                </>
            );
        }
    };

    // Extract header content to avoid duplication
    const renderHeaderContent = () => (
        <>
            <Animated.View style={[styles.headerTitleContainer, headerTitleStyle]}>
                <Text style={styles.headerTitle}>{title}</Text>

                <View style={styles.headerButtons}>
                    <Pressable style={styles.searchButton} onPress={() => router.push('/downloads')}>
                        <ExpoImage
                            source={require('../../assets/images/replace-these/download-netflix-transparent.png')}
                            style={{ width: 28, height: 28 }}
                            cachePolicy="memory-disk"
                            contentFit="contain"
                        />
                    </Pressable>
                    <Pressable style={styles.searchButton} onPress={() => router.push('/search')}>
                        <Ionicons name="search-outline" size={28} color="#fff" />
                    </Pressable>
                </View>
            </Animated.View>
            <Animated.View style={[styles.categoryTabs, tabsAnimatedStyle]}>
                <Pressable style={styles.categoryTab}>
                    <Text style={styles.categoryTabText}>TV Shows</Text>
                </Pressable>
                <Pressable style={styles.categoryTab}>
                    <Text style={styles.categoryTabText}>Movies</Text>
                </Pressable>
                <Pressable
                    style={styles.categoryTab}
                    onPress={onCategoryPress}
                >
                    <Text style={styles.categoryTabTextWithIcon}>Categories</Text>
                    <Ionicons name="chevron-down" size={16} color="#fff" />
                </Pressable>
            </Animated.View>
        </>
    );

    return (
        <>
            <Animated.View style={[styles.header]}>
                {renderHeaderBackground()}
            </Animated.View>

            <CategoriesListModal
                visible={showCategories}
                onClose={() => setShowCategories(false)}
            />
        </>
    );
} 