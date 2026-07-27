import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/common/password';

const prisma = new PrismaClient();

// Dev seed user for the web-login path (Authorization: Bearer).
// telegramId=1 is a reserved fake id — the real account is upserted
// by its own telegramId on first /start and never collides with it.
async function main() {
  const login = 'azhar';
  const passwordHash = hashPassword('azhar');

  const user = await prisma.user.upsert({
    where: { login },
    update: { passwordHash },
    create: {
      telegramId: BigInt(1),
      username: 'azhar',
      firstName: 'Azhar',
      login,
      passwordHash,
      preferredLocale: 'RU',
    },
  });

  console.log(`Seeded dev user "${user.login}" (id=${user.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
