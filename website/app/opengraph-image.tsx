import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px 96px",
          background: "linear-gradient(135deg, #15120D 0%, #1E1A14 60%, #0E6E5C 130%)",
          color: "#F3ECE1",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 40 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: "#E1793D",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              fontWeight: 700,
              color: "#1c0f06",
            }}
          >
            स
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {/* Devanagari conjuncts (e.g. क्ष) don't shape correctly in
                next/og's renderer — Latin-only text here to avoid a
                visibly broken glyph in link previews. */}
            <span style={{ fontSize: 28, fontWeight: 700 }}>Saksham</span>
            <span style={{ fontSize: 18, color: "#C9BBA5" }}>Ministry of Social Justice &amp; Empowerment</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 900 }}>
          <span style={{ fontSize: 58, fontWeight: 700, lineHeight: 1.15 }}>Say your skill.</span>
          <span style={{ fontSize: 58, fontWeight: 700, lineHeight: 1.15, color: "#E1793D", fontStyle: "italic" }}>
            Get certified for it.
          </span>
        </div>
        <span style={{ fontSize: 24, color: "#C9BBA5", marginTop: 28, maxWidth: 820 }}>
          Voice-first NSQF qualification matching and PM-AJAY training, in 10 Indian languages.
        </span>
      </div>
    ),
    { ...size },
  );
}
