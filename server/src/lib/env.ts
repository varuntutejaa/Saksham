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
};

export const hasLLM = Boolean(env.anthropicApiKey);
export const hasSarvam = Boolean(env.sarvamApiKey);
export const hasGroq = Boolean(env.groqApiKey);
export const hasBhashini = Boolean(env.bhashiniApiKey && env.bhashiniUserId);
export const hasSms = Boolean(env.smsApiKey);
