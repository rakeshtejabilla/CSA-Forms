const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// ─── Read seed config from environment variables ──────────────────────────────
const config = {
  superAdmin: {
    email:    process.env.SEED_SUPER_ADMIN_EMAIL    || 'admin@formbuilder.com',
    password: process.env.SEED_SUPER_ADMIN_PASSWORD || 'Password123',
    name:     process.env.SEED_SUPER_ADMIN_NAME     || 'Super Admin',
  },
  orgAdmin: {
    email: process.env.SEED_ORG_ADMIN_EMAIL || 'orgadmin@formbuilder.com',
    name:  process.env.SEED_ORG_ADMIN_NAME  || 'Org Admin',
  },
  enumerator: {
    email: process.env.SEED_ENUMERATOR_EMAIL || 'enumerator@formbuilder.com',
    name:  process.env.SEED_ENUMERATOR_NAME  || 'Enumerator User',
  },
  defaultOrg: {
    name:  process.env.SEED_DEFAULT_ORG_NAME  || 'Default Organization',
    code:  process.env.SEED_DEFAULT_ORG_CODE  || 'DEFAULT',
    email: process.env.SEED_DEFAULT_ORG_EMAIL || 'contact@default.org',
  },
};

async function main() {
  console.log('--- STARTING DATABASE SEED CHECK ---');

  // ─── Step 1: Connect to PostgreSQL with retries ───────────────────────────
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
    throw new Error('Could not connect to PostgreSQL after 30 retries.');
  }
  console.log('Connected to PostgreSQL.');

  // ─── Step 2: Check if DB is already seeded ───────────────────────────────
  // If the Super Admin user already exists, the DB has been seeded before.
  // Skip all operations to preserve existing data.
  const existingSuperAdmin = await prisma.user.findUnique({
    where: { email: config.superAdmin.email },
  });

  if (existingSuperAdmin) {
    console.log('✅ Database is already seeded. Skipping seed to preserve existing data.');
    console.log('   (Run with docker-compose down -v to reset the database completely.)');
    await prisma.$disconnect();
    console.log('--- SEED CHECK COMPLETED (NO CHANGES MADE) ---');
    return;
  }

  // ─── Step 3: Fresh DB detected — run full seed ───────────────────────────
  console.log('🌱 Fresh database detected. Running initial seed...');
  console.log(`   Super Admin : ${config.superAdmin.email}`);
  console.log(`   Org         : ${config.defaultOrg.name} (${config.defaultOrg.code})`);

  const passHash = await bcrypt.hash(config.superAdmin.password, 10);

  // Create Super Admin
  console.log('Seeding Super Admin...');
  const superAdmin = await prisma.user.upsert({
    where: { email: config.superAdmin.email },
    update: {},
    create: {
      email:        config.superAdmin.email,
      passwordHash: passHash,
      name:         config.superAdmin.name,
      role:         'SUPER_ADMIN',
      organizationId: null,
    },
  });
  console.log(`✔ Seeded user: ${superAdmin.email} (SUPER_ADMIN)`);

  // Create Default Organization
  console.log('Seeding Default Organization...');
  const defaultOrg = await prisma.organization.upsert({
    where: { code: config.defaultOrg.code },
    update: {},
    create: {
      name:        config.defaultOrg.name,
      code:        config.defaultOrg.code,
      description: 'Default organization created by seed',
      email:       config.defaultOrg.email,
    },
  });
  console.log(`✔ Seeded organization: ${defaultOrg.name}`);

  // Create Org Admin
  console.log('Seeding Org Admin...');
  const orgAdmin = await prisma.user.upsert({
    where: { email: config.orgAdmin.email },
    update: {},
    create: {
      email:          config.orgAdmin.email,
      passwordHash:   passHash,
      name:           config.orgAdmin.name,
      role:           'ORG_ADMIN',
      organizationId: defaultOrg.id,
    },
  });
  console.log(`✔ Seeded user: ${orgAdmin.email} (ORG_ADMIN)`);

  // Create Enumerator
  console.log('Seeding Enumerator...');
  const enumerator = await prisma.user.upsert({
    where: { email: config.enumerator.email },
    update: {},
    create: {
      email:          config.enumerator.email,
      passwordHash:   passHash,
      name:           config.enumerator.name,
      role:           'ENUMERATOR',
      organizationId: defaultOrg.id,
    },
  });
  console.log(`✔ Seeded user: ${enumerator.email} (ENUMERATOR)`);

  await prisma.$disconnect();
  console.log('PostgreSQL client disconnected.');
  console.log('--- SEEDING COMPLETED SUCCESSFULLY ---');
}

main().catch((err) => {
  console.error('Fatal error during database seeding:', err);
  process.exit(1);
});
