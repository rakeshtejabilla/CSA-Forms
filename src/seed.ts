import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seed() {
  console.log('[Seed] Checking if seed data exists...');

  const adminEmail = process.env.SEED_SUPER_ADMIN_EMAIL || 'admin@formbuilder.com';
  const adminPassword = process.env.SEED_SUPER_ADMIN_PASSWORD || 'Password123';
  const adminName = process.env.SEED_SUPER_ADMIN_NAME || 'Super Admin';
  const orgName = process.env.SEED_DEFAULT_ORG_NAME || 'Default Organization';
  const orgCode = process.env.SEED_DEFAULT_ORG_CODE || 'DEFAULT';
  const orgEmail = process.env.SEED_DEFAULT_ORG_EMAIL || 'contact@default.org';

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log('[Seed] Admin user already exists. Skipping seed.');
    return;
  }

  // Create default organization
  let org = await prisma.organization.findUnique({
    where: { code: orgCode },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: orgName,
        code: orgCode,
        email: orgEmail,
        status: 'ACTIVE',
      },
    });
    console.log(`[Seed] Created organization: ${orgName}`);
  }

  // Create super admin user
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash: hashedPassword,
      name: adminName,
      role: 'SUPER_ADMIN',
      organizationId: org.id,
      status: 'ACTIVE',
    },
  });

  console.log(`[Seed] Created super admin: ${adminEmail}`);
  console.log('[Seed] Seeding complete!');
}

seed()
  .catch((e) => {
    console.error('[Seed] Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
