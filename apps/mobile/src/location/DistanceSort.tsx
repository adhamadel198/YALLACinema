import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Chips } from '../components/Chips';
import { useI18n } from '../i18n';
import type { Strings } from '../i18n/strings';
import { useTheme } from '../theme';
import { AREAS } from './types';
import type { DistanceSort, Near } from './useDistanceSort';

/** The device location couldn't be used; the customer is offered an area instead. */
const isProblem = (status: DistanceSort['status']) => status === 'denied' || status === 'unavailable' || status === 'timeout';

/** "Sort by" in the Filters panel: soonest, or nearest to the device location or a picked area (BRD 7.1). */
export function DistanceSortFilter({ ds }: { ds: DistanceSort }) {
  const theme = useTheme();
  const { t } = useI18n();
  return (
    <>
      <Text style={[styles.label, { color: theme.muted }]}>{t.sortBy}</Text>
      <Chips label={t.sortBy} value={ds.sort} onChange={ds.setSort}
        options={[{ value: 'soonest', label: t.soonest }, { value: 'distance', label: t.nearest }]} />
      {ds.sort === 'distance' && (
        <>
          <Text style={[styles.label, { color: theme.muted }]}>{t.distanceFrom}</Text>
          <Chips<Near> label={t.distanceFrom} value={ds.near} onChange={ds.setNear}
            options={[{ value: 'here', label: t.useMyLocation }, ...AREAS.map((a) => ({ value: a, label: t.areas[a] }))]} />
          <LocationStatusLine ds={ds} />
        </>
      )}
    </>
  );
}

/** Shown above the results while the Filters panel is closed, so a remembered distance sort is never a surprise. */
export function DistanceSortSummary({ ds, onChange }: { ds: DistanceSort; onChange: () => void }) {
  const theme = useTheme();
  const { t } = useI18n();
  if (ds.sort !== 'distance') return null;
  const change = (
    <Pressable onPress={onChange} accessibilityRole="button" hitSlop={8}>
      <Text style={{ color: theme.accent, fontWeight: '700' }}>{t.change}</Text>
    </Pressable>
  );
  if (ds.byDistance && ds.status !== 'locating' && ds.status !== 'slow') {
    return (
      <View style={styles.summary}>
        <Text style={{ color: theme.ink, fontWeight: '700', flexShrink: 1 }}>
          {ds.near === 'here' ? t.nearestFromHere : t.nearestFromArea(t.areas[ds.near])}
        </Text>
        {change}
      </View>
    );
  }
  // The area chips are in the closed panel, so a problem message offers to open it.
  if (isProblem(ds.status)) return <View style={{ marginTop: 10 }}><LocationStatusLine ds={ds} onPickArea={onChange} /></View>;
  return (
    <View style={[styles.summary, { alignItems: 'flex-start' }]}>
      <View style={{ flexShrink: 1 }}><LocationStatusLine ds={ds} /></View>
      <View style={styles.status}>{change}</View>
    </View>
  );
}

/** What is happening with the device location, and what to do when it can't be used. */
function LocationStatusLine({ ds, onPickArea }: { ds: DistanceSort; onPickArea?: () => void }) {
  const theme = useTheme();
  const { t } = useI18n();
  const { status, near } = ds;

  if (status === 'locating' || status === 'slow') {
    return (
      <View style={[styles.status, { flexDirection: 'row', alignItems: 'center', gap: 8 }]} accessibilityLiveRegion="polite">
        <ActivityIndicator size="small" color={theme.accent} />
        <Text style={{ color: theme.muted, fontSize: 13, flexShrink: 1 }}>{status === 'slow' ? t.locatingSlow : t.locating}</Text>
      </View>
    );
  }
  if (isProblem(status)) {
    const message = status === 'denied' ? (Platform.OS === 'web' ? t.locationDeniedWeb : t.locationDeniedApp)
      : status === 'unavailable' ? t.locationUnavailable : t.locationTimeout;
    return (
      <View style={[styles.status, styles.problem, { borderColor: theme.accent, backgroundColor: theme.bg }]} accessibilityLiveRegion="polite">
        <Text style={{ color: theme.ink, fontSize: 13, lineHeight: 19 }}>{message}</Text>
        <View style={styles.actions}>
          <Pressable onPress={ds.retry} accessibilityRole="button" hitSlop={8}>
            <Text style={{ color: theme.accent, fontWeight: '700' }}>{t.tryAgain}</Text>
          </Pressable>
          {onPickArea && (
            <Pressable onPress={onPickArea} accessibilityRole="button" hitSlop={8}>
              <Text style={{ color: theme.accent, fontWeight: '700' }}>{t.pickAnArea}</Text>
            </Pressable>
          )}
          {status === 'denied' && Platform.OS !== 'web' && (
            <Pressable onPress={() => Linking.openSettings()} accessibilityRole="button" hitSlop={8}>
              <Text style={{ color: theme.accent, fontWeight: '700' }}>{t.openSettings}</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }
  if (near === 'here' && status === 'ready') return <Text style={[styles.status, { color: theme.muted, fontSize: 12 }]}>{t.fromHere}</Text>;
  if (!near) return <Text style={[styles.status, { color: theme.muted, fontSize: 12 }]}>{t.chooseOrigin}</Text>;
  return null;
}

/** "1.2 km from you" or "9.8 km from Maadi" on a result card. */
export const distanceText = (t: Strings, near: Near, km: number) =>
  near === 'here' ? t.kmFromYou(km) : near ? t.kmFromArea(km, t.areas[near]) : t.km(km);

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '700', marginTop: 10, marginBottom: 6 },
  status: { marginTop: 8 },
  problem: { borderWidth: 1, borderStartWidth: 3, borderRadius: 10, padding: 10 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, marginTop: 8 },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 12 },
});
