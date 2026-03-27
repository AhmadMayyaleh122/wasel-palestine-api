const { getPrismaClient } = require('../prisma/prismaClient');

/**
 * Seed incident categories
 * Run: node src/db/seed.js
 */
async function seedIncidentCategories() {
  const prisma = getPrismaClient();

  const categories = [
    {
      code: 'CLOSURE',
      label: 'Road Closure',
      description: 'Complete road closure preventing passage',
    },
    {
      code: 'DELAY',
      label: 'Traffic Delay',
      description: 'Significant traffic delays',
    },
    {
      code: 'CHECKPOINT',
      label: 'Checkpoint Issue',
      description: 'Checkpoint-related incident or status change',
    },
    {
      code: 'ACCIDENT',
      label: 'Accident',
      description: 'Traffic accident on route',
    },
    {
      code: 'WEATHER',
      label: 'Weather Hazard',
      description: 'Weather-related road hazard',
    },
    {
      code: 'CONGESTION',
      label: 'Congestion',
      description: 'Heavy traffic congestion',
    },
    {
      code: 'CONSTRUCTION',
      label: 'Construction',
      description: 'Road construction or maintenance',
    },
    {
      code: 'INCIDENT',
      label: 'Incident',
      description: 'General incident',
    },
  ];

  try {
    for (const category of categories) {
      const existing = await prisma.incidentCategory.findUnique({
        where: { code: category.code },
      });

      if (!existing) {
        await prisma.incidentCategory.create({
          data: category,
        });
        console.log(`✓ Created category: ${category.label}`);
      } else {
        console.log(`• Category already exists: ${category.label}`);
      }
    }

    console.log('\n✅ Seed completed successfully!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run seed if this file is executed directly
if (require.main === module) {
  seedIncidentCategories();
}

module.exports = { seedIncidentCategories };
