import "dotenv/config";

export const env = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me",
  databaseUrl: process.env.DATABASE_URL ?? "",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  sarvamApiKey: process.env.SARVAM_API_KEY ?? "",
  groqApiKey: process.env.GROQ_API_KEY ?? "",
  bhashiniApiKey: process.env.BHASHINI_API_KEY ?? "",
  bhashiniUserId: process.env.BHASHINI_USER_ID ?? "",
  smsApiKey: process.env.SMS_API_KEY ?? "",
  /** Demo mode: every OTP is DEMO_OTP_CODE so the flow can be shown without
   *  SMS or a handset. Defaults ON only while no SMS provider is configured;
   *  set DEMO_OTP=false to force real random codes. */
  demoOtp: (process.env.DEMO_OTP ?? "").toLowerCase() !== "false",
  demoOtpCode: process.env.DEMO_OTP_CODE ?? "1234",
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ?? "",
  twilioWhatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER ?? "",
  stitchApiKey: process.env.STITCH_API_KEY ?? "",
  stitchAccessToken: process.env.STITCH_ACCESS_TOKEN ?? "",
  stitchProjectId: process.env.STITCH_PROJECT_ID ?? "",
  googleCloudProject: process.env.GOOGLE_CLOUD_PROJECT ?? "",
  stitchHost: process.env.STITCH_HOST ?? "",
};

export const hasLLM = Boolean(env.anthropicApiKey);
export const hasSarvam = Boolean(env.sarvamApiKey);
export const hasGroq = Boolean(env.groqApiKey);
export const hasBhashini = Boolean(env.bhashiniApiKey && env.bhashiniUserId);
export const hasSms = Boolean(env.smsApiKey);
/** A fixed OTP is only ever acceptable while there is no real SMS provider —
 *  once one is configured, real codes are always used regardless of DEMO_OTP. */
export const useDemoOtp = env.demoOtp && !hasSms;
export const hasTwilio = Boolean(env.twilioAccountSid && env.twilioAuthToken);
export const hasStitch = Boolean(env.stitchApiKey || (env.stitchAccessToken && env.googleCloudProject));
