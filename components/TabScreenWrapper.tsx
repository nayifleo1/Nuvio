import { View } from 'react-native';
import React, { useEffect } from 'react';
import Animated, {
    useAnimatedStyle,
    withTiming,
    useSharedValue,
    Easing
} from 'react-native-reanimated';

interface Props {
    children: React.ReactNode;
    isActive: boolean;
    slideDirection: 'left' | 'right';
}

export function TabScreenWrapper({ children, isActive, slideDirection }: Props) {
    // Use more subtle translation values
    const opacity = useSharedValue(isActive ? 1 : 0);
    const translateX = useSharedValue(isActive ? 0 : slideDirection === 'left' ? -30 : 30);
    
    // Update values when active state changes
    useEffect(() => {
        if (isActive) {
            // Smoother, more subtle transition
            opacity.value = withTiming(1, { duration: 300, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
            translateX.value = withTiming(0, { duration: 300, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
        } else {
            // Subtle fade out
            opacity.value = withTiming(0, { duration: 200, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
            translateX.value = withTiming(slideDirection === 'left' ? -20 : 20, 
                { duration: 200, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
        }
    }, [isActive, slideDirection]);
    
    const animatedStyle = useAnimatedStyle(() => {
        return {
            opacity: opacity.value,
            transform: [{ translateX: translateX.value }],
            backgroundColor: '#000', // Ensure black background during animation
        };
    });
    
    // If the screen is not active, still render it with zero opacity for smooth transitions
    return (
        <View style={{ flex: 1, backgroundColor: '#000' }}>
            <Animated.View 
                style={[
                    { 
                        flex: 1,
                        backgroundColor: '#000',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                    },
                    animatedStyle
                ]}
                pointerEvents={isActive ? 'auto' : 'none'}
            >
                {children}
            </Animated.View>
        </View>
    );
} 