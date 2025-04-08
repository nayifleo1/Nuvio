import {DarkTheme, DefaultTheme, ThemeProvider} from '@react-navigation/native';
import {Stack} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import {useEffect, useState} from 'react';
import {StyleSheet, useColorScheme, View, Platform} from 'react-native';
import {RootScaleProvider} from '@/contexts/RootScaleContext';
import {useRootScale} from '@/contexts/RootScaleContext';
import Animated, {useAnimatedStyle} from 'react-native-reanimated';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {OverlayProvider} from '@/components/Overlay/OverlayProvider';
import {useRouter} from 'expo-router';
import {BlurView} from 'expo-blur';
import {WhoIsWatching} from '@/components/WhoIsWatching';
import {UserProvider} from '@/contexts/UserContext';
import {useUser} from '@/contexts/UserContext';
import {Image} from 'expo-image';
import useCachedResources from '@/hooks/useCachedResources';
import { useVisionOS } from '@/hooks/useVisionOS';

function AnimatedStack() {
    const {scale} = useRootScale();
    const router = useRouter();
    const [isModalActive, setIsModalActive] = useState(false);
    const [canBlur, setCanBlur] = useState(false);
    const {selectedProfile, selectProfile} = useUser();
    const colorScheme = useColorScheme();
    const { isVisionOS } = useVisionOS();
    const isAndroid = Platform.OS === 'android';

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                {scale: scale.value},
                {
                    translateY: (1 - scale.value) * -150,
                },
            ],
        };
    });

    if (!selectedProfile) {
        return <WhoIsWatching onProfileSelect={selectProfile}/>;
    }

    return (
        <View 
            style={[
                styles.container,
                isVisionOS && { backgroundColor: 'transparent' }
            ]}
            pointerEvents="box-none"
        >
            {(isModalActive && canBlur && !isAndroid) && (
                <BlurView
                    intensity={50}
                    style={[
                        StyleSheet.absoluteFill,
                        {zIndex: 1}
                    ]}
                    tint={colorScheme === 'dark' ? 'dark' : 'light'}
                />
            )}
            {(isModalActive && isAndroid) && (
                <View 
                    style={[
                        StyleSheet.absoluteFill,
                        {
                            zIndex: 1,
                            backgroundColor: 'transparent'
                        }
                    ]}
                    pointerEvents="box-none"
                />
            )}
            <Animated.View 
                style={[styles.stackContainer, animatedStyle]}
                pointerEvents="box-none"
            >
                <Stack>
                    <Stack.Screen name="(tabs)" options={{headerShown: false}}/>
                    <Stack.Screen
                        name="movie/[id]"
                        options={{
                            presentation: Platform.OS === 'android' ? 'modal' : 'transparentModal',
                            headerShown: false,
                            contentStyle: {
                                backgroundColor: 'transparent',
                            },
                            animation: Platform.OS === 'android' ? 'slide_from_bottom' : 'default',
                        }}
                        listeners={{
                            focus: () => {
                                setIsModalActive(true);
                                setCanBlur(true);
                            },
                            beforeRemove: () => {
                                setIsModalActive(false);
                                setCanBlur(false);
                            },
                        }}
                    />
                    <Stack.Screen
                        name="switch-profile"
                        options={{
                            presentation: Platform.OS === 'android' ? 'modal' : 'transparentModal',
                            headerShown: false,
                            contentStyle: {
                                backgroundColor: 'transparent',
                            },
                            animation: Platform.OS === 'android' ? 'slide_from_bottom' : 'default',
                        }}
                        listeners={{
                            focus: () => {
                                setIsModalActive(true);
                                setCanBlur(false);
                            },
                            beforeRemove: () => {
                                setIsModalActive(false);
                                setCanBlur(false);
                            },
                        }}
                    />
                    <Stack.Screen
                        name="search"
                        options={{
                            // presentation: 'card',
                            // animation: 'none',
                            headerShown: false,
                            contentStyle: {
                                backgroundColor: 'transparent',
                            },
                        }}

                    />

                    <Stack.Screen
                        name="downloads"
                        options={{
                            // presentation: 'card',
                            // animation: 'none',
                            headerShown: false,
                            contentStyle: {
                                backgroundColor: 'transparent',
                            },
                        }}

                    />

                    <Stack.Screen
                        name="addons"
                        options={{
                            headerShown: false,
                            contentStyle: {
                                backgroundColor: 'transparent',
                            },
                        }}
                    />

                    <Stack.Screen
                        name="player-settings"
                        options={{
                            headerShown: false,
                            contentStyle: {
                                backgroundColor: 'transparent',
                            },
                        }}
                    />

                    <Stack.Screen name="+not-found"/>
                </Stack>

            </Animated.View>

            {/* {!selectedProfile && (
        <WhoIsWatching onProfileSelect={selectProfile} />
      )} */}


        </View>
    );
}

export default function RootLayout() {
    const colorScheme = useColorScheme();
    const isLoaded = useCachedResources();

    useEffect(() => {
        SplashScreen.hideAsync();
    }, []);

    useEffect(() => {
        Image.prefetch([
            // Add your common image URLs here
            'path-to-netflix-icon.png',
            'path-to-netflix-outline.png',
        ]);
    }, []);

    if (!isLoaded) {
        return null; // Early return after all hooks are called
    }


    return (
        <UserProvider>
            <GestureHandlerRootView style={styles.container}>
                <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                    <RootScaleProvider>
                        <OverlayProvider>
                            <AnimatedStack/>
                        </OverlayProvider>
                    </RootScaleProvider>
                </ThemeProvider>
            </GestureHandlerRootView>
        </UserProvider>
    );
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        position: 'relative',
        width: '100%',
        height: '100%',
    },
    stackContainer: {
        flex: 1,
        overflow: 'hidden',
        borderRadius: 5,
        position: 'relative',
        width: '100%',
        height: '100%',
    },
});

