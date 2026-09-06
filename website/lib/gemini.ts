const MODEL = "gemini-3.6-flash";

/** Calls Gemini with a JSON schema so the response is guaranteed-parseable
 *  structured data, not free text we have to hope is valid JSON. */
export async function generateStructured<T>(prompt: string, schema: object): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
          // a small thinking budget (rather than the model's large default)
          // is the difference between ~2s and ~10s+ for this call — the
          // schema-constrained JSON output doesn't need deep reasoning.
          thinkingConfig: { thinkingBudget: 100 },
        },
      }),
    },
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Gemini error ${res.status}: ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no content");

  // Free-tier quota has no dashboard of its own — this at least puts usage
  // in Vercel's function logs so a quiet quota problem is visible there
  // instead of only showing up as a silent quality drop for users.
  const usage = data?.usageMetadata;
  if (usage) {
    console.log(
      `[gemini] tokens: prompt=${usage.promptTokenCount ?? 0} thoughts=${usage.thoughtsTokenCount ?? 0} output=${usage.candidatesTokenCount ?? 0} total=${usage.totalTokenCount ?? 0}`,
    );
  }

  return JSON.parse(text) as T;
}
