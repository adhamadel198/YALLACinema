import { Stack } from 'expo-router';
import { LocaleDirContext } from 'expo-router/react-navigation';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { LanguageProvider, useI18n } from '../i18n';
import { useTheme } from '../theme';

export default function RootLayout() {
  return (
    <LanguageProvider>
      <AppStack />
    </LanguageProvider>
  );
}

function AppStack() {
  const theme = useTheme();
  const { dir, t } = useI18n();
  return (
    // LocaleDirContext flips headers, back buttons and tabs; the `direction` style flips our own layouts.
    <LocaleDirContext.Provider value={dir}>
      <View style={{ flex: 1, direction: dir, backgroundColor: theme.bg }}>
        <StatusBar style="auto" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: theme.bg },
            headerTintColor: theme.ink,
            contentStyle: { backgroundColor: theme.bg },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="movie/[id]" options={{ title: '' }} />
          <Stack.Screen name="showtime/[id]" options={{ title: t.chooseSeats }} />
          <Stack.Screen name="checkout/[holdId]" options={{ title: t.checkout }} />
          <Stack.Screen name="ticket/[id]" options={{ title: t.yourTicket }} />
        </Stack>
      </View>
    </LocaleDirContext.Provider>
  );
}
