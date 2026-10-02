import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { Text, View } from 'react-native';
import { api } from '../../api/client';
import { useRequest } from '../../api/useRequest';
import { TicketCard } from '../../components/checkout/TicketCard';
import { Page } from '../../components/page';
import { TicketResale } from '../../components/resale';
import { ShowChangeNotice } from '../../components/ShowChangeNotice';
import { Badge, H1, Lead, Message, Spinner, TextLink } from '../../components/ui';
import { useI18n } from '../../i18n';
import { colors } from '../../theme';
import { useType } from '../../typography';

/** The ticket column: centred, as wide as the e-ticket card (590). */
const column = { width: '100%', maxWidth: 590, alignSelf: 'center' } as const;

/** Scannable e-ticket (BRD 6 step 9). One QR per seat so each guest can enter separately. */
export default function TicketScreen() {
  const { t, lang } = useI18n();
  const { type, font } = useType();
  const { id } = useLocalSearchParams<{ id: string }>();
  const booking = useRequest(() => api.booking(id), [id, lang]);
  // Coming back from selling or managing listings shows the tickets' new status.
  useFocusEffect(useCallback(() => booking.reload(), [booking.reload]));

  const title = <Stack.Screen options={{ title: t.yourTicket }} />;
  if (booking.error && !booking.data) return <Page footer="ticket">{title}<Message text={t.loadFailed} onRetry={booking.reload} /></Page>;
  if (!booking.data) return <Page footer="ticket">{title}<Spinner style={{ marginTop: 60 }} /></Page>;
  const b = booking.data;
  const cancelled = b.showChange?.kind === 'cancelled';

  return (
    <Page footer="ticket" footerRef={b.reference} contentStyle={{ paddingTop: 35 }}>
      {title}
      <ShowChangeNotice change={b.showChange} style={[column, { marginBottom: 18 }]} />
      {!cancelled ? (
        <View style={{ alignItems: 'center' }}>
          <Badge label={t.checkoutUi.confirmed} style={{ alignSelf: 'center' }} />
          <H1 center style={{ marginTop: 7, marginBottom: 12 }}>{t.goingToMovies}</H1>
          <Lead center>{t.checkoutUi.ticketLead}</Lead>
        </View>
      ) : null}

      <TicketCard booking={b} />

      <View style={column}>
        <TicketResale booking={b} />
        <Text style={[type.caption, { textAlign: 'center', marginTop: 16 }]}>
          {t.checkoutUi.emailNoteBefore}
          <Text style={[font(700), { color: colors.ink }]}>{b.holder.email}</Text>
          {t.checkoutUi.emailNoteAfter} {b.showtime.cinema.cancellationPolicy}
        </Text>
        <View style={{ alignItems: 'center', marginTop: 12 }}>
          <TextLink title={t.supportNeedHelp} size={13}
            onPress={() => router.push({ pathname: '/support', params: { ref: b.reference, cinema: b.showtime.cinema.id } })} />
        </View>
      </View>
    </Page>
  );
}
