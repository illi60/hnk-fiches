// Pure read-only component — pas de "use client" nécessaire.
export default function XpBar({
  level,
  ratio,
  current,
  next,
  xpAvailable,
}: {
  level: number;
  ratio: number; // 0..1
  current: number;
  next: number;
  xpAvailable: number;
}) {
  const pct = Math.round(ratio * 100);

  return (
    <div className="hnk-panel" data-kanji="力">
      <div className="flex items-end justify-between mb-4">
        <div>
          <p className="hnk-eyebrow">Niveau</p>
          <p className="hnk-stat mt-1">{level}</p>
        </div>
        <div className="text-right">
          <p className="hnk-eyebrow">XP disponible</p>
          <p className="hnk-stat mt-1 tabular-nums">{xpAvailable}</p>
        </div>
      </div>
      <div className="hnk-xpbar">
        <span style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-smoke mt-2 tabular-nums tracking-wide">
        {current} / {next} XP · palier Niveau {level + 1}
      </p>
    </div>
  );
}
