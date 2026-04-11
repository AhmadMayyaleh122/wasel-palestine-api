const { getPrismaClient } = require('../prisma/prismaClient');

class AlertRepository {
  async createSubscription({ userId, categoryId, geofenceId, channel }) {
    const prisma = getPrismaClient();

    try {
      return await prisma.alertSubscription.create({
        data: {
          userId,
          categoryId,
          geofenceId,
          channel,
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
          category: true,
          geofence: true,
        },
      });
    } catch (error) {
      throw new Error(`Failed to create alert subscription: ${error.message}`);
    }
  }

  async getDuplicateSubscription({ userId, categoryId, geofenceId, channel }) {
    const prisma = getPrismaClient();

    try {
      return await prisma.alertSubscription.findFirst({
        where: {
          userId,
          categoryId: categoryId ?? null,
          geofenceId: geofenceId ?? null,
          channel,
          isActive: true,
        },
      });
    } catch (error) {
      throw new Error(`Failed to check duplicate subscription: ${error.message}`);
    }
  }

  async getUserSubscriptions(userId) {
    const prisma = getPrismaClient();

    try {
      return await prisma.alertSubscription.findMany({
        where: {
          userId,
        },
        include: {
          category: true,
          geofence: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } catch (error) {
      throw new Error(`Failed to fetch user subscriptions: ${error.message}`);
    }
  }
}

module.exports = new AlertRepository();