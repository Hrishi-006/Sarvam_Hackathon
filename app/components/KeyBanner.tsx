'use client';

import { useEffect, useState } from 'react';

export function KeyBanner() {
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setMissing(!d.hasKey))
      .catch(() => setMissing(true));
  }, []);

  if (!missing) return null;

  return (
    <div className="bg-[var(--chilli)] px-4 py-2 text-center text-sm font-medium text-white">
      SARVAM_API_KEY is not set on the server — voice features won&apos;t work until it is.
    </div>
  );
}
