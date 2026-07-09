"use client";

import { useEffect, useRef, useState } from 'react';

interface Props {
  value: string;
  className?: string;
}

export default function AnimatedNumber({ value, className }: Props) {
  const [display, setDisplay] = useState(value);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const isPound = value.includes('£');
    const isComma = value.includes(',');
    const isDecimal = value.includes('.');
    const raw = parseFloat(value.replace(/[^0-9.]/g, ''));
    if (isNaN(raw)) return;

    let cur = 0;
    const step = raw / (1200 / 16);

    const t = setInterval(() => {
      cur = Math.min(cur + step, raw);
      const d = isDecimal ? cur.toFixed(1) : Math.floor(cur);
      const formatted = isComma ? Number(d).toLocaleString() : d;
      setDisplay(isPound ? `£${formatted}` : String(formatted));
      if (cur >= raw) clearInterval(t);
    }, 16);

    return () => clearInterval(t);
  }, [value]);

  return <div className={className}>{display}</div>;
}
