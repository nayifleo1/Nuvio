import React, { useState, useEffect } from 'react';
import {
  View, // Re-add View import
  Text, // Re-add Text import
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Image
} from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { stremioService, Manifest } from '../services/stremioService';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const AddonsScreen = () => {
  // const isDarkMode = useColorScheme() === 'dark'; // No longer needed with Themed components
  const [addons, setAddons] = useState<Manifest[]>([]);
  const [loading, setLoading] = useState(true);
  const [addonUrl, setAddonUrl] = useState('');
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    loadAddons();
  }, []);

  const loadAddons = async () => {
    try {
      setLoading(true);
      const installedAddons = await stremioService.getInstalledAddonsAsync();
      setAddons(installedAddons);
    } catch (error) {
      console.error('Failed to load addons:', error);
      Alert.alert('Error', 'Failed to load addons');
    } finally {
      setLoading(false);
    }
  };

  const handleInstallAddon = async () => {
    if (!addonUrl) {
      Alert.alert('Error', 'Please enter an addon URL');
      return;
    }

    try {
      setInstalling(true);
      await stremioService.installAddon(addonUrl);
      setAddonUrl('');
      loadAddons();
      Alert.alert('Success', 'Addon installed successfully');
    } catch (error) {
      console.error('Failed to install addon:', error);
      Alert.alert('Error', 'Failed to install addon');
    } finally {
      setInstalling(false);
    }
  };

  const handleRemoveAddon = (addon: Manifest) => {
    Alert.alert(
      'Remove Addon',
      `Are you sure you want to remove ${addon.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            stremioService.removeAddon(addon.id);
            loadAddons();
          },
        },
      ]
    );
  };

  const renderAddonItem = ({ item }: { item: Manifest }) => {
    // Get the first catalog type to display
    const catalogType = item.catalogs && item.catalogs.length > 0
      ? item.catalogs[0].type
      : 'unknown';

    return (
      // Use ThemedView for automatic background color
      <ThemedView style={styles.addonItem}> {/* Removed darkColor prop, relies on theme */}
        {/* New addonInfo container */}
        <ThemedView style={styles.addonInfo}>
          <ThemedText style={styles.addonName}>
            {item.name}
          </ThemedText>
          <ThemedText style={styles.addonDescription} darkColor="#aaa">
            {item.description}
          </ThemedText>
          <ThemedView style={styles.addonDetails}>
            <ThemedView style={styles.addonBadge}>
              <ThemedText style={styles.addonBadgeText}>v{item.version}</ThemedText>
            </ThemedView>
            {catalogType !== 'unknown' && (
              <ThemedView style={styles.addonBadge}>
                <ThemedText style={styles.addonBadgeText}>{catalogType}</ThemedText>
              </ThemedView>
            )}
            {item.types && item.types.map((type, index) => (
              <ThemedView key={index} style={styles.addonBadge}>
                <ThemedText style={styles.addonBadgeText}>{type}</ThemedText>
              </ThemedView>
            ))}
          </ThemedView>
        </ThemedView>
        {/* Remove button moved outside addonInfo */}
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveAddon(item)}
        >
          <MaterialIcons name="delete" size={24} color="#E50914" />
        </TouchableOpacity>
      </ThemedView>
    );
  };

  return (
    // Use ThemedView for safe area and background
    <ThemedView style={styles.container} darkColor="#000"> {/* Explicit black background */}
      <StatusBar
        barStyle="light-content" // Assume dark theme consistency
        backgroundColor="#000" // Consistent black background
      />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingContainer}
      >
        {/* Use ThemedText for title */}
        <ThemedText style={styles.title}>
          Addons
        </ThemedText>
        
        <ThemedView style={styles.inputContainer}>
          <TextInput
            style={[
              styles.input,
              {
                // Colors handled by local stylesheet update below
              }
            ]}
            placeholder="Enter addon URL..."
            placeholderTextColor="#888" // Consistent placeholder color
            value={addonUrl}
            onChangeText={setAddonUrl}
            autoCapitalize="none"
            autoCorrect={false}
          />
          
          <TouchableOpacity
            style={[
              styles.installButton,
              { opacity: installing ? 0.7 : 1 }
            ]}
            onPress={handleInstallAddon}
            disabled={installing}
          >
            {installing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.installButtonText}>Install</Text>
            )}
          </TouchableOpacity>
        </ThemedView>
        
        {loading ? (
          <ThemedView style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E50914" />
          </ThemedView>
        ) : (
          <FlatList
            data={addons}
            renderItem={renderAddonItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.addonsList}
            ListEmptyComponent={() => (
              <ThemedView style={styles.emptyContainer}>
                <MaterialIcons name="extension-off" size={48} color="#888888" />
                {/* Use ThemedText */}
                {/* Use default type, color is handled by style */}
                <ThemedText style={styles.emptyText} darkColor="#888"> {/* Explicit empty text color */}
                  No addons installed
                </ThemedText>
              </ThemedView>
            )}
          />
        )}
      </KeyboardAvoidingView>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    // paddingTop: StatusBar.currentHeight || 0, // Remove - Let ThemedView handle safe area if needed, or rely on header
  },
  keyboardAvoidingContainer: {
    flex: 1,
    backgroundColor: 'transparent', // Make KAV transparent
  },
  // Header Style (if we add a dedicated header view)
  // header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, backgroundColor: '#000' },
  title: { // Style for title text within header or directly
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    paddingHorizontal: 16, // Add padding directly if no header view
    paddingTop: 16,
    paddingBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 24, // Increase spacing below input
    borderBottomWidth: 1, // Add separator line
    borderBottomColor: '#222', // Dark separator color
    paddingBottom: 24, // Add padding below button
    // backgroundColor: 'transparent', // Keep default ThemedView background
  },
  input: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    backgroundColor: '#333', // Dark input background
    color: '#fff', // White input text
  },
  installButton: {
    backgroundColor: '#E50914',
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  installButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent', // Make loading container transparent
  },
  addonsList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  addonItem: {
    // Remove card look
    // borderRadius: 8,
    paddingVertical: 16, // Vertical padding only
    paddingHorizontal: 16, // Keep horizontal padding
    // backgroundColor: '#181818',
    // marginBottom: 16, // Remove margin, use border instead
    borderBottomWidth: 1, // Use border for separation
    borderBottomColor: '#222', // Dark separator color
    flexDirection: 'row', // Arrange content horizontally
    alignItems: 'center', // Center items vertically
  },
  addonInfo: { // Container for name, description, badges
    flex: 1, // Take available space
    marginRight: 16, // Space before remove button
  },
  // addonHeader removed - integrated into addonItem layout
  addonName: {
    fontSize: 16, // Slightly smaller name
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4, // Space below name
  },
  removeButton: {
    padding: 4,
  },
  addonDescription: {
    marginBottom: 8, // Space below description
    color: '#aaa',
    fontSize: 13, // Smaller description text
  },
  addonDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // backgroundColor: 'transparent', // Keep default ThemedView background
  },
  addonBadge: {
    backgroundColor: '#333', // Darker badge background
    borderRadius: 4,
    paddingHorizontal: 6, // Adjust padding
    paddingVertical: 3, // Adjust padding
    marginRight: 6, // Adjust spacing
    marginBottom: 4,
  },
  addonBadgeText: {
    color: '#ccc', // Lighter text for badge
    fontSize: 11, // Smaller badge text
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    // backgroundColor: 'transparent', // Keep default ThemedView background
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
});

export default AddonsScreen; 