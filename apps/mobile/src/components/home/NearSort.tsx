import { useState } from 'react';
import { ActivityIndicator, Linking, Platform, Text, View } from 'react-native';
import { useI18n } from '../../i18n';
import { AREAS } from '../../location/types';
import type { DistanceSort, Near } from '../../location/useDistanceSort';
import { colors } from '../../theme';
import { useType } from '../../typography';
import { ChoiceChip } from '../Chips';
import { TextLink } from '../ui';
import { HomeSelect } from './HomeSelect';

const isProblem = (status: DistanceSort['status']) => status === 'denied' || status === 'unavailable' || status === 'timeout';

/**
 * "Sort by" for Popular showtimes: soonest, or nearest to the device location or an area (the app's distance sort,
 * shared with the movie screen through `useDistanceSort`). Choosing "Nearest" asks for the location only then;
 * the "from" pill switches to an area. Failures say why and offer "Try again" and "Pick an area".
 */
export function NearSort({ ds }: { ds: DistanceSort }) {
  const { t } = useI18n();
  const { font } = useType();
  const [picking, setPicking] = useState(false);
  const nearest = ds.sort === 'distance';

  const choose = (sort: DistanceSort['sort']) => {
    if (sort === ds.sort) return;
    ds.setSort(sort);
    // The customer asked for nearest: use their location unless they measured from an area before.
    if (sort === 'distance' && !ds.near) ds.setNear('here');
  };
  const small = { paddingVertical: 6, paddingHorizontal: 13 };
  const smallText = { fontSize: 13, lineHeight: 19 };

  return (
    <View style={{ marginTop: -6, marginBottom: 18, gap: 10 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 9, rowGap: 8 }}>
        <Text style={[font(800), { color: colors.fieldLabel, fontSize: 12, lineHeight: 18, marginEnd: 2 }]}>{t.home.sortBy}</Text>
        <View role="radiogroup" aria-label={t.home.sortBy} style={{ flexDirection: 'row', gap: 8 }}>
          <ChoiceChip label={t.home.sortSoonest} selected={!nearest} onPress={() => choose('soonest')} style={small} textStyle={smallText} />
          <ChoiceChip label={t.home.sortNearest} selected={nearest} onPress={() => choose('distance')} style={small} textStyle={smallText} />
        </View>
        {nearest ? (
          <HomeSelect<Near> look="pill" icon="⌖" label={t.home.distanceFrom} value={ds.near} onChange={ds.setNear}
            placeholder={t.home.pickPlace} open={picking} onOpenChange={setPicking}
            options={[{ value: 'here', label: t.home.myLocation }, ...AREAS.map((a) => ({ value: a, label: t.areas[a] }))]} />
        ) : null}
      </View>
      {nearest ? <LocationStatus ds={ds} onPickArea={() => setPicking(true)} /> : null}
    </View>
  );
}

/** What is happening with the device location, and what to do when it can't be used. */
function LocationStatus({ ds, onPickArea }: { ds: DistanceSort; onPickArea: () => void }) {
  const { t } = useI18n();
  const { font } = useType();
  const { status, near } = ds;
  const note = [font(400), { color: colors.muted, fontSize: 12, lineHeight: 18 }];

  if (status === 'locating' || status === 'slow') {
    return (
      <View role="status" aria-live="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <ActivityIndicator size="small" color={colors.gold} />
        <Text style={[note, { flexShrink: 1 }]}>{status === 'slow' ? t.locatingSlow : t.locating}</Text>
      </View>
    );
  }
  if (isProblem(status)) {
    const message = status === 'denied' ? (Platform.OS === 'web' ? t.locationDeniedWeb : t.locationDeniedApp)
      : status === 'unavailable' ? t.locationUnavailable : t.locationTimeout;
    return (
      <View role="alert" style={{ backgroundColor: colors.alertBg, borderColor: colors.alertLine, borderWidth: 1, borderRadius: 11, paddingVertical: 11, paddingHorizontal: 14, gap: 4, maxWidth: 720 }}>
        <Text style={[font(400), { color: colors.alertInk, fontSize: 13, lineHeight: 19.5 }]}>{message}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 18 }}>
          <TextLink title={t.tryAgain} onPress={ds.retry} size={13} />
          <TextLink title={t.pickAnArea} onPress={onPickArea} size={13} />
          {status === 'denied' && Platform.OS !== 'web' ? <TextLink title={t.openSettings} onPress={() => Linking.openSettings()} size={13} /> : null}
        </View>
      </View>
    );
  }
  if (near === 'here' && status === 'ready') return <Text role="status" style={note}>{t.fromHere}</Text>;
  if (!near) return <Text role="status" style={note}>{t.chooseOrigin}</Text>;
  return null;
}
