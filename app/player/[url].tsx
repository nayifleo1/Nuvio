import React, { useEffect } from 'react';
import { View, StyleSheet, BackHandler, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import VideoPlayer from '@/components/VideoPlayer';
import * as ScreenOrientation from 'expo-screen-orientation';

export default function PlayerScreen() {
  const { 
    url, 
    title,
    season,
    episode,
    episodeTitle,
    quality,
    year,
    streamProvider
  } = useLocalSearchParams<{ 
    url: string, 
    title?: string,
    season?: string,
    episode?: string,
    episodeTitle?: string,
    quality?: string,
    year?: string,
    streamProvider?: string
  }>();
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
  // Parse additional parameters
  const parsedSeason = season ? parseInt(season as string, 10) : undefined;
  const parsedEpisode = episode ? parseInt(episode as string, 10) : undefined;
  const parsedEpisodeTitle = episodeTitle ? decodeURIComponent(episodeTitle as string) : undefined;
  const parsedQuality = quality ? decodeURIComponent(quality as string) : undefined;
  const parsedYear = year ? decodeURIComponent(year as string) : undefined;
  const parsedStreamProvider = streamProvider ? decodeURIComponent(streamProvider as string) : undefined;

  // Debug the parameters
  console.log("Player received metadata:", {
    rawSeason: season,
    rawEpisode: episode,
    parsedSeason,
    parsedEpisode,
    episodeTitle: parsedEpisodeTitle
  });

  return (
    <>
      <Stack.Screen options={{ 
        headerShown: false,
        animation: 'fade'
      }} />
      <View style={styles.container}>
        <StatusBar hidden />
        <VideoPlayer 
          uri={videoUrl} 
          title={videoTitle}
          season={parsedSeason}
          episode={parsedEpisode}
          episodeTitle={parsedEpisodeTitle}
          quality={parsedQuality}
          year={parsedYear}
          streamProvider={parsedStreamProvider}
        />
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