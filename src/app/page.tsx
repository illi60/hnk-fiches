import Link from "next/link";

export default function Home() {
  return (
    <main className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden">
      {/* Kanji géant en filigrane */}
      <span
        aria-hidden
        className="pointer-events-none select-none absolute -z-0 font-jp font-black leading-none"
        style={{
          fontSize: "46vw",
          color: "rgba(255,87,34,0.05)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
        }}
      >
        火
      </span>

      <div className="relative z-10 max-w-2xl text-center">
        <p className="hnk-eyebrow mb-4">Hi no Kuni · 火ノ国 · Registre</p>
        <h1 className="hnk-display text-5xl md:text-7xl mb-5">
          Fiches Techniques
        </h1>
        <p className="text-bone/75 mb-10 leading-relaxed max-w-xl mx-auto">
          Site compagnon du forum Hi no Kuni. Chaque shinobi y consigne ses
          techniques, le staff les valide, et l&apos;expérience récoltée sur le
          forum se synchronise ici.
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <Link href="/login" className="hnk-btn">
            Connexion <span aria-hidden>→</span>
          </Link>
        </div>
        <p className="text-[11px] text-smoke mt-6">
          Les comptes sont créés par le staff. Rapproche-toi d&apos;un membre du staff pour obtenir tes accès.
        </p>
      </div>
    </main>
  );
}
