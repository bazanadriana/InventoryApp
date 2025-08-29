import { PrismaClient, FieldKind, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function reset() {
  await prisma.$transaction([
    prisma.like.deleteMany({}),
    prisma.comment.deleteMany({}),
    prisma.inventoryMember.deleteMany({}),
    prisma.inventoryTag.deleteMany({}),
    prisma.customField.deleteMany({}),
    prisma.item.deleteMany({}),
    prisma.tag.deleteMany({}),
    prisma.inventory.deleteMany({}),
    prisma.user.deleteMany({}),
  ]);
}

async function main() {
  await reset();

  // Tags first
  const [tDemo, tSeed] = await Promise.all([
    prisma.tag.upsert({
      where: { slug: 'demo' },
      update: {},
      create: { name: 'demo', slug: slugify('demo') },
    }),
    prisma.tag.upsert({
      where: { slug: 'seed' },
      update: {},
      create: { name: 'seed', slug: slugify('seed') },
    }),
  ]);

  // Demo user
  const user = await prisma.user.create({
    data: {
      email: 'demo@example.com',
      name: 'Demo User',
      image: 'https://i.pravatar.cc/100?img=1',
    },
  });

  // Inventory
  const inv = await prisma.inventory.create({
    data: {
      ownerId: user.id,
      title: 'Demo Inventory',
      description: 'Seeded inventory for local development',
      category: 'Equipment',
      isPublic: true,
      version: 1,
      customIdSpec: [
        { type: 'FIXED', value: 'EQ-' },
        { type: 'SEQUENCE', width: 4, padWith: '0' },
      ] as Prisma.InputJsonValue,
    },
  });

  // Link tags via join model
  await prisma.inventoryTag.createMany({
    data: [
      { inventoryId: inv.id, tagId: tDemo.id },
      { inventoryId: inv.id, tagId: tSeed.id },
    ],
    skipDuplicates: true,
  });

  // Custom fields (FieldKind.TEXT instead of STRING)
  await prisma.customField.createMany({
    data: [
      {
        inventoryId: inv.id,
        name: 'Title',
        kind: FieldKind.TEXT,   // <-- fixed
        position: 1,
        showInTable: true,
      },
      {
        inventoryId: inv.id,
        name: 'Year',
        kind: FieldKind.NUMBER,
        position: 2,
        showInTable: true,
      },
      {
        inventoryId: inv.id,
        name: 'Notes',
        kind: FieldKind.TEXT,
        position: 3,
        showInTable: false,
      },
    ],
  });

  // Items
  await prisma.item.createMany({
    data: [
      { inventoryId: inv.id, customId: 'EQ-0001', version: 1, createdById: user.id },
      { inventoryId: inv.id, customId: 'EQ-0002', version: 1, createdById: user.id },
    ],
  });

  console.log('✅ Seed complete', { user: user.email, inventory: inv.title });
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
