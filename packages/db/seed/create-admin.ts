import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Gerçek bir admin hesabı oluşturur. Bilgiler komut satırına değil ortam değişkenine
// verilir ki şifre shell geçmişinde ve loglarda kalmasın:
//   ADMIN_EMAIL=... ADMIN_PASSWORD=... pnpm db:create-admin
async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("ADMIN_EMAIL ve ADMIN_PASSWORD ortam değişkenleri zorunlu.");
  }
  if (password.length < 12) {
    throw new Error("ADMIN_PASSWORD en az 12 karakter olmalı.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: "ADMIN", isActive: true },
    create: { email, passwordHash, role: "ADMIN", isEmailVerified: true },
  });
  // eslint-disable-next-line no-console
  console.log(`Admin hazır: ${admin.email}`);
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
