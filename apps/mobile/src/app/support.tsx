import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { supportApi } from '../api/support';
import { useRequest } from '../api/useRequest';
import { Button, Panel } from '../components/ui';
import { useI18n } from '../i18n';
import { useTheme } from '../theme';

/** Booking references look like YL-K7Q2M9 (apps/api/src/routes/booking.ts). Anything else in the URL is ignored. */
const REFERENCE = /^YL-[A-Z0-9]{6}$/;

/**
 * Help and support (BRD 7.6): how to get help, FAQs, and each cinema's cancellation policy (BRD 9).
 * The ticket screen opens it with `ref` (booking reference) and `cinema` (cinema id) so the customer
 * has their reference to hand and sees their cinema's policy first.
 */
export default function Support() {
  const theme = useTheme();
  const { t, lang, rtl } = useI18n();
  const params = useLocalSearchParams<{ ref?: string; cinema?: string }>();
  const reference = typeof params.ref === 'string' && REFERENCE.test(params.ref) ? params.ref : undefined;
  const policies = useRequest(supportApi.cinemaPolicies, [lang]);
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const isMine = (cinemaId: string) => cinemaId === params.cinema;
  const cinemas = [...(policies.data ?? [])].sort((a, b) => Number(isMine(b.id)) - Number(isMine(a.id)));
  const noTracking = rtl && styles.noTracking;

  return (
    <>
      <Stack.Screen options={{ title: t.supportTitle }} />
      <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={styles.page}>
        <Text style={[styles.kicker, { color: theme.accent }, noTracking]}>{t.supportKicker}</Text>
        <Text style={[styles.h1, { color: theme.ink }, noTracking]}>{t.supportHeading}</Text>
        <Text style={[styles.body, { color: theme.muted, marginTop: 6 }]}>{t.supportLead}</Text>

        <Panel style={{ marginTop: 20 }}>
          <Text style={[styles.h3, { color: theme.ink }]}>{t.supportContactTitle}</Text>
          <Text style={[styles.body, { color: theme.muted, marginTop: 6 }]}>{t.supportContactBody}</Text>
          {reference && (
            <View style={[styles.reference, { backgroundColor: theme.bg, borderColor: theme.line }]}>
              <Text style={{ color: theme.muted, flex: 1 }}>{t.supportYourReference}</Text>
              <Text selectable style={{ color: theme.ink, fontWeight: '800', fontSize: 16 }}>{reference}</Text>
            </View>
          )}
          {/* CONTACT CHANNELS GO HERE. Support channels (phone, email, chat) and support hours are still an
              open decision (BRD 7.6; section 15, decision 4). Once agreed, list them in this box with their
              copy in i18n/features/support.ts. Never put a made-up number or address here. */}
          <View style={[styles.channels, { borderColor: theme.line }]} testID="support-channels">
            <Text style={[styles.label, { color: theme.muted }, noTracking]}>{t.supportChannelsLabel}</Text>
            <Text style={{ color: theme.ink, marginTop: 4, lineHeight: 20 }}>{t.supportChannelsSoon}</Text>
          </View>
        </Panel>

        <Text style={[styles.kicker, { color: theme.accent, marginTop: 32 }, noTracking]}>{t.supportFaqKicker}</Text>
        <Text style={[styles.h2, { color: theme.ink }]}>{t.supportFaqTitle}</Text>
        {Object.entries(t.supportFaq).map(([sectionId, section]) => (
          <View key={sectionId} style={{ marginTop: 18 }}>
            <Text style={[styles.h3, { color: theme.ink, marginBottom: 8 }]}>{section.title}</Text>
            <View style={[styles.faqGroup, { borderColor: theme.line, backgroundColor: theme.panel }]}>
              {Object.entries(section.items).map(([itemId, item], i) => {
                const id = `${sectionId}.${itemId}`;
                const expanded = open.has(id);
                return (
                  <View key={id} style={i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.line }}>
                    <Pressable onPress={() => toggle(id)} accessibilityRole="button" aria-expanded={expanded} style={styles.question}>
                      <Text style={{ color: theme.ink, fontWeight: '700', fontSize: 15, flex: 1, lineHeight: 21 }}>{item.q}</Text>
                      <View style={[styles.sign, { borderColor: expanded ? theme.accent : theme.line }]}>
                        <Text style={{ color: expanded ? theme.accent : theme.muted, fontWeight: '800', fontSize: 16, lineHeight: 18 }}>
                          {expanded ? '−' : '+'}
                        </Text>
                      </View>
                    </Pressable>
                    {expanded && <Text style={[styles.body, styles.answer, { color: theme.muted }]}>{item.a}</Text>}
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        <Text style={[styles.h2, { color: theme.ink, marginTop: 32 }]}>{t.supportPoliciesTitle}</Text>
        <Text style={[styles.body, { color: theme.muted, marginTop: 4, marginBottom: 12 }]}>{t.supportPoliciesBody}</Text>
        {policies.error ? (
          <Panel>
            <Text style={{ color: theme.ink, marginBottom: 12 }}>{t.loadFailed}</Text>
            <Button title={t.tryAgain} kind="secondary" onPress={policies.reload} />
          </Panel>
        ) : !policies.data ? (
          <ActivityIndicator color={theme.accent} style={{ marginVertical: 16 }} />
        ) : (
          cinemas.map((c) => (
            <Panel key={c.id} style={{ marginBottom: 12, ...(isMine(c.id) && { borderColor: theme.accent, borderWidth: 1.5 }) }}>
              {isMine(c.id) && <Text style={[styles.label, { color: theme.accent, marginBottom: 4 }, noTracking]}>{t.supportYourCinema}</Text>}
              <Text style={{ color: theme.ink, fontWeight: '800', fontSize: 16 }}>{c.name}</Text>
              <Text style={{ color: theme.muted, fontSize: 13, marginTop: 2 }}>{t.areas[c.area] ?? c.area}</Text>
              <Text style={[styles.body, { color: theme.ink, marginTop: 8 }]}>{c.cancellationPolicy}</Text>
            </Panel>
          ))
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, paddingBottom: 48, width: '100%', maxWidth: 720, alignSelf: 'center' },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.8 },
  noTracking: { letterSpacing: 0 }, // Arabic is cursive; letter spacing breaks the joins.
  h1: { fontSize: 28, fontWeight: '800', letterSpacing: -0.8, marginTop: 4 },
  h2: { fontSize: 22, fontWeight: '800', marginTop: 4 },
  h3: { fontSize: 17, fontWeight: '800' },
  body: { fontSize: 15, lineHeight: 22 },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  reference: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginTop: 14 },
  channels: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 12, padding: 14, marginTop: 14 },
  faqGroup: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  question: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, minHeight: 52 },
  sign: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  answer: { paddingHorizontal: 16, paddingBottom: 16, marginTop: -4 },
});
