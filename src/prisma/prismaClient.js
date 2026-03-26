const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Client } = require('pg');

let prisma;

function getPrismaClient() {
  if (!prisma) {
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    
    const adapter = new PrismaPg({ client });
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
