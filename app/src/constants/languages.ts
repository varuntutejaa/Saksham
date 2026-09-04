import type { LanguageCode } from '@/lib/api';

export interface LanguageOption {
  code: LanguageCode;
  /** name in its own script */
  native: string;
  /** name in English */
  english: string;
  /** BCP-47 tag for expo-speech */
  speechTag: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', native: 'English', english: 'English', speechTag: 'en-IN' },
  { code: 'hi', native: 'हिन्दी', english: 'Hindi', speechTag: 'hi-IN' },
  { code: 'bn', native: 'বাংলা', english: 'Bengali', speechTag: 'bn-IN' },
  { code: 'ta', native: 'தமிழ்', english: 'Tamil', speechTag: 'ta-IN' },
  { code: 'te', native: 'తెలుగు', english: 'Telugu', speechTag: 'te-IN' },
  { code: 'mr', native: 'मराठी', english: 'Marathi', speechTag: 'mr-IN' },
  { code: 'kn', native: 'ಕನ್ನಡ', english: 'Kannada', speechTag: 'kn-IN' },
  { code: 'gu', native: 'ગુજરાતી', english: 'Gujarati', speechTag: 'gu-IN' },
  { code: 'pa', native: 'ਪੰਜਾਬੀ', english: 'Punjabi', speechTag: 'pa-IN' },
  { code: 'or', native: 'ଓଡ଼ିଆ', english: 'Odia', speechTag: 'or-IN' },
];

export function speechTagFor(code: LanguageCode): string {
  return LANGUAGES.find((l) => l.code === code)?.speechTag ?? 'hi-IN';
}

export interface Strings {
  // splash
  welcomeTitle: string;
  welcomeTagline: string;
  getStarted: string;
  // auth
  loginTab: string;
  signupTab: string;
  namePlaceholder: string;
  phonePlaceholder: string;
  passwordPlaceholder: string;
  loginBtn: string;
  signupBtn: string;
  continueGuest: string;
  authError: string;
  changeLanguageLink: string;
  // core flow
  tagline: string;
  tapToSpeak: string;
  tapHint: string;
  listening: string;
  thinking: string;
  examplesTitle: string;
  examples: string[];
  yourSkill: string;
  nsqfMatch: string;
  matchLabel: string;
  recommended: string;
  whyThis: string;
  speakAgain: string;
  typeInstead: string;
  typePlaceholder: string;
  send: string;
  tryAgain: string;
  askAgain: string;
  changeLanguage: string;
  noConnection: string;
  noMatch: string;
  call: string;
  seats: string;
  weeks: string;
  stipendYes: string;
  // bottom nav + dashboard
  navHome: string;
  navSpeak: string;
  navPrograms: string;
  navProfile: string;
  goodMorning: string;
  goodAfternoon: string;
  goodEvening: string;
  guestLabel: string;
  homeSubtitle: string;
  speakCta: string;
  speakCtaHint: string;
  browsePrograms: string;
  programsTitle: string;
  programsSubtitle: string;
  loadingPrograms: string;
  profileTitle: string;
  guestNotice: string;
  createAccount: string;
  logout: string;
  languageLabel: string;
  phoneLabel: string;
}

const hi: Strings = {
  welcomeTitle: 'सक्षम',
  welcomeTagline: 'अपनी भाषा में अपना हुनर बताइए और सरकारी प्रशिक्षण पाइए',
  getStarted: 'शुरू करें',
  loginTab: 'लॉग इन',
  signupTab: 'नया खाता',
  namePlaceholder: 'आपका नाम',
  phonePlaceholder: 'मोबाइल नंबर',
  passwordPlaceholder: 'पासवर्ड',
  loginBtn: 'लॉग इन करें',
  signupBtn: 'खाता बनाएं',
  continueGuest: 'बिना खाते के जारी रखें',
  authError: 'कुछ गलत हुआ, कृपया फिर से कोशिश करें',
  changeLanguageLink: 'भाषा बदलें',
  tagline: 'अपनी भाषा में अपना हुनर बताइए',
  tapToSpeak: 'बोलने के लिए दबाएँ',
  tapHint: 'अपना काम या हुनर सरल भाषा में बताइए',
  listening: 'सुन रहे हैं…',
  thinking: 'समझ रहे हैं…',
  examplesTitle: 'ऐसे बता सकते हैं',
  examples: [
    'मैं मिट्टी के बर्तन और मटका बनाता हूँ',
    'मैं सिलाई और कढ़ाई का काम करती हूँ',
    'मैं राज मिस्त्री हूँ, दीवार और प्लास्टर',
    'मैं गाय-भैंस पालता हूँ, दूध बेचता हूँ',
  ],
  yourSkill: 'आपने बताया',
  nsqfMatch: 'NSQF योग्यता',
  matchLabel: 'मिलान',
  recommended: 'आपके लिए प्रशिक्षण',
  whyThis: 'यह क्यों',
  speakAgain: 'फिर से सुनें',
  typeInstead: 'लिखकर बताएं',
  typePlaceholder: 'अपना हुनर यहाँ लिखें…',
  send: 'भेजें',
  tryAgain: 'दोबारा कोशिश करें',
  askAgain: 'फिर से पूछें',
  changeLanguage: 'भाषा बदलें',
  noConnection: 'सर्वर से संपर्क नहीं हो पा रहा',
  noMatch: 'हुनर पूरी तरह समझ नहीं आया — कृपया दोबारा बताइए',
  call: 'कॉल करें',
  seats: 'सीटें',
  weeks: 'सप्ताह',
  stipendYes: 'वजीफा',
  navHome: 'होम',
  navSpeak: 'बोलें',
  navPrograms: 'प्रशिक्षण',
  navProfile: 'प्रोफ़ाइल',
  goodMorning: 'सुप्रभात',
  goodAfternoon: 'नमस्कार',
  goodEvening: 'शुभ संध्या',
  guestLabel: 'साथी',
  homeSubtitle: 'अपना हुनर बताइए और सरकारी प्रशिक्षण खोजिए',
  speakCta: 'अपना हुनर बताएं',
  speakCtaHint: 'बोलकर या लिखकर बताइए',
  browsePrograms: 'सभी प्रशिक्षण देखें',
  programsTitle: 'PM-AJAY प्रशिक्षण',
  programsSubtitle: 'आपके लिए उपलब्ध कौशल प्रशिक्षण कार्यक्रम',
  loadingPrograms: 'लोड हो रहा है…',
  profileTitle: 'प्रोफ़ाइल',
  guestNotice: 'आप बिना खाते के उपयोग कर रहे हैं',
  createAccount: 'खाता बनाएं',
  logout: 'लॉग आउट',
  languageLabel: 'भाषा',
  phoneLabel: 'मोबाइल नंबर',
};

const en: Strings = {
  welcomeTitle: 'Saksham',
  welcomeTagline: 'Tell us your skill in your own language and find government training',
  getStarted: 'Get Started',
  loginTab: 'Log in',
  signupTab: 'Sign up',
  namePlaceholder: 'Your name',
  phonePlaceholder: 'Mobile number',
  passwordPlaceholder: 'Password',
  loginBtn: 'Log in',
  signupBtn: 'Create account',
  continueGuest: 'Continue without an account',
  authError: 'Something went wrong, please try again',
  changeLanguageLink: 'Change language',
  tagline: 'Tell us your skill, in your own language',
  tapToSpeak: 'Press to speak',
  tapHint: 'Describe your work or skill in simple words',
  listening: 'Listening…',
  thinking: 'Understanding…',
  examplesTitle: 'You could say',
  examples: [
    'I make clay pots and matka',
    'I do tailoring and embroidery work',
    'I am a mason, walls and plaster',
    'I rear cattle and sell milk',
  ],
  yourSkill: 'You said',
  nsqfMatch: 'NSQF qualification',
  matchLabel: 'match',
  recommended: 'Training for you',
  whyThis: 'Why this',
  speakAgain: 'Hear again',
  typeInstead: 'Type instead',
  typePlaceholder: 'Type your skill here…',
  send: 'Send',
  tryAgain: 'Try again',
  askAgain: 'Ask again',
  changeLanguage: 'Change language',
  noConnection: 'Cannot reach the server',
  noMatch: 'Could not fully understand the skill — please say it again',
  call: 'Call',
  seats: 'seats',
  weeks: 'weeks',
  stipendYes: 'Stipend',
  navHome: 'Home',
  navSpeak: 'Speak',
  navPrograms: 'Programs',
  navProfile: 'Profile',
  goodMorning: 'Good morning',
  goodAfternoon: 'Good afternoon',
  goodEvening: 'Good evening',
  guestLabel: 'there',
  homeSubtitle: 'Speak your skill and find government training',
  speakCta: 'Tell us your skill',
  speakCtaHint: 'Speak or type it in your language',
  browsePrograms: 'Browse all programmes',
  programsTitle: 'PM-AJAY Training',
  programsSubtitle: 'Skilling programmes available for you',
  loadingPrograms: 'Loading…',
  profileTitle: 'Profile',
  guestNotice: "You're using Saksham without an account",
  createAccount: 'Create an account',
  logout: 'Log out',
  languageLabel: 'Language',
  phoneLabel: 'Mobile number',
};

const bn: Strings = {
  ...hi,
  tagline: 'নিজের ভাষায় নিজের দক্ষতা বলুন',
  tapToSpeak: 'বলতে চাপ দিন',
  tapHint: 'সহজ ভাষায় আপনার কাজ বা দক্ষতা বলুন',
  listening: 'শুনছি…',
  thinking: 'বুঝছি…',
  examplesTitle: 'এভাবে বলতে পারেন',
  examples: [
    'আমি মাটির বাসন ও কলসি বানাই',
    'আমি সেলাই ও কাঁথার কাজ করি',
    'আমি রাজমিস্ত্রি, দেওয়াল ও প্লাস্টার',
    'আমি গরু-মহিষ পালি, দুধ বিক্রি করি',
  ],
  yourSkill: 'আপনি বলেছেন',
  nsqfMatch: 'NSQF যোগ্যতা',
  matchLabel: 'মিল',
  recommended: 'আপনার জন্য প্রশিক্ষণ',
  whyThis: 'কেন এটি',
  speakAgain: 'আবার শুনুন',
  typeInstead: 'লিখে বলুন',
  typePlaceholder: 'আপনার দক্ষতা এখানে লিখুন…',
  send: 'পাঠান',
  tryAgain: 'আবার চেষ্টা করুন',
  askAgain: 'আবার জিজ্ঞাসা করুন',
  changeLanguage: 'ভাষা পরিবর্তন',
  noConnection: 'সার্ভারে পৌঁছানো যাচ্ছে না',
  call: 'কল করুন',
  seats: 'আসন',
  weeks: 'সপ্তাহ',
  stipendYes: 'ভাতা',
};

const ta: Strings = {
  ...hi,
  tagline: 'உங்கள் மொழியில் உங்கள் திறனைச் சொல்லுங்கள்',
  tapToSpeak: 'பேச அழுத்தவும்',
  tapHint: 'உங்கள் வேலை அல்லது திறனை எளிய வார்த்தைகளில் சொல்லுங்கள்',
  listening: 'கேட்கிறோம்…',
  thinking: 'புரிந்துகொள்கிறோம்…',
  examplesTitle: 'இப்படிச் சொல்லலாம்',
  examples: [
    'நான் மண் பானைகள் செய்கிறேன்',
    'நான் தையல் மற்றும் எம்பிராய்டரி வேலை செய்கிறேன்',
    'நான் கொத்தனார், சுவர் மற்றும் பிளாஸ்டர்',
    'நான் மாடு வளர்த்து பால் விற்கிறேன்',
  ],
  yourSkill: 'நீங்கள் சொன்னது',
  nsqfMatch: 'NSQF தகுதி',
  matchLabel: 'பொருத்தம்',
  recommended: 'உங்களுக்கான பயிற்சி',
  whyThis: 'ஏன் இது',
  speakAgain: 'மீண்டும் கேட்க',
  typeInstead: 'தட்டச்சு செய்யவும்',
  typePlaceholder: 'உங்கள் திறனை இங்கே தட்டச்சு செய்யவும்…',
  send: 'அனுப்பு',
  tryAgain: 'மீண்டும் முயற்சி',
  askAgain: 'மீண்டும் கேள்',
  changeLanguage: 'மொழியை மாற்று',
  noConnection: 'சேவையகத்தை அணுக முடியவில்லை',
  call: 'அழைக்கவும்',
  seats: 'இடங்கள்',
  weeks: 'வாரங்கள்',
  stipendYes: 'உதவித்தொகை',
};

export const UI_STRINGS: Record<LanguageCode, Strings> = {
  hi,
  en,
  bn,
  ta,
  te: hi,
  mr: hi,
  kn: hi,
  gu: hi,
  pa: hi,
  or: hi,
};
