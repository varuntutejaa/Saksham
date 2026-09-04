import { DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/lib/auth';
import { StoreProvider } from '@/lib/store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Saksham is light-theme-only by design — see src/theme/index.ts.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StoreProvider>
          <AuthProvider>
            <ThemeProvider value={DefaultTheme}>
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: 'slide_from_right',
                  contentStyle: { backgroundColor: 'transparent' },
                }}>
                <Stack.Screen name="index" options={{ animation: 'fade' }} />
                <Stack.Screen name="language" />
                <Stack.Screen name="auth" />
                <Stack.Screen name="home" />
                <Stack.Screen name="results" />
              </Stack>
              <StatusBar style="dark" />
            </ThemeProvider>
          </AuthProvider>
        </StoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
