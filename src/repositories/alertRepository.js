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

  async findMatchingSubscriptions({ categoryId, geofenceId }) {
    const prisma = getPrismaClient();
    try {
      return await prisma.alertSubscription.findMany({
        where: {
          isActive: true,
          OR: [
            ...(categoryId ? [{ categoryId }] : []),
            ...(geofenceId ? [{ geofenceId }] : []),
          ],
        },
      });
    } catch (error) {
      throw new Error(`Failed to find matching subscriptions: ${error.message}`);
    }
  }

  async createAlertRecords({ subscriptions, incidentId, title, message }) {
    const prisma = getPrismaClient();
    try {
      return await prisma.alertRecord.createMany({
        data: subscriptions.map((sub) => ({
          subscriptionId: sub.id,
          incidentId,
          title,
          message,
          status: 'generated',
        })),
      });
    } catch (error) {
      throw new Error(`Failed to create alert records: ${error.message}`);
    }
  }
}

module.exports = new AlertRepository();