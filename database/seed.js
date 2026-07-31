const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('--- STARTING DATABASE SEEDING ---');

  // 1. Relational Database Seeding (PostgreSQL via Prisma)
  // Clean relational database
  console.log('Connecting to PostgreSQL...');
  let postgresConnected = false;
  let postgresRetries = 30;
  while (!postgresConnected && postgresRetries > 0) {
    try {
      await prisma.$connect();
      postgresConnected = true;
    } catch (err) {
      console.log(`Failed to connect to PostgreSQL. Retries left: ${postgresRetries}. Error: ${err.message}`);
      postgresRetries--;
      await new Promise(res => setTimeout(res, 2000));
    }
  }
  if (!postgresConnected) {
    throw new Error("Could not connect to PostgreSQL after 30 retries.");
  }
  console.log('Connected to PostgreSQL...');

  // Clean database
  console.log('Cleaning database...');
  await prisma.submission.deleteMany({});
  await prisma.formShare.deleteMany({});
  await prisma.formTemplate.deleteMany({});
  await prisma.activityLog.deleteMany({});
  await prisma.prebuiltTemplateVersion.deleteMany({});
  await prisma.prebuiltTemplate.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.organization.deleteMany({});
  console.log('Database cleaned.');

  // Create Base Super Admin User
  console.log('Seeding Super Admin...');
  const passHash = await bcrypt.hash('Password123', 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@formbuilder.com' },
    update: {},
    create: {
      email: 'admin@formbuilder.com',
      passwordHash: passHash,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      organizationId: null,
    },
  });

  console.log(`Seeded user: ${superAdmin.email} (SUPER_ADMIN)`);

  console.log('Seeding Default Organization...');
  const defaultOrg = await prisma.organization.upsert({
    where: { code: 'DEFAULT' },
    update: {},
    create: {
      name: 'Default Organization',
      code: 'DEFAULT',
      description: 'Default organization created by seed',
      email: 'contact@default.org',
    },
  });
  console.log(`Seeded organization: ${defaultOrg.name}`);

  console.log('Seeding Example Org Admin...');
  const orgAdmin = await prisma.user.upsert({
    where: { email: 'orgadmin@formbuilder.com' },
    update: {},
    create: {
      email: 'orgadmin@formbuilder.com',
      passwordHash: passHash,
      name: 'Org Admin',
      role: 'ORG_ADMIN',
      organizationId: defaultOrg.id,
    },
  });
  console.log(`Seeded user: ${orgAdmin.email} (ORG_ADMIN)`);

  console.log('Seeding Example Enumerator...');
  const enumerator = await prisma.user.upsert({
    where: { email: 'enumerator@formbuilder.com' },
    update: {},
    create: {
      email: 'enumerator@formbuilder.com',
      passwordHash: passHash,
      name: 'Enumerator User',
      role: 'ENUMERATOR',
      organizationId: defaultOrg.id,
    },
  });
  console.log(`Seeded user: ${enumerator.email} (ENUMERATOR)`);

  await prisma.$disconnect();
  console.log('PostgreSQL client disconnected.');
  console.log('--- SEEDING COMPLETED SUCCESSFULLY ---');
}

main().catch((err) => {
  console.error('Fatal error during database seeding:', err);
  process.exit(1);
});
