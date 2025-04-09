import {DarkTheme, DefaultTheme, ThemeProvider} from '@react-navigation/native';
import {Stack} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import {useEffect, useState} from 'react';
import {StyleSheet, useColorScheme, View, Platform} from 'react-native';
import {RootScaleProvider} from '@/contexts/RootScaleContext';
import {useRootScale} from '@/contexts/RootScaleContext';
import Animated, {useAnimatedStyle, withSpring} from 'react-native-reanimated';
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
import { colors } from '@/styles/colors';

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
                <Stack
                    screenOptions={{
                        headerShown: false,
                        gestureEnabled: true,
                        animationEnabled: true,
                        gestureDirection: Platform.OS === 'ios' ? 'horizontal' : 'horizontal',
                        animation: Platform.OS === 'android' ? 'slide_from_right' : 'default',
                        onTransitionStart: () => {
                            console.log('[Navigation] Screen transition started');
                        },
                        onTransitionEnd: () => {
                            console.log('[Navigation] Screen transition ended');
                        },
                    }}
                >
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
                            gestureEnabled: true,
                            gestureDirection: 'vertical',
                        }}
                        listeners={{
                            focus: () => {
                                console.log('[Navigation] Movie screen focused');
                                setIsModalActive(true);
                                setCanBlur(true);
                            },
                            beforeRemove: () => {
                                console.log('[Navigation] Movie screen will be removed');
                                setIsModalActive(false);
                                setCanBlur(false);
                            },
                            gestureStart: () => {
                                console.log('[Gesture] Back gesture started on movie screen');
                            },
                            gestureEnd: () => {
                                console.log('[Gesture] Back gesture ended on movie screen');
                            },
                            gestureCancel: () => {
                                console.log('[Gesture] Back gesture cancelled on movie screen');
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
                            gestureEnabled: true,
                            gestureDirection: 'vertical',
                        }}
                        listeners={{
                            focus: () => {
                                console.log('[Navigation] Profile switch screen focused');
                                setIsModalActive(true);
                                setCanBlur(false);
                            },
                            beforeRemove: () => {
                                console.log('[Navigation] Profile switch screen will be removed');
                                setIsModalActive(false);
                                setCanBlur(false);
                            },
                        }}
                    />
                    <Stack.Screen
                        name="search"
                        options={{
                            headerShown: false,
                            contentStyle: {
                                backgroundColor: 'transparent',
                            },
                            gestureEnabled: true,
                            gestureDirection: 'horizontal',
                        }}
                        listeners={{
                            focus: () => {
                                console.log('[Navigation] Search screen focused');
                            },
                            beforeRemove: () => {
                                console.log('[Navigation] Search screen will be removed');
                            },
                        }}
                    />

                    <Stack.Screen
                        name="downloads"
                        options={{
                            headerShown: false,
                            contentStyle: {
                                backgroundColor: 'transparent',
                            },
                            gestureEnabled: true,
                            gestureDirection: 'horizontal',
                        }}
                        listeners={{
                            focus: () => {
                                console.log('[Navigation] Downloads screen focused');
                            },
                            beforeRemove: () => {
                                console.log('[Navigation] Downloads screen will be removed');
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
                            gestureEnabled: true,
                            gestureDirection: 'horizontal',
                        }}
                        listeners={{
                            focus: () => {
                                console.log('[Navigation] Addons screen focused');
                            },
                            beforeRemove: () => {
                                console.log('[Navigation] Addons screen will be removed');
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
                            gestureEnabled: true,
                            gestureDirection: 'horizontal',
                        }}
                        listeners={{
                            focus: () => {
                                console.log('[Navigation] Player settings screen focused');
                            },
                            beforeRemove: () => {
                                console.log('[Navigation] Player settings screen will be removed');
                            },
                        }}
                    />

                    <Stack.Screen
                        name="show-ratings"
                        options={{
                            headerShown: false,
                            contentStyle: {
                                backgroundColor: colors.black,
                            },
                            presentation: 'modal',
                            animation: 'slide_from_bottom',
                            gestureEnabled: true,
                            gestureDirection: 'vertical',
                            animationDuration: 200,
                        }}
                        listeners={{
                            focus: () => {
                                console.log('[Navigation] Show ratings screen focused');
                                setIsModalActive(true);
                                setCanBlur(true);
                            },
                            beforeRemove: () => {
                                console.log('[Navigation] Show ratings screen will be removed');
                                setIsModalActive(false);
                                setCanBlur(false);
                            },
                            gestureStart: () => {
                                console.log('[Gesture] Back gesture started on ratings screen');
                            },
                            gestureEnd: () => {
                                console.log('[Gesture] Back gesture ended on ratings screen');
                            },
                            gestureCancel: () => {
                                console.log('[Gesture] Back gesture cancelled on ratings screen');
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

