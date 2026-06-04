import LoginForm from "./LoginForm";

export const metadata = { title: "Connexion · Hi no Kuni" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; error?: string }>;
}) {
  const sp = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <p className="hnk-eyebrow text-center mb-3">Hi no Kuni · 火ノ国</p>
        <h1 className="hnk-display text-4xl text-center mb-8">Connexion</h1>

        <div className="hnk-panel" data-kanji="忍">
          <LoginForm from={sp.from} initialError={sp.error} />
        </div>

        <p className="text-center text-xs text-smoke mt-6">
          Accès créés par le staff. Tu pourras changer ton mot de passe une fois connecté.
        </p>
      </div>
    </main>
  );
}
