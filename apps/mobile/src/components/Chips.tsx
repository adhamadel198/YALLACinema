import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type PressableStateCallbackType, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { colors, shadows } from '../theme';
import { useType, type Weight } from '../typography';

/**
 * Chip looks of the live site:
 * - `pill`   home genre filter: round, dark; on = gold line + gold text (the default)
 * - `time`   `.timebtn`: small dark box (show times)
 * - `choice` `.match-choice`: dark box, 11px (seat-group picker); on = gold + ring
 * - `pay`    `.payopt`: large dark box that grows to fill (payment method, language)
 * - `cream`  `.match-choice` on cream surfaces (resale buy/sell)
 * - `tab`    resale area tabs: cream
 * - `side`   operator sidebar item: text only; on = cream block
 */
export type ChipVariant = 'pill' | 'time' | 'choice' | 'pay' | 'cream' | 'tab' | 'side';

type Look = { box: ViewStyle; on: ViewStyle; ink: string; inkOn: string; size: number; weight: Weight; weightOn?: Weight; ring?: boolean };

const LOOKS: Record<ChipVariant, Look> = {
  pill: {
    box: { borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.lineControl, backgroundColor: colors.surface },
    on: { borderColor: colors.gold, backgroundColor: colors.chipOn }, ink: colors.chipInk, inkOn: colors.goldSelected, size: 15, weight: 400,
  },
  time: {
    box: { borderRadius: 9, paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.lineControl, backgroundColor: colors.control },
    on: { borderColor: colors.gold, backgroundColor: colors.controlOn }, ink: colors.inkControl, inkOn: colors.goldSelected, size: 12, weight: 500, weightOn: 700,
  },
  choice: {
    box: { borderRadius: 10, paddingVertical: 8, paddingHorizontal: 11, borderWidth: 1, borderColor: '#55472d', backgroundColor: colors.control },
    on: { borderColor: colors.gold, backgroundColor: colors.controlOn }, ink: colors.tagInk, inkOn: colors.goldSelected, size: 11, weight: 700, ring: true,
  },
  pay: {
    box: { flexGrow: 1, flexBasis: 0, borderRadius: 10, padding: 13, borderWidth: 1, borderColor: colors.lineControl, backgroundColor: colors.control, alignItems: 'center' },
    on: { borderColor: colors.gold, backgroundColor: colors.controlOn }, ink: colors.inkControl, inkOn: colors.goldSelected, size: 15, weight: 700,
  },
  cream: {
    box: { borderRadius: 10, paddingVertical: 8, paddingHorizontal: 11, borderWidth: 1, borderColor: '#ded0ad', backgroundColor: colors.fieldBg },
    on: { borderColor: colors.eyebrow, backgroundColor: colors.badgeBg }, ink: '#554a32', inkOn: '#6f5018', size: 13, weight: 700, ring: true,
  },
  tab: {
    box: { borderRadius: 9, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.creamLine, backgroundColor: colors.fieldBg },
    on: { borderColor: colors.gold, backgroundColor: '#f0e4c5' }, ink: '#756b56', inkOn: colors.softInk, size: 15, weight: 700,
  },
  side: {
    box: { borderRadius: 9, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: 'transparent' },
    on: { backgroundColor: '#f1e6c9' }, ink: colors.mutedSoft, inkOn: colors.softInk, size: 15, weight: 400, weightOn: 800,
  },
};

type Hoverable = PressableStateCallbackType & { hovered?: boolean };

/**
 * One selectable chip. `role` defaults to radio (inside a `Chips` group); use 'button' for a lone toggle,
 * 'checkbox' for multi-select. Pass `children` to draw your own content instead of `label`.
 */
export function ChoiceChip({ label, selected, onPress, variant = 'pill', disabled, role = 'radio', accessibilityLabel, style, textStyle, children, testID }: {
  label?: string; selected: boolean; onPress: () => void; variant?: ChipVariant; disabled?: boolean;
  role?: 'radio' | 'checkbox' | 'button' | 'tab'; accessibilityLabel?: string; style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>; children?: ReactNode; testID?: string;
}) {
  const { font } = useType();
  const look = LOOKS[variant];
  const checkable = role === 'radio' || role === 'checkbox';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel}
      aria-checked={checkable ? selected : undefined}
      aria-selected={role === 'tab' ? selected : undefined}
      aria-pressed={role === 'button' ? selected : undefined}
      aria-disabled={disabled}
      style={(state: Hoverable) => [
        look.box,
        selected && look.on,
        selected && look.ring && shadows.choiceRing,
        !selected && state.hovered && !disabled && (variant === 'side' ? { backgroundColor: '#ffffff08' } : { borderColor: colors.gold }),
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      {children ?? (
        <Text numberOfLines={1} style={[font(selected ? (look.weightOn ?? look.weight) : look.weight), { color: selected ? look.inkOn : look.ink, fontSize: look.size, lineHeight: Math.round(look.size * 1.45) }, textStyle]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

/**
 * A single-choice group of chips. `variant` picks the look (default `pill`). `scroll` keeps them on one line that
 * scrolls sideways (genre chips, resale area tabs, operator days on phones); `column` stacks them (operator sidebar).
 */
export function Chips<T extends string>({ options, value, onChange, label, variant = 'pill', scroll, column, gap, style }: {
  options: { value: T; label: string; accessibilityLabel?: string }[]; value: T; onChange: (v: T) => void; label?: string;
  variant?: ChipVariant; scroll?: boolean; column?: boolean; gap?: number; style?: StyleProp<ViewStyle>;
}) {
  const spacing = gap ?? (variant === 'pill' ? 9 : variant === 'side' ? 4 : 8);
  const chips = options.map((o) => (
    <ChoiceChip key={o.value} label={o.label} accessibilityLabel={o.accessibilityLabel} variant={variant}
      selected={o.value === value} onPress={() => onChange(o.value)} />
  ));
  if (scroll) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="radiogroup" accessibilityLabel={label}
        style={style} contentContainerStyle={[styles.row, { gap: spacing, flexWrap: 'nowrap' }]}>
        {chips}
      </ScrollView>
    );
  }
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label}
      style={[column ? { gap: spacing } : [styles.row, { gap: spacing }], variant === 'pay' && { flexWrap: 'nowrap' }, style]}>
      {chips}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
});
