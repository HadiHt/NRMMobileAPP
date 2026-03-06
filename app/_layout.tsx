import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import 'react-native-reanimated';
import { AuthProvider } from '../src/auth/AuthContext';

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'android') {
      // Make the Android navigation bar transparent and immersive
      NavigationBar.setPositionAsync('absolute');
      NavigationBar.setBackgroundColorAsync('transparent');
      NavigationBar.setBehaviorAsync('overlay-swipe');
      NavigationBar.setVisibilityAsync('hidden');
    }
  }, []);

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="task-detail" options={{ presentation: 'card' }} />
        <Stack.Screen name="login" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="auth/callback" options={{ presentation: 'card' }} />
      </Stack>
      <StatusBar style="light" translucent />
    </AuthProvider>
  );
}
