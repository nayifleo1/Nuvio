import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Dimensions, Modal, Pressable } from 'react-native';
import Video from 'react-native-video';
import { Ionicons } from '@expo/vector-icons';
import { Slider } from 'react-native-awesome-slider';
import { LinearGradient } from 'expo-linear-gradient';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
// Import Gesture Handler components
import { PinchGestureHandler, State, PinchGestureHandlerGestureEvent } from 'react-native-gesture-handler';

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

const VideoPlayer: React.FC<VideoPlayerProps> = ({ uri, title = 'Episode Name' }) => {
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
  const videoRef = useRef<any>(null);
  const progress = useSharedValue(0);
  const min = useSharedValue(0);
  const max = useSharedValue(duration);

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
          selectedTextTrack={selectedTextTrack as any} // Ensure this prop is passed
          onTextTracks={onTextTracks} // Ensure this prop is passed
        />

        {/* Controls Overlay */} 
        {showControls && (
          <View style={styles.controlsContainer}>
            {/* Top Gradient & Header */}
            <LinearGradient
              colors={['rgba(0,0,0,0.7)', 'transparent']}
              style={styles.topGradient}
            >
              <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
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
                  
                  {/* Lock Button */}
                  <TouchableOpacity style={styles.bottomButton}>
                    <Ionicons name="lock-closed" size={20} color="white" />
                    <Text style={styles.bottomButtonText}>Lock</Text>
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
      {/* Video TouchableOpacity ends here */}
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
      
    {/* Root View container ends here */}
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
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  bottomGradient: {
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
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