// Radar des Arts Shinobi (style databook). Composant pur (server-safe).
// Chaque axe = un Art ; le remplissage = son rang (E→S), plus c'est haut
// plus ça pousse vers l'extérieur.
import { RANKS, type Rank } from "@/lib/arts";

export interface RadarAxis {
  kanji: string;
  label: string;
  rank: string | null; // E..S ou null
}

const MAX = RANKS.length; // 6 niveaux (E..S) → valeur 1..6

function rankValue(rank: string | null): number {
  if (!rank) return 0;
  const i = RANKS.indexOf(rank.toUpperCase() as Rank);
  return i < 0 ? 0 : i + 1; // E=1 … S=6
}

export default function ArtsRadar({
  axes,
  size = 360,
}: {
  axes: RadarAxis[];
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.3;
  const n = Math.max(axes.length, 3);

  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pt = (i: number, r: number): [number, number] => [
    cx + r * Math.cos(angle(i)),
    cy + r * Math.sin(angle(i)),
  ];
  const poly = (r: number) => axes.map((_, i) => pt(i, r).join(",")).join(" ");

  const rings: number[] = [];
  for (let lvl = 1; lvl <= MAX; lvl++) rings.push((R * lvl) / MAX);

  const valuePoly = axes
    .map((a, i) => pt(i, (R * rankValue(a.rank)) / MAX).join(","))
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className="max-w-full h-auto"
      role="img"
      aria-label="Radar des arts shinobi"
    >
      {/* Limite extérieure (max = S) */}
      <polygon
        points={poly(R)}
        fill="rgba(245,241,234,0.05)"
        stroke="rgba(245,241,234,0.45)"
        strokeWidth={2}
      />
      {/* Anneaux concentriques pointillés */}
      {rings.slice(0, MAX - 1).map((r, idx) => (
        <polygon
          key={idx}
          points={poly(r)}
          fill="none"
          stroke="rgba(91,168,212,0.28)"
          strokeWidth={1}
          strokeDasharray="4 5"
        />
      ))}
      {/* Axes */}
      {axes.map((_, i) => {
        const [x, y] = pt(i, R);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke="rgba(91,168,212,0.3)"
            strokeWidth={1}
          />
        );
      })}
      {/* Valeurs courantes (remplissage chakra) */}
      <polygon
        points={valuePoly}
        fill="rgba(91,168,212,0.45)"
        stroke="#5BA8D4"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      {/* Kanji des arts + nom FR */}
      {axes.map((a, i) => {
        const [x, y] = pt(i, R + size * 0.085);
        return (
          <g key={i}>
            <text
              x={x}
              y={y}
              fill="var(--ember)"
              fontFamily="var(--jp)"
              fontWeight={900}
              fontSize={size * 0.07}
              textAnchor="middle"
              dominantBaseline="central"
              style={{ filter: "drop-shadow(0 0 6px rgba(255,87,34,0.55))" }}
            >
              {a.kanji}
            </text>
            <text
              x={x}
              y={y + size * 0.05}
              fill="var(--bone)"
              fontFamily="var(--ui)"
              fontWeight={700}
              fontSize={size * 0.027}
              letterSpacing="0.06em"
              textAnchor="middle"
              dominantBaseline="central"
            >
              {a.label.toUpperCase()}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
