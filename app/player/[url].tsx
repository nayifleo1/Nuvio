import React, { useEffect } from 'react';
import { View, StyleSheet, BackHandler, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import VideoPlayer from '@/components/VideoPlayer';
import * as ScreenOrientation from 'expo-screen-orientation';

export default function PlayerScreen() {
  const { url, title } = useLocalSearchParams<{ url: string, title?: string }>();
  const router = useRouter();
  
  // Force landscape orientation when component mounts
  useEffect(() => {
    const setOrientation = async () => {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE
      );
    };
    setOrientation();

    // Reset orientation when component unmounts
    return () => {
      ScreenOrientation.unlockAsync();
    };
  }, []);

  // Handle back button on Android to ensure proper navigation
  useEffect(() => {
    const backAction = () => {
      router.back();
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [router]);

  // Ensure we have a valid URL
  const videoUrl = decodeURIComponent(url as string);
  const videoTitle = title ? decodeURIComponent(title as string) : 'Episode Name';

  return (
    <>
      <Stack.Screen options={{ 
        headerShown: false,
        animation: 'fade'
      }} />
      <View style={styles.container}>
        <StatusBar hidden />
        <VideoPlayer uri={videoUrl} title={videoTitle} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
}); 