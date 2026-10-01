// Copy for sign-in, sign-up, the Profile tab and booking history (BRD 5.1, 7.3). Merged into strings.ts.
// Shared field labels (fullName, email, mobile, mobilePlaceholder) come from strings.ts.

export const en = {
  signIn: 'Sign in',
  signOut: 'Sign out',
  createAccount: 'Create an account',

  authSignInKicker: 'WELCOME BACK',
  authSignInHeading: 'Your next movie night starts here.',
  authSignInBody: 'Sign in to see your tickets on any device and check out faster. Booking as a guest is always available.',
  authPassword: 'Password',
  authShowPassword: 'Show',
  authHidePassword: 'Hide',
  authNewHere: 'New to YALLA?',

  authSignUpTitle: 'Create account',
  authSignUpKicker: 'NEW TO YALLA',
  authSignUpHeading: 'Keep every ticket in one place.',
  authSignUpBody: 'We save your details for checkout, and your tickets follow you to any device.',
  authPasswordHint: 'At least 8 characters.',
  authCreate: 'Create account',
  authHaveAccount: 'Already have an account?',
  authDeviceTickets: 'Tickets booked as a guest on this device with this email are added to your account when you sign in.',

  authWrongPassword: 'Wrong email or password.',
  authEmailTaken: 'An account with this email already exists.',
  authSignInInstead: 'Sign in instead',
  authTooMany: 'Too many attempts. Please wait a few minutes and try again.',
  authOffline: 'Couldn’t reach YALLA. Check your connection and try again.',
  authCheckFields: 'Please check the fields above.',
  authNameInvalid: 'Enter your name (at least 2 letters).',
  authEmailInvalid: 'Enter an email address like name@example.com.',
  authMobileInvalid: 'Enter a mobile number with 8 to 16 digits.',
  authPasswordShort: 'Use at least 8 characters.',
  authPasswordMissing: 'Enter your password.',
  authAlreadyIn: (email: string) => `You’re signed in as ${email}.`,
  authContinue: 'Continue',

  accountInviteTitle: 'Sign in to YALLA',
  accountInviteBody: 'See your tickets on any device and check out faster with your saved details.',

  historySignInPrompt: 'Booked with your account? Sign in to see those tickets here too.',
  historySignedInEmpty: 'Tickets you book with your account or on this device appear here.',
  historyAccountFailed: 'Couldn’t load your account’s tickets. Showing the ones saved on this device.',

  checkoutSignedIn: (email: string) => `Signed in as ${email}. Your saved details are filled in, and this booking is saved to your account.`,
  checkoutSignInPrompt: 'Have an account? Sign in to fill in your details.',
};

export const ar: typeof en = {
  signIn: 'تسجيل الدخول',
  signOut: 'تسجيل الخروج',
  createAccount: 'اعمل حساب',

  authSignInKicker: 'أهلًا بيك تاني',
  authSignInHeading: 'سهرة السينما الجاية بتبدأ من هنا.',
  authSignInBody: 'سجّل دخول عشان تشوف تذاكرك من أي جهاز وتدفع أسرع. وتقدر دايمًا تحجز من غير حساب.',
  authPassword: 'كلمة السر',
  authShowPassword: 'إظهار',
  authHidePassword: 'إخفاء',
  authNewHere: 'أول مرة على YALLA؟',

  authSignUpTitle: 'حساب جديد',
  authSignUpKicker: 'جديد على YALLA',
  authSignUpHeading: 'كل تذاكرك في مكان واحد.',
  authSignUpBody: 'بنحفظ بياناتك عشان الدفع يبقى أسرع، وتذاكرك تبقى معاك على أي جهاز.',
  authPasswordHint: '٨ حروف على الأقل.',
  authCreate: 'اعمل الحساب',
  authHaveAccount: 'عندك حساب بالفعل؟',
  authDeviceTickets: 'التذاكر اللي حجزتها من الجهاز ده من غير حساب بالإيميل ده بتتضاف لحسابك لما تسجّل دخول.',

  authWrongPassword: 'الإيميل أو كلمة السر غلط.',
  authEmailTaken: 'فيه حساب بالإيميل ده بالفعل.',
  authSignInInstead: 'سجّل دخول بدل كده',
  authTooMany: 'محاولات كتير في وقت قصير. استنى كام دقيقة وحاول تاني.',
  authOffline: 'مقدرناش نوصل لـ YALLA. اتأكد من الاتصال وحاول تاني.',
  authCheckFields: 'راجع البيانات اللي فوق.',
  authNameInvalid: 'اكتب اسمك (حرفين على الأقل).',
  authEmailInvalid: 'اكتب إيميل صحيح زي name@example.com.',
  authMobileInvalid: 'اكتب رقم موبايل من ٨ لـ ١٦ رقم.',
  authPasswordShort: 'استخدم ٨ حروف على الأقل.',
  authPasswordMissing: 'اكتب كلمة السر.',
  authAlreadyIn: (email) => `إنت مسجّل دخول بـ ${email}.`,
  authContinue: 'كمّل',

  accountInviteTitle: 'سجّل دخولك على YALLA',
  accountInviteBody: 'شوف تذاكرك من أي جهاز وادفع أسرع ببياناتك المحفوظة.',

  historySignInPrompt: 'حجزت بحسابك؟ سجّل دخول عشان تشوف التذاكر دي هنا كمان.',
  historySignedInEmpty: 'التذاكر اللي بتحجزها بحسابك أو من الجهاز ده هتظهر هنا.',
  historyAccountFailed: 'مقدرناش نحمّل تذاكر حسابك. دي التذاكر المحفوظة على الجهاز ده.',

  checkoutSignedIn: (email) => `إنت مسجّل دخول بـ ${email}. بياناتك المحفوظة اتكتبت، والحجز ده هيتحفظ في حسابك.`,
  checkoutSignInPrompt: 'عندك حساب؟ سجّل دخول وبياناتك تتكتب لوحدها.',
};
