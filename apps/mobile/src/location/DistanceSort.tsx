import { ActivityIndicator, Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { Chips } from '../components/Chips';
import { Button } from '../components/ui';
import { useI18n } from '../i18n';
import type { Strings } from '../i18n/strings';
import { colors } from '../theme';
import { useType } from '../typography';
import { AREAS } from './types';
import type { DistanceSort, Near } from './useDistanceSort';

/** The device location couldn't be used; the customer is offered an area instead. */
const isProblem = (status: DistanceSort['status']) => status === 'denied' || status === 'unavailable' || status === 'timeout';

/**
 * "Sort by" in the Refine panel: soonest, or nearest to the device location or a picked area (BRD 7.1). The
 * origin sits in a dark box like the live search page's "Distance from" box.
 */
export function DistanceSortFilter({ ds }: { ds: DistanceSort }) {
  const { t } = useI18n();
  const { type } = useType();
  return (
    <>
      <Text style={[type.label, styles.label]}>{t.sortBy}</Text>
      <Chips variant="time" label={t.sortBy} value={ds.sort} onChange={ds.setSort}
        options={[{ value: 'soonest', label: t.booking.soonestShowtime }, { value: 'distance', label: t.booking.distanceSort }]} />
      {ds.sort === 'distance' && (
        <View style={styles.origin}>
          <Text style={[type.label, { marginBottom: 7 }]}>{t.distanceFrom}</Text>
          <Chips<Near> variant="time" label={t.distanceFrom} value={ds.near} onChange={ds.setNear}
            options={[{ value: 'here', label: t.useMyLocation }, ...AREAS.map((a) => ({ value: a, label: t.areas[a] }))]} />
          <LocationStatusLine ds={ds} />
        </View>
      )}
    </>
  );
}

/** Shown above the results while the Refine panel is closed, so a remembered distance sort is never a surprise. */
export function DistanceSortSummary({ ds, onChange }: { ds: DistanceSort; onChange: () => void }) {
  const { t } = useI18n();
  const { type } = useType();
  if (ds.sort !== 'distance') return null;
  const change = <Button kind="link" size="small" title={t.change} onPress={onChange} textStyle={{ fontSize: 12 }} style={{ paddingVertical: 2 }} />;
  if (ds.byDistance && ds.status !== 'locating' && ds.status !== 'slow') {
    return (
      <View style={styles.summary}>
        <Text style={[type.caption, { color: colors.ink, flexShrink: 1 }]}>
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
  const { t } = useI18n();
  const { type } = useType();
  const { status, near } = ds;

  if (status === 'locating' || status === 'slow') {
    return (
      <View style={[styles.status, { flexDirection: 'row', alignItems: 'center', gap: 8 }]} accessibilityLiveRegion="polite">
        <ActivityIndicator size="small" color={colors.gold} />
        <Text style={[type.micro, { flexShrink: 1 }]}>{status === 'slow' ? t.locatingSlow : t.locating}</Text>
      </View>
    );
  }
  if (isProblem(status)) {
    const message = status === 'denied' ? (Platform.OS === 'web' ? t.locationDeniedWeb : t.locationDeniedApp)
      : status === 'unavailable' ? t.locationUnavailable : t.locationTimeout;
    const action = (title: string, onPress: () => void) => (
      <Button kind="link" size="small" title={title} onPress={onPress} textStyle={{ fontSize: 12 }} style={{ paddingVertical: 2 }} />
    );
    return (
      <View style={[styles.status, styles.problem]} accessibilityLiveRegion="polite">
        <Text style={[type.small, { color: colors.ink }]}>{message}</Text>
        <View style={styles.actions}>
          {action(t.tryAgain, ds.retry)}
          {onPickArea && action(t.pickAnArea, onPickArea)}
          {status === 'denied' && Platform.OS !== 'web' && action(t.openSettings, () => Linking.openSettings())}
        </View>
      </View>
    );
  }
  if (near === 'here' && status === 'ready') return <Text style={[type.micro, styles.status]}>{t.fromHere}</Text>;
  if (!near) return <Text style={[type.micro, styles.status]}>{t.chooseOrigin}</Text>;
  return null;
}

/** "1.2 km from you" or "9.8 km from Maadi" on a result card. */
export const distanceText = (t: Strings, near: Near, km: number) =>
  near === 'here' ? t.kmFromYou(km) : near ? t.kmFromArea(km, t.areas[near]) : t.km(km);

const styles = StyleSheet.create({
  label: { marginTop: 14, marginBottom: 7 },
  origin: { backgroundColor: colors.control, borderRadius: 10, padding: 11, marginTop: 8 },
  status: { marginTop: 8 },
  problem: { borderWidth: 1, borderColor: colors.line, borderStartWidth: 3, borderStartColor: colors.gold, borderRadius: 10, padding: 10, backgroundColor: colors.bg },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, marginTop: 4 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
});
