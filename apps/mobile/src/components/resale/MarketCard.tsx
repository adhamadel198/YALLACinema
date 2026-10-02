import { Pressable, Text, View, type PressableStateCallbackType, type ViewStyle } from 'react-native';
import type { MarketListing } from '../../api/resale';
import { useI18n } from '../../i18n';
import { useLayout } from '../../layout';
import { describeSeats } from '../../seats';
import { colors, shadows } from '../../theme';
import { useType } from '../../typography';
import { Parts } from '../resale';
import { Badge, StatusPill } from '../ui';
import { showWhen } from './parts';

type Hoverable = PressableStateCallbackType & { hovered?: boolean };

/**
 * One listing on the market (`.listing-card`): title with "Verified ticket", facts, the price-cap line, and the
 * price with a "Buy ticket" button. The whole card opens the listing (one control, so the button is drawn, not nested).
 */
export function MarketCard({ item, onOpen }: { item: MarketListing; onOpen: () => void }) {
  const { t } = useI18n();
  const { type, font } = useType();
  const { wide } = useLayout();
  const s = item.showtime;
  const seats = describeSeats(item.tickets.map((x) => x.seat));
  return (
    <Pressable onPress={onOpen} accessibilityRole="button"
      accessibilityLabel={`${s.movie.title}, ${s.cinema.name}, ${t.seatsList(seats)}, ${t.resaleUi.buyTicket} ${t.egp(item.price)}`}
      style={(state: Hoverable) => [
        { backgroundColor: colors.panel, borderWidth: 1, borderColor: state.hovered ? '#5d4c2c' : colors.line, borderRadius: 18, padding: 17, gap: 10 },
        shadows.panel,
        wide ? { flexDirection: 'row', alignItems: 'center' } : null,
      ]}>
      {(state: Hoverable) => (
        <>
          <View style={{ flex: wide ? 1 : undefined, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 9 }}>
              <Text style={[font(800), { color: colors.ink, fontSize: 15, lineHeight: 23 }]}>{s.movie.title}</Text>
              <StatusPill label={t.resaleUi.verified} />
              {item.mine ? <Badge label={t.resaleYours} /> : null}
            </View>
            <Parts parts={[s.cinema.name, showWhen(s.startsAt, t), s.format, t.seatsList(seats), t.resaleTicketCount(item.tickets.length)]} />
            <Text style={[type.micro, { marginTop: 5 }]}>{t.resaleUi.capLine}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, justifyContent: wide ? undefined : 'space-between' }}>
            <Text style={[font(700), { color: colors.ink, fontSize: 15, lineHeight: 23 }]}>{t.egp(item.price)}</Text>
            <BuyPill lifted={!!(state.hovered || state.pressed)} label={t.resaleUi.buyTicket} />
          </View>
        </>
      )}
    </Pressable>
  );
}

/** The small gold "Buy ticket" button, drawn inside the pressable card. */
function BuyPill({ label, lifted }: { label: string; lifted: boolean }) {
  const { type } = useType();
  return (
    <View aria-hidden style={[{ backgroundColor: colors.gold, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 12, minHeight: 38, justifyContent: 'center' },
      { boxShadow: lifted ? '0 6px 0 #89672f' : '0 4px 0 #89672f', transform: [{ translateY: lifted ? -2 : 0 }] } as ViewStyle]}>
      <Text style={[type.buttonSmall, { color: colors.onGold }]}>{label}</Text>
    </View>
  );
}
