import { useState, type ComponentProps, type ReactNode, type Ref } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { useI18n } from '../i18n';
import { colors, shadows } from '../theme';
import { useType } from '../typography';

// Form controls in the live site's look: cream fields on dark panels.

export type FieldProps = Omit<ComponentProps<typeof TextInput>, 'style' | 'secureTextEntry'> & {
  ref?: Ref<TextInput>;
  /** Shown above the field (12px, 800). Also the accessibility label unless you pass one. */
  label: string;
  /** Hide the visible label (still used as the accessibility label), e.g. the operator's inline search. */
  hideLabel?: boolean;
  /** Red line and message under the field; replaces the hint. */
  error?: string;
  /** Muted note under the field. */
  hint?: string;
  /** Email, phone, codes and passwords read left to right even in Arabic. */
  ltr?: boolean;
  /** A password, with a Show/Hide toggle at the end of the label row. */
  secret?: boolean;
  /** `dark` (default): label in light cream for dark panels. `cream`: label in brown, for cream boxes and sheets. */
  tone?: 'dark' | 'cream';
  /** Style for the outer block (margins, width). */
  style?: StyleProp<ViewStyle>;
  /** Style for the input box itself (height, width). */
  inputStyle?: ComponentProps<typeof TextInput>['style'];
};

/**
 * A labelled cream text field (live `.field`): 12px bold label, cream box with a gold-brown line, gold focus ring.
 * Example: `<Field label={t.email} value={email} onChangeText={setEmail} ltr keyboardType="email-address" error={err} />`
 */
export function Field({ ref, label, hideLabel, error, hint, ltr, secret, tone = 'dark', style, inputStyle, onFocus, onBlur, ...input }: FieldProps) {
  const { t, rtl } = useI18n();
  const { type, font } = useType();
  const [hidden, setHidden] = useState(true);
  const [focused, setFocused] = useState(false);
  const cream = tone === 'cream';
  return (
    <View style={[styles.field, style]}>
      {!hideLabel || secret ? (
        <View style={styles.labelRow}>
          {!hideLabel ? <Text style={[type.label, cream && { color: colors.verifyInk }]}>{label}</Text> : <View />}
          {secret ? (
            <Pressable onPress={() => setHidden((h) => !h)} accessibilityRole="button" hitSlop={8}>
              <Text style={[font(800), { color: cream ? colors.eyebrow : colors.link, fontSize: 12 }]}>{hidden ? t.shell.show : t.shell.hide}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor={colors.placeholder}
        accessibilityLabel={label}
        aria-invalid={!!error}
        secureTextEntry={secret && hidden}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        {...input}
        style={[
          styles.input,
          font(400),
          focused && [{ borderColor: colors.focus }, shadows.focusRing],
          !!error && { borderColor: colors.dangerLine },
          ltr && { direction: 'ltr', textAlign: rtl ? 'right' : 'left' },
          inputStyle,
        ]}
      />
      {error ? <Text role="alert" style={[type.caption, { color: cream ? colors.dangerOnCream : colors.danger }]}>{error}</Text>
        : hint ? <Text style={[type.caption, cream && { color: colors.creamMuted }]}>{hint}</Text> : null}
    </View>
  );
}

/**
 * A select: shows the chosen option and ⌄, and opens a list to pick from (a centred sheet; React Native has no
 * native select). `tone="cream"` looks like a Field box; `tone="bare"` is text only, for the home search bar.
 * Example: `<Select label={t.area} value={area} options={[{ value: '', label: 'All Cairo & Giza' }, …]} onChange={setArea} />`
 */
export function Select<T extends string>({ label, hideLabel, value, options, onChange, tone = 'cream', style, testID }: {
  label: string; hideLabel?: boolean; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void;
  tone?: 'cream' | 'bare'; style?: StyleProp<ViewStyle>; testID?: string;
}) {
  const { t } = useI18n();
  const { type, font } = useType();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value)?.label ?? '';
  const bare = tone === 'bare';
  return (
    <View style={[!bare && styles.field, style]}>
      {!hideLabel ? <Text style={type.label}>{label}</Text> : null}
      <Pressable
        testID={testID}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t.shell.select(label, current)}
        aria-expanded={open}
        style={[styles.selectBox, bare ? styles.selectBare : styles.input]}
      >
        <Text numberOfLines={1} style={[font(bare ? 500 : 400), { flex: 1, color: bare ? colors.inkPill : colors.fieldInk, fontSize: bare ? 13 : 15 }]}>{current}</Text>
        <Text aria-hidden style={{ color: bare ? colors.muted : colors.fieldInk, fontSize: 14 }}>⌄</Text>
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
    </View>
  );
}

/**
 * A number stepper drawn as a cream field: − value + (the movie page's "Number of seats").
 * `compact` is the small dark version for the home search bar.
 */
export function Stepper({ label, hideLabel, value, min = 1, max, onChange, compact, style }: {
  label: string; hideLabel?: boolean; value: number; min?: number; max: number; onChange: (n: number) => void;
  compact?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const { t } = useI18n();
  const { type, font } = useType();
  const ink = compact ? colors.inkPill : colors.fieldInk;
  const step = (d: number, sign: string, a11y: string) => {
    const off = d < 0 ? value <= min : value >= max;
    return (
      <Pressable onPress={() => onChange(value + d)} disabled={off} accessibilityRole="button" accessibilityLabel={a11y} aria-disabled={off} hitSlop={6}
        style={[compact ? styles.stepCompact : styles.stepBtn, off && { opacity: 0.35 }]}>
        <Text style={[font(700), { color: ink, fontSize: compact ? 16 : 20, lineHeight: compact ? 20 : 24 }]}>{sign}</Text>
      </Pressable>
    );
  };
  return (
    <View style={[!compact && styles.field, style]}>
      {!hideLabel ? <Text style={compact ? [type.tiny, { color: '#c6b991' }] : type.label}>{label}</Text> : null}
      <View style={[styles.stepper, compact ? styles.stepperCompact : styles.input, { direction: 'ltr' }]}>
        {step(-1, '−', t.shell.decrease(label))}
        <Text role="status" aria-live="polite" accessibilityLabel={`${label}: ${value}`}
          style={[font(compact ? 700 : 500), { color: ink, fontSize: compact ? 13 : 16, minWidth: 28, textAlign: 'center' }]}>{value}</Text>
        {step(1, '+', t.shell.increase(label))}
      </View>
    </View>
  );
}

/** A checkbox square (16px): gold with ✓ when checked. Decorative; put the role on the pressable row. */
export function CheckBox({ checked, tone = 'dark' }: { checked: boolean; tone?: 'dark' | 'cream' }) {
  return (
    <View aria-hidden style={[styles.box, { borderColor: tone === 'cream' ? colors.eyebrow : colors.muted }, checked && { backgroundColor: colors.gold, borderColor: colors.gold }]}>
      {checked ? <Text style={{ color: colors.onGold, fontSize: 11, lineHeight: 13, fontWeight: '900' }}>✓</Text> : null}
    </View>
  );
}

/**
 * A ticket row with a checkbox (live `.elig-ticket`): title + small line, checkbox at the start.
 * `hideBox` drops the checkbox for a plain tappable row (pass `trailing`, e.g. a → or a small button).
 * `tone="cream"` for cream sheets.
 */
export function CheckRow({ title, sub, checked = false, onToggle, disabled, hideBox, trailing, tone = 'dark', style, accessibilityLabel }: {
  title: string; sub?: string; checked?: boolean; onToggle?: () => void; disabled?: boolean; hideBox?: boolean; trailing?: ReactNode;
  tone?: 'dark' | 'cream'; style?: StyleProp<ViewStyle>; accessibilityLabel?: string;
}) {
  const { font } = useType();
  const cream = tone === 'cream';
  const body = (
    <>
      {!hideBox ? <CheckBox checked={checked} tone={tone} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={[font(700), { color: cream ? colors.fieldInk : colors.ink, fontSize: 15, lineHeight: 21 }]}>{title}</Text>
        {sub ? <Text style={[font(400), { color: cream ? colors.creamMuted : colors.muted, fontSize: 11, lineHeight: 17 }]}>{sub}</Text> : null}
      </View>
      {trailing}
    </>
  );
  const box = [
    styles.checkRow,
    cream && { borderColor: '#e2d5b5', backgroundColor: '#ffffff' },
    checked && !hideBox && (cream ? { borderColor: colors.eyebrow, backgroundColor: colors.badgeBg } : { borderColor: colors.gold }),
    disabled && { opacity: 0.55 },
    style,
  ];
  if (!onToggle) return <View style={box}>{body}</View>;
  return (
    <Pressable onPress={onToggle} disabled={disabled} style={box} accessibilityLabel={accessibilityLabel}
      accessibilityRole={hideBox ? 'button' : 'checkbox'} aria-checked={hideBox ? undefined : checked} aria-disabled={disabled}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6, marginVertical: 13 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input: {
    minHeight: 49, borderWidth: 1, borderColor: colors.fieldLine, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 13,
    backgroundColor: colors.fieldBg, color: colors.fieldInk, fontSize: 15,
  },
  selectBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectBare: { minHeight: 40, paddingHorizontal: 6 },
  backdrop: { flex: 1, backgroundColor: '#11100eb8', alignItems: 'center', justifyContent: 'center', padding: 16 },
  sheet: { width: '100%', maxWidth: 380, backgroundColor: colors.panel, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 12, ...shadows.panel },
  option: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 10, borderRadius: 10 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 0, paddingHorizontal: 4, minHeight: 46 },
  stepperCompact: { minHeight: 32, gap: 2 },
  stepBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  stepCompact: { width: 26, height: 28, alignItems: 'center', justifyContent: 'center' },
  box: { width: 16, height: 16, borderRadius: 3, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 11, padding: 12, marginVertical: 8 },
});
