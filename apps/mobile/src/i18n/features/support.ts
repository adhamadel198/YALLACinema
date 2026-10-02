// Copy for the help and support page (BRD 7.6, 9, 11). Merged into strings.ts.
// Answers describe what the app does today; update them when the flows change
// (for example the 10-minute seat hold, the YL- booking reference, or email delivery).

import { MAX_SEATS_PER_BOOKING as MAX } from '../../api/types';

const arDigits = (n: number) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);

export const en = {
  supportTitle: 'Help & support',
  supportNeedHelp: 'Need help?',
  supportKicker: 'WE’RE HERE TO HELP',
  supportHeading: 'Let’s sort it out.',
  supportLead: 'Questions about a booking? Find quick answers below. If you still need a hand, YALLA support is here for you.',

  supportContactTitle: 'Need help with a booking?',
  supportContactBody:
    'YALLA support handles booking problems and talks to the cinema for you. When you get in touch, have your booking reference ready: it starts with YL- and is on your ticket. The email and mobile number you booked with help too.',
  supportYourReference: 'Your booking reference',
  supportChannelsLabel: 'CONTACT OPTIONS',
  supportChannelsSoon: 'Ways to reach us and our support hours will be listed here soon.',

  supportFaqKicker: 'FREQUENTLY ASKED QUESTIONS',
  supportFaqTitle: 'The quick answers',
  supportFaq: {
    booking: {
      title: 'Booking and seats',
      items: {
        find: {
          q: 'How do I find seats for my group?',
          a: 'Pick a movie, then choose how many seats you need and whether they must be together (next to each other in the same row), separated, or either. We only show showtimes that can seat you exactly that way, and the seat map highlights the best match. You can tap another matching group if you prefer. We never swap in near matches without telling you.',
        },
        limit: {
          q: 'How many seats can I book at once?',
          a: `Up to ${MAX} seats in one booking. For a bigger group, make a second booking once the first one is done.`,
        },
        hold: {
          q: 'How long are my seats held?',
          a: 'When you tap “Continue to checkout”, we check that the seats are still free and hold those exact seats for 10 minutes while you check out. The countdown at checkout shows the time left. If it runs out, the seats are released and you can choose again. You can hold one set of seats at a time: holding new seats releases the old ones, and “Cancel and release seats” lets them go straight away.',
        },
        taken: {
          q: 'What if someone takes my seats first?',
          a: 'Seats are checked again the moment you hold them. If someone got there first, the seat map refreshes with what is still free so you can pick again. If no matching seats are left, go back and try another time or a different number of seats.',
        },
      },
    },
    accounts: {
      title: 'Guest checkout and accounts',
      items: {
        guest: {
          q: 'Do I need an account to book?',
          a: 'No. You can book as a guest with your name, email address and mobile number. An account is optional for booking; you only need one to resell tickets.',
        },
        find: {
          q: 'Where do I find my tickets later?',
          a: 'In My Tickets on the phone or browser you booked with. Tickets aren’t sent by email yet, so keep your booking reference somewhere safe. If you were signed in when you booked, the booking is saved to your account too. Can’t find a booking? Contact support with your booking reference and the email you booked with.',
        },
      },
    },
    payment: {
      title: 'Payment and fees',
      items: {
        methods: {
          q: 'How can I pay?',
          a: 'With a bank card or a local digital wallet; you choose at checkout. Your booking is confirmed once the payment goes through and the cinema confirms your seats.',
        },
        fee: {
          q: 'What is the 5 EGP fee?',
          a: 'YALLA adds a fixed platform fee of 5 EGP per ticket on top of the cinema’s ticket price. Before you pay, checkout shows the ticket price, the fee and the total.',
        },
        failed: {
          q: 'What if my payment fails?',
          a: 'Your seats are released and no booking is made, so you can choose seats and try again. If you have paid but the cinema can’t confirm your seats, we refund you automatically.',
        },
      },
    },
    tickets: {
      title: 'Tickets and QR codes',
      items: {
        use: {
          q: 'How do I use my ticket?',
          a: 'Open your ticket from My Tickets and show the QR codes at the cinema entrance. Each seat has its own code, so if your group isn’t arriving together you can send a friend the code for their seat.',
        },
        reference: {
          q: 'Where is my booking reference?',
          a: 'On your ticket, under the movie details. It starts with YL- (for example YL-K7Q2M9). Have it ready whenever you contact support.',
        },
      },
    },
    cancellations: {
      title: 'Cancellations and refunds',
      items: {
        cancel: {
          q: 'Can I cancel my booking?',
          a: 'Each cinema sets its own cancellation and refund policy. You see it and agree to it at checkout, and it is on your ticket too. You can’t cancel in the app yet: contact support with your booking reference and we’ll arrange it with the cinema under its policy.',
        },
        refund: {
          q: 'Will I get my money back?',
          a: 'It depends on the cinema’s policy, which says whether you can get a refund and until when. Each cinema’s policy is listed below.',
        },
        showChange: {
          q: 'What if the cinema changes or cancels my show?',
          a: 'The change shows on your ticket in My Tickets: the new time or format, or that the show was cancelled. We can’t email or text you about changes yet, so check your ticket before you go. If the change doesn’t suit you, contact support with your booking reference and we’ll work it out with the cinema under its policy, whether that’s a refund or another show.',
        },
      },
    },
    resale: {
      title: 'Reselling tickets',
      items: {
        eligible: {
          q: 'Which tickets can I resell?',
          a: 'Only tickets you bought on YALLA that haven’t been scanned or used. You need a YALLA account and payout details (a mobile wallet or bank account) so we know where to send your money; we don’t verify payout details yet. We check with the cinema that the ticket can be resold before it goes on sale. You can put one ticket or several from the same booking up for sale.',
        },
        price: {
          q: 'How much can I sell for, and what do I get?',
          a: 'Your price can be at most what you paid for the ticket, not counting the 5 EGP platform fee. The buyer pays your price plus 5 EGP. When the sale goes through, you get your price minus a 20 EGP resale fee. If your price is under 20 EGP you get nothing, but you never pay anything, and there is no fee if the ticket doesn’t sell. For example, a 180 EGP ticket listed at 150 EGP: the buyer pays 155 EGP and you get 130 EGP.',
        },
        sold: {
          q: 'What happens when my ticket sells?',
          a: 'Your original ticket stops working and the buyer gets a new ticket with a new QR code. You are paid once the buyer’s payment and the transfer are confirmed. If the buyer pays but the transfer fails, the sale is cancelled, the buyer is refunded automatically and your ticket stays valid.',
        },
        unsold: {
          q: 'What if it doesn’t sell?',
          a: 'You can take an unsold ticket off sale any time before the show starts. When the show starts, any unsold ticket comes off sale and returns to you once the cinema confirms it is active again; until then it stays blocked and our support team is alerted to follow up. If only some of your tickets sell, the rest stay yours.',
        },
        refund: {
          q: 'Who can get a refund after a resale?',
          a: 'Whoever holds the ticket now. If the cinema’s policy allows a refund, the ticket price is refunded but platform fees are not. If the cinema changes or cancels the show, we tell both the buyer and the seller and follow the cinema’s policy.',
        },
      },
    },
  },

  supportPoliciesTitle: 'Cinema cancellation policies',
  supportPoliciesBody: 'The policy of the cinema you book with applies to your booking. You also see it at checkout before you pay.',
  supportYourCinema: 'Your booking',
};

export const ar: typeof en = {
  supportTitle: 'المساعدة والدعم',
  supportNeedHelp: 'محتاج مساعدة؟',
  supportKicker: 'إحنا هنا عشان نساعدك',
  supportHeading: 'يلا نحلها.',
  supportLead: 'عندك سؤال عن حجز؟ هتلاقي إجابات سريعة تحت. ولو لسه محتاج مساعدة، فريق دعم YALLA موجود.',

  supportContactTitle: 'محتاج مساعدة في حجز؟',
  supportContactBody:
    'فريق دعم YALLA بيتابع مشاكل الحجز وبيتواصل مع السينما بالنيابة عنك. لما تكلمنا خلّي رقم الحجز جاهز معاك؛ بيبدأ بحروف YL وتلاقيه على تذكرتك. والإيميل ورقم الموبايل اللي حجزت بيهم بيساعدونا كمان.',
  supportYourReference: 'رقم حجزك',
  supportChannelsLabel: 'طرق التواصل',
  supportChannelsSoon: 'طرق التواصل معانا ومواعيد الدعم هتتنشر هنا قريب.',

  supportFaqKicker: 'الأسئلة المتكررة',
  supportFaqTitle: 'الإجابات السريعة',
  supportFaq: {
    booking: {
      title: 'الحجز والكراسي',
      items: {
        find: {
          q: 'إزاي ألاقي كراسي لمجموعتي؟',
          a: 'اختار الفيلم، وبعدين حدد محتاج كام كرسي ولازم يكونوا جنب بعض (لازقين في نفس الصف) ولا متفرقين ولا أي ترتيب. هنعرضلك بس العروض اللي فيها كراسي مناسبة لطلبك بالظبط، وخريطة الكراسي بتعلّم على أفضل اختيار. ولو حابب، تقدر تختار مجموعة تانية مناسبة. عمرنا ما هنبدّل طلبك بكراسي قريبة منه من غير ما نقولك.',
        },
        limit: {
          q: 'أقدر أحجز كام كرسي مرة واحدة؟',
          a: `لحد ${arDigits(MAX)} كراسي في الحجز الواحد. لو مجموعتكم أكبر، اعمل حجز تاني بعد ما تخلّص الأول.`,
        },
        hold: {
          q: 'الكراسي بتفضل محجوزة لي قد إيه؟',
          a: 'لما تدوس «كمّل للدفع»، بنتأكد إن الكراسي لسه فاضية وبنحجزلك نفس الكراسي دي بالظبط لمدة ١٠ دقايق وإنت بتدفع. العداد في صفحة الدفع بيوريك الوقت الباقي. لو الوقت خلص، الكراسي بتتفك وتقدر تختار تاني. تقدر تحجز مجموعة كراسي واحدة بس في المرة: لو حجزت كراسي جديدة القديمة بتتفك، ولو دوست «إلغاء وفك حجز الكراسي» بتتفك على طول.',
        },
        taken: {
          q: 'لو حد حجز الكراسي قبلي؟',
          a: 'بنتأكد من الكراسي تاني في نفس اللحظة اللي بتحجزها فيها. لو حد سبقك، خريطة الكراسي بتتحدث باللي لسه فاضي وتقدر تختار تاني. ولو مفيش كراسي مناسبة فاضلة، ارجع وجرّب معاد تاني أو عدد كراسي مختلف.',
        },
      },
    },
    accounts: {
      title: 'الحجز كضيف والحساب',
      items: {
        guest: {
          q: 'لازم يكون عندي حساب عشان أحجز؟',
          a: 'لأ. تقدر تحجز كضيف باسمك وإيميلك ورقم موبايلك. الحساب اختياري للحجز؛ هتحتاجه بس لو عايز تبيع تذاكر تاني.',
        },
        find: {
          q: 'ألاقي تذاكري فين بعدين؟',
          a: 'في تبويب «تذاكري» على الموبايل أو المتصفح اللي حجزت منه. التذاكر لسه مش بتتبعت على الإيميل، فاحتفظ برقم الحجز في مكان أمان. ولو كنت مسجّل دخول وإنت بتحجز، الحجز بيتسجل على حسابك كمان. مش لاقي حجز؟ كلّم الدعم ومعاك رقم الحجز والإيميل اللي حجزت بيه.',
        },
      },
    },
    payment: {
      title: 'الدفع والرسوم',
      items: {
        methods: {
          q: 'أدفع إزاي؟',
          a: 'ببطاقة بنكية أو محفظة إلكترونية، وبتختار في صفحة الدفع. الحجز بيتأكد لما الدفع ينجح والسينما تأكد كراسيك.',
        },
        fee: {
          q: 'إيه رسوم الـ٥ جنيه دي؟',
          a: 'YALLA بتضيف رسوم منصة ثابتة ٥ جنيه على كل تذكرة فوق سعر تذكرة السينما. قبل ما تدفع، صفحة الدفع بتوريك سعر التذاكر والرسوم والإجمالي.',
        },
        failed: {
          q: 'لو الدفع منجحش؟',
          a: 'الكراسي بتتفك ومفيش حجز بيتعمل، فتقدر تختار كراسي وتحاول تاني. ولو دفعت والسينما مقدرتش تأكد كراسيك، فلوسك بترجعلك تلقائيًا.',
        },
      },
    },
    tickets: {
      title: 'التذاكر وأكواد QR',
      items: {
        use: {
          q: 'أستخدم تذكرتي إزاي؟',
          a: 'افتح تذكرتك من تبويب «تذاكري» وورّي أكواد QR عند باب السينما. كل كرسي ليه كود لوحده، فلو مجموعتكم مش جاية مع بعض تقدر تبعت لصاحبك كود الكرسي بتاعه.',
        },
        reference: {
          q: 'ألاقي رقم الحجز فين؟',
          a: 'على تذكرتك تحت تفاصيل الفيلم، وبيبدأ بحروف YL (زي YL-K7Q2M9). خلّيه جاهز معاك كل ما تكلم الدعم.',
        },
      },
    },
    cancellations: {
      title: 'الإلغاء والاسترداد',
      items: {
        cancel: {
          q: 'أقدر ألغي حجزي؟',
          a: 'كل سينما ليها سياسة إلغاء واسترداد خاصة بيها، بتشوفها وتوافق عليها في صفحة الدفع، ومكتوبة على تذكرتك كمان. الإلغاء من التطبيق لسه مش متاح: كلّم الدعم ومعاك رقم الحجز وإحنا هنرتّب الموضوع مع السينما حسب سياستها.',
        },
        refund: {
          q: 'فلوسي هترجعلي؟',
          a: 'ده بيعتمد على سياسة السينما، وهي اللي بتقول إذا كان ينفع تسترد فلوسك ولحد إمتى. سياسة كل سينما مكتوبة تحت.',
        },
        showChange: {
          q: 'لو السينما غيّرت أو لغت العرض بتاعي؟',
          a: 'التغيير بيظهر على تذكرتك في تبويب «تذاكري»: المعاد أو النوع الجديد، أو إن العرض اتلغى. لسه مش بنقدر نبعتلك إيميل أو رسالة بالتغييرات، فبص على تذكرتك قبل ما تروح. ولو التغيير مش مناسبك، كلّم الدعم ومعاك رقم الحجز، وإحنا هنتابع مع السينما ونمشي على سياستها، سواء استرداد الفلوس أو عرض تاني.',
        },
      },
    },
    resale: {
      title: 'إعادة بيع التذاكر',
      items: {
        eligible: {
          q: 'إيه التذاكر اللي أقدر أبيعها تاني؟',
          a: 'التذاكر اللي اشتريتها من YALLA بس، واللي متمسحتش ومتستخدمتش. محتاج حساب على YALLA وبيانات استلام فلوس (محفظة موبايل أو حساب بنكي) عشان نعرف نحوّلك فلوسك فين؛ والبيانات دي لسه مش بنتأكد منها. وبنتأكد مع السينما إن التذكرة ينفع تتباع قبل ما تنزل للبيع. تقدر تنزّل تذكرة واحدة أو أكتر من نفس الحجز.',
        },
        price: {
          q: 'أبيع بكام، وهاخد كام؟',
          a: 'أقصى سعر تقدر تبيع بيه هو اللي دفعته في التذكرة، من غير رسوم المنصة الـ٥ جنيه. المشتري بيدفع سعرك + ٥ جنيه. ولما البيعة تتم، بتاخد سعرك ناقص ٢٠ جنيه رسوم إعادة بيع. لو سعرك أقل من ٢٠ جنيه مش هتاخد حاجة، بس عمرك ما هتدفع من جيبك، ولو التذكرة متباعتش مفيش رسوم. مثلًا: تذكرة بـ١٨٠ جنيه نزّلتها بـ١٥٠ جنيه، المشتري يدفع ١٥٥ جنيه وإنت تاخد ١٣٠ جنيه.',
        },
        sold: {
          q: 'إيه اللي بيحصل لما تذكرتي تتباع؟',
          a: 'تذكرتك الأصلية بتبطل تشتغل والمشتري بياخد تذكرة جديدة بكود QR جديد. فلوسك بتوصلك بعد ما دفع المشتري ونقل التذكرة يتأكدوا. ولو المشتري دفع والنقل فشل، البيعة بتتلغي والمشتري فلوسه بترجعله تلقائيًا وتذكرتك بتفضل صالحة.',
        },
        unsold: {
          q: 'لو التذكرة متباعتش؟',
          a: 'تقدر تشيل التذكرة من البيع في أي وقت قبل ما العرض يبدأ. ولما العرض يبدأ، أي تذكرة متباعتش بتنزل من البيع وترجعلك بعد ما السينما تأكد إنها اتفعّلت تاني؛ لحد كده بتفضل موقوفة وفريق الدعم بيوصله تنبيه عشان يتابع. ولو جزء بس من تذاكرك اتباع، الباقي بيفضل بتاعك.',
        },
        refund: {
          q: 'مين يقدر يسترد الفلوس بعد إعادة البيع؟',
          a: 'اللي معاه التذكرة دلوقتي. لو سياسة السينما بتسمح بالاسترداد، سعر التذكرة بيرجع لكن رسوم المنصة مش بترجع. ولو السينما غيّرت أو لغت العرض، بنبلّغ البايع والمشتري وبنمشي على سياسة السينما.',
        },
      },
    },
  },

  supportPoliciesTitle: 'سياسات الإلغاء في السينمات',
  supportPoliciesBody: 'سياسة السينما اللي بتحجز فيها هي اللي بتتطبق على حجزك، وبتظهرلك كمان في صفحة الدفع قبل ما تدفع.',
  supportYourCinema: 'حجزك',
};
