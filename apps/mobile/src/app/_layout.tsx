import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import type { NativeStackHeaderProps } from 'expo-router/native-stack';
import { LocaleDirContext } from 'expo-router/react-navigation';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { AuthProvider } from '../auth';
import { SiteHeader } from '../components/shell/Header';
import { StackBottomNav } from '../components/shell/TabBar';
import { useAppFonts } from '../fonts';
import { LanguageProvider, useI18n } from '../i18n';
import { colors } from '../theme';

// Keep the splash screen up until the fonts and the saved language are ready.
SplashScreen.preventAutoHideAsync().catch(() => {});

/** Navigation chrome (screen backgrounds between transitions, default borders) in the site's colours. */
const NAV_THEME = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, primary: colors.gold, background: colors.bg, card: colors.bg, text: colors.ink, border: colors.lineHeader, notification: colors.gold },
};

export default function RootLayout() {
  const fontsReady = useAppFonts();
  return (
    <LanguageProvider>
      <AuthProvider>
        {fontsReady ? <AppStack /> : null}
      </AuthProvider>
    </LanguageProvider>
  );
}

/** Stack screens get the site header: desktop nav on wide web, else logo with a back button. */
function StackHeader({ navigation, options, back }: NativeStackHeaderProps) {
  const { headerLeft } = options;
  // A screen can supply its own back action (e.g. the operator screen opened from a link, with nothing to go back to).
  const left = headerLeft ? headerLeft({ tintColor: colors.ink, canGoBack: !!back }) : undefined;
  return <SiteHeader onBack={back ? () => navigation.goBack() : undefined} left={left ?? undefined} />;
}

function AppStack() {
  const { dir, t } = useI18n();
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);
  return (
    // LocaleDirContext flips headers, back buttons and tabs; the `direction` style flips our own layouts.
    <LocaleDirContext.Provider value={dir}>
      <ThemeProvider value={NAV_THEME}>
        <View style={{ flex: 1, direction: dir, backgroundColor: colors.bg }}>
          {/* The app is always dark, like the live site. */}
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              header: (props) => <StackHeader {...props} />,
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            {/* Titles name the browser tab and the screen for assistive tech; the header shows the logo instead. */}
            <Stack.Screen name="movie/[id]" options={{ title: '' }} />
            <Stack.Screen name="showtime/[id]" options={{ title: t.chooseSeats }} />
            <Stack.Screen name="checkout/[holdId]" options={{ title: t.checkout }} />
            <Stack.Screen name="ticket/[id]" options={{ title: t.yourTicket }} />
            {/* Newer screens set their own title with <Stack.Screen options> inside the screen. */}
          </Stack>
          <StackBottomNav />
        </View>
      </ThemeProvider>
    </LocaleDirContext.Provider>
  );
}
