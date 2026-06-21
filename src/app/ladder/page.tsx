import GeneratorNav from "@/components/GeneratorNav";
import LadderView from "@/components/LadderView";
import { loadLadder } from "@/lib/ladder";

// Lecture DB à chaque visite (classement vivant).
export const dynamic = "force-dynamic";

export default async function LadderPage() {
  const { players, clans } = await loadLadder();

  return (
    <main className="min-h-screen flex flex-col">
      <GeneratorNav current="ladder" />

      <div className="relative flex-1 overflow-hidden">
        <span
          aria-hidden
          className="pointer-events-none select-none absolute -z-0 font-jp font-black leading-none"
          style={{
            fontSize: "42vw",
            color: "rgba(255,87,34,0.045)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
          }}
        >
          番
        </span>

        <div className="relative z-10 max-w-5xl mx-auto px-6 py-16">
          <p className="hnk-eyebrow mb-4">Hi no Kuni · 火ノ国 · Ladder</p>
          <h1 className="hnk-display text-4xl md:text-6xl mb-5">Le classement</h1>
          <p className="text-bone/75 mb-12 leading-relaxed max-w-2xl">
            Les shinobi et les clans du Pays du Feu, classés. Trie par XP, contribution, rang ou
            ordre alphabétique, et clique sur un nom pour ouvrir son aperçu.
          </p>

          <LadderView players={players} clans={clans} />

          <p className="text-[11px] text-smoke mt-10">
            Seuls les profils synchronisés au forum apparaissent. XP et rangs sont mis à jour à
            chaque synchronisation.
          </p>
        </div>
      </div>
    </main>
  );
}
