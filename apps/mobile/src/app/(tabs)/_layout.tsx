import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';
import { LanguageButton } from '../../components/LanguageButton';
import { useI18n } from '../../i18n';
import { useTheme } from '../../theme';

const icon = (glyph: string) => ({ color }: { color: ColorValue }) => <Text style={{ color, fontSize: 18 }}>{glyph}</Text>;

export default function TabsLayout() {
  const theme = useTheme();
  const { t } = useI18n();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.bg },
        headerTintColor: theme.ink,
        headerRight: () => <LanguageButton />,
        tabBarStyle: { backgroundColor: theme.bg, borderTopColor: theme.line },
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.muted,
        sceneStyle: { backgroundColor: theme.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t.tabMovies, tabBarIcon: icon('▶') }} />
      <Tabs.Screen name="resale" options={{ title: t.tabResale, tabBarIcon: icon('⇄') }} />
      <Tabs.Screen name="tickets" options={{ title: t.tabTickets, tabBarIcon: icon('▭') }} />
      <Tabs.Screen name="account" options={{ title: t.tabProfile, tabBarIcon: icon('◯') }} />
    </Tabs>
  );
}
