import { prisma } from "./src/lib/prisma";

async function main() {
  const users = await prisma.user.findMany({
    include: { customer: true }
  });
  console.log("Users in Database:");
  console.dir(users, { depth: null });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
