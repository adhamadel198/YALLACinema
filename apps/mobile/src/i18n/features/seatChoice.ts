// Copy for choosing seats freely on the seat map. Merged into strings.ts.

export const en = {
  suggestedHint: 'We picked the best seats for you. Tap any free seat to choose your own instead.',
  tapHint: 'Tap free seats to pick them. Tap a picked seat to drop it.',
  pickedOf: (n: number, of: number) => `${n} of ${of}`,
  noSeatsPicked: 'None yet. Tap seats on the map.',
  togetherTag: 'together',
  splitPlaces: (n: number) => `apart, in ${n} places`,
  clearSeats: 'Clear',
  clearSeatsLabel: 'Clear the seats you picked',
  pickMore: (n: number) => (n === 1 ? 'Pick 1 more seat' : `Pick ${n} more seats`),
  allPicked: (n: number) =>
    n === 1 ? 'You’ve picked your seat. Tap it to drop it, or clear and start again.' : `You’ve picked all ${n} seats. Tap one of them to drop it, or clear and start again.`,
  priceLine: (n: number, price: string, fees: string) => `${n} × ${price} + ${fees} fee`,
  seatsGone: (seats: string, n: number) =>
    n === 1 ? `Seat ${seats} was just taken. Pick another seat.` : `Seats ${seats} were just taken. Pick other seats.`,
  noMatchPickYourself: 'No matching group is left, but you can still pick seats yourself.',
  notEnoughSeats: (n: number) => `Fewer than ${n} seats are free at this showtime. Go back to pick another time.`,
};

export const ar: typeof en = {
  suggestedHint: 'اخترنالك أحسن كراسي. دوس على أي كرسي فاضي لو عايز تختار بنفسك.',
  tapHint: 'دوس على الكراسي الفاضية عشان تختارها، ودوس على الكرسي المختار عشان تشيله.',
  pickedOf: (n, of) => `${n} من ${of}`,
  noSeatsPicked: 'لسه مختارتش. دوس على الكراسي في الخريطة.',
  togetherTag: 'جنب بعض',
  splitPlaces: (n) => `متفرقين في ${n} أماكن`,
  clearSeats: 'امسح',
  clearSeatsLabel: 'امسح الكراسي اللي اخترتها',
  pickMore: (n) => (n === 1 ? 'اختار كرسي كمان' : n === 2 ? 'اختار كرسيين كمان' : `اختار ${n} كراسي كمان`),
  allPicked: (n) =>
    `اخترت ${n === 1 ? 'الكرسي' : n === 2 ? 'الكرسيين' : `الـ ${n} كراسي`} خلاص. دوس على كرسي مختار عشان تشيله، أو امسح وابدأ من الأول.`,
  priceLine: (n, price, fees) => `${n} × ${price} + ${fees} رسوم`,
  seatsGone: (seats, n) =>
    n === 1 ? `الكرسي ${seats} لسه اتحجز. اختار كرسي تاني.` : `الكراسي ${seats} لسه اتحجزت. اختار كراسي تانية.`,
  noMatchPickYourself: 'مفيش مجموعة مناسبة فاضلة، بس لسه تقدر تختار الكراسي بنفسك.',
  notEnoughSeats: (n) => `الكراسي الفاضية في العرض ده أقل من ${n}. ارجع واختار معاد تاني.`,
};
