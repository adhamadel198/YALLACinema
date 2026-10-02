import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, type PressableStateCallbackType } from 'react-native';
import { useI18n } from '../../i18n';
import { colors, shadows } from '../../theme';
import { useType } from '../../typography';

type Hoverable = PressableStateCallbackType & { hovered?: boolean };

/**
 * A select drawn like the live search bar's `<select>`: the value in ivory with a chevron at the far end, filling its
 * cell. It opens the same centred option sheet as the shared `Select` (components/form.tsx), whose bare trigger
 * puts the chevron next to the text and low on the line.
 * - `look="pill"`: a small dark pill sized to its text, like the live header's "⌖ Cairo, Egypt ⌄" button, with an
 *   optional `icon` before the value.
 * - `placeholder`: shown when no option has the value.
 * - `open` / `onOpenChange`: open the sheet from elsewhere (e.g. "Pick an area" in a location message).
 */
export function HomeSelect<T extends string>({ label, value, options, onChange, look = 'cell', icon, placeholder, open: openProp, onOpenChange, testID }: {
  label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; look?: 'cell' | 'pill';
  icon?: string; placeholder?: string; open?: boolean; onOpenChange?: (open: boolean) => void; testID?: string;
}) {
  const { t } = useI18n();
  const { type, font } = useType();
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = (o: boolean) => { setOpenState(o); onOpenChange?.(o); };
  const current = options.find((o) => o.value === value)?.label;
  const pill = look === 'pill';
  return (
    <>
      <Pressable testID={testID} onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={t.shell.select(label, current ?? placeholder ?? '')}
        aria-expanded={open} style={(s: Hoverable) => [pill ? styles.pill : styles.trigger, s.hovered && (pill ? { borderColor: colors.gold } : { opacity: 0.85 })]}>
        {icon ? <Text aria-hidden style={[font(400), { color: colors.kicker, fontSize: 13, lineHeight: 18 }]}>{icon}</Text> : null}
        <Text numberOfLines={1} style={[font(pill ? 500 : 400), pill ? styles.pillValue : styles.value, !current && { color: colors.placeholder }]}>
          {current ?? placeholder}
        </Text>
        <View aria-hidden style={styles.chevron} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel={t.shell.closeList} />
          <View style={styles.sheet} role="radiogroup" aria-label={label}>
            <Text style={[type.eyebrow, { marginBottom: 8, paddingHorizontal: 8 }]}>{label}</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {options.map((o) => {
                const on = o.value === value;
                return (
                  <Pressable key={o.value} role="radio" aria-checked={on}
                    onPress={() => { setOpen(false); if (!on) onChange(o.value); }}
                    style={({ pressed }) => [styles.option, on && { backgroundColor: colors.controlOn }, pressed && { backgroundColor: colors.control }]}>
                    <Text style={[font(on ? 700 : 400), { color: on ? colors.goldSelected : colors.ink, fontSize: 15 }]}>{o.label}</Text>
                    {on ? <Text style={{ color: colors.goldSelected }}>✓</Text> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40, alignSelf: 'stretch' },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', minHeight: 36, paddingVertical: 7, paddingHorizontal: 13,
    borderRadius: 10, borderWidth: 1, borderColor: colors.linePill, backgroundColor: colors.surface,
  },
  value: { flex: 1, minWidth: 0, color: colors.ink, fontSize: 13, lineHeight: 18 },
  pillValue: { flexShrink: 1, minWidth: 0, color: colors.inkPill, fontSize: 13, lineHeight: 18 },
  // A small "v" drawn with two borders, so it sits on the text's middle in every font.
  chevron: { width: 7, height: 7, borderRightWidth: 1.8, borderBottomWidth: 1.8, borderColor: colors.ink, transform: [{ rotate: '45deg' }], marginTop: -4, marginHorizontal: 2 },
  backdrop: { flex: 1, backgroundColor: '#11100eb8', alignItems: 'center', justifyContent: 'center', padding: 16 },
  sheet: { width: '100%', maxWidth: 380, backgroundColor: colors.panel, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 12, ...shadows.panel },
  option: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 10, borderRadius: 10 },
});
