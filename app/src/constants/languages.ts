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
  transcribing: string;
  agentThinking: string;
  voiceAgent: string;
  agentName: string;
  agentTapToTalk: string;
  agentHint: string;
  agentFallbackReply: string;
  clearAgent: string;
  viewResults: string;
  transcriptTitle: string;
  editTranscript: string;
  transcriptionError: string;
  noSpeechDetected: string;
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
  // confirm screen (post-speech, pre-results)
  youSaid: string;
  confirmUnderstood: string; // must contain "{skill}"
  whatNext: string;
  optionJobs: string;
  optionTraining: string;
  optionCertificate: string;
  jobsTitle: string;
  certTitle: string;
  // location
  enableLocation: string;
  enableLocationHint: string;
  locating: string;
  locationDenied: string;
  changeLocation: string;
  // onboarding (post-signup profile questions)
  onboardIntroTitle: string;
  onboardIntroBody: string;
  onboardStart: string;
  onboardSkip: string;
  stepLabel: string; // must contain "{n}"
  genderQuestion: string;
  genderMale: string;
  genderFemale: string;
  genderOther: string;
  ageQuestion: string;
  yearsSuffix: string;
  eduQuestion: string;
  eduBelow10th: string;
  edu10th: string;
  edu12th: string;
  eduIti: string;
  eduUndergrad: string;
  eduPostgrad: string;
  onboardDoneTitle: string;
  onboardDoneBody: string;
  onboardContinue: string;
  next: string;
  back: string;
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
  transcribing: 'लिख रहे हैं…',
  agentThinking: 'जवाब तैयार कर रहे हैं…',
  voiceAgent: 'वॉइस एजेंट',
  agentName: 'सक्षम',
  agentTapToTalk: 'एजेंट से बात करें',
  agentHint: 'अपना सवाल बोलिए, सक्षम जवाब बोलकर देगा',
  agentFallbackReply: 'मैंने आपकी बात समझ ली।',
  clearAgent: 'साफ करें',
  viewResults: 'परिणाम देखें',
  transcriptTitle: 'आपकी आवाज़ का लिखा हुआ पाठ',
  editTranscript: 'संपादित करें',
  transcriptionError: 'आवाज़ को लिख नहीं पाए',
  noSpeechDetected: 'आवाज़ समझ नहीं आई, कृपया फिर से बोलें',
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
  youSaid: 'आपने कहा',
  confirmUnderstood: 'समझ गया। आपको {skill} का अनुभव है।',
  whatNext: 'आप क्या करना चाहेंगे?',
  optionJobs: 'काम / रोज़गार ढूंढना',
  optionTraining: 'ट्रेनिंग करना चाहता हूँ',
  optionCertificate: 'स्किल सर्टिफिकेट चाहिए',
  jobsTitle: 'आपके लिए रोज़गार के अवसर',
  certTitle: 'प्रमाणन के लिए प्रशिक्षण केंद्र',
  enableLocation: 'लोकेशन चालू करें',
  enableLocationHint: 'अपने पास के प्रशिक्षण कार्यक्रम खोजने के लिए',
  locating: 'लोकेशन खोज रहे हैं…',
  locationDenied: 'लोकेशन की अनुमति नहीं मिली',
  changeLocation: 'लोकेशन बदलें',
  onboardIntroTitle: 'आपको बेहतर तरीके से जानना चाहते हैं',
  onboardIntroBody: 'बस 3 छोटे सवाल — इससे हम आपके लिए सही प्रशिक्षण और योजनाएं ढूंढ पाएंगे।',
  onboardStart: 'शुरू करें',
  onboardSkip: 'अभी छोड़ें',
  stepLabel: 'चरण {n} / 3',
  genderQuestion: 'आपका लिंग?',
  genderMale: 'पुरुष',
  genderFemale: 'महिला',
  genderOther: 'अन्य',
  ageQuestion: 'आपकी उम्र?',
  yearsSuffix: 'वर्ष',
  eduQuestion: 'आप कहाँ तक पढ़े हैं?',
  eduBelow10th: '10वीं से कम',
  edu10th: '10वीं पास',
  edu12th: '12वीं पास',
  eduIti: 'आईटीआई / डिप्लोमा',
  eduUndergrad: 'स्नातक (UG)',
  eduPostgrad: 'स्नातकोत्तर (PG)',
  onboardDoneTitle: 'सब तैयार है!',
  onboardDoneBody: 'अब हम आपके लिए सही प्रशिक्षण सुझा सकते हैं।',
  onboardContinue: 'आगे बढ़ें',
  next: 'आगे',
  back: 'पीछे',
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
  transcribing: 'Transcribing…',
  agentThinking: 'Preparing a reply…',
  voiceAgent: 'Voice agent',
  agentName: 'Saksham',
  agentTapToTalk: 'Talk to agent',
  agentHint: 'Ask your question and Saksham will answer out loud',
  agentFallbackReply: 'I understood that.',
  clearAgent: 'Clear',
  viewResults: 'View results',
  transcriptTitle: 'Transcript',
  editTranscript: 'Edit text',
  transcriptionError: 'Could not transcribe the recording',
  noSpeechDetected: 'No speech was detected. Please try again',
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
  youSaid: 'You said',
  confirmUnderstood: 'Got it. You have experience in {skill}.',
  whatNext: 'What would you like to do?',
  optionJobs: 'Find work / employment',
  optionTraining: 'I want training',
  optionCertificate: 'I want a skill certificate',
  jobsTitle: 'Employment opportunities for you',
  certTitle: 'Training centres for certification',
  enableLocation: 'Enable location',
  enableLocationHint: 'To find training programmes near you',
  locating: 'Finding your location…',
  locationDenied: 'Location permission was not granted',
  changeLocation: 'Change location',
  onboardIntroTitle: "Let's get to know you",
  onboardIntroBody: 'Just 3 quick questions — this helps us find the right training and schemes for you.',
  onboardStart: 'Start',
  onboardSkip: 'Skip for now',
  stepLabel: 'Step {n} of 3',
  genderQuestion: 'What is your gender?',
  genderMale: 'Male',
  genderFemale: 'Female',
  genderOther: 'Other',
  ageQuestion: 'What is your age?',
  yearsSuffix: 'years',
  eduQuestion: 'How far did you study?',
  eduBelow10th: 'Below 10th',
  edu10th: '10th pass',
  edu12th: '12th pass',
  eduIti: 'ITI / Diploma',
  eduUndergrad: 'Undergraduate',
  eduPostgrad: 'Postgraduate',
  onboardDoneTitle: "You're all set!",
  onboardDoneBody: 'Now we can suggest the right training for you.',
  onboardContinue: 'Continue',
  next: 'Next',
  back: 'Back',
};

const bn: Strings = {
  ...hi,
  tagline: 'নিজের ভাষায় নিজের দক্ষতা বলুন',
  tapToSpeak: 'বলতে চাপ দিন',
  tapHint: 'সহজ ভাষায় আপনার কাজ বা দক্ষতা বলুন',
  listening: 'শুনছি…',
  thinking: 'বুঝছি…',
  transcribing: 'লিখছি…',
  agentThinking: 'উত্তর তৈরি হচ্ছে…',
  voiceAgent: 'ভয়েস এজেন্ট',
  agentName: 'সক্ষম',
  agentTapToTalk: 'এজেন্টের সঙ্গে কথা বলুন',
  agentHint: 'আপনার প্রশ্ন বলুন, সক্ষম উত্তর শুনিয়ে দেবে',
  agentFallbackReply: 'আমি আপনার কথা বুঝেছি।',
  clearAgent: 'মুছুন',
  viewResults: 'ফলাফল দেখুন',
  transcriptTitle: 'আপনার কথার লেখা',
  editTranscript: 'সম্পাদনা করুন',
  transcriptionError: 'রেকর্ডিং লেখা যায়নি',
  noSpeechDetected: 'কথা বোঝা যায়নি, আবার চেষ্টা করুন',
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
  transcribing: 'எழுதுகிறோம்…',
  agentThinking: 'பதில் தயார் செய்கிறோம்…',
  voiceAgent: 'குரல் முகவர்',
  agentName: 'சக்ஷம்',
  agentTapToTalk: 'முகவரிடம் பேசுங்கள்',
  agentHint: 'உங்கள் கேள்வியை பேசுங்கள், சக்ஷம் பதிலை கூறும்',
  agentFallbackReply: 'உங்கள் பேச்சை புரிந்துகொண்டேன்.',
  clearAgent: 'அழி',
  viewResults: 'முடிவுகள்',
  transcriptTitle: 'நீங்கள் பேசிய உரை',
  editTranscript: 'திருத்து',
  transcriptionError: 'பதிவை உரையாக்க முடியவில்லை',
  noSpeechDetected: 'பேச்சு புரியவில்லை. மீண்டும் முயற்சிக்கவும்',
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

const te: Strings = {
  ...hi,
  listening: 'వింటున్నాం…',
  thinking: 'అర్థం చేసుకుంటున్నాం…',
  transcribing: 'లిఖితం చేస్తున్నాం…',
  agentThinking: 'సమాధానం సిద్ధం చేస్తున్నాం…',
  voiceAgent: 'వాయిస్ ఏజెంట్',
  agentName: 'సాక్షమ్',
  agentTapToTalk: 'ఏజెంట్‌తో మాట్లాడండి',
  agentHint: 'మీ ప్రశ్నను మాట్లాడండి, సాక్షమ్ జవాబు చెబుతుంది',
  agentFallbackReply: 'మీ మాట అర్థమైంది.',
  clearAgent: 'క్లియర్',
  viewResults: 'ఫలితాలు చూడండి',
  transcriptTitle: 'మీ మాటల లిఖితం',
  editTranscript: 'సవరించండి',
  transcriptionError: 'రికార్డింగ్‌ను లిఖితం చేయలేకపోయాం',
  noSpeechDetected: 'మాట అర్థం కాలేదు. మళ్లీ ప్రయత్నించండి',
};

const mr: Strings = {
  ...hi,
  listening: 'ऐकत आहोत…',
  thinking: 'समजून घेत आहोत…',
  transcribing: 'लिहून घेत आहोत…',
  agentThinking: 'उत्तर तयार करत आहोत…',
  voiceAgent: 'व्हॉइस एजंट',
  agentName: 'सक्षम',
  agentTapToTalk: 'एजंटशी बोला',
  agentHint: 'तुमचा प्रश्न बोला, सक्षम उत्तर बोलून देईल',
  agentFallbackReply: 'तुमची गोष्ट समजली.',
  clearAgent: 'साफ करा',
  viewResults: 'परिणाम पहा',
  transcriptTitle: 'तुमच्या आवाजाचे लिखित रूप',
  editTranscript: 'संपादित करा',
  transcriptionError: 'रेकॉर्डिंग लिहून घेता आले नाही',
  noSpeechDetected: 'बोलणे समजले नाही. पुन्हा प्रयत्न करा',
};

const kn: Strings = {
  ...hi,
  listening: 'ಕೇಳುತ್ತಿದ್ದೇವೆ…',
  thinking: 'ಅರ್ಥಮಾಡಿಕೊಳ್ಳುತ್ತಿದ್ದೇವೆ…',
  transcribing: 'ಬರೆಯುತ್ತಿದ್ದೇವೆ…',
  agentThinking: 'ಉತ್ತರ ಸಿದ್ಧಪಡಿಸುತ್ತಿದ್ದೇವೆ…',
  voiceAgent: 'ವಾಯ್ಸ್ ಏಜೆಂಟ್',
  agentName: 'ಸಕ್ಷಮ್',
  agentTapToTalk: 'ಏಜೆಂಟ್ ಜೊತೆ ಮಾತನಾಡಿ',
  agentHint: 'ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಮಾತನಾಡಿ, ಸಕ್ಷಮ್ ಉತ್ತರವನ್ನು ಹೇಳುತ್ತದೆ',
  agentFallbackReply: 'ನಿಮ್ಮ ಮಾತು ಅರ್ಥವಾಯಿತು.',
  clearAgent: 'ತೆರವುಗೊಳಿಸಿ',
  viewResults: 'ಫಲಿತಾಂಶ ನೋಡಿ',
  transcriptTitle: 'ನಿಮ್ಮ ಮಾತಿನ ಪಠ್ಯ',
  editTranscript: 'ತಿದ್ದುಪಡಿ ಮಾಡಿ',
  transcriptionError: 'ರೆಕಾರ್ಡಿಂಗ್ ಅನ್ನು ಪಠ್ಯವಾಗಿ ಮಾಡಲು ಆಗಲಿಲ್ಲ',
  noSpeechDetected: 'ಮಾತು ಅರ್ಥವಾಗಲಿಲ್ಲ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ',
};

const gu: Strings = {
  ...hi,
  listening: 'સાંભળી રહ્યા છીએ…',
  thinking: 'સમજી રહ્યા છીએ…',
  transcribing: 'લખી રહ્યા છીએ…',
  agentThinking: 'જવાબ તૈયાર કરી રહ્યા છીએ…',
  voiceAgent: 'વોઇસ એજન્ટ',
  agentName: 'સક્ષમ',
  agentTapToTalk: 'એજન્ટ સાથે વાત કરો',
  agentHint: 'તમારો પ્રશ્ન બોલો, સક્ષમ જવાબ બોલીને આપશે',
  agentFallbackReply: 'તમારી વાત સમજાઈ ગઈ.',
  clearAgent: 'સાફ કરો',
  viewResults: 'પરિણામ જુઓ',
  transcriptTitle: 'તમારા અવાજનું લખાણ',
  editTranscript: 'સંપાદિત કરો',
  transcriptionError: 'રેકોર્ડિંગ લખી શક્યા નહીં',
  noSpeechDetected: 'બોલવું સમજાયું નહીં. ફરી પ્રયાસ કરો',
};

const pa: Strings = {
  ...hi,
  listening: 'ਸੁਣ ਰਹੇ ਹਾਂ…',
  thinking: 'ਸਮਝ ਰਹੇ ਹਾਂ…',
  transcribing: 'ਲਿਖ ਰਹੇ ਹਾਂ…',
  agentThinking: 'ਜਵਾਬ ਤਿਆਰ ਕਰ ਰਹੇ ਹਾਂ…',
  voiceAgent: 'ਵੌਇਸ ਏਜੰਟ',
  agentName: 'ਸਕਸ਼ਮ',
  agentTapToTalk: 'ਏਜੰਟ ਨਾਲ ਗੱਲ ਕਰੋ',
  agentHint: 'ਆਪਣਾ ਸਵਾਲ ਬੋਲੋ, ਸਕਸ਼ਮ ਜਵਾਬ ਬੋਲ ਕੇ ਦੇਵੇਗਾ',
  agentFallbackReply: 'ਤੁਹਾਡੀ ਗੱਲ ਸਮਝ ਆ ਗਈ.',
  clearAgent: 'ਸਾਫ ਕਰੋ',
  viewResults: 'ਨਤੀਜੇ ਵੇਖੋ',
  transcriptTitle: 'ਤੁਹਾਡੀ ਆਵਾਜ਼ ਦਾ ਲਿਖਤ ਪਾਠ',
  editTranscript: 'ਸੋਧੋ',
  transcriptionError: 'ਰਿਕਾਰਡਿੰਗ ਨੂੰ ਲਿਖ ਨਹੀਂ ਸਕੇ',
  noSpeechDetected: 'ਬੋਲਣਾ ਸਮਝ ਨਹੀਂ ਆਇਆ. ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ',
};

const or: Strings = {
  ...hi,
  listening: 'ଶୁଣୁଛୁ…',
  thinking: 'ବୁଝୁଛୁ…',
  transcribing: 'ଲେଖୁଛୁ…',
  agentThinking: 'ଉତ୍ତର ପ୍ରସ୍ତୁତ କରୁଛୁ…',
  voiceAgent: 'ଭଏସ୍ ଏଜେଣ୍ଟ',
  agentName: 'ସକ୍ଷମ',
  agentTapToTalk: 'ଏଜେଣ୍ଟ ସହ କଥା ହୁଅନ୍ତୁ',
  agentHint: 'ଆପଣଙ୍କ ପ୍ରଶ୍ନ କହନ୍ତୁ, ସକ୍ଷମ ଉତ୍ତର କହିଦେବ',
  agentFallbackReply: 'ଆପଣଙ୍କ କଥା ବୁଝିଲି।',
  clearAgent: 'ସଫା କରନ୍ତୁ',
  viewResults: 'ଫଳାଫଳ ଦେଖନ୍ତୁ',
  transcriptTitle: 'ଆପଣଙ୍କ କଥାର ଲିଖିତ ପାଠ',
  editTranscript: 'ସମ୍ପାଦନା କରନ୍ତୁ',
  transcriptionError: 'ରେକର୍ଡିଂକୁ ଲେଖିପାରିଲୁ ନାହିଁ',
  noSpeechDetected: 'କଥା ବୁଝିପାରିଲୁ ନାହିଁ। ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ',
};

export const UI_STRINGS: Record<LanguageCode, Strings> = {
  hi,
  en,
  bn,
  ta,
  te,
  mr,
  kn,
  gu,
  pa,
  or,
};
