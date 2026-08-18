"use client";

import { useEffect, useMemo, useState } from "react";

const WEIRD_DATES = [
  "32/13/2026",
  "Hier, vers demain",
  "08/08/∞",
  "Quand le marchand aura retrouvé son boulier",
  "J-404",
  "Euh... je sais pas",
];

function pad(value: number): string {
  return String(Math.abs(value)).padStart(2, "0");
}

export default function TradeTeaser() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((current) => current + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const fakeDate = WEIRD_DATES[Math.floor(tick / 4) % WEIRD_DATES.length];
  const parts = useMemo(() => {
    const wobble = tick * 7;
    return {
      days: -Math.floor(wobble / 86400) - 3,
      hours: 99 - (Math.floor(wobble / 3600) % 100),
      minutes: 77 - (Math.floor(wobble / 60) % 78),
      seconds: 61 - (wobble % 62),
    };
  }, [tick]);

  return (
    <section className="hnk-shop-shell">
      <div className="hnk-shop-hero">
        <div className="relative z-10 text-center">
          <p className="hnk-eyebrow text-ember-hot">Marché entre shinobi</p>
          <h1 className="hnk-display text-4xl md:text-6xl mt-3">Bientôt</h1>
          <p className="hnk-eyebrow mt-3">Ou peut-être avant. Le calendrier refuse de coopérer.</p>
        </div>
      </div>

      <div className="p-5 md:p-8">
        <div className="hnk-panel" data-kanji="?">
          <div className="relative z-10 text-center max-w-3xl mx-auto">
            <p className="hnk-eyebrow text-ember-hot">Compte à rebours officiel-ish</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
              <CountdownCell label="Jours" value={parts.days} />
              <CountdownCell label="Heures" value={parts.hours} />
              <CountdownCell label="Minutes" value={parts.minutes} />
              <CountdownCell label="Secondes" value={parts.seconds} />
            </div>
            <div className="hnk-shop-confirm-box mt-6">
              <p className="hnk-eyebrow">Date annoncée</p>
              <p className="text-2xl md:text-3xl font-display uppercase tracking-wider text-white mt-3">
                {fakeDate}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CountdownCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="hnk-shop-confirm-box">
      <span className="block font-display text-3xl md:text-5xl leading-none text-ember tabular-nums">
        {value < 0 ? "-" : ""}
        {pad(value)}
      </span>
      <p className="hnk-eyebrow mt-3">{label}</p>
    </div>
  );
}
