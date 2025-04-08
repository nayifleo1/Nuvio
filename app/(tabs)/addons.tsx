import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  Switch,
  ScrollView,
} from 'react-native';
import { stremioService, Manifest, Catalog } from '../../services/stremioService';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';
import { TAB_SCREENS } from './_layout';
import { TabScreenWrapper } from '@/components/TabScreenWrapper';
import { BlurView } from 'expo-blur';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';

// New interface for catalog with preferences
interface CatalogWithPrefs {
  addonId: string;
  addonName: string;
  catalog: Catalog;
  enabled: boolean;
  order: number;
}

export default function AddonsScreen() {
  const isDarkMode = useColorScheme() === 'dark';
  const [addons, setAddons] = useState<Manifest[]>([]);
  const [loading, setLoading] = useState(true);
  const [addonUrl, setAddonUrl] = useState('');
  const [installing, setInstalling] = useState(false);
  const [activeTab, setActiveTab] = useState<'addons' | 'catalogs'>('addons');
  const [catalogs, setCatalogs] = useState<CatalogWithPrefs[]>([]);
  const [catalogsLoading, setCatalogsLoading] = useState(true);
  const insets = useSafeAreaInsets();
  
  // For tab animation
  const pathname = usePathname();
  const isActive = pathname === '/addons';
  const currentTabIndex = TAB_SCREENS.findIndex(screen => screen.name === 'addons');
  const activeTabIndex = TAB_SCREENS.findIndex(screen =>
    pathname === `/${screen.name}` || (screen.name === 'index' && pathname === '/')
  );
  const slideDirection = activeTabIndex > currentTabIndex ? 'right' : 'left';

  useEffect(() => {
    loadAddons();
  }, []);

  useEffect(() => {
    if (activeTab === 'catalogs') {
      loadCatalogs();
    }
  }, [activeTab]);

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

  const loadCatalogs = async () => {
    try {
      setCatalogsLoading(true);
      const installedAddons = await stremioService.getInstalledAddonsAsync();
      const catalogPrefs = await stremioService.getCatalogPreferences();
      
      // Create a list of all catalogs with their preferences
      const allCatalogs: CatalogWithPrefs[] = [];
      
      for (const addon of installedAddons) {
        if (addon.catalogs && addon.catalogs.length > 0) {
          for (const catalog of addon.catalogs) {
            const prefKey = `${addon.id}:${catalog.type}:${catalog.id}`;
            const pref = catalogPrefs.get(prefKey) || { enabled: true, order: 1000 };
            
            allCatalogs.push({
              addonId: addon.id,
              addonName: addon.name,
              catalog,
              enabled: pref.enabled,
              order: pref.order
            });
          }
        }
      }
      
      // Sort by order
      allCatalogs.sort((a, b) => a.order - b.order);
      
      setCatalogs(allCatalogs);
    } catch (error) {
      console.error('Failed to load catalogs:', error);
      Alert.alert('Error', 'Failed to load catalogs');
    } finally {
      setCatalogsLoading(false);
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
            if (activeTab === 'catalogs') {
              loadCatalogs();
            }
          },
        },
      ]
    );
  };

  const handleCatalogToggle = async (item: CatalogWithPrefs) => {
    try {
      await stremioService.setCatalogPreference(
        item.addonId,
        item.catalog.type,
        item.catalog.id,
        !item.enabled
      );
      
      // Update local state
      setCatalogs(
        catalogs.map(cat => {
          if (
            cat.addonId === item.addonId &&
            cat.catalog.type === item.catalog.type &&
            cat.catalog.id === item.catalog.id
          ) {
            return { ...cat, enabled: !item.enabled };
          }
          return cat;
        })
      );
    } catch (error) {
      console.error('Failed to update catalog preference:', error);
      Alert.alert('Error', 'Failed to update catalog preference');
    }
  };

  const handleCatalogReorder = async (data: CatalogWithPrefs[]) => {
    try {
      setCatalogs(data);
      
      // Update orders in the service
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        await stremioService.setCatalogOrder(
          item.addonId,
          item.catalog.type,
          item.catalog.id,
          i * 10 // Use gaps for easier manual reordering
        );
      }
    } catch (error) {
      console.error('Failed to reorder catalogs:', error);
      Alert.alert('Error', 'Failed to reorder catalogs');
    }
  };

  const formatCatalogName = (catalog: Catalog): string => {
    // Format the catalog name to match how it's displayed on the home screen
    let displayName = catalog.name;
    
    // Remove duplicate words and clean up the name (case-insensitive)
    const words = displayName.split(' ');
    const uniqueWords = [];
    const seenWords = new Set();
    
    for (const word of words) {
      const lowerWord = word.toLowerCase();
      if (!seenWords.has(lowerWord)) {
        uniqueWords.push(word); // Keep original case
        seenWords.add(lowerWord);
      }
    }
    displayName = uniqueWords.join(' ');
    
    // Add content type if not present
    const contentType = catalog.type === 'movie' ? 'Movies' : 'TV Shows';
    if (!displayName.toLowerCase().includes(contentType.toLowerCase())) {
      displayName = `${displayName} ${contentType}`;
    }
    
    return displayName;
  };

  const renderAddonItem = ({ item }: { item: Manifest }) => {
    // Get the first catalog type to display
    const catalogType = item.catalogs && item.catalogs.length > 0
      ? item.catalogs[0].type
      : 'unknown';

    return (
      <View style={[
        styles.addonItem,
        { backgroundColor: isDarkMode ? '#141414' : '#F5F5F5' }
      ]}>
        <View style={styles.addonHeader}>
          <Text style={[
            styles.addonName,
            { color: isDarkMode ? '#FFFFFF' : '#000000' }
          ]}>
            {item.name}
          </Text>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemoveAddon(item)}
          >
            <MaterialIcons name="delete" size={24} color="#E50914" />
          </TouchableOpacity>
        </View>
        
        <Text style={[
          styles.addonDescription,
          { color: isDarkMode ? '#999999' : '#666666' }
        ]}>
          {item.description}
        </Text>
        
        <View style={styles.addonDetails}>
          <View style={styles.addonBadge}>
            <Text style={styles.addonBadgeText}>v{item.version}</Text>
          </View>
          
          {catalogType !== 'unknown' && (
            <View style={styles.addonBadge}>
              <Text style={styles.addonBadgeText}>{catalogType}</Text>
            </View>
          )}
          
          {item.types && item.types.map((type, index) => (
            <View key={index} style={styles.addonBadge}>
              <Text style={styles.addonBadgeText}>{type}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderCatalogItem = ({ item, drag, isActive }: { 
    item: CatalogWithPrefs; 
    drag: () => void;
    isActive: boolean;
  }) => {
    // Get the formatted catalog name
    const displayName = formatCatalogName(item.catalog);
    
    return (
      <ScaleDecorator>
        <TouchableOpacity
          activeOpacity={0.7}
          onLongPress={drag}
          disabled={isActive}
          style={[
            styles.catalogItem,
            { 
              backgroundColor: isDarkMode ? (isActive ? '#1F1F1F' : '#141414') : (isActive ? '#E5E5E5' : '#F5F5F5'),
              borderColor: isActive ? '#E50914' : (isDarkMode ? '#222222' : '#DDDDDD')
            }
          ]}
        >
          <View style={styles.catalogHeader}>
            <TouchableOpacity onPressIn={drag} style={styles.dragHandle}>
              <MaterialIcons name="drag-handle" size={24} color={isDarkMode ? '#999999' : '#777777'} />
            </TouchableOpacity>
            
            <View style={styles.catalogInfo}>
              <Text style={[
                styles.catalogName,
                { color: isDarkMode ? '#FFFFFF' : '#000000' }
              ]}>
                {displayName}
              </Text>
              
              <Text style={[
                styles.catalogAddon,
                { color: isDarkMode ? '#999999' : '#666666' }
              ]}>
                {item.addonName}
              </Text>
            </View>
            
            <Switch
              value={item.enabled}
              onValueChange={() => handleCatalogToggle(item)}
              trackColor={{ false: '#767577', true: '#E50914' }}
              thumbColor={item.enabled ? '#f4f3f4' : '#f4f3f4'}
            />
          </View>
          
          <View style={styles.catalogMetadata}>
            <View style={styles.addonBadge}>
              <Text style={styles.addonBadgeText}>{item.catalog.type}</Text>
            </View>
            
            <View style={styles.addonBadge}>
              <Text style={styles.addonBadgeText}>{item.catalog.id}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </ScaleDecorator>
    );
  };

  const renderTabHeader = () => (
    <View style={styles.tabHeader}>
      <TouchableOpacity
        style={[
          styles.tabButton,
          activeTab === 'addons' && styles.activeTabButton
        ]}
        onPress={() => setActiveTab('addons')}
      >
        <Text style={[
          styles.tabButtonText,
          activeTab === 'addons' && styles.activeTabButtonText
        ]}>
          Addons
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.tabButton,
          activeTab === 'catalogs' && styles.activeTabButton
        ]}
        onPress={() => setActiveTab('catalogs')}
      >
        <Text style={[
          styles.tabButtonText,
          activeTab === 'catalogs' && styles.activeTabButtonText
        ]}>
          Catalogs
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderCatalogsContent = () => {
    if (catalogsLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E50914" />
        </View>
      );
    }

    if (catalogs.length === 0) {
      return (
        <View style={[
          styles.emptyContainer,
          Platform.OS === 'ios' ? { marginTop: 90 } : {}
        ]}>
          <MaterialIcons name="category" size={48} color="#666666" />
          <Text style={[
            styles.emptyText,
            { color: isDarkMode ? '#999999' : '#666666' }
          ]}>
            No catalogs available
          </Text>
        </View>
      );
    }

    return (
      <DraggableFlatList
        data={catalogs}
        onDragEnd={({ data }: { data: CatalogWithPrefs[] }) => handleCatalogReorder(data)}
        keyExtractor={(item: CatalogWithPrefs) => `${item.addonId}:${item.catalog.type}:${item.catalog.id}`}
        renderItem={renderCatalogItem}
        contentContainerStyle={[
          styles.catalogsList,
          Platform.OS === 'ios' ? { paddingTop: 90 } : { paddingTop: 70 }
        ]}
      />
    );
  };

  const renderAddonsContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E50914" />
        </View>
      );
    }

    return (
      <>
        <View style={[
          styles.inputContainer,
          Platform.OS === 'ios' ? { marginTop: 90 } : { marginTop: 70 }
        ]}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDarkMode ? '#141414' : '#F5F5F5',
                color: isDarkMode ? '#FFFFFF' : '#000000',
                borderColor: isDarkMode ? '#222222' : '#DDDDDD',
                borderWidth: 1,
              }
            ]}
            placeholder="Enter addon URL..."
            placeholderTextColor={isDarkMode ? '#666666' : '#AAAAAA'}
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
        </View>
        
        <FlatList
          data={addons}
          renderItem={renderAddonItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.addonsList}
          ListEmptyComponent={() => (
            <View style={[
              styles.emptyContainer,
              Platform.OS === 'ios' ? { marginTop: 90 } : {}
            ]}>
              <MaterialIcons name="extension-off" size={48} color="#666666" />
              <Text style={[
                styles.emptyText,
                { color: isDarkMode ? '#999999' : '#666666' }
              ]}>
                No addons installed
              </Text>
            </View>
          )}
        />
      </>
    );
  };

  return (
    <TabScreenWrapper isActive={isActive} slideDirection={slideDirection}>
      <View style={[
        styles.container,
        { 
          backgroundColor: isDarkMode ? '#000000' : '#FFFFFF', 
          paddingTop: Platform.OS === 'ios' ? insets.top + 20 : insets.top + 10 
        }
      ]}>
        <BlurView 
          tint="dark"
          intensity={isDarkMode ? 100 : 99}
          style={[
            styles.headerBlur,
            { paddingTop: Platform.OS === 'ios' ? 20 : 10 }
          ]}
        >
          <View style={[
            styles.header,
            Platform.OS === 'ios' ? { paddingTop: 30 } : {}
          ]}>
            <Text style={styles.title}>Nuvio Addons</Text>
          </View>
          {renderTabHeader()}
        </BlurView>
        
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingContainer}
        >
          {activeTab === 'addons' ? renderAddonsContent() : renderCatalogsContent()}
        </KeyboardAvoidingView>
      </View>
    </TabScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  headerBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  tabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  activeTabButton: {
    backgroundColor: '#E50914',
  },
  tabButtonText: {
    color: '#757575',
    fontWeight: '600',
  },
  activeTabButtonText: {
    color: '#FFFFFF',
  },
  inputContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 60,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  installButton: {
    backgroundColor: '#E50914',
    borderRadius: 8,
    marginLeft: 8,
    height: 48,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  installButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addonsList: {
    paddingHorizontal: 16,
    paddingBottom: 100, // Increased to avoid content hiding under navigation
  },
  addonItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  addonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addonName: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  removeButton: {
    padding: 4,
  },
  addonDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  addonDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  addonBadge: {
    backgroundColor: '#E50914',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 8,
    marginBottom: 4,
  },
  addonBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  catalogsList: {
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 100,
  },
  catalogItem: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  catalogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dragHandle: {
    marginRight: 12,
  },
  catalogInfo: {
    flex: 1,
  },
  catalogName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  catalogAddon: {
    fontSize: 12,
  },
  catalogMetadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  catalogBadge: {
    backgroundColor: '#333333',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 8,
    marginBottom: 4,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
    padding: 8,
    alignItems: 'center',
  },
  infoIcon: {
    marginRight: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#AAAAAA',
    flex: 1,
  },
}); 