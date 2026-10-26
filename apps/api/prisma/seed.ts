import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("Defina SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD antes de executar o seed.");
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: { name: process.env.SEED_ADMIN_NAME ?? "Administrador", password: await bcrypt.hash(password, 12) },
    create: {
      email,
      name: process.env.SEED_ADMIN_NAME ?? "Administrador",
      password: await bcrypt.hash(password, 12)
    }
  });
  const network = await prisma.network.upsert({
    where: { id: "rede-principal" },
    update: {},
    create: { id: "rede-principal", name: "Rede principal" }
  });
  await prisma.networkMembership.upsert({
    where: { userId_networkId: { userId: user.id, networkId: network.id } },
    update: { role: "ADMIN" },
    create: { userId: user.id, networkId: network.id, role: "ADMIN" }
  });
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
