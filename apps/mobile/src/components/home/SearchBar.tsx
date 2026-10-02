import { useState, type ReactNode } from 'react';
import { Platform, StyleSheet, Text, TextInput, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { MAX_SEATS_PER_BOOKING, type Area, type Arrangement } from '../../api/types';
import { useI18n } from '../../i18n';
import { useLayout } from '../../layout';
import { AREAS } from '../../location/types';
import { colors, shadows } from '../../theme';
import { useType } from '../../typography';
import { Stepper } from '../form';
import { HomeSelect } from './HomeSelect';
import { HomeGoldButton } from './parts';

/**
 * The home search bar (index.html `.searchbox`), overlapping the hero: movie title, area, seat count, seat
 * arrangement and "Find matching shows". Desktop is one row with hairline dividers; phones stack the title, then
 * area | seats, then arrangement and the button.
 */
export function SearchBar({ query, onQuery, area, onArea, count, onCount, arrangement, onArrangement, onSubmit }: {
  query: string; onQuery: (q: string) => void; area: Area | ''; onArea: (a: Area | '') => void;
  count: number; onCount: (n: number) => void; arrangement: Arrangement; onArrangement: (a: Arrangement) => void;
  onSubmit: () => void;
}) {
  const { t } = useI18n();
  const { font } = useType();
  const { width, homeWide } = useLayout();
  const phone = width <= 580;
  const [focused, setFocused] = useState(false);

  const search = (
    <View style={[styles.searchField, homeWide ? { flex: 1, minWidth: 175 } : { minHeight: 36.5 }]}>
      <Text aria-hidden style={{ color: colors.muted, fontSize: 15 }}>⌕</Text>
      <TextInput
        value={query}
        onChangeText={onQuery}
        onSubmitEditing={onSubmit}
        placeholder={t.home.searchPlaceholder}
        placeholderTextColor="#91856b"
        accessibilityLabel={t.home.searchLabel}
        role="searchbox"
        returnKeyType="search"
        enterKeyHint="search"
        autoCorrect={false}
        autoCapitalize="none"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[font(400), styles.input, Platform.OS === 'web' && ({ outlineStyle: 'none' } as unknown as TextStyle)]}
      />
    </View>
  );
  const areaSelect = (
    <HomeSelect<Area | ''> label={t.home.areaLabel} value={area} onChange={onArea}
      options={[{ value: '', label: t.home.allCairoGiza }, ...AREAS.map((a) => ({ value: a, label: t.areas[a] }))]} />
  );
  const seats = (
    <Stepper compact label={t.home.seatsField} value={count} min={1} max={MAX_SEATS_PER_BOOKING} onChange={onCount}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }} />
  );
  const arrangementSelect = (
    <HomeSelect<Arrangement> label={t.home.arrangementLabel} value={arrangement} onChange={onArrangement}
      options={[{ value: 'either', label: t.home.arrEither }, { value: 'connected', label: t.home.arrConnected }, { value: 'separated', label: t.home.arrSeparated }]} />
  );
  const button = (
    <HomeGoldButton title={t.home.findMatchingShows} onPress={onSubmit} radius={13}
      style={homeWide ? { width: 132, paddingVertical: 10, paddingHorizontal: 9 } : { minHeight: 42, paddingVertical: 10 }} />
  );

  return (
    <View accessibilityRole="search" style={[styles.box, shadows.search, focused && { borderColor: colors.focus }]}>
      {homeWide ? (
        <View style={styles.row}>
          {search}
          <Cell width={155} divider pad={14}>{areaSelect}</Cell>
          <Cell width={128} divider pad={9}>{seats}</Cell>
          <Cell width={165} divider pad={14}>{arrangementSelect}</Cell>
          {button}
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {search}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Cell top pad={phone ? 7 : 9} style={{ flex: phone ? 1 : 2 }}>{areaSelect}</Cell>
            <Cell top pad={6} style={{ flex: 1 }}>{seats}</Cell>
            {!phone ? <Cell top pad={9} style={{ flex: 1 }}>{arrangementSelect}</Cell> : null}
          </View>
          {phone ? <Cell top pad={7}>{arrangementSelect}</Cell> : null}
          {button}
        </View>
      )}
    </View>
  );
}

/** One field of the bar. `divider`: the 1px line before it (desktop); `top`: the line above it (phones). */
function Cell({ children, width, divider, top, pad, style }: {
  children: ReactNode; width?: number; divider?: boolean; top?: boolean; pad: number; style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'stretch' }, width != null && { width }, top && styles.topLine, style]}>
      {divider ? <View style={styles.divider} /> : null}
      <View style={{ flex: 1, minWidth: 0, justifyContent: 'center', paddingHorizontal: pad, minHeight: top ? 42 : undefined }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.lineControl, borderRadius: 17, padding: 12 },
  row: { flexDirection: 'row', alignItems: 'stretch', gap: 10, minHeight: 56 },
  searchField: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 6, paddingHorizontal: 12 },
  input: { flex: 1, minWidth: 0, color: colors.ink, fontSize: 15, paddingVertical: 1, paddingHorizontal: 2 },
  divider: { width: 1, backgroundColor: colors.lineControl },
  topLine: { borderTopWidth: 1, borderTopColor: colors.lineControl },
});
