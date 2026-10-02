import { router } from 'expo-router';
import { Text, View } from 'react-native';
import type { Account } from '../../api/auth';
import type { PayoutMethod } from '../../api/resale';
import type { Booking } from '../../api/types';
import { signInHref } from '../../auth/routes';
import { useI18n } from '../../i18n';
import { showStarted, showStartsAt } from '../../liveShow';
import { colors } from '../../theme';
import { useType } from '../../typography';
import { CheckRow } from '../form';
import { Button, Panel, Spinner } from '../ui';
import { PanelHead, showWhen, Subtle, VerifyBox, VerifyLine } from './parts';
import { dotLine, unbroken } from '../../format';

/** Bookings of this account with a ticket that can still be listed, soonest show first. */
export function sellableBookings(bookings: Booking[], account: Account) {
  return bookings
    .filter((b) => b.accountId === account.id && b.tickets.some((x) => x.status === 'valid') && !showStarted(b) && b.showChange?.kind !== 'cancelled')
    .sort((a, b) => Date.parse(showStartsAt(a)) - Date.parse(showStartsAt(b)));
}

/**
 * The live "For ticket owners" aside. Selling starts from a booking in the app, so it shows the account and payout
 * state, then up to three bookings that have tickets to list, each opening the sell screen.
 * `bookings`/`payout` are undefined while loading.
 */
export function OwnersPanel({ account, bookings, payout }: { account: Account | null; bookings?: Booking[]; payout?: PayoutMethod | null }) {
  const { t } = useI18n();
  const { type, rtl } = useType();
  const eligible = account && bookings ? sellableBookings(bookings, account).slice(0, 3) : [];
  return (
    <Panel>
      <PanelHead eyebrow={t.resaleUi.ownersKicker} title={t.resaleUi.ownersTitle} style={{ marginBottom: 1 }} />
      <Text style={[type.small, { color: colors.muted }]}>{t.resaleUi.ownersBody}</Text>
      <VerifyBox style={{ marginTop: 13 }}>
        {!account ? (
          <>
            <VerifyLine>{t.resaleSignInNote}</VerifyLine>
            <Button title={t.resaleGoSignIn} size="small" inline onPress={() => router.push(signInHref('/resale'))} style={{ marginTop: 2 }} />
          </>
        ) : (
          <>
            <VerifyLine label={t.resaleUi.accountLabel}>{account.name}</VerifyLine>
            {payout === undefined ? null : payout ? (
              <>
                <VerifyLine>{t.resalePayoutTo(payout.label)}</VerifyLine>
                {payout.verification !== 'verified' ? <VerifyLine>{t.resaleUi.payoutUnverified}</VerifyLine> : null}
              </>
            ) : <VerifyLine>{t.resaleUi.addPayoutLater}</VerifyLine>}
          </>
        )}
      </VerifyBox>
      {account ? (
        bookings === undefined ? <Spinner size="small" /> : eligible.length ? (
          <View style={{ marginTop: 5 }}>
            {eligible.map((b) => {
              const valid = b.tickets.filter((x) => x.status === 'valid').length;
              return (
                <CheckRow key={b.id} hideBox title={t.resaleUi.eligibleBooking(unbroken(b.reference))}
                  sub={`${dotLine(rtl, b.showtime.movie.title, b.showtime.cinema.name, showWhen(showStartsAt(b), t))}\n${rtl ? '\u200F' : ''}${t.resaleUi.sellableCount(valid, b.tickets.length)}`}
                  trailing={<Button title={t.resaleSellTitle} kind="soft" size="small" inline
                    onPress={() => router.push({ pathname: '/resale/sell/[bookingId]', params: { bookingId: b.id } })} />} />
              );
            })}
          </View>
        ) : <Text style={[type.small, { color: colors.muted, marginTop: 5 }]}>{t.resaleUi.noEligible}</Text>
      ) : null}
      <Subtle style={{ marginBottom: 0 }}>{t.resaleUi.closeNote}</Subtle>
    </Panel>
  );
}
