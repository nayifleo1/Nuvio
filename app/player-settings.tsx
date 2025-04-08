import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TabScreenWrapper } from '@/components/TabScreenWrapper';
import { usePathname, useRouter } from 'expo-router';
import { TAB_SCREENS } from '@/app/(tabs)/_layout';
import { Ionicons } from '@expo/vector-icons';
import { useUser, ExternalPlayerType } from '@/contexts/UserContext';

interface PlayerOption {
  id: ExternalPlayerType;
  name: string;
  description: string;
  icon: string;
  color: string;
}

// Define separate options based on platform
const iosPlayerOptions: PlayerOption[] = [
  {
    id: 'internal',
    name: 'Built-in Player',
    description: 'Use the app\'s built-in video player',
    icon: 'play-circle',
    color: '#E50914' // Netflix red
  },
  {
    id: 'vlc',
    name: 'VLC',
    description: 'Open videos in VLC media player',
    icon: 'play-circle',
    color: '#FF8800' // VLC orange
  },
  {
    id: 'outplayer',
    name: 'Outplayer',
    description: 'Open videos in Outplayer',
    icon: 'play-circle',
    color: '#4CAF50' // Green
  },
  {
    id: 'infuse',
    name: 'Infuse',
    description: 'Open videos in Infuse video player',
    icon: 'play-circle',
    color: '#2196F3' // Blue
  },
  {
    id: 'vidhub',
    name: 'VidHub',
    description: 'Open videos in VidHub video player',
    icon: 'play-circle',
    color: '#9C27B0' // Purple
  }
];

const androidPlayerOptions: PlayerOption[] = [
  {
    id: 'internal',
    name: 'Built-in Player',
    description: 'Use the app\'s built-in video player',
    icon: 'play-circle',
    color: '#E50914' // Netflix red
  },
  {
    id: 'external',
    name: 'External Player',
    description: 'Choose an external player when streaming',
    icon: 'open-outline',
    color: '#4CAF50' // Green
  }
];

export default function PlayerSettingsScreen() {
  const { preferredPlayer, setPreferredPlayer } = useUser();
  const [selectedPlayer, setSelectedPlayer] = useState<ExternalPlayerType>(preferredPlayer);
  const pathname = usePathname();
  const router = useRouter();
  const isAndroid = Platform.OS === 'android';
  
  // Use the appropriate options based on platform
  const playerOptions = isAndroid ? androidPlayerOptions : iosPlayerOptions;
  
  const currentTabIndex = TAB_SCREENS.findIndex(screen =>
    screen.name === '(profile)/profile'
  );
  const activeTabIndex = TAB_SCREENS.findIndex(screen =>
    pathname === `/${screen.name}` || (screen.name === 'index' && pathname === '/')
  );

  const slideDirection = activeTabIndex > currentTabIndex ? 'right' : 'left';
  const isActive = pathname === '/player-settings';

  const handleSelectPlayer = async (playerId: ExternalPlayerType) => {
    setSelectedPlayer(playerId);
    await setPreferredPlayer(playerId);
  };

  return (
    <TabScreenWrapper isActive={isActive} slideDirection={slideDirection} >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.title}>External Player</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.description}>
            {isAndroid ? 
              "Choose how video streams should be played. When using an external player, you'll be prompted to select which app to use." :
              "Choose which video player to use when playing streaming content. The external player must be installed on your device."
            }
          </Text>

          {playerOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.playerOption,
                selectedPlayer === option.id && styles.selectedOption
              ]}
              onPress={() => handleSelectPlayer(option.id)}
            >
              <View style={[styles.iconContainer, { backgroundColor: option.color }]}>
                <Ionicons name={option.icon as any} size={24} color="white" />
              </View>
              <View style={styles.playerDetails}>
                <Text style={styles.playerName}>{option.name}</Text>
                <Text style={styles.playerDescription}>{option.description}</Text>
              </View>
              {selectedPlayer === option.id && (
                <Ionicons name="checkmark-circle" size={24} color="#E50914" style={styles.checkmark} />
              )}
            </TouchableOpacity>
          ))}

          <Text style={styles.note}>
            {isAndroid ?
              "Note: When using external player, you'll need at least one video player app installed on your device." :
              "Note: For external players to work, they must be installed on your device. If an external player is not installed, the built-in player will be used instead."
            }
          </Text>
        </ScrollView>
      </SafeAreaView>
    </TabScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
  },
  backButton: {
    padding: 8,
    position: 'absolute',
    left: 8,
    zIndex: 100,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },
  description: {
    fontSize: 16,
    color: '#999',
    marginBottom: 24,
    lineHeight: 22,
  },
  playerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#111',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  selectedOption: {
    borderColor: '#E50914',
    backgroundColor: '#1A0F10',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  playerDetails: {
    flex: 1,
  },
  playerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  playerDescription: {
    fontSize: 14,
    color: '#999',
  },
  checkmark: {
    marginLeft: 8,
  },
  note: {
    fontSize: 14,
    color: '#777',
    marginTop: 24,
    fontStyle: 'italic',
    lineHeight: 20,
  },
}); 