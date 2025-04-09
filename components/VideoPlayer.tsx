import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Dimensions, Modal, Pressable, StatusBar, Platform } from 'react-native';
import Video from 'react-native-video';
import { Ionicons } from '@expo/vector-icons';
import { Slider } from 'react-native-awesome-slider';
import { LinearGradient } from 'expo-linear-gradient';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
// Remove Gesture Handler imports
// import { PinchGestureHandler, State, PinchGestureHandlerGestureEvent } from 'react-native-gesture-handler';
// Import for navigation bar hiding
import { NativeModules } from 'react-native';
// Import immersive mode package
import RNImmersiveMode from 'react-native-immersive-mode';

// Define the TrackPreferenceType for audio/text tracks
type TrackPreferenceType = 'system' | 'disabled' | 'title' | 'language' | 'index';

// Define the SelectedTrack type for audio/text tracks
interface SelectedTrack {
  type: TrackPreferenceType;
  value?: string | number; // value is optional for 'system' and 'disabled'
}

interface VideoPlayerProps {
  uri: string;
  title?: string;
  season?: number;
  episode?: number;
  episodeTitle?: string;
  quality?: string;
  year?: number;
  streamProvider?: string;
}

// Match the react-native-video AudioTrack type
interface AudioTrack {
  index: number;
  title?: string;
  language?: string;
  bitrate?: number;
  type?: string;
  selected?: boolean;
}

// Define TextTrack interface based on react-native-video expected structure
interface TextTrack {
  index: number;
  title?: string;
  language?: string;
  type?: string | null; // Adjusting type based on linter error
}

// Define the possible resize modes
type ResizeModeType = 'contain' | 'cover' | 'stretch' | 'none';
const resizeModes: ResizeModeType[] = ['contain', 'cover', 'stretch'];

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  uri,
  title = 'Episode Name',
  season,
  episode,
  episodeTitle,
  quality,
  year,
  streamProvider
}) => {
  // Log received props for debugging
  console.log("VideoPlayer received props:", {
    uri,
    title,
    season,
    episode,
    episodeTitle,
    quality,
    year,
    streamProvider
  });

  const [paused, setPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [selectedAudioTrack, setSelectedAudioTrack] = useState<number | null>(null);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [textTracks, setTextTracks] = useState<TextTrack[]>([]);
  const [selectedTextTrack, setSelectedTextTrack] = useState<SelectedTrack | null>({ type: 'disabled' }); // Default subtitles off
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [resizeMode, setResizeMode] = useState<ResizeModeType>('contain'); // State for resize mode
  const [showAspectRatioMenu, setShowAspectRatioMenu] = useState(false); // New state for aspect ratio menu
  const videoRef = useRef<any>(null);
  const progress = useSharedValue(0);
  const min = useSharedValue(0);
  const max = useSharedValue(duration);

  // Hide navigation bar when component mounts, restore when it unmounts
  useEffect(() => {
    // Enable immersive mode when component mounts
    enableImmersiveMode();

    // Disable immersive mode when component unmounts
    return () => {
      disableImmersiveMode();
    };
  }, []);

  // Function to enable immersive mode
  const enableImmersiveMode = () => {
    StatusBar.setHidden(true);
    
    if (Platform.OS === 'android') {
      // Full immersive mode - hides both status and navigation bars
      // Use setBarMode with 'FullSticky' mode to hide all bars with sticky behavior
      RNImmersiveMode.setBarMode('FullSticky');
      
      // Alternative: if you want to use fullLayout method (which is in the TypeScript definition)
      RNImmersiveMode.fullLayout(true);
    }
  };

  // Function to disable immersive mode
  const disableImmersiveMode = () => {
    StatusBar.setHidden(false);
    
    if (Platform.OS === 'android') {
      // Restore normal mode using setBarMode
      RNImmersiveMode.setBarMode('Normal');
      
      // Alternative: disable fullLayout
      RNImmersiveMode.fullLayout(false);
    }
  };

  useEffect(() => {
    max.value = duration;
  }, [duration]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const onSliderValueChange = (value: number) => {
    if (videoRef.current) {
      const newTime = Math.floor(value);
      videoRef.current.seek(newTime);
      setCurrentTime(newTime);
      progress.value = newTime;
    }
  };

  const togglePlayback = () => {
    setPaused(!paused);
  };

  const skip = (seconds: number) => {
    if (videoRef.current) {
      const newTime = Math.max(0, Math.min(currentTime + seconds, duration));
      videoRef.current.seek(newTime);
      setCurrentTime(newTime);
      progress.value = newTime;
    }
  };

  const onProgress = (data: { currentTime: number }) => {
    setCurrentTime(data.currentTime);
    progress.value = data.currentTime;
  };

  const onLoad = (data: { duration: number }) => {
    setDuration(data.duration);
    max.value = data.duration;
  };

  const onAudioTracks = (data: { audioTracks: AudioTrack[] }) => {
    setAudioTracks(data.audioTracks || []);
    if (selectedAudioTrack === null && data.audioTracks && data.audioTracks.length > 0) {
      setSelectedAudioTrack(data.audioTracks[0].index);
    }
  };

  const onTextTracks = (e: Readonly<{ textTracks: TextTrack[] }>) => {
    console.log("Detected Text Tracks:", e.textTracks);
    setTextTracks(e.textTracks || []);
  };

  // Toggle through aspect ratio modes
  const cycleAspectRatio = () => {
    const currentIndex = resizeModes.indexOf(resizeMode);
    const nextIndex = (currentIndex + 1) % resizeModes.length;
    console.log(`Changing aspect ratio from ${resizeMode} to ${resizeModes[nextIndex]}`);
    setResizeMode(resizeModes[nextIndex]);
  };

  return (
    <View style={styles.container}> 
      <TouchableOpacity
        style={styles.videoContainer}
        onPress={() => setShowControls(!showControls)}
        activeOpacity={1}
      >
        <Video
          ref={videoRef}
          source={{ uri }}
          style={styles.video}
          paused={paused}
          resizeMode={resizeMode}
          onLoad={onLoad}
          onProgress={onProgress}
          rate={playbackSpeed}
          progressUpdateInterval={250}
          selectedAudioTrack={selectedAudioTrack !== null ? 
            { type: 'index', value: selectedAudioTrack } as any : 
            undefined
          }
          onAudioTracks={onAudioTracks}
          selectedTextTrack={selectedTextTrack as any}
          onTextTracks={onTextTracks}
        />

        {/* Controls Overlay - still inside TouchableOpacity */}
        {showControls && (
          <View style={styles.controlsContainer}>
            {/* Top Gradient & Header */}
            <LinearGradient
              colors={['rgba(0,0,0,0.7)', 'transparent']}
              style={styles.topGradient}
            >
              <View style={styles.header}>
                {/* Title Section - Enhanced with metadata */}
                <View style={styles.titleSection}>
                  <Text style={styles.title}>{title}</Text>
                  {/* Show season and episode for series */}
                  {season && episode && (
                    <Text style={styles.episodeInfo}>
                      S{season}E{episode} {episodeTitle && `• ${episodeTitle}`}
                    </Text>
                  )}
                  {/* Show year, quality, and provider */}
                  <View style={styles.metadataRow}>
                    {year && <Text style={styles.metadataText}>{year}</Text>}
                    {quality && <View style={styles.qualityBadge}><Text style={styles.qualityText}>{quality}</Text></View>}
                    {streamProvider && <Text style={styles.providerText}>via {streamProvider}</Text>}
                  </View>
                </View>
                <TouchableOpacity style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {/* Center Controls (Play/Pause, Skip) */}
            <View style={styles.controls}>
              <TouchableOpacity onPress={() => skip(-10)}>
                <Ionicons name="play-back" size={24} color="white" />
              </TouchableOpacity>
              <TouchableOpacity onPress={togglePlayback} style={styles.playButton}>
                <Ionicons name={paused ? "play" : "pause"} size={30} color="white" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => skip(10)}>
                <Ionicons name="play-forward" size={24} color="white" />
              </TouchableOpacity>
            </View>

            {/* Bottom Gradient & Controls */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.bottomGradient}
            >
              <View style={styles.bottomControls}>
                {/* Slider */}
                <View style={styles.sliderContainer}>
                  <Slider
                    progress={progress}
                    minimumValue={min}
                    maximumValue={max}
                    style={styles.slider}
                    onValueChange={onSliderValueChange}
                    theme={{
                      minimumTrackTintColor: '#E50914',
                      maximumTrackTintColor: '#FFF',
                      bubbleBackgroundColor: '#E50914',
                    }}
                  />
                  <Text style={styles.duration}>
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </Text>
                </View>

                {/* Bottom Buttons Row */}
                <View style={styles.bottomButtons}>
                  {/* Speed Button */}
                  <TouchableOpacity style={styles.bottomButton}>
                    <Ionicons name="speedometer" size={20} color="white" />
                    <Text style={styles.bottomButtonText}>Speed ({playbackSpeed}x)</Text>
                  </TouchableOpacity>

                  {/* Aspect Ratio Button - Added */}
                  <TouchableOpacity style={styles.bottomButton} onPress={cycleAspectRatio}>
                    <Ionicons name="resize" size={20} color="white" />
                    <Text style={styles.bottomButtonText}>
                      Aspect ({resizeMode})
                    </Text>
                  </TouchableOpacity>

                  {/* Audio Button */}
                  <TouchableOpacity 
                    style={styles.bottomButton} 
                    onPress={() => setShowAudioMenu(true)}
                    disabled={audioTracks.length <= 1}
                  >
                    <Ionicons name="volume-high" size={20} color={audioTracks.length <= 1 ? 'grey' : 'white'} />
                    <Text style={[styles.bottomButtonText, audioTracks.length <= 1 && {color: 'grey'}]}>
                      Audio {audioTracks.length > 0 ? 
                        `(${audioTracks.find(t => t.index === selectedAudioTrack)?.language || 'Default'})` : 
                        ''}
                    </Text>
                  </TouchableOpacity>
                  
                  {/* Subtitle Button */}
                  <TouchableOpacity 
                    style={styles.bottomButton}
                    onPress={() => setShowSubtitleMenu(true)}
                    disabled={textTracks.length === 0}
                  >
                    <Ionicons name="text" size={20} color={textTracks.length === 0 ? 'grey' : 'white'} />
                    <Text style={[styles.bottomButtonText, textTracks.length === 0 && {color: 'grey'}]}>
                      {selectedTextTrack?.type === 'disabled' 
                        ? 'Subtitles (Off)' 
                        : `Subtitles (${textTracks.find(t => t.index === selectedTextTrack?.value)?.language?.toUpperCase() || 'On'})`}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
          </View>
        )}
      </TouchableOpacity> 

      {/* Audio Selection Modal */} 
      <Modal
        animationType="fade"
        transparent={true}
        visible={showAudioMenu}
        onRequestClose={() => setShowAudioMenu(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setShowAudioMenu(false)}
        >
          <View style={styles.audioMenuContainer} onStartShouldSetResponder={() => true}>
            <Text style={styles.audioMenuTitle}>Select Audio Track</Text>
            {audioTracks.map((track) => (
              <TouchableOpacity
                key={track.index}
                style={styles.audioMenuItem}
                onPress={() => {
                  setSelectedAudioTrack(track.index);
                  setShowAudioMenu(false);
                }}
              >
                <Ionicons 
                  name={selectedAudioTrack === track.index ? "radio-button-on" : "radio-button-off"}
                  size={18}
                  color="white"
                  style={{ marginRight: 10 }}
                />
                <Text style={styles.audioMenuItemText}>
                  {track.language ? track.language.toUpperCase() : (track.title || `Track ${track.index + 1}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Subtitle Selection Modal */} 
      <Modal
        animationType="fade"
        transparent={true}
        visible={showSubtitleMenu}
        onRequestClose={() => setShowSubtitleMenu(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setShowSubtitleMenu(false)}
        >
          <View style={styles.subtitleMenuContainer} onStartShouldSetResponder={() => true}>
            <Text style={styles.subtitleMenuTitle}>Select Subtitles</Text>
            {/* Off Option */}
            <TouchableOpacity
              style={styles.subtitleMenuItem}
              onPress={() => {
                setSelectedTextTrack({ type: 'disabled' });
                setShowSubtitleMenu(false);
              }}
            >
              <Ionicons 
                name={selectedTextTrack?.type === 'disabled' ? "radio-button-on" : "radio-button-off"}
                size={18}
                color="white"
                style={{ marginRight: 10 }}
              />
              <Text style={styles.subtitleMenuItemText}>Off</Text>
            </TouchableOpacity>

            {/* Available Tracks */}
            {textTracks.map((track) => (
              <TouchableOpacity
                key={track.index}
                style={styles.subtitleMenuItem}
                onPress={() => {
                  setSelectedTextTrack({ type: 'index', value: track.index });
                  setShowSubtitleMenu(false);
                }}
              >
                <Ionicons 
                  name={selectedTextTrack?.type === 'index' && selectedTextTrack?.value === track.index ? "radio-button-on" : "radio-button-off"}
                  size={18}
                  color="white"
                  style={{ marginRight: 10 }}
                />
                <Text style={styles.subtitleMenuItemText}>
                  {track.language ? track.language.toUpperCase() : (track.title || `Track ${track.index + 1}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
      
    </View> 
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    flex: 1,
  },
  video: {
    flex: 1,
  },
  controlsContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20, // Adjust top padding for safe area
    paddingHorizontal: 20,
    paddingBottom: 10, // Add some padding at the bottom of the gradient
  },
  bottomGradient: {
    paddingBottom: Platform.OS === 'ios' ? 30 : 20, // Adjust bottom padding for safe area
    paddingHorizontal: 20,
    paddingTop: 10, // Add some padding at the top of the gradient
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start', // Align items to the top
  },
  // Styles for the title section and metadata
  titleSection: {
    flex: 1, // Allow title section to take available space
    marginRight: 10, // Add margin to avoid overlap with close button
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  episodeInfo: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    marginTop: 3,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    flexWrap: 'wrap', // Allow items to wrap if needed
  },
  metadataText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginRight: 8,
  },
  qualityBadge: {
    backgroundColor: '#E50914',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  qualityText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  providerText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontStyle: 'italic', // Italicize provider text
  },
  closeButton: {
    padding: 8,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomControls: {
    gap: 20,
  },
  sliderContainer: {
    width: '100%',
    gap: 10,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  duration: {
    color: 'white',
    fontSize: 12,
  },
  bottomButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  bottomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  bottomButtonText: {
    color: 'white',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)', 
  },
  audioMenuContainer: { 
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    borderRadius: 10,
    padding: 20,
    minWidth: 250,
    maxWidth: '80%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  audioMenuTitle: { 
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  audioMenuItem: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  audioMenuItemText: { 
    color: 'white',
    fontSize: 14,
  },
  subtitleMenuContainer: { 
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    borderRadius: 10,
    padding: 20,
    minWidth: 250,
    maxWidth: '80%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  subtitleMenuTitle: { 
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  subtitleMenuItem: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  subtitleMenuItemText: { 
    color: 'white',
    fontSize: 14,
  },
});

export default VideoPlayer; 