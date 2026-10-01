import { useState, type ComponentProps, type ReactNode, type Ref } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useI18n } from '../i18n';
import { useTheme } from '../theme';
import { Button, Panel } from './ui';

/** Kicker, heading and intro at the top of the sign-in and sign-up screens. */
export function FormIntro({ kicker, heading, body }: { kicker: string; heading: string; body: string }) {
  const theme = useTheme();
  const { rtl } = useI18n();
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={[styles.kicker, { color: theme.accent }, rtl && styles.noTracking]}>{kicker}</Text>
      <Text style={[styles.heading, { color: theme.ink }, rtl && styles.noTracking]}>{heading}</Text>
      <Text style={[styles.body, { color: theme.muted }]}>{body}</Text>
    </View>
  );
}

type FieldProps = Omit<ComponentProps<typeof TextInput>, 'style' | 'secureTextEntry'> & {
  ref?: Ref<TextInput>;
  label: string;
  /** Shown under the field, in place of the hint, once the person has tried to submit. */
  error?: string;
  hint?: string;
  /** Email, phone and password read left to right even in Arabic. */
  ltr?: boolean;
  /** A password, with a show/hide toggle. */
  secret?: boolean;
};

export function Field({ ref, label, error, hint, ltr, secret, ...input }: FieldProps) {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const [hidden, setHidden] = useState(true);
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
        {secret && (
          <Pressable onPress={() => setHidden((h) => !h)} accessibilityRole="button" hitSlop={8}>
            <Text style={{ color: theme.accent, fontWeight: '700', fontSize: 13 }}>{hidden ? t.authShowPassword : t.authHidePassword}</Text>
          </Pressable>
        )}
      </View>
      <TextInput
        ref={ref}
        placeholderTextColor={theme.muted}
        accessibilityLabel={label}
        aria-invalid={!!error}
        secureTextEntry={secret && hidden}
        {...input}
        style={[
          styles.input,
          { color: theme.ink, borderColor: error ? theme.accent : theme.line, backgroundColor: theme.panel },
          ltr && { direction: 'ltr', textAlign: lang === 'ar' ? 'right' : 'left' },
        ]}
      />
      {error ? <Text style={[styles.note, { color: theme.accent }]}>{error}</Text>
        : hint ? <Text style={[styles.note, { color: theme.muted }]}>{hint}</Text> : null}
    </View>
  );
}

/** A failed submit, with an optional way forward (e.g. "Sign in instead"). */
export function FormError({ text, action }: { text: string; action?: { title: string; onPress: () => void } }) {
  const theme = useTheme();
  return (
    <View accessibilityRole="alert" style={[styles.error, { borderColor: theme.accent, backgroundColor: theme.panel }]}>
      <Text style={{ color: theme.ink, fontWeight: '600' }}>{text}</Text>
      {action && (
        <Pressable onPress={action.onPress} accessibilityRole="button" hitSlop={6} style={{ marginTop: 6, alignSelf: 'flex-start' }}>
          <Text style={{ color: theme.accent, fontWeight: '800' }}>{action.title}</Text>
        </Pressable>
      )}
    </View>
  );
}

/** Shown instead of the form to someone already signed in (e.g. opening a saved sign-in link). */
export function SignedInNotice({ email, onContinue }: { email: string; onContinue: () => void }) {
  const theme = useTheme();
  const { t } = useI18n();
  return (
    <ScrollView contentContainerStyle={{ padding: 24 }}>
      <Panel>
        <Text style={{ color: theme.ink, fontSize: 16, marginBottom: 14 }}>{t.authAlreadyIn(email)}</Text>
        <Button title={t.authContinue} onPress={onContinue} />
      </Panel>
    </ScrollView>
  );
}

/** "New to YALLA? [Create an account]" under the form. */
export function FormSwitch({ prompt, children }: { prompt: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.switch, { borderColor: theme.line }]}>
      <Text style={{ color: theme.muted, textAlign: 'center', marginBottom: 10 }}>{prompt}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.8 },
  noTracking: { letterSpacing: 0 }, // Arabic is cursive; letter spacing breaks the joins.
  heading: { fontSize: 28, fontWeight: '800', letterSpacing: -0.8, marginTop: 4, marginBottom: 8 },
  body: { fontSize: 15, lineHeight: 22 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  label: { fontSize: 13 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  note: { fontSize: 12, marginTop: 4 },
  error: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 14 },
  switch: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 24, paddingTop: 20 },
});
