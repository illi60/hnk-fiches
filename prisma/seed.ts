import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@local.dev";
  const username = process.env.SEED_ADMIN_USERNAME ?? "Admin";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe!2026";

  const passwordHash = await hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    // On ré-applique aussi le mot de passe (et le pseudo) à chaque seed :
    // sinon, changer SEED_ADMIN_PASSWORD après un 1er seed ne mettait pas
    // à jour le hash → "Identifiants invalides".
    update: { role: Role.ADMIN, canManageAdmins: true, username, passwordHash },
    create: {
      email,
      username,
      passwordHash,
      role: Role.ADMIN,
      canManageAdmins: true,
    },
  });

  console.log(`✓ Admin ready: ${admin.email} (id=${admin.id})`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
