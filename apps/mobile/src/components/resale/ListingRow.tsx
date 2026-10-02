import { useState } from 'react';
import { Text, View } from 'react-native';
import { ApiError } from '../../api/client';
import { resaleApi, type ListingStatus, type MyListing } from '../../api/resale';
import { useI18n } from '../../i18n';
import { useLayout } from '../../layout';
import { describeSeats } from '../../seats';
import { colors } from '../../theme';
import { useType } from '../../typography';
import { Parts } from '../resale';
import { Badge, Button, StatusPill, StatusText, Tag } from '../ui';
import { showWhen } from './parts';

/** The listing's status: on sale = green pill, sold = cream badge, closed states = dark tag. */
function ListingStatusPill({ status, label }: { status: ListingStatus; label: string }) {
  if (status === 'open') return <StatusPill label={label} />;
  if (status === 'sold') return <Badge label={label} />;
  return <Tag label={label} size="page" />;
}

/**
 * One of the seller's listings (`.resale-row`): title and seats, facts, what they receive, status, each seat's
 * state, and "Withdraw unsold tickets". Rows are split by a hairline; pass `last` for the final one.
 */
export function ListingRow({ listing: l, onChanged, last }: { listing: MyListing; onChanged: () => void; last?: boolean }) {
  const { t } = useI18n();
  const { type, font } = useType();
  const { wide } = useLayout();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; ok: boolean }>();
  const unsold = l.tickets.some((x) => x.state === 'listed');
  const waiting = l.tickets.some((x) => x.ticketStatus === 'pending-reactivation');
  const reviewing = l.tickets.some((x) => x.ticketStatus === 'under-review');

  async function withdraw() {
    setBusy(true);
    setNote(undefined);
    try {
      await resaleApi.withdraw(l.id);
      setNote({ text: t.resaleWithdrawn, ok: true });
      onChanged();
    } catch (e) {
      setNote({ text: e instanceof ApiError && e.body.code === 'busy' ? t.resaleBusy : t.genericError, ok: false });
      if (e instanceof ApiError && e.status === 409) onChanged();
    } finally {
      setBusy(false);
    }
  }

  const seatLabel = (x: MyListing['tickets'][number]) =>
    x.ticketStatus === 'pending-reactivation' || x.ticketStatus === 'under-review' ? t.resaleTicketStatus[x.ticketStatus] : t.resaleTicketState[x.state];

  return (
    <View style={[{ paddingVertical: wide ? 17 : 14, paddingHorizontal: wide ? 17 : 0, gap: 12 },
      !last && { borderBottomWidth: 1, borderBottomColor: colors.line },
      wide && { flexDirection: 'row', alignItems: 'center' }]}>
      <View style={{ flex: wide ? 1 : undefined, minWidth: 0 }}>
        <Text style={[font(700), { color: colors.ink, fontSize: 15, lineHeight: 23 }]}>
          {`${l.showtime.movie.title} · `}
          <Text style={{ writingDirection: 'ltr' }}>{describeSeats(l.tickets.map((x) => x.seat))}</Text>
        </Text>
        <Parts parts={[l.showtime.cinema.name, showWhen(l.showtime.startsAt, t), t.resaleUi.perTicketShort(t.egp(l.price))]} />
        <Text style={type.caption}>{t.resaleYouReceiveEach(t.egp(l.sellerReceives))}</Text>
        <View style={{ marginTop: 6 }}>
          <ListingStatusPill status={l.status} label={t.resaleStatus[l.status]} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {l.tickets.map((x) => (x.state === 'sold'
            ? <StatusPill key={x.ticketId} label={t.resaleUi.seatState(x.seat, seatLabel(x))} />
            : <Tag key={x.ticketId} label={t.resaleUi.seatState(x.seat, seatLabel(x))} />))}
        </View>
        {l.pendingPayout > 0 ? <Text style={[font(700), { color: colors.success, fontSize: 12, lineHeight: 18.6, marginTop: 8 }]}>{t.resalePendingPayout(t.egp(l.pendingPayout))}</Text> : null}
        {waiting ? <Text style={[type.caption, { color: colors.link, marginTop: 8 }]}>{t.resaleWaitingCinema}</Text> : null}
        {reviewing ? <Text style={[type.caption, { color: colors.link, marginTop: 8 }]}>{t.resaleUnderReview}</Text> : null}
        {note ? <StatusText tone={note.ok ? 'success' : 'danger'} style={{ marginTop: 8 }}>{note.text}</StatusText> : null}
      </View>
      {l.status === 'open' && unsold ? (
        <Button title={t.resaleWithdraw} kind="soft" size="small" inline onPress={withdraw} busy={busy} />
      ) : null}
    </View>
  );
}
