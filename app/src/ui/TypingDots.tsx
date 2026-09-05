import { useEffect, useState } from 'react';
import { Txt } from './Txt';

/** Three dots that cycle, for a "…is typing" chat indicator. */
export function TypingDots({ color }: { color: string }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % 3), 350);
    return () => clearInterval(id);
  }, []);
  return (
    <Txt variant="body" style={{ color, letterSpacing: 3 }}>
      {['•', '• •', '• • •'][step]}
    </Txt>
  );
}
