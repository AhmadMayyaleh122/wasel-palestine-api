const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

let prisma;

function getPrismaClient() {
  if (!prisma) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
  }
  return prisma;
}

async function disconnectPrisma() {
  if (prisma) {
    await prisma.$disconnect();
  }
}

module.exports = {
  getPrismaClient,
  disconnectPrisma,
};
