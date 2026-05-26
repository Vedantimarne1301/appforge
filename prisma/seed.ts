// prisma/seed.ts
// Run with: npm run db:seed
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo user
  const hashedPw = await bcrypt.hash('demo1234', 12);
  const user = await prisma.user.upsert({
    where: { email: 'demo@appforge.dev' },
    update: {},
    create: {
      name: 'Demo User',
      email: 'demo@appforge.dev',
      password: hashedPw,
    },
  });
  console.log(`✓ Demo user: ${user.email}`);

  // Task manager config
  const taskConfig = await prisma.appConfig.upsert({
    where: { id: 'seed-tasks-config' },
    update: {},
    create: {
      id: 'seed-tasks-config',
      userId: user.id,
      name: 'Task Manager',
      description: 'Track and manage project tasks',
      resource: 'tasks',
      isValid: true,
      rawConfig: {
        resource: 'tasks',
        layout: 'both',
        name: 'Task Manager',
        description: 'Track and manage project tasks',
        fields: [
          { name: 'title', label: 'Task Title', component: 'input', type: 'text', required: true },
          { name: 'description', label: 'Description', component: 'textarea', type: 'text' },
          { name: 'priority', label: 'Priority', component: 'select', options: ['Low', 'Medium', 'High'], required: true },
          { name: 'due_date', label: 'Due Date', component: 'date' },
          { name: 'completed', label: 'Completed', component: 'checkbox' },
        ],
        settings: { allowCreate: true, allowEdit: true, allowDelete: true, allowCsvImport: true, pageSize: 20 },
      },
    },
  });
  console.log(`✓ Task config: ${taskConfig.name}`);

  // Contact form config
  const contactConfig = await prisma.appConfig.upsert({
    where: { id: 'seed-contacts-config' },
    update: {},
    create: {
      id: 'seed-contacts-config',
      userId: user.id,
      name: 'Contact Directory',
      description: 'Store and manage contact information',
      resource: 'contacts',
      isValid: true,
      rawConfig: {
        resource: 'contacts',
        layout: 'both',
        name: 'Contact Directory',
        fields: [
          { name: 'full_name', label: 'Full Name', component: 'input', type: 'text', required: true },
          { name: 'email', label: 'Email', component: 'email', type: 'email', required: true },
          { name: 'phone', label: 'Phone', component: 'input', type: 'text' },
          { name: 'company', label: 'Company', component: 'input', type: 'text' },
          { name: 'role', label: 'Role', component: 'select', options: ['Client', 'Vendor', 'Partner', 'Team Member'] },
          { name: 'notes', label: 'Notes', component: 'textarea' },
        ],
        settings: { allowCreate: true, allowEdit: true, allowDelete: true, allowCsvImport: true, pageSize: 25 },
      },
    },
  });
  console.log(`✓ Contacts config: ${contactConfig.name}`);

  // Seed some task records
  const existingRecords = await prisma.appRecord.count({ where: { configId: 'seed-tasks-config' } });
  if (existingRecords === 0) {
    await prisma.appRecord.createMany({
      data: [
        { configId: 'seed-tasks-config', userId: user.id, data: { title: 'Set up project', priority: 'High', completed: true, description: 'Initialize repo and CI' } },
        { configId: 'seed-tasks-config', userId: user.id, data: { title: 'Design DB schema', priority: 'High', completed: true } },
        { configId: 'seed-tasks-config', userId: user.id, data: { title: 'Build config validator', priority: 'Medium', completed: false, due_date: '2025-02-01' } },
        { configId: 'seed-tasks-config', userId: user.id, data: { title: 'Write tests', priority: 'Low', completed: false } },
      ],
    });
    console.log('✓ Seeded 4 task records');
  }

  console.log('✅ Seed complete');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
