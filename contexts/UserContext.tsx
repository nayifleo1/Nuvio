import React, { createContext, useContext, useCallback, useMemo, useState, useEffect } from 'react';
import profilesData from '@/data/users.json';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ExternalPlayerType = 'vlc' | 'outplayer' | 'infuse' | 'vidhub' | 'internal' | 'external';

export interface Profile {
    id: string;
    name: string;
    avatar: string;
}

export interface SavedContent {
    id: number;
    title: string;
    imageUrl: string;
    mediaType: 'movie' | 'tv';
    tmdbId: number;
    addedAt: string;
}

interface UserContextType {
    profiles: Profile[];
    selectedProfile: Profile | null;
    selectProfile: (profileId: string) => void;
    preferredPlayer: ExternalPlayerType;
    setPreferredPlayer: (player: ExternalPlayerType) => Promise<void>;
    likedContent: SavedContent[];
    myList: SavedContent[];
    addToLiked: (content: Omit<SavedContent, 'addedAt'>) => Promise<void>;
    removeFromLiked: (id: number) => Promise<void>;
    addToMyList: (content: Omit<SavedContent, 'addedAt'>) => Promise<void>;
    removeFromMyList: (id: number) => Promise<void>;
    isLiked: (id: number) => boolean;
    isInMyList: (id: number) => boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
    const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
    const [preferredPlayer, setPreferredPlayerState] = useState<ExternalPlayerType>('internal');
    const [likedContent, setLikedContent] = useState<SavedContent[]>([]);
    const [myList, setMyList] = useState<SavedContent[]>([]);

    // Load saved data when component mounts
    useEffect(() => {
        const loadSavedData = async () => {
            try {
                const [storedPlayer, storedLiked, storedMyList] = await Promise.all([
                    AsyncStorage.getItem('preferredPlayer'),
                    AsyncStorage.getItem('likedContent'),
                    AsyncStorage.getItem('myList')
                ]);

                if (storedPlayer) {
                    setPreferredPlayerState(storedPlayer as ExternalPlayerType);
                }
                if (storedLiked) {
                    setLikedContent(JSON.parse(storedLiked));
                }
                if (storedMyList) {
                    setMyList(JSON.parse(storedMyList));
                }
            } catch (error) {
                console.error('Failed to load saved data:', error);
            }
        };
        
        loadSavedData();
    }, []);

    // Save liked content to AsyncStorage whenever it changes
    useEffect(() => {
        const saveLikedContent = async () => {
            try {
                await AsyncStorage.setItem('likedContent', JSON.stringify(likedContent));
            } catch (error) {
                console.error('Failed to save liked content:', error);
            }
        };
        
        saveLikedContent();
    }, [likedContent]);

    // Save my list to AsyncStorage whenever it changes
    useEffect(() => {
        const saveMyList = async () => {
            try {
                await AsyncStorage.setItem('myList', JSON.stringify(myList));
            } catch (error) {
                console.error('Failed to save my list:', error);
            }
        };
        
        saveMyList();
    }, [myList]);

    const selectProfile = useCallback((profileId: string) => {
        const profile = profilesData.profiles.find(p => p.id === profileId);
        if (profile) {
            setSelectedProfile(profile);
        }
    }, []);

    const setPreferredPlayer = useCallback(async (player: ExternalPlayerType) => {
        try {
            await AsyncStorage.setItem('preferredPlayer', player);
            setPreferredPlayerState(player);
        } catch (error) {
            console.error('Failed to save preferred player:', error);
        }
    }, []);

    const addToLiked = useCallback(async (content: Omit<SavedContent, 'addedAt'>) => {
        setLikedContent(prev => {
            if (prev.some(item => item.id === content.id)) return prev;
            return [...prev, { ...content, addedAt: new Date().toISOString() }];
        });
    }, []);

    const removeFromLiked = useCallback(async (id: number) => {
        setLikedContent(prev => prev.filter(item => item.id !== id));
    }, []);

    const addToMyList = useCallback(async (content: Omit<SavedContent, 'addedAt'>) => {
        setMyList(prev => {
            if (prev.some(item => item.id === content.id)) return prev;
            return [...prev, { ...content, addedAt: new Date().toISOString() }];
        });
    }, []);

    const removeFromMyList = useCallback(async (id: number) => {
        setMyList(prev => prev.filter(item => item.id !== id));
    }, []);

    const isLiked = useCallback((id: number) => {
        return likedContent.some(item => item.id === id);
    }, [likedContent]);

    const isInMyList = useCallback((id: number) => {
        return myList.some(item => item.id === id);
    }, [myList]);

    const value = useMemo(() => ({
        profiles: profilesData.profiles,
        selectedProfile,
        selectProfile,
        preferredPlayer,
        setPreferredPlayer,
        likedContent,
        myList,
        addToLiked,
        removeFromLiked,
        addToMyList,
        removeFromMyList,
        isLiked,
        isInMyList
    }), [
        selectedProfile, 
        selectProfile, 
        preferredPlayer, 
        setPreferredPlayer,
        likedContent,
        myList,
        addToLiked,
        removeFromLiked,
        addToMyList,
        removeFromMyList,
        isLiked,
        isInMyList
    ]);

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
} 