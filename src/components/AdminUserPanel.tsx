"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { KG_NAMES } from "@/lib/kekkei";
import { ELEMENTS, ART_OPTIONS, ACTION_TYPES } from "@/lib/techniques";
import { type ArtsState } from "@/lib/arts";
import { AdminArtsForm, AdminQuintForm } from "@/components/AdminArtsQuint";

type Rang = "E" | "D" | "C" | "B" | "A" | "S";
type Grade = "GENIN" | "CHUNIN" | "JONIN";
type Role = "USER" | "ADMIN";

export interface AdminUser {
  id: string;
  username: string;
  role: Role;
  canManageAdmins: boolean;
  xpAvailable: number;
  xpTotalEarned: number;
  primaryKg: string | null;
  primaryAffinity: string | null;
  clan: string | null;
  rang: Rang | null;
  rangVillage: Rang | null;
  rangHistoire: Rang | null;
  rangClan: Rang | null;
  grade: Grade | null;
  uniteSpeciale: string | null;
  trame: string | null;
  prime: string | null;
  age: number | null;
  genre: string | null;
  kekkeiGenkai: string | null;
  affinites: string[];
  pactAffinities: string[];
  artsState?: unknown;
  progressionState?: unknown;
  forumProfileUrl: string | null;
  forumPseudo: string | null;
  forumLastXp: number | null;
  forumLastSyncAt: Date | null;
  forumLastSyncError: string | null;
}

export default function AdminUserPanel({
  user,
  currentUserId,
  canManageAdmins,
}: {
  user: AdminUser;
  currentUserId: string;
  canManageAdmins: boolean;
}) {
  return (
    <div className="space-y-8">
      <AccountAdminPanel
        user={user}
        currentUserId={currentUserId}
        canManageAdmins={canManageAdmins}
      />
      <XpForm userId={user.id} />
      <ProfilForm user={user} />
      <PactAffinityAdminForm userId={user.id} current={user.pactAffinities ?? []} />
      <AddTechniqueForm userId={user.id} userClan={user.clan} />
      <AdminArtsForm userId={user.id} artsState={(user.artsState ?? {}) as ArtsState} />
      <AdminQuintForm
        userId={user.id}
        quintessences={
          (user.progressionState as { quintessences?: { kind: string; target: string }[] } | null)
            ?.quintessences ?? []
        }
      />
      <ModeForm user={user} />
      <ForumLinkPanel user={user} />
    </div>
  );
}

// ===== Compte =====

function AccountAdminPanel({
  user,
  currentUserId,
  canManageAdmins,
}: {
  user: AdminUser;
  currentUserId: string;
  canManageAdmins: boolean;
}) {
  return (
    <section className="border border-ember/20 bg-ink-700 p-4">
      <h3 className="text-[10px] tracking-[0.28em] uppercase text-ember mb-3">Compte</h3>
      <div className="grid md:grid-cols-2 gap-4">
        <PasswordResetForm userId={user.id} isProtectedAdmin={user.canManageAdmins} />
        <RoleForm
          user={user}
          currentUserId={currentUserId}
          canManageAdmins={canManageAdmins}
        />
      </div>
    </section>
  );
}

function PasswordResetForm({
  userId,
  isProtectedAdmin,
}: {
  userId: string;
  isProtectedAdmin: boolean;
}) {
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setMsg(null);
    start(async () => {
      const res = await fetch(`/api/admin/users/${userId}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) {
        setMsg(j.error === "FORBIDDEN" ? "Protégé : réservé aux admins maîtres." : "Mot de passe invalide.");
        return;
      }
      setPassword("");
      setMsg("Mot de passe réinitialisé.");
    });
  }

  return (
    <div>
      <label className="block">
        <span className="block text-[10px] uppercase text-smoke mb-1">
          Nouveau mot de passe
        </span>
        <input
          type="text"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setMsg(null);
          }}
          minLength={8}
          placeholder={isProtectedAdmin ? "Admin maître protégé" : "8 caractères minimum"}
          className="w-full bg-ink-900 border border-white/10 px-3 py-2 text-bone text-sm"
        />
      </label>
      <button
        onClick={submit}
        disabled={pending || password.length < 8}
        className="mt-3 px-4 py-2 bg-ember text-black font-bold tracking-[0.2em] uppercase text-xs hover:bg-ember-hot disabled:opacity-50"
      >
        {pending ? "…" : "Réinitialiser"}
      </button>
      {msg && <p className="text-xs text-bone mt-2">{msg}</p>}
    </div>
  );
}

function RoleForm({
  user,
  currentUserId,
  canManageAdmins,
}: {
  user: AdminUser;
  currentUserId: string;
  canManageAdmins: boolean;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const isSelf = user.id === currentUserId;
  const nextRole: Role = user.role === "ADMIN" ? "USER" : "ADMIN";

  function submit() {
    setMsg(null);
    start(async () => {
      const res = await fetch(`/api/admin/users/${user.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) {
        setMsg(
          j.error === "FORBIDDEN"
            ? "Tu ne peux pas transmettre le statut admin."
            : j.error === "SELF_ROLE_CHANGE"
            ? "Tu ne peux pas changer ton propre rôle."
            : j.error === "LAST_ADMIN_MANAGER"
            ? "Impossible de retirer le dernier admin maître."
            : "Erreur."
        );
        return;
      }
      setMsg(nextRole === "ADMIN" ? "Statut admin accordé." : "Statut admin retiré.");
      router.refresh();
    });
  }

  return (
    <div>
      <p className="block text-[10px] uppercase text-smoke mb-1">Statut</p>
      <p className="text-sm text-bone">
        {user.role === "ADMIN" ? "Administrateur" : "Joueur"}
        {user.canManageAdmins && (
          <span className="ml-2 text-[10px] tracking-[0.2em] uppercase text-ember">
            maître
          </span>
        )}
      </p>
      <button
        onClick={submit}
        disabled={pending || !canManageAdmins || isSelf}
        className="mt-3 px-4 py-2 border border-ember/50 text-ember font-bold tracking-[0.2em] uppercase text-xs hover:bg-ember/10 disabled:opacity-50"
      >
        {pending ? "…" : user.role === "ADMIN" ? "Retirer admin" : "Rendre admin"}
      </button>
      <p className="text-[10px] text-smoke mt-2">
        Un admin promu ici ne peut pas promouvoir d&apos;autres admins.
      </p>
      {msg && <p className="text-xs text-bone mt-2">{msg}</p>}
    </div>
  );
}

// ===== XP =====

function XpForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function submit() {
    const n = parseInt(amount, 10);
    if (!Number.isFinite(n) || n === 0) {
      setError("Montant invalide.");
      return;
    }
    setError("");
    start(async () => {
      const res = await fetch("/api/admin/xp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amount: n, note: note || undefined }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(
          j.error === "INSUFFICIENT_XP"
            ? "Le joueur n'a pas assez d'XP pour ce retrait."
            : j.error === "CONFLICT"
            ? "Conflit (autre mutation simultanée). Recharge."
            : "Erreur."
        );
        return;
      }
      setAmount("");
      setNote("");
      router.refresh();
    });
  }

  return (
    <section className="border border-ember/20 bg-ink-700 p-4">
      <h3 className="text-[10px] tracking-[0.28em] uppercase text-ember mb-3">
        Mouvement d&apos;XP
      </h3>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="block text-[10px] uppercase text-smoke mb-1">Montant (±)</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-32 bg-ink-900 border border-white/10 px-3 py-2 text-bone tabular-nums"
          />
        </label>
        <label className="block flex-1 min-w-[200px]">
          <span className="block text-[10px] uppercase text-smoke mb-1">Note (audit)</span>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={280}
            className="w-full bg-ink-900 border border-white/10 px-3 py-2 text-bone"
          />
        </label>
        <button
          onClick={submit}
          disabled={pending}
          className="px-5 py-2 bg-ember text-black font-bold tracking-[0.2em] uppercase text-xs hover:bg-ember-hot disabled:opacity-50"
        >
          {pending ? "…" : "Appliquer"}
        </button>
      </div>
      {error && <p className="text-sm text-ember-hot mt-2">{error}</p>}
    </section>
  );
}

// ===== Profil RP =====

function ProfilForm({ user }: { user: AdminUser }) {
  const router = useRouter();
  const [v, setV] = useState({
    primaryKg: user.primaryKg ?? "",
    primaryAffinity: user.primaryAffinity ?? "",
    clan: user.clan ?? "",
    rang: user.rang ?? "",
    rangVillage: user.rangVillage ?? "",
    rangHistoire: user.rangHistoire ?? "",
    rangClan: user.rangClan ?? "",
    grade: user.grade ?? "",
    uniteSpeciale: user.uniteSpeciale ?? "",
    trame: user.trame ?? "",
    prime: user.prime ?? "",
    age: user.age?.toString() ?? "",
    genre: user.genre ?? "",
    kekkeiGenkai: user.kekkeiGenkai ?? "",
    affinites: user.affinites.join(", "),
  });
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function update<K extends keyof typeof v>(k: K, val: string) {
    setV((s) => ({ ...s, [k]: val }));
    setSaved(false);
  }

  function submit() {
    const payload = {
      primaryKg: v.primaryKg || null,
      primaryAffinity: v.primaryAffinity || null,
      clan: v.clan || null,
      rang: (v.rang || null) as Rang | null,
      rangVillage: (v.rangVillage || null) as Rang | null,
      rangHistoire: (v.rangHistoire || null) as Rang | null,
      rangClan: (v.rangClan || null) as Rang | null,
      grade: (v.grade || null) as Grade | null,
      uniteSpeciale: v.uniteSpeciale || null,
      trame: v.trame || null,
      prime: v.prime || null,
      age: v.age ? parseInt(v.age, 10) : null,
      genre: v.genre || null,
      kekkeiGenkai: v.kekkeiGenkai || null,
      affinites: v.affinites
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };
    start(async () => {
      const res = await fetch(`/api/admin/users/${user.id}/profil`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <section className="border border-white/5 bg-ink-700 p-4">
      <h3 className="text-[10px] tracking-[0.28em] uppercase text-ember mb-3">Profil RP</h3>
      <div className="grid sm:grid-cols-3 gap-3">
        <Sel label="1er KG" v={v.primaryKg} on={(x) => update("primaryKg", x)} options={KG_NAMES} />
        <Sel
          label="1ère affinité"
          v={v.primaryAffinity}
          on={(x) => update("primaryAffinity", x)}
          options={[...ELEMENTS]}
        />
        <Inp label="Clan" v={v.clan} on={(x) => update("clan", x)} />
        <Sel
          label="Rang global (personnage)"
          v={v.rang}
          on={(x) => update("rang", x)}
          options={["E", "D", "C", "B", "A", "S"]}
        />
        <Sel
          label="Rang du village"
          v={v.rangVillage}
          on={(x) => update("rangVillage", x)}
          options={["E", "D", "C", "B", "A", "S"]}
        />
        <Sel
          label="Rang histoire"
          v={v.rangHistoire}
          on={(x) => update("rangHistoire", x)}
          options={["E", "D", "C", "B", "A", "S"]}
        />
        <Sel
          label="Rang clan"
          v={v.rangClan}
          on={(x) => update("rangClan", x)}
          options={["E", "D", "C", "B", "A", "S"]}
        />
        <Sel
          label="Grade"
          v={v.grade}
          on={(x) => update("grade", x)}
          options={["GENIN", "CHUNIN", "JONIN"]}
        />
        <Inp
          label="Unité spéciale"
          v={v.uniteSpeciale}
          on={(x) => update("uniteSpeciale", x)}
        />
        <Inp label="Trame" v={v.trame} on={(x) => update("trame", x)} />
        <Inp label="Age" v={v.age} on={(x) => update("age", x)} />
        <Inp label="Genre" v={v.genre} on={(x) => update("genre", x)} />
        <Sel
          label="Kekkei Genkai"
          v={v.kekkeiGenkai}
          on={(x) => update("kekkeiGenkai", x)}
          options={KG_NAMES}
        />
        <Inp
          label="Affinités (séparées par ,)"
          v={v.affinites}
          on={(x) => update("affinites", x)}
        />
      </div>
      <label className="block mt-3">
        <span className="block text-[10px] uppercase text-smoke mb-1">Prime / notes</span>
        <textarea
          value={v.prime}
          onChange={(e) => update("prime", e.target.value)}
          rows={3}
          className="w-full bg-ink-900 border border-white/10 px-3 py-2 text-bone text-sm"
        />
      </label>
      <div className="flex items-center gap-3 mt-3">
        <button
          onClick={submit}
          disabled={pending}
          className="px-5 py-2 bg-ember text-black font-bold tracking-[0.2em] uppercase text-xs hover:bg-ember-hot disabled:opacity-50"
        >
          {pending ? "…" : "Enregistrer"}
        </button>
        {saved && <span className="text-xs text-emerald-400">Enregistré.</span>}
      </div>
    </section>
  );
}

// ===== Affinités du pacte (Kuchiyose) =====

function PactAffinityAdminForm({ userId, current }: { userId: string; current: string[] }) {
  const router = useRouter();
  const [sel, setSel] = useState<string[]>(current);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function toggle(el: string) {
    setMsg(null);
    setSel((s) => (s.includes(el) ? s.filter((x) => x !== el) : [...s, el]));
  }

  function submit() {
    start(async () => {
      const res = await fetch(`/api/admin/users/${userId}/pact-affinity`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ affinities: sel }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) {
        setMsg("Erreur.");
        return;
      }
      setMsg("Affinités du pacte enregistrées.");
      router.refresh();
    });
  }

  return (
    <section className="border border-white/5 bg-ink-700 p-4">
      <h3 className="text-[10px] tracking-[0.28em] uppercase text-ember mb-3">
        Affinités du pacte (Kuchiyose)
      </h3>
      <p className="text-[10px] text-smoke mb-3">
        Affinité(s) héritée(s) par toutes les invocations du joueur. Contrôle direct (sans verrou).
      </p>
      <div className="flex flex-wrap gap-x-6 gap-y-2 mb-3">
        {ELEMENTS.map((el) => (
          <label key={el} className="flex items-center gap-2 text-sm text-bone cursor-pointer">
            <input
              type="checkbox"
              checked={sel.includes(el)}
              onChange={() => toggle(el)}
              className="accent-[var(--ember)]"
            />
            {el}
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={submit}
          disabled={pending}
          className="px-5 py-2 bg-ember text-black font-bold tracking-[0.2em] uppercase text-xs hover:bg-ember-hot disabled:opacity-50"
        >
          {pending ? "…" : "Enregistrer"}
        </button>
        {msg && <span className="text-xs text-bone">{msg}</span>}
      </div>
    </section>
  );
}

// ===== Ajout manuel d'une technique =====

function AddTechniqueForm({ userId, userClan }: { userId: string; userClan: string | null }) {
  const router = useRouter();
  const [v, setV] = useState({
    nom: "",
    description: "",
    art: "",
    actionType: "",
    element: "",
    kekkeiGenkai: "",
    nature: "",
    clan: userClan ?? "",
    coutXp: "0",
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function up<K extends keyof typeof v>(k: K, val: string) {
    setV((s) => ({ ...s, [k]: val }));
    setMsg(null);
  }

  function submit() {
    if (v.nom.trim().length < 2 || v.description.trim().length < 1) {
      setMsg("Nom et description requis.");
      return;
    }
    if (v.nature === "COLLECTIVE" && !v.clan.trim()) {
      setMsg("Indique le clan pour une technique collective.");
      return;
    }
    const payload = {
      nom: v.nom.trim(),
      description: v.description.trim(),
      art: v.art || null,
      actionType: v.actionType || null,
      element: v.element || null,
      kekkeiGenkai: v.kekkeiGenkai || null,
      nature: v.nature || null,
      clan: v.nature === "COLLECTIVE" ? v.clan.trim() || null : null,
      coutXp: parseInt(v.coutXp, 10) || 0,
    };
    start(async () => {
      const res = await fetch(`/api/admin/users/${userId}/fiches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) {
        setMsg("Erreur lors de l'ajout.");
        return;
      }
      setV((s) => ({ ...s, nom: "", description: "", kekkeiGenkai: "", element: "" }));
      setMsg("Technique ajoutée (validée).");
      router.refresh();
    });
  }

  return (
    <section className="border border-white/5 bg-ink-700 p-4">
      <h3 className="text-[10px] tracking-[0.28em] uppercase text-ember mb-3">
        Ajouter une technique (manuel)
      </h3>
      <p className="text-[10px] text-smoke mb-3">
        Créée directement en VALIDATED, sans débit d&apos;XP. Nature « Collective » + clan = ajout à
        la bibliothèque commune du clan.
      </p>
      <div className="grid sm:grid-cols-3 gap-3">
        <Inp label="Nom" v={v.nom} on={(x) => up("nom", x)} />
        <Sel label="Art" v={v.art} on={(x) => up("art", x)} options={[...ART_OPTIONS]} />
        <Sel
          label="Type d'action"
          v={v.actionType}
          on={(x) => up("actionType", x)}
          options={ACTION_TYPES.map((a) => a.key)}
        />
        <Sel label="Élément" v={v.element} on={(x) => up("element", x)} options={[...ELEMENTS]} />
        <Sel
          label="Kekkei Genkai"
          v={v.kekkeiGenkai}
          on={(x) => up("kekkeiGenkai", x)}
          options={KG_NAMES}
        />
        <Sel
          label="Nature"
          v={v.nature}
          on={(x) => up("nature", x)}
          options={["PERSONNELLE", "COLLECTIVE"]}
        />
        {v.nature === "COLLECTIVE" && <Inp label="Clan" v={v.clan} on={(x) => up("clan", x)} />}
        <Inp label="Coût XP (info)" v={v.coutXp} on={(x) => up("coutXp", x)} />
      </div>
      <label className="block mt-3">
        <span className="block text-[10px] uppercase text-smoke mb-1">Description</span>
        <textarea
          value={v.description}
          onChange={(e) => up("description", e.target.value)}
          rows={4}
          className="w-full bg-ink-900 border border-white/10 px-3 py-2 text-bone text-sm"
        />
      </label>
      <div className="flex items-center gap-3 mt-3">
        <button
          onClick={submit}
          disabled={pending}
          className="px-5 py-2 bg-ember text-black font-bold tracking-[0.2em] uppercase text-xs hover:bg-ember-hot disabled:opacity-50"
        >
          {pending ? "…" : "Ajouter"}
        </button>
        {msg && <span className="text-xs text-bone">{msg}</span>}
      </div>
    </section>
  );
}

// ===== Mode spécial =====

function ModeForm({ user }: { user: AdminUser }) {
  const router = useRouter();
  const mode = (user.progressionState as { mode?: { path?: string; stage?: number } } | null)?.mode;
  const [path, setPath] = useState(mode?.path ?? "");
  const [stage, setStage] = useState(String(mode?.stage ?? 0));
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function submit() {
    start(async () => {
      const res = await fetch(`/api/admin/users/${user.id}/mode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, stage: parseInt(stage, 10) || 0 }),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <section className="border border-white/5 bg-ink-700 p-4">
      <h3 className="text-[10px] tracking-[0.28em] uppercase text-ember mb-3">Mode spécial</h3>
      <div className="flex flex-wrap items-end gap-3">
        <Sel
          label="Voie"
          v={path}
          on={(x) => {
            setPath(x);
            setSaved(false);
          }}
          options={["ERMITE", "JINCHURIKI", "OTSUTSUKI"]}
        />
        <Sel
          label="Stade (0 = aucun)"
          v={stage}
          on={(x) => {
            setStage(x);
            setSaved(false);
          }}
          options={["0", "1", "2", "3"]}
        />
        <button
          onClick={submit}
          disabled={pending}
          className="px-5 py-2 bg-ember text-black font-bold tracking-[0.2em] uppercase text-xs hover:bg-ember-hot disabled:opacity-50"
        >
          {pending ? "…" : "Appliquer"}
        </button>
        {saved && <span className="text-xs text-emerald-400">Enregistré.</span>}
      </div>
    </section>
  );
}

// ===== Lien forum =====

function ForumLinkPanel({ user }: { user: AdminUser }) {
  const router = useRouter();
  const [url, setUrl] = useState(user.forumProfileUrl ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function link() {
    start(async () => {
      const res = await fetch(`/api/admin/users/${user.id}/forum-link`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forumProfileUrl: url }),
      });
      if (res.ok) {
        setMsg("Lien enregistré.");
        router.refresh();
      } else {
        const j = await res.json().catch(() => ({}));
        setMsg(j.error === "DUPLICATE" ? "Ce profil est déjà lié." : "Erreur.");
      }
    });
  }

  function unlink() {
    start(async () => {
      const res = await fetch(`/api/admin/users/${user.id}/forum-link`, {
        method: "DELETE",
      });
      if (res.ok) {
        setUrl("");
        setMsg("Délié.");
        router.refresh();
      }
    });
  }

  function syncNow() {
    setMsg("Sync en cours…");
    start(async () => {
      const res = await fetch(`/api/admin/users/${user.id}/sync-forum`, { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (j.ok) setMsg(`Sync OK — delta ${j.delta ?? 0} XP.`);
      else setMsg(`Sync échouée : ${j.error ?? "?"}`);
      router.refresh();
    });
  }

  return (
    <section className="border border-white/5 bg-ink-700 p-4">
      <h3 className="text-[10px] tracking-[0.28em] uppercase text-ember mb-3">
        Lien forum Hi no Kuni
      </h3>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block flex-1 min-w-[260px]">
          <span className="block text-[10px] uppercase text-smoke mb-1">
            URL profil (/u&lt;ID&gt;)
          </span>
          <input
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setMsg(null);
            }}
            placeholder="https://hinokuni.forumactif.com/u123"
            className="w-full bg-ink-900 border border-white/10 px-3 py-2 text-bone text-sm font-mono"
          />
        </label>
        <button
          onClick={link}
          disabled={pending || !url}
          className="px-4 py-2 bg-ember text-black font-bold tracking-[0.2em] uppercase text-xs hover:bg-ember-hot disabled:opacity-50"
        >
          {user.forumProfileUrl ? "Mettre à jour" : "Lier"}
        </button>
        {user.forumProfileUrl && (
          <button
            onClick={syncNow}
            disabled={pending}
            className="px-4 py-2 border border-ember/50 text-ember font-bold tracking-[0.2em] uppercase text-xs hover:bg-ember/10 disabled:opacity-50"
          >
            Sync maintenant
          </button>
        )}
        {user.forumProfileUrl && (
          <button
            onClick={unlink}
            disabled={pending}
            className="px-4 py-2 border border-red-500/40 text-red-400 font-bold tracking-[0.2em] uppercase text-xs hover:bg-red-500/10 disabled:opacity-50"
          >
            Délier
          </button>
        )}
      </div>
      {msg && <p className="text-xs text-bone mt-2">{msg}</p>}
      {(user.forumPseudo || user.forumLastXp !== null) && (
        <p className="text-xs text-smoke mt-2">
          Dernier état : {user.forumPseudo ?? "?"}
          {user.forumLastXp !== null && ` · ${user.forumLastXp} XP forum`}
          {user.forumLastSyncAt && ` · ${new Date(user.forumLastSyncAt).toLocaleString("fr-FR")}`}
        </p>
      )}
      {user.forumLastSyncError && (
        <p className="text-xs text-red-400 mt-1">Dernière erreur : {user.forumLastSyncError}</p>
      )}
    </section>
  );
}

// ===== Helpers UI =====

function Inp({ label, v, on }: { label: string; v: string; on: (x: string) => void }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase text-smoke mb-1">{label}</span>
      <input
        type="text"
        value={v}
        onChange={(e) => on(e.target.value)}
        className="w-full bg-ink-900 border border-white/10 px-3 py-2 text-bone text-sm"
      />
    </label>
  );
}

function Sel({
  label,
  v,
  on,
  options,
}: {
  label: string;
  v: string;
  on: (x: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase text-smoke mb-1">{label}</span>
      <select
        value={v}
        onChange={(e) => on(e.target.value)}
        className="w-full bg-ink-900 border border-white/10 px-3 py-2 text-bone text-sm"
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
