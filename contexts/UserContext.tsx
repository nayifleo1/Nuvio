import React, { createContext, useContext, useCallback, useMemo, useState, useEffect } from 'react';
import profilesData from '@/data/users.json';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ExternalPlayerType = 'vlc' | 'outplayer' | 'infuse' | 'vidhub' | 'internal' | 'external';

export interface Profile {
    id: string;
    name: string;
    avatar: string;
}

interface UserContextType {
    profiles: Profile[];
    selectedProfile: Profile | null;
    selectProfile: (profileId: string) => void;
    preferredPlayer: ExternalPlayerType;
    setPreferredPlayer: (player: ExternalPlayerType) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
    const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
    const [preferredPlayer, setPreferredPlayerState] = useState<ExternalPlayerType>('internal');

    // Load preferred player from storage when component mounts
    useEffect(() => {
        const loadPreferredPlayer = async () => {
            try {
                const storedPlayer = await AsyncStorage.getItem('preferredPlayer');
                if (storedPlayer) {
                    setPreferredPlayerState(storedPlayer as ExternalPlayerType);
                }
            } catch (error) {
                console.error('Failed to load preferred player:', error);
            }
        };
        
        loadPreferredPlayer();
    }, []);

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

    const value = useMemo(() => ({
        profiles: profilesData.profiles,
        selectedProfile,
        selectProfile,
        preferredPlayer,
        setPreferredPlayer
    }), [selectedProfile, selectProfile, preferredPlayer, setPreferredPlayer]);

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