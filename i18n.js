/* YALLA Cinema · English/Arabic language switch shared by every page.
   Load it in <head> with a plain <script src="i18n.js"></script>.
   The chosen language is saved in localStorage ("yallaLang") so it carries
   across pages. Static text, placeholders, titles and text that page scripts
   render later are translated from the dictionary below. Elements that carry
   their own data-en / data-ar (or data-placeholder-en / -ar) attributes use
   those instead. Add data-i18n-skip to any element that must stay as is. */
(function () {
  'use strict';
  var KEY = 'yallaLang';
  var html = document.documentElement;

  function readLang() {
    try { return localStorage.getItem(KEY) === 'ar' ? 'ar' : 'en'; } catch (e) { return 'en'; }
  }
  function saveLang(value) {
    try { localStorage.setItem(KEY, value); } catch (e) {}
  }

  var lang = readLang();

  /* Set direction before the body renders, and keep the page hidden until
     the Arabic text is in place so English doesn't flash first. */
  var style = document.createElement('style');
  style.textContent = 'html.i18n-pending body{visibility:hidden}';
  document.head.appendChild(style);
  html.lang = lang;
  html.dir = lang === 'ar' ? 'rtl' : 'ltr';
  if (lang === 'ar') html.classList.add('i18n-pending');

  /* ---------- Dictionary: exact English text -> Arabic ---------- */
  var AR = {
    // Navigation, header, footer
    'Movies': 'الأفلام',
    'Cinemas': 'السينمات',
    'Ticket resale': 'إعادة بيع التذاكر',
    'Resale': 'إعادة البيع',
    'Help': 'المساعدة',
    'Sign in': 'دخول',
    'Home': 'الرئيسية',
    'My Tickets': 'تذاكري',
    'Profile': 'حسابي',
    'Primary navigation': 'التنقل الرئيسي',
    'YALLA Cinema home': 'الصفحة الرئيسية لـ YALLA Cinema',
    'Cairo, Egypt': 'القاهرة، مصر',
    '⌖ Cairo, Egypt': '⌖ القاهرة، مصر',
    'Help & support': 'المساعدة والدعم',
    'Terms & privacy': 'الشروط والخصوصية',
    'Cinema portal': 'بوابة السينمات',
    'Policies': 'السياسات',
    'Need help?': 'محتاج مساعدة؟',
    'Need booking help?': 'محتاج مساعدة في الحجز؟',
    'Booking support': 'دعم الحجوزات',
    'Cancellation policy': 'سياسة الإلغاء',
    'Resale help': 'مساعدة إعادة البيع',
    'Partner support': 'دعم الشركاء',
    'YALLA Cinema · Partner portal': 'YALLA Cinema · بوابة الشركاء',
    'Close': 'إغلاق',
    'YALLA — Your next movie night': 'YALLA — ليلة السينما الجاية',
    'My bookings': 'حجوزاتي',
    'My account': 'حسابي',

    // Shared booking words
    'Seats': 'المقاعد',
    'Seat': 'مقعد',
    'Checkout': 'الدفع',
    'Ticket': 'التذكرة',
    'Tickets': 'التذاكر',
    'Total': 'الإجمالي',
    'Today': 'اليوم',
    'Tomorrow': 'غدًا',
    'Tonight': 'الليلة',
    'Booking': 'الحجز',
    'Movie': 'الفيلم',
    'Cinema': 'السينما',
    'Area': 'المنطقة',
    'Show': 'العرض',
    'Status': 'الحالة',
    'Showtime': 'موعد العرض',
    'Format': 'نوع القاعة',
    'Standard': 'عادي',
    'Premium': 'بريميوم',
    'Drama': 'دراما',
    'Action': 'أكشن',
    'Comedy': 'كوميدي',
    'Family': 'عائلي',
    'Adventure': 'مغامرة',
    'All ages': 'لكل الأعمار',
    'Dolby sound': 'صوت Dolby',
    'Available': 'متاح',
    'Selected': 'مختار',
    'Taken': 'محجوز',
    'Unavailable': 'غير متاح',
    'Ineligible': 'غير مؤهل',
    'Connected': 'متصلة',
    'connected': 'متصلة',
    'separated': 'منفصلة',
    'Connected or separated': 'متصلة أو منفصلة',
    'Connected seats': 'مقاعد متصلة',
    'Separated groups': 'مجموعات منفصلة',
    'Connected group': 'مجموعة متصلة',
    'Number of seats': 'عدد المقاعد',
    'Seat arrangement': 'ترتيب المقاعد',
    'Find matching shows': 'ابحث عن عروض مناسبة',
    'Find seats': 'اختار المقاعد',
    'Continue to checkout': 'متابعة للدفع',
    'Platform fee': 'رسوم المنصة',
    'Platform fee · 5 EGP per ticket': 'رسوم المنصة · ٥ جنيه لكل تذكرة',
    '5 EGP × tickets': '٥ جنيه × عدد التذاكر',
    'English · Arabic subtitles': 'إنجليزي · ترجمة عربية',
    'English, Arabic subtitles': 'إنجليزي، ترجمة عربية',
    'Arabic · English subtitles': 'عربي · ترجمة إنجليزية',
    'Arabic, English subtitles': 'عربي، ترجمة إنجليزية',
    '● Sample seat availability': '● توفر مقاعد تجريبي',
    '● Sample seats available': '● مقاعد تجريبية متاحة',
    '● Sample price': '● سعر تجريبي',

    // Places
    'Maadi': 'المعادي',
    'New Cairo': 'القاهرة الجديدة',
    '6th of October': '٦ أكتوبر',
    '6th of October City': 'مدينة ٦ أكتوبر',
    'Sheikh Zayed': 'الشيخ زايد',
    'Downtown Cairo': 'وسط البلد',
    'My location': 'موقعي',
    'All Cairo & Giza': 'كل القاهرة والجيزة',
    'Now showing · Cairo & Giza': 'يعرض الآن · القاهرة والجيزة',
    'all': 'كل المناطق',

    // Home page (text without data-en)
    'An unforgettable journey': 'رحلة لا تُنسى',
    'No way back': 'مفيش رجوع',
    'Life happens': 'الحياة بتحصل',
    'Into the unknown': 'نحو المجهول',
    'Big dreams start small': 'الأحلام الكبيرة بتبدأ صغيرة',
    'No matching movies. Try another search.': 'مفيش أفلام مطابقة. جرّب بحث تاني.',
    '01 / DISCOVER': '٠١ / اكتشف',
    '02 / PICK': '٠٢ / اختار',
    '03 / GO': '٠٣ / انطلق',
    'Choose area': 'اختار المنطقة',
    'Search movies': 'ابحث عن الأفلام',
    'Choose at least one available seat to continue.': 'اختار مقعد متاح واحد على الأقل للمتابعة.',

    // Account
    'Sign in · YALLA': 'تسجيل الدخول · YALLA',
    'Welcome back': 'أهلًا بيك تاني',
    'Your next movie night starts here.': 'ليلة السينما الجاية بتبدأ من هنا.',
    'Sign in to see your bookings and save your details. Guest checkout is always available.': 'سجّل الدخول عشان تشوف حجوزاتك وتحفظ بياناتك. الحجز كضيف متاح دايمًا.',
    'Email address': 'البريد الإلكتروني',
    'Password': 'كلمة المرور',
    'Your password': 'كلمة المرور',
    'New to YALLA?': 'جديد على YALLA؟',
    'Create an account': 'أنشئ حساب',
    "This design preview doesn't create or authenticate accounts.": 'نسخة العرض دي لا تنشئ حسابات ولا تتحقق منها.',
    'Your tickets': 'تذاكرك',
    'Need to pass a ticket on?': 'عايز تبيع تذكرة؟',
    'List eligible, unused YALLA tickets for resale. A signed-in account and verified payout details are required.': 'اعرض تذاكر YALLA المؤهلة وغير المستخدمة لإعادة البيع. لازم تكون مسجّل دخول وبيانات استلام الأموال موثّقة.',
    'Open ticket resale': 'افتح إعادة بيع التذاكر',
    'Sign-in preview only. You can continue booking as a guest.': 'تسجيل الدخول للعرض فقط. تقدر تكمل الحجز كضيف.',
    'Account registration can be added when the pilot account rules are defined.': 'تسجيل الحسابات هيتضاف لما قواعد الحسابات في المرحلة التجريبية تتحدد.',

    // Checkout
    'Checkout · YALLA': 'الدفع · YALLA',
    '/ Booking / Checkout': '/ الحجز / الدفع',
    'Almost there': 'قربنا نخلص',
    'Continue as a guest or sign in. An account is never required to book.': 'كمّل كضيف أو سجّل الدخول. الحساب مش مطلوب للحجز أبدًا.',
    'Your details': 'بياناتك',
    'Full name': 'الاسم بالكامل',
    'e.g. Salma Hassan': 'مثال: سلمى حسن',
    'Mobile number': 'رقم الموبايل',
    'Payment method': 'طريقة الدفع',
    '💳 Bank card': '💳 بطاقة بنكية',
    '📱 Local wallet': '📱 محفظة إلكترونية',
    'Card number': 'رقم البطاقة',
    'Expiry': 'تاريخ الانتهاء',
    'MM / YY': 'شهر / سنة',
    'Security code': 'رمز الأمان',
    "I have read and accept the cinema's": 'قرأت وأوافق على',
    'cancellation and refund policy': 'سياسة الإلغاء والاسترداد الخاصة بالسينما',
    '🔒 Secure payment preview. This sample does not submit or store real payment details.': '🔒 معاينة لدفع آمن. النسخة التجريبية دي لا ترسل ولا تحفظ أي بيانات دفع حقيقية.',
    'Pay securely': 'ادفع بأمان',
    'Order summary': 'ملخص الطلب',
    'Cinema cancellation policy applies. A scannable ticket will be issued after payment and cinema confirmation.': 'تطبق سياسة الإلغاء الخاصة بالسينما. هتصدر تذكرة قابلة للمسح بعد الدفع وتأكيد السينما.',

    // Movie
    'Movie details · YALLA': 'تفاصيل الفيلم · YALLA',
    '/ Movies /': '/ الأفلام /',
    'When a quiet coastal town loses its lighthouse, a young restorer returns home to uncover the story her family left behind. A moving, visually rich story about finding your way back.': 'لما بلدة ساحلية هادية تفقد منارتها، ترجع مرمّمة شابة لبيتها عشان تكشف الحكاية اللي سابتها عيلتها. قصة مؤثرة وغنية بصريًا عن إنك تلاقي طريق الرجوع.',
    'Directed by Lina Mansour · Starring Salma Hassan, Karim Nabil': 'إخراج لينا منصور · بطولة سلمى حسن، كريم نبيل',
    'Choose a showtime ↓': 'اختار موعد العرض ↓',
    'Find your seats': 'لاقي مقاعدك',
    'How many seats do you need?': 'محتاج كام مقعد؟',
    "We'll show only cinemas and times with an exact seat arrangement match.": 'هنعرض بس السينمات والمواعيد اللي فيها ترتيب مقاعد مطابق تمامًا.',
    'Sample cinema listings': 'سينمات تجريبية',
    'Pick a cinema & time': 'اختار السينما والموعد',
    'Live integrations provide final seat availability and prices.': 'الربط المباشر مع السينمات هو اللي بيحدد التوفر والأسعار النهائية.',
    'Final seat availability is rechecked before your booking is reserved. Cinema cancellation policy is shown at checkout.': 'بيتم التأكد من توفر المقاعد تاني قبل تثبيت الحجز. سياسة الإلغاء الخاصة بالسينما بتظهر وقت الدفع.',

    // Operator
    'Cinema portal · YALLA': 'بوابة السينمات · YALLA',
    'Customer site': 'موقع العملاء',
    'Operator ▾': 'المشغّل ▾',
    'Cinema workspace': 'مساحة عمل السينما',
    'Overview': 'نظرة عامة',
    'Bookings': 'الحجوزات',
    'Listings': 'العروض',
    'Support': 'الدعم',
    'Operator portal · Sample': 'بوابة المشغّل · تجريبية',
    'Good afternoon, cinema team': 'مساء الخير يا فريق السينما',
    'Your listings and bookings at a glance.': 'عروضك وحجوزاتك في لمحة.',
    '✎ Edit listings': '✎ تعديل العروض',
    'Bookings today': 'حجوزات النهارده',
    'Upcoming shows': 'العروض الجاية',
    'Seats available*': 'المقاعد المتاحة*',
    'Customer rating*': 'تقييم العملاء*',
    'Sample portal data · Not connected to a cinema integration': 'بيانات تجريبية · غير مربوطة بنظام سينما',
    'Recent bookings': 'أحدث الحجوزات',
    'Confirmed': 'مؤكد',
    "Today's listings": 'عروض النهارده',
    'Listing status': 'حالة العرض',
    'Published': 'منشور',
    '* Illustrative sample metrics. Portal data is static in this design preview; live data requires cinema integration.': '* أرقام توضيحية. بيانات البوابة ثابتة في نسخة العرض دي؛ البيانات المباشرة محتاجة ربط مع السينما.',
    'Listing edit preview: use the Published toggles to show or hide a listing. Changes are not saved.': 'معاينة تعديل العروض: استخدم مفاتيح "منشور" لإظهار أو إخفاء عرض. التغييرات مش بتتحفظ.',
    'Preview only: listing visibility changed locally and is not saved.': 'للمعاينة فقط: ظهور العرض اتغير على جهازك ومش هيتحفظ.',

    // Resale
    'Ticket resale · YALLA': 'إعادة بيع التذاكر · YALLA',
    'Platform ticket resale': 'إعادة بيع التذاكر عبر المنصة',
    'Plans changed?': 'خططك اتغيرت؟',
    'Pass your seat on.': 'سيب مقعدك لحد تاني.',
    'Buy eligible tickets from other moviegoers or list a ticket you booked with YALLA.': 'اشتري تذاكر مؤهلة من رواد سينما تانيين أو اعرض تذكرة حجزتها على YALLA.',
    'Fair-price promise:': 'وعد السعر العادل:',
    'Resale listings are capped at the original cinema ticket amount paid, excluding the original platform fee. Buyers pay the ticket price plus 5 EGP per ticket.': 'سعر إعادة البيع لا يتجاوز سعر التذكرة الأصلي المدفوع للسينما، من غير رسوم المنصة الأصلية. المشتري بيدفع سعر التذكرة + ٥ جنيه لكل تذكرة.',
    'Interactive prototype only. Payments, payout verification, ticket invalidation, and cinema confirmation are simulated.': 'نموذج تفاعلي فقط. الدفع وتوثيق استلام الأموال وإلغاء التذاكر وتأكيد السينما كلها محاكاة.',
    'Marketplace': 'السوق',
    'Tickets available': 'التذاكر المتاحة',
    'Browse current listings. Unused tickets only; every transfer needs cinema confirmation.': 'تصفّح العروض الحالية. تذاكر غير مستخدمة فقط؛ وكل نقل محتاج تأكيد من السينما.',
    'All tickets': 'كل التذاكر',
    "Refunds are handled under the cinema's policy for the current ticket holder. Platform fees are non-refundable if a refund is allowed, subject to applicable agreements.": 'الاسترداد بيتم حسب سياسة السينما لحامل التذكرة الحالي. رسوم المنصة غير قابلة للاسترداد لو الاسترداد مسموح، حسب الاتفاقيات المعمول بيها.',
    'For ticket owners': 'لأصحاب التذاكر',
    'List your ticket': 'اعرض تذكرتك',
    'A YALLA account and verified payout details are required. Only unused tickets originally bought on YALLA qualify.': 'لازم حساب YALLA وبيانات استلام أموال موثّقة. التذاكر غير المستخدمة اللي اتشرت من YALLA بس هي المؤهلة.',
    'Account:': 'الحساب:',
    'demo seller workspace': 'مساحة بائع تجريبية',
    'Simulate payout verification': 'محاكاة توثيق استلام الأموال',
    "Payout details aren't verified yet.": 'بيانات استلام الأموال لسه مش موثّقة.',
    'Demo payout details verified. No financial details were collected.': 'تم توثيق بيانات الاستلام التجريبية. لم يتم جمع أي بيانات مالية.',
    'Eligible booking · YL-4831': 'حجز مؤهل · YL-4831',
    'The Last Light · VOX Mall of Egypt · Tomorrow, 7:45 PM': 'The Last Light · VOX Mall of Egypt · غدًا، 7:45 م',
    'Original ticket: 180 EGP each · Platform fee is excluded': 'التذكرة الأصلية: ١٨٠ جنيه للواحدة · من غير رسوم المنصة',
    'Unused · YALLA booking · verified for resale': 'غير مستخدمة · حجز YALLA · موثّقة لإعادة البيع',
    'Already scanned/used; cannot be listed.': 'اتمسحت/اتستخدمت بالفعل؛ لا يمكن عرضها.',
    'Listing price per ticket (maximum 180 EGP)': 'سعر العرض للتذكرة (حد أقصى ١٨٠ جنيه)',
    'Publish selected tickets': 'انشر التذاكر المختارة',
    "Listings close when the show starts. Unsold tickets stay blocked until the cinema confirms they're active again.": 'العروض بتقفل مع بداية العرض. التذاكر اللي متباعتش بتفضل موقوفة لحد ما السينما تأكد إنها اتفعّلت تاني.',
    'Your listings': 'عروضك',
    "Manage tickets you've listed": 'إدارة التذاكر اللي عرضتها',
    'No listings yet.': 'مفيش عروض لسه.',
    'No listings yet. Select an eligible ticket above to create one.': 'مفيش عروض لسه. اختار تذكرة مؤهلة فوق عشان تعمل عرض.',
    'How resale protects both sides': 'إزاي إعادة البيع بتحمي الطرفين',
    'Before listing': 'قبل العرض',
    'YALLA verifies the original booking, checks the ticket is unused, and requires a signed-in account with verified payout details.': 'YALLA بتتأكد من الحجز الأصلي وإن التذكرة مش مستخدمة، وبتطلب حساب مسجّل دخول ببيانات استلام أموال موثّقة.',
    'On transfer': 'وقت النقل',
    'After buyer payment succeeds, the old ticket is invalidated and a replacement is issued. If transfer fails, the purchase is cancelled, the buyer is refunded, and the original ticket remains valid.': 'بعد نجاح دفع المشتري، التذكرة القديمة بتتلغي وبتصدر تذكرة بديلة. لو النقل فشل، الشراء بيتلغي والمشتري بيسترد فلوسه والتذكرة الأصلية بتفضل صالحة.',
    "If it doesn't sell": 'لو متباعتش',
    'Withdraw any time before showtime. At show start, unsold listings close; the original ticket is usable again only after cinema reactivation is confirmed.': 'تقدر تسحب العرض في أي وقت قبل العرض. مع بداية العرض العروض اللي متباعتش بتقفل؛ والتذكرة الأصلية ترجع صالحة بس بعد ما السينما تأكد إعادة تفعيلها.',
    "If a cinema changes or cancels a show after resale, both parties are notified. The current ticket holder follows the cinema's refund or rebooking policy, and YALLA coordinates with the cinema. If a refund is allowed, the ticket amount is refundable; platform fees are non-refundable subject to applicable terms.": 'لو السينما غيّرت أو لغت عرض بعد إعادة البيع، الطرفين بيتبلغوا. حامل التذكرة الحالي بيتبع سياسة السينما للاسترداد أو إعادة الحجز، وYALLA بتنسق مع السينما. لو الاسترداد مسموح، قيمة التذكرة بترجع؛ ورسوم المنصة غير قابلة للاسترداد حسب الشروط المعمول بيها.',
    'Resale checkout · Preview': 'دفع إعادة البيع · معاينة',
    'Buy ticket': 'اشتري التذكرة',
    'Tickets from this listing': 'تذاكر من العرض ده',
    'Resale ticket price': 'سعر تذكرة إعادة البيع',
    'Buyer platform fee · 5 EGP per ticket': 'رسوم المنصة على المشتري · ٥ جنيه لكل تذكرة',
    'Buyer total': 'إجمالي المشتري',
    'Payment and ticket replacement are demo actions; no money moves and no cinema ticket is changed.': 'الدفع واستبدال التذكرة عمليات تجريبية؛ مفيش فلوس بتتحول ولا تذكرة سينما بتتغير.',
    'Simulate successful transfer': 'محاكاة نقل ناجح',
    'Simulate transfer failure': 'محاكاة فشل النقل',
    'Cancel': 'إلغاء',
    'Verified ticket': 'تذكرة موثّقة',
    'capped at original price': 'بحد أقصى السعر الأصلي',
    'seller fee applies only after successful transfer': 'رسوم البائع بتتطبق بس بعد نجاح النقل',
    'unused and eligible': 'غير مستخدمة ومؤهلة',
    'Try another area.': 'جرّب منطقة تانية.',
    'Active': 'نشط',
    'sold': 'اتباعت',
    'pending-reactivation': 'في انتظار إعادة التفعيل',
    'reactivated': 'اتفعّلت تاني',
    'Ticket stays blocked until cinema confirms reactivation; owner/support alerted.': 'التذكرة بتفضل موقوفة لحد ما السينما تأكد إعادة التفعيل؛ تم تنبيه المالك والدعم.',
    'Cinema confirmed reactivation. Unsold ticket(s) are available to the original owner.': 'السينما أكدت إعادة التفعيل. التذاكر اللي متباعتش متاحة لصاحبها الأصلي.',
    'Withdraw unsold tickets': 'اسحب التذاكر اللي متباعتش',
    'Simulate show start': 'محاكاة بداية العرض',
    'Simulate cinema reactivation confirmed': 'محاكاة تأكيد السينما لإعادة التفعيل',
    'Relist reactivated tickets': 'اعرض التذاكر المُعاد تفعيلها تاني',
    'Transfer failed: in the live flow the resale is cancelled and the buyer is automatically refunded. The seller’s original ticket remains valid.': 'فشل النقل: في الخدمة الفعلية بيتلغي البيع والمشتري بيسترد فلوسه تلقائيًا. وتذكرة البائع الأصلية بتفضل صالحة.',
    'Verify payout details before publishing a listing.': 'وثّق بيانات استلام الأموال قبل نشر العرض.',
    'Select at least one eligible, unused ticket.': 'اختار تذكرة واحدة مؤهلة وغير مستخدمة على الأقل.',

    // Search
    'Matching showtimes · YALLA': 'العروض المطابقة · YALLA',
    'Matching showtimes': 'العروض المطابقة',
    '/ Matching showtimes': '/ العروض المطابقة',
    'Exact seat matches': 'مقاعد مطابقة تمامًا',
    'Find your seats together.': 'لاقي مقاعدكم مع بعض.',
    "Only shows that can fit your seat count and arrangement appear here. We won't broaden your search silently.": 'هنا بتظهر بس العروض اللي تناسب عدد وترتيب مقاعدك. مش هنوسّع البحث من غير ما تعرف.',
    'Refine your search': 'حدّد بحثك',
    'All participating cinemas': 'كل السينمات المشاركة',
    'Showtime from': 'العرض من',
    'Showtime until': 'العرض لحد',
    'Any time': 'أي وقت',
    'Sort by': 'الترتيب حسب',
    'Soonest showtime': 'أقرب موعد',
    'Distance': 'المسافة',
    'Distance from': 'المسافة من',
    '⌖ Use my location (optional)': '⌖ استخدم موقعي (اختياري)',
    'Location sharing is optional.': 'مشاركة الموقع اختيارية.',
    'Update results': 'حدّث النتائج',
    'Loading matches…': 'جاري تحميل النتائج…',
    'Sample seat data': 'بيانات مقاعد تجريبية',
    'Availability is illustrative in this prototype. The live service must refresh cinema inventory and confirm the exact highlighted seats before checkout.': 'التوفر هنا توضيحي في النموذج ده. الخدمة الفعلية لازم تحدّث مقاعد السينما وتأكد المقاعد المحددة بالظبط قبل الدفع.',
    'No exact matches for this search': 'مفيش نتائج مطابقة تمامًا للبحث ده',
    "Try changing the seat quantity, arrangement, area, or showtime range. We won't show near matches as exact results.": 'جرّب تغيّر عدد المقاعد أو ترتيبها أو المنطقة أو مواعيد العرض. مش هنعرض نتائج قريبة على إنها مطابقة.',
    'Connected group available.': 'في مجموعة متصلة متاحة.',
    'Separated seat groups available.': 'في مجموعات مقاعد منفصلة متاحة.',
    'Connected group available. Separated seat groups available.': 'في مجموعة متصلة متاحة. وفي مجموعات مقاعد منفصلة متاحة.',
    '/ ticket': '/ تذكرة',
    'View matching seats': 'اعرض المقاعد المطابقة',
    'Location is unavailable in this browser. Choose an area above.': 'الموقع مش متاح في المتصفح ده. اختار منطقة من فوق.',
    'Waiting for location permission…': 'في انتظار إذن الموقع…',
    'Using your location for sorting only.': 'بنستخدم موقعك للترتيب بس.',
    'Location was not shared. Choose an area to sort by distance.': 'الموقع متشاركش. اختار منطقة للترتيب حسب المسافة.',

    // Seats
    'Select seats · YALLA': 'اختيار المقاعد · YALLA',
    'Select seats': 'اختيار المقاعد',
    '/ Choose seats': '/ اختيار المقاعد',
    'Your movie night': 'ليلة السينما بتاعتك',
    'Choose your seats': 'اختار مقاعدك',
    'SCREEN': 'الشاشة',
    'Best match': 'أفضل اختيار',
    'Choose a highlighted group or select another qualifying group above the map.': 'اختار مجموعة من المحددة أو مجموعة مناسبة تانية فوق الخريطة.',
    '↻ Refresh sample availability': '↻ حدّث التوفر التجريبي',
    'Booking summary': 'ملخص الحجز',
    'Choose a matching group': 'اختار مجموعة مطابقة',
    'Only the exact highlighted seats are held during checkout, subject to cinema confirmation.': 'المقاعد المحددة بس هي اللي بتتحجز وقت الدفع، بشرط تأكيد السينما.',
    'No matching seats': 'مفيش مقاعد مطابقة',
    'Those seats are no longer available.': 'المقاعد دي مبقتش متاحة.',
    'Refresh matching showtimes': 'حدّث العروض المطابقة',
    'No groups remain at this showtime. Matching showtimes were updated; try another option.': 'مفيش مجموعات متبقية في الموعد ده. العروض المطابقة اتحدثت؛ جرّب اختيار تاني.',
    'No matching seats are available. Refresh or change your search.': 'مفيش مقاعد مطابقة متاحة. حدّث الصفحة أو غيّر بحثك.',

    // Support
    'Help & support · YALLA': 'المساعدة والدعم · YALLA',
    "We're here to help": 'إحنا هنا عشان نساعدك',
    "Let's sort it out.": 'يلا نحلها.',
    'Questions about a booking? Find quick answers below or send our support team a note.': 'عندك سؤال عن حجز؟ هتلاقي إجابات سريعة تحت أو ابعت رسالة لفريق الدعم.',
    'Need help with a ticket?': 'محتاج مساعدة في تذكرة؟',
    'Have your booking reference and email ready. Our team can coordinate booking issues with the cinema.': 'جهّز رقم الحجز والإيميل. فريقنا يقدر ينسق مشاكل الحجز مع السينما.',
    'Email support': 'راسل الدعم',
    'Before you book': 'قبل ما تحجز',
    'Clear prices, no surprises.': 'أسعار واضحة، من غير مفاجآت.',
    'The cinema ticket price and 5 EGP platform fee per ticket appear in your order total before you pay.': 'سعر تذكرة السينما ورسوم المنصة ٥ جنيه لكل تذكرة بيظهروا في إجمالي الطلب قبل ما تدفع.',
    'Browse showtimes': 'تصفّح المواعيد',
    'Cinema partners': 'السينمات الشريكة',
    'Listing or booking question?': 'سؤال عن عرض أو حجز؟',
    'We’ll help coordinate with participating cinemas when a show or booking needs attention.': 'هنساعد في التنسيق مع السينمات المشاركة لما عرض أو حجز يحتاج متابعة.',
    'Contact partners': 'تواصل مع الشركاء',
    'Frequently asked questions': 'الأسئلة الشائعة',
    'The quick answers': 'الإجابات السريعة',
    'Do I need an account to book?': 'هل محتاج حساب عشان أحجز؟',
    'No. Browse and book as a guest. Guest checkout asks for your name, email, and mobile number.': 'لأ. تقدر تتصفح وتحجز كضيف. الحجز كضيف بيطلب اسمك وإيميلك ورقم موبايلك.',
    'What does the platform fee cover?': 'رسوم المنصة بتغطي إيه؟',
    'A fixed 5 EGP platform fee is added per ticket. The cinema ticket price, fee, and total are shown before payment.': 'بتتضاف رسوم ثابتة ٥ جنيه للمنصة على كل تذكرة. سعر التذكرة والرسوم والإجمالي بيظهروا قبل الدفع.',
    'How do I use my ticket?': 'أستخدم تذكرتي إزاي؟',
    'Open your scannable ticket from the confirmation page or email and show it at the cinema entrance.': 'افتح تذكرتك القابلة للمسح من صفحة التأكيد أو الإيميل واعرضها على باب السينما.',
    'What is the cancellation and refund policy?': 'إيه سياسة الإلغاء والاسترداد؟',
    'The relevant cinema’s policy applies and is shown before purchase. Exact cancellation, refund, and show-change workflows are agreed with each cinema. Contact support if a cinema changes or cancels your show.': 'بتطبق سياسة السينما المعنية وبتظهر قبل الشراء. تفاصيل الإلغاء والاسترداد وتغيير العروض بتتحدد مع كل سينما. تواصل مع الدعم لو السينما غيّرت أو لغت عرضك.',
    'What if my seats become unavailable?': 'لو مقاعدي بقت مش متاحة؟',
    "Availability is checked again before your seats are reserved. If a seat is no longer available, change your quantity or arrangement to refresh matching showtimes; the platform won't silently substitute near matches.": 'بيتم التأكد من التوفر تاني قبل حجز مقاعدك. لو مقعد مبقاش متاح، غيّر العدد أو الترتيب عشان تتحدث العروض المطابقة؛ المنصة مش هتبدّل مقاعدك بمقاعد قريبة من غير ما تعرف.',
    'Which tickets can be resold?': 'إيه التذاكر اللي ينفع تتباع تاني؟',
    'Only unused tickets originally purchased through YALLA can be listed. Sellers need an account and verified payout details; scanned or used tickets are not eligible.': 'التذاكر غير المستخدمة اللي اتشرت من YALLA بس هي اللي ينفع تتعرض. البائع محتاج حساب وبيانات استلام أموال موثّقة؛ والتذاكر اللي اتمسحت أو اتستخدمت مش مؤهلة.',
    'How are resale prices and fees calculated?': 'أسعار ورسوم إعادة البيع بتتحسب إزاي؟',
    "A seller's price cannot exceed the original cinema ticket amount paid, excluding platform fees. Buyers pay the listing price plus 5 EGP per ticket. Sellers pay a 20 EGP fee only after a successful transfer; proceeds cannot be negative.": 'سعر البائع ميزيدش عن سعر التذكرة الأصلي المدفوع للسينما، من غير رسوم المنصة. المشتري بيدفع سعر العرض + ٥ جنيه لكل تذكرة. البائع بيدفع ٢٠ جنيه رسوم بس بعد نجاح النقل؛ والعائد مينفعش يبقى بالسالب.',
    "What happens if a resale doesn't sell or a transfer fails?": 'إيه اللي بيحصل لو التذكرة متباعتش أو النقل فشل؟',
    "Unsold listings close at showtime. The original ticket stays blocked until the cinema confirms reactivation. If buyer payment succeeds but ticket transfer fails, the resale is cancelled, the buyer is refunded automatically, and the seller's original ticket remains valid.": 'العروض اللي متباعتش بتقفل في ميعاد العرض. التذكرة الأصلية بتفضل موقوفة لحد ما السينما تأكد إعادة تفعيلها. لو دفع المشتري نجح بس نقل التذكرة فشل، البيع بيتلغي والمشتري بيسترد فلوسه تلقائيًا، وتذكرة البائع الأصلية بتفضل صالحة.',

    // Ticket
    'Your ticket · YALLA': 'تذكرتك · YALLA',
    '✓ Booking confirmed': '✓ تم تأكيد الحجز',
    "You're going to the movies.": 'إنت رايح السينما.',
    'Your sample ticket is ready. In the live service, this ticket is issued after payment and cinema confirmation.': 'تذكرتك التجريبية جاهزة. في الخدمة الفعلية التذكرة بتصدر بعد الدفع وتأكيد السينما.',
    'YALLA · E-TICKET': 'YALLA · تذكرة إلكترونية',
    'DATE & TIME': 'التاريخ والوقت',
    'SEATS': 'المقاعد',
    'BOOKING REFERENCE': 'رقم الحجز',
    'Sample scannable ticket code': 'كود تذكرة تجريبي قابل للمسح',
    'Show this code at the cinema entrance. Sample QR graphic for design preview.': 'اعرض الكود ده على باب السينما. صورة QR تجريبية لنسخة العرض.',
    'Total paid': 'إجمالي المدفوع',
    'Print ticket': 'اطبع التذكرة',
    'Find another movie': 'دوّر على فيلم تاني',
    'A copy would be sent to': 'هتتبعت نسخة على',
    'your email': 'إيميلك',
    'in the live service.': 'في الخدمة الفعلية.'
  };

  function plural(n, one, few, many) {
    n = Number(n);
    return n === 1 ? one : n >= 2 && n <= 10 ? few : many;
  }
  function T(s) { var r = translate(s); return r == null ? s : r; }

  /* Patterns for text the page scripts build at runtime. */
  var RULES = [
    [/^(\d{1,2}:\d{2}) ?(AM|PM)$/, function (m) { return m[1] + (m[2] === 'AM' ? ' ص' : ' م'); }],
    [/^(\d+) EGP$/, function (m) { return m[1] + ' جنيه'; }],
    [/^(\d+) EGP\/ticket$/, function (m) { return m[1] + ' جنيه/تذكرة'; }],
    [/^(\d+) EGP per ticket$/, function (m) { return m[1] + ' جنيه للتذكرة'; }],
    [/^from (\d+) EGP$/, function (m) { return 'من ' + m[1] + ' جنيه'; }],
    [/^Sample price from (\d+) EGP$/, function (m) { return 'سعر تجريبي من ' + m[1] + ' جنيه'; }],
    [/^(\d+)h (\d+)m$/, function (m) { return m[1] + 'س ' + m[2] + 'د'; }],
    [/^★ ([\d.]+) audience rating$/, function (m) { return '★ ' + m[1] + ' تقييم الجمهور'; }],
    [/^(\d+) seats?$/, function (m) { return m[1] + ' ' + plural(m[1], 'مقعد', 'مقاعد', 'مقعدًا'); }],
    [/^(\d+) matching cinemas?$/, function (m) { return m[1] + ' ' + plural(m[1], 'سينما مطابقة', 'سينمات مطابقة', 'سينما مطابقة'); }],
    [/^(\d+) qualifying seat groups$/, function (m) { return m[1] + ' ' + plural(m[1], 'مجموعة مقاعد مناسبة', 'مجموعات مقاعد مناسبة', 'مجموعة مقاعد مناسبة'); }],
    [/^(\d+) required$/, function (m) { return 'المطلوب ' + m[1]; }],
    [/^(\d+) ticket\(s\)$/, function (m) { return m[1] + ' ' + plural(m[1], 'تذكرة', 'تذاكر', 'تذكرة'); }],
    [/^(?:(\d+) )?tickets · (\d+) EGP \+ 5 EGP fee each$/, function (m) {
      return (m[1] ? m[1] + ' ' : '') + 'تذاكر · ' + m[2] + ' جنيه + ٥ جنيه رسوم لكل تذكرة';
    }],
    [/^Tickets (\d+) × (\d+) EGP$/, function (m) { return 'التذاكر ' + m[1] + ' × ' + m[2] + ' جنيه'; }],
    [/^Today, (.+)$/, function (m) { return 'اليوم، ' + T(m[1]); }],
    [/^Tomorrow, (.+)$/, function (m) { return 'غدًا، ' + T(m[1]); }],
    [/^Seat ([A-Z]\d+)$/, function (m) { return 'مقعد ' + m[1]; }],
    [/^Seats ([A-Z]\d+.*)$/, function (m) { return 'المقاعد ' + m[1]; }],
    [/^≈(.+) km from (.+)$/, function (m) { return '≈' + m[1] + ' كم من ' + T(m[2]); }],
    [/^No tickets in (.+)$/, function (m) { return 'مفيش تذاكر في ' + T(m[1]); }],
    [/^Buy (.+)$/, function (m) { return 'شراء ' + m[1]; }],
    [/^Seller proceeds after a successful transfer: (\d+) EGP per ticket \(listing price less 20 EGP, floored at zero\)\.$/, function (m) {
      return 'عائد البائع بعد نجاح النقل: ' + m[1] + ' جنيه للتذكرة (سعر العرض ناقص ٢٠ جنيه، وبحد أدنى صفر).';
    }],
    [/^Listing price must be between 1 and (\d+) EGP per ticket\.$/, function (m) {
      return 'سعر العرض لازم يكون بين ١ و' + m[1] + ' جنيه للتذكرة.';
    }],
    [/^Listing (\S+) published for (\d+) ticket\(s\)\. Seller fee applies only after a confirmed transfer\.$/, function (m) {
      return 'تم نشر العرض ' + m[1] + ' لعدد ' + m[2] + ' ' + plural(m[2], 'تذكرة', 'تذاكر', 'تذكرة') + '. رسوم البائع بتتطبق بس بعد تأكيد النقل.';
    }],
    [/^Transfer confirmed in preview\. Original ticket\(s\) (.+) invalidated; replacement (\S+) issued to buyer\. Seller proceeds: (\d+) EGP after transfer confirmation\.$/, function (m) {
      return 'تم تأكيد النقل في المعاينة. التذاكر الأصلية ' + m[1] + ' اتلغت؛ واتصدرت التذكرة البديلة ' + m[2] + ' للمشتري. عائد البائع: ' + m[3] + ' جنيه بعد تأكيد النقل.';
    }]
  ];

  /* Cinema names ("Galaxy Cinema · Maadi") stay in English: page scripts read them back. */
  var KEEP = /^(VOX|Reel|Galaxy)\b/;

  function translate(raw) {
    var s = String(raw).replace(/\s+/g, ' ').trim();
    if (!s || !/[A-Za-z]/.test(s)) return null;
    if (Object.prototype.hasOwnProperty.call(AR, s)) return AR[s];
    for (var i = 0; i < RULES.length; i++) {
      var m = s.match(RULES[i][0]);
      if (m) return RULES[i][1](m);
    }
    if (s.indexOf(' · ') > 0) {
      var parts = s.split(' · '), changed = false;
      for (var j = 0; j < parts.length; j++) {
        if (KEEP.test(parts[j])) { j++; continue; }
        var t = translate(parts[j]);
        if (t != null) { parts[j] = t; changed = true; }
      }
      if (changed) return parts.join(' · ');
    }
    return null;
  }
  function withSpacing(original, translated) {
    var lead = original.match(/^\s*/)[0], trail = original.match(/\s*$/)[0];
    return lead + translated + trail;
  }

  /* ---------- Applying translations ---------- */
  var textState = new WeakMap(); // Text node -> {en, ar}
  var attrState = new WeakMap(); // Element -> {attr: {en, ar}}
  var ATTRS = ['placeholder', 'title', 'aria-label'];
  var titleState = null;
  var observer = null;

  function skipped(el) {
    return !el || el.closest('script,style,[data-i18n-skip],[data-en]');
  }

  function translateTextNode(node) {
    if (skipped(node.parentElement)) return;
    var st = textState.get(node);
    if (st && node.data === st.ar) return;
    var t = translate(node.data);
    if (t == null) return;
    var ar = withSpacing(node.data, t);
    textState.set(node, { en: node.data, ar: ar });
    node.data = ar;
  }

  function translateAttrs(el) {
    if (skipped(el)) return;
    var st = attrState.get(el) || {};
    ATTRS.forEach(function (name) {
      var v = el.getAttribute(name);
      if (!v || (st[name] && v === st[name].ar)) return;
      // aria-label is read back by page scripts (e.g. "Seat A1"), so only exact phrases.
      var key = v.replace(/\s+/g, ' ').trim();
      var t = name === 'aria-label' ? (Object.prototype.hasOwnProperty.call(AR, key) ? AR[key] : null) : translate(v);
      if (t == null) return;
      st[name] = { en: v, ar: t };
      el.setAttribute(name, t);
    });
    attrState.set(el, st);
  }

  function translateTree(root) {
    if (root.nodeType === 3) { translateTextNode(root); return; }
    if (root.nodeType !== 1) return;
    translateAttrs(root);
    root.querySelectorAll('[placeholder],[title],[aria-label]').forEach(translateAttrs);
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(translateTextNode);
  }

  function restoreTree(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      var node = walker.currentNode, st = textState.get(node);
      if (st && node.data === st.ar) node.data = st.en;
    }
    [root].concat([].slice.call(root.querySelectorAll('[placeholder],[title],[aria-label]'))).forEach(function (el) {
      var st = attrState.get(el);
      if (!st) return;
      Object.keys(st).forEach(function (name) {
        if (el.getAttribute(name) === st[name].ar) el.setAttribute(name, st[name].en);
      });
    });
  }

  function applyDataAttrs(ar) {
    document.querySelectorAll('[data-en]').forEach(function (el) {
      el.innerHTML = ar ? el.dataset.ar : el.dataset.en;
    });
    document.querySelectorAll('[data-placeholder-en]').forEach(function (el) {
      el.placeholder = ar ? el.dataset.placeholderAr : el.dataset.placeholderEn;
    });
  }

  function applyTitle(ar) {
    if (ar) {
      if (titleState && document.title === titleState.ar) return;
      var t = translate(document.title);
      if (t == null) return;
      titleState = { en: document.title, ar: t };
      document.title = t;
    } else if (titleState && document.title === titleState.ar) {
      document.title = titleState.en;
    }
  }

  /* ---------- Language buttons ---------- */
  function buttonLabel() { return lang === 'ar' ? 'English' : 'عربي'; }

  function setupButtons() {
    var main = document.getElementById('langBtn');
    if (!main) {
      var side = document.querySelector('.navside, .nav-right');
      if (side) {
        main = document.createElement('button');
        main.type = 'button';
        main.className = 'lang';
        main.id = 'langBtn';
        side.insertBefore(main, side.firstChild);
      }
    }
    var nav = document.querySelector('.topbar .nav, header .nav');
    if (nav && !nav.querySelector('.lang-mobile')) {
      var mobile = document.createElement('button');
      mobile.type = 'button';
      mobile.className = 'lang lang-mobile';
      nav.appendChild(mobile);
    }
    document.querySelectorAll('#langBtn, .lang-mobile').forEach(function (b) {
      b.setAttribute('data-i18n-skip', '');
      b.setAttribute('lang', lang === 'ar' ? 'en' : 'ar');
      b.setAttribute('aria-label', lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية');
      b.textContent = buttonLabel();
      if (!b.dataset.i18nBound) {
        b.dataset.i18nBound = '1';
        b.addEventListener('click', function () { setLang(lang === 'ar' ? 'en' : 'ar'); });
      }
    });
  }

  function apply() {
    var ar = lang === 'ar';
    html.lang = lang;
    html.dir = ar ? 'rtl' : 'ltr';
    applyDataAttrs(ar);
    if (ar) translateTree(document.body); else restoreTree(document.body);
    applyTitle(ar);
    setupButtons();
    if (observer) observer.takeRecords();
    html.classList.remove('i18n-pending');
  }

  function setLang(next) {
    lang = next === 'ar' ? 'ar' : 'en';
    saveLang(lang);
    apply();
  }

  /* Translate whatever the page scripts render after load. */
  function observe() {
    observer = new MutationObserver(function (records) {
      if (!document.getElementById('langBtn') || !document.querySelector('.lang-mobile')) setupButtons();
      if (lang !== 'ar') return;
      records.forEach(function (r) {
        if (r.type === 'characterData') translateTextNode(r.target);
        else if (r.type === 'attributes') translateAttrs(r.target);
        else r.addedNodes.forEach(translateTree);
        if (r.target.nodeName === 'TITLE' || (r.target.parentNode && r.target.parentNode.nodeName === 'TITLE')) applyTitle(true);
      });
      observer.takeRecords();
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    var title = document.querySelector('title');
    if (title) observer.observe(title, { childList: true, subtree: true, characterData: true });
  }

  function init() {
    apply();
    observe();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.yallaI18n = {
    get lang() { return lang; },
    setLang: setLang,
    t: function (s) { return lang === 'ar' ? T(s) : s; }
  };
})();
