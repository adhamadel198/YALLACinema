import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { supportApi } from '../api/support';
import { useRequest } from '../api/useRequest';
import { CardGrid } from '../components/account/parts';
import { Page, PageIntro } from '../components/page';
import { goTo } from '../components/shell/nav';
import { Badge, Button, Eyebrow, H2, Notice, Panel, SmallCard, Spinner } from '../components/ui';
import { useI18n } from '../i18n';
import { colors } from '../theme';
import { useType } from '../typography';

/** Booking references look like YL-K7Q2M9 (apps/api/src/routes/booking.ts). Anything else in the URL is ignored. */
const REFERENCE = /^YL-[A-Z0-9]{6}$/;

/**
 * Help and support (BRD 7.6): how to get help, FAQs, and each cinema's cancellation policy (BRD 9), laid out like the
 * live support.html (intro, three small cards, one panel per question).
 * The ticket screen opens it with `ref` (booking reference) and `cinema` (cinema id) so the customer
 * has their reference to hand and sees their cinema's policy first.
 */
export default function Support() {
  const { t, lang } = useI18n();
  const { type, font } = useType();
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
  const cards = t.accountUi.supportCards;

  return (
    <Page footer="support">
      <Stack.Screen options={{ title: t.supportTitle }} />
      <PageIntro eyebrow={t.supportKicker} title={t.supportHeading} lead={t.supportLead} />

      <CardGrid>
        <SmallCard style={styles.fill} eyebrow={cards.booking.kicker} title={cards.booking.title} body={cards.booking.body}>
          {reference ? (
            <Notice tone="verify" style={styles.full}>
              <Text style={[font(800), { color: colors.verifyInk, fontSize: 12, lineHeight: 18 }]}>{t.supportYourReference}</Text>
              <Text selectable style={[font(800), styles.reference]}>{reference}</Text>
            </Notice>
          ) : null}
          {/* CONTACT CHANNELS GO HERE. Support channels (phone, email, chat) and support hours are still an
              open decision (BRD 7.6; section 15, decision 4). Once agreed, list them in this box with their
              copy in i18n/features/support.ts, and add the live "Email support" button. Never put a made-up
              number or address here. */}
          <View testID="support-channels" style={styles.full}>
            <Notice>
              <Text style={[type.eyebrow, { color: colors.noticeInk }]}>{t.supportChannelsLabel}</Text>
              <Text style={[type.small, { color: colors.noticeInk, marginTop: 2 }]}>{t.supportChannelsSoon}</Text>
            </Notice>
          </View>
        </SmallCard>
        <SmallCard style={styles.fill} eyebrow={cards.prices.kicker} title={cards.prices.title} body={cards.prices.body}>
          <Button kind="soft" size="small" inline title={cards.prices.button} onPress={() => goTo('/')} />
        </SmallCard>
        <SmallCard style={styles.fill} eyebrow={cards.partners.kicker} title={cards.partners.title} body={cards.partners.body}>
          <Button kind="soft" size="small" inline title={cards.partners.button} onPress={() => goTo('/operator')} />
        </SmallCard>
      </CardGrid>

      <View style={styles.section}>
        <Eyebrow>{t.supportFaqKicker}</Eyebrow>
        <H2 style={{ marginBottom: 0 }}>{t.supportFaqTitle}</H2>
        {Object.entries(t.supportFaq).map(([sectionId, section], s) => (
          <View key={sectionId} style={{ marginTop: s ? 22 : 12 }}>
            <Eyebrow style={{ marginBottom: 2 }}>{section.title}</Eyebrow>
            {Object.entries(section.items).map(([itemId, item]) => {
              const id = `${sectionId}.${itemId}`;
              return <FaqItem key={id} question={item.q} answer={item.a} expanded={open.has(id)} onToggle={() => toggle(id)} />;
            })}
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Eyebrow>{t.accountUi.supportPoliciesKicker}</Eyebrow>
        <H2 style={{ marginBottom: 8 }}>{t.supportPoliciesTitle}</H2>
        <Text style={[type.body, { color: colors.muted, marginBottom: 16, maxWidth: 650 }]}>{t.supportPoliciesBody}</Text>
        {policies.error ? (
          <Panel>
            <Notice role="alert" style={{ marginBottom: 12 }}>{t.loadFailed}</Notice>
            <Button kind="soft" size="small" inline title={t.tryAgain} onPress={policies.reload} />
          </Panel>
        ) : !policies.data ? (
          <Spinner />
        ) : (
          <CardGrid>
            {cinemas.map((c) => (
              <Panel key={c.id} padding={19} style={[styles.fill, isMine(c.id) && { borderColor: colors.gold }]}>
                {isMine(c.id) ? <Badge label={t.supportYourCinema} style={{ marginBottom: 10 }} /> : null}
                <Eyebrow>{t.areas[c.area] ?? c.area}</Eyebrow>
                <Text role="heading" aria-level={3} style={[type.h3, { marginTop: 6, marginBottom: 6 }]}>{c.name}</Text>
                <Text style={type.small}>{c.cancellationPolicy}</Text>
              </Panel>
            ))}
          </CardGrid>
        )}
      </View>
    </Page>
  );
}

/** One question in its own panel (live `details.panel.faq`): a disclosure triangle and the question; the answer under it. */
function FaqItem({ question, answer, expanded, onToggle }: { question: string; answer: string; expanded: boolean; onToggle: () => void }) {
  const { type, font, rtl } = useType();
  return (
    <Panel padding={0} style={styles.faq}>
      <Pressable onPress={onToggle} accessibilityRole="button" aria-expanded={expanded} style={styles.question}>
        <Text aria-hidden style={[styles.marker, { color: colors.ink, fontSize: expanded ? 10 : 12 }]}>{expanded ? '▼\uFE0E' : rtl ? '◀\uFE0E' : '▶\uFE0E'}</Text>
        <Text style={[font(800), { color: colors.ink, fontSize: 15, lineHeight: 23, flex: 1 }]}>{question}</Text>
      </Pressable>
      {expanded ? <Text style={[type.small, styles.answer, { color: colors.muted }]}>{answer}</Text> : null}
    </Panel>
  );
}

const styles = StyleSheet.create({
  full: { width: '100%' },
  fill: { flexGrow: 1 },
  reference: { color: colors.verifyInk, fontSize: 16, lineHeight: 22, writingDirection: 'ltr', alignSelf: 'flex-start', marginTop: 2 },
  section: { paddingTop: 40 },
  faq: { marginTop: 9 },
  question: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingVertical: 17, paddingHorizontal: 19 },
  marker: { lineHeight: 23, width: 10 },
  answer: { paddingHorizontal: 19, paddingBottom: 17, marginTop: -4 },
});
