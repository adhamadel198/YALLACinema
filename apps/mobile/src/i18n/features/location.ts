// Copy for sorting cinemas by distance from the customer's location. Merged into strings.ts.

export const en = {
  distanceFrom: 'Distance from',
  useMyLocation: '📍 Use my location',
  chooseOrigin: 'Use your location or pick an area to sort by distance.',
  locating: 'Finding your location…',
  locatingSlow: 'Still finding your location. This can take a while indoors, or you can pick an area instead.',
  fromHere: 'Sorted by straight-line distance from where you are. Your location is only used to sort cinemas and isn’t saved.',
  locationDeniedWeb: 'Location access is blocked in your browser. Pick an area instead, or allow location for this site in your browser settings and try again.',
  locationDeniedApp: 'YALLA doesn’t have permission to use your location. Pick an area instead, or allow it in Settings and try again.',
  locationUnavailable: 'We couldn’t get your location. Check that location services are on, or pick an area instead.',
  locationTimeout: 'Finding your location took too long. Try again, or pick an area instead.',
  openSettings: 'Open Settings',
  pickAnArea: 'Pick an area',
  nearestFromHere: 'Nearest first · from your location',
  nearestFromArea: (area: string) => `Nearest first · from ${area}`,
  change: 'Change',
  // Distances come rounded to 0.1 km; anything under 1 km reads better as "under 1 km" than "0.3 km".
  kmFromYou: (km: number) => (km < 1 ? 'Under 1 km from you' : `${km} km from you`),
  kmFromArea: (km: number, area: string) => (km < 1 ? `Under 1 km from ${area}` : `${km} km from ${area}`),
};

export const ar: typeof en = {
  distanceFrom: 'المسافة من',
  useMyLocation: '📍 استخدم موقعي',
  chooseOrigin: 'استخدم موقعك أو اختار منطقة عشان نرتّب حسب المسافة.',
  locating: 'بنحدد موقعك…',
  locatingSlow: 'لسه بنحدد موقعك، وده ممكن ياخد وقت جوه المباني. تقدر تختار منطقة بدل كده.',
  fromHere: 'مترتبة حسب المسافة المباشرة من مكانك. موقعك بيُستخدم لترتيب السينمات بس ومش بيتحفظ.',
  locationDeniedWeb: 'تحديد المكان مقفول في المتصفح. اختار منطقة بدل كده، أو اسمح بتحديد المكان للموقع ده من إعدادات المتصفح وحاول تاني.',
  locationDeniedApp: 'YALLA مش مسموح له يستخدم موقعك. اختار منطقة بدل كده، أو اسمح بده من الإعدادات وحاول تاني.',
  locationUnavailable: 'مقدرناش نحدد موقعك. اتأكد إن خدمة تحديد الموقع شغالة، أو اختار منطقة بدل كده.',
  locationTimeout: 'تحديد موقعك أخد وقت طويل. حاول تاني، أو اختار منطقة بدل كده.',
  openSettings: 'افتح الإعدادات',
  pickAnArea: 'اختار منطقة',
  nearestFromHere: 'الأقرب الأول · من مكانك',
  nearestFromArea: (area) => `الأقرب الأول · من ${area}`,
  change: 'غيّر',
  kmFromYou: (km) => (km < 1 ? 'أقل من كيلو منك' : `${km} كم منك`),
  kmFromArea: (km, area) => (km < 1 ? `أقل من كيلو من ${area}` : `${km} كم من ${area}`),
};
