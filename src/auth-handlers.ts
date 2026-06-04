// Réexport des handlers Auth.js pour la route catch-all.
// Le middleware Edge importe "@/auth.config" directement pour éviter
// d'embarquer Prisma/bcrypt dans son bundle.
export { handlers } from "@/auth";
