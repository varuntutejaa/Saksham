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
  { code: 'hi', native: 'हिन्दी', english: 'Hindi', speechTag: 'hi-IN' },
  { code: 'en', native: 'English', english: 'English', speechTag: 'en-IN' },
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

/** UI micro-copy per language. Kept small and hand-written for accuracy. */
export const UI_STRINGS: Record<
  LanguageCode,
  {
    pickLanguage: string;
    tapToSpeak: string;
    listening: string;
    thinking: string;
    yourSkill: string;
    nsqfMatch: string;
    recommended: string;
    speakAgain: string;
    typeInstead: string;
    tryAgain: string;
    noConnection: string;
    call: string;
    seats: string;
    weeks: string;
    stipendYes: string;
  }
> = {
  hi: {
    pickLanguage: 'अपनी भाषा चुनें',
    tapToSpeak: 'दबाकर अपना काम या हुनर बताइए',
    listening: 'सुन रहे हैं…',
    thinking: 'समझ रहे हैं…',
    yourSkill: 'आपने बताया',
    nsqfMatch: 'NSQF योग्यता',
    recommended: 'आपके लिए प्रशिक्षण',
    speakAgain: 'फिर से सुनें',
    typeInstead: 'लिखकर बताएं',
    tryAgain: 'दोबारा कोशिश करें',
    noConnection: 'सर्वर से संपर्क नहीं हो पा रहा',
    call: 'कॉल करें',
    seats: 'सीटें',
    weeks: 'सप्ताह',
    stipendYes: 'वजीफा मिलेगा',
  },
  en: {
    pickLanguage: 'Choose your language',
    tapToSpeak: 'Press and tell us your work or skill',
    listening: 'Listening…',
    thinking: 'Understanding…',
    yourSkill: 'You said',
    nsqfMatch: 'NSQF qualification',
    recommended: 'Training for you',
    speakAgain: 'Hear again',
    typeInstead: 'Type instead',
    tryAgain: 'Try again',
    noConnection: 'Cannot reach the server',
    call: 'Call',
    seats: 'seats',
    weeks: 'weeks',
    stipendYes: 'Stipend provided',
  },
  bn: {
    pickLanguage: 'আপনার ভাষা বেছে নিন',
    tapToSpeak: 'চেপে ধরে আপনার কাজ বা দক্ষতা বলুন',
    listening: 'শুনছি…',
    thinking: 'বুঝছি…',
    yourSkill: 'আপনি বললেন',
    nsqfMatch: 'NSQF যোগ্যতা',
    recommended: 'আপনার জন্য প্রশিক্ষণ',
    speakAgain: 'আবার শুনুন',
    typeInstead: 'লিখে বলুন',
    tryAgain: 'আবার চেষ্টা করুন',
    noConnection: 'সার্ভারে পৌঁছানো যাচ্ছে না',
    call: 'কল করুন',
    seats: 'আসন',
    weeks: 'সপ্তাহ',
    stipendYes: 'ভাতা দেওয়া হবে',
  },
  ta: {
    pickLanguage: 'உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்',
    tapToSpeak: 'அழுத்திப் பிடித்து உங்கள் வேலை அல்லது திறனைச் சொல்லுங்கள்',
    listening: 'கேட்கிறோம்…',
    thinking: 'புரிந்துகொள்கிறோம்…',
    yourSkill: 'நீங்கள் சொன்னது',
    nsqfMatch: 'NSQF தகுதி',
    recommended: 'உங்களுக்கான பயிற்சி',
    speakAgain: 'மீண்டும் கேட்கவும்',
    typeInstead: 'தட்டச்சு செய்யவும்',
    tryAgain: 'மீண்டும் முயற்சிக்கவும்',
    noConnection: 'சேவையகத்தை அணுக முடியவில்லை',
    call: 'அழைக்கவும்',
    seats: 'இடங்கள்',
    weeks: 'வாரங்கள்',
    stipendYes: 'உதவித்தொகை வழங்கப்படும்',
  },
  te: fallbackStrings('te'),
  mr: fallbackStrings('mr'),
  kn: fallbackStrings('kn'),
  gu: fallbackStrings('gu'),
  pa: fallbackStrings('pa'),
  or: fallbackStrings('or'),
};

// Languages we haven't hand-translated yet fall back to Hindi copy so the app
// still functions; swap in real strings before shipping.
function fallbackStrings(_c: LanguageCode) {
  return {
    pickLanguage: 'अपनी भाषा चुनें',
    tapToSpeak: 'दबाकर अपना काम या हुनर बताइए',
    listening: 'सुन रहे हैं…',
    thinking: 'समझ रहे हैं…',
    yourSkill: 'आपने बताया',
    nsqfMatch: 'NSQF योग्यता',
    recommended: 'आपके लिए प्रशिक्षण',
    speakAgain: 'फिर से सुनें',
    typeInstead: 'लिखकर बताएं',
    tryAgain: 'दोबारा कोशिश करें',
    noConnection: 'सर्वर से संपर्क नहीं हो पा रहा',
    call: 'कॉल करें',
    seats: 'सीटें',
    weeks: 'सप्ताह',
    stipendYes: 'वजीफा मिलेगा',
  };
}
