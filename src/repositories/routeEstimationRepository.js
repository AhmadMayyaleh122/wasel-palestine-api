const { getPrismaClient } = require('../prisma/prismaClient');

class RouteEstimationRepository {
  async createRouteEstimation({
    userId,
    originName,
    originLatitude,
    originLongitude,
    destinationName,
    destinationLatitude,
    destinationLongitude,
    baseDistanceKm,
    adjustedDistanceKm,
    baseDurationMinutes,
    adjustedDurationMinutes,
    riskScore,
    providerName,
    routeSummary,
  }) {
    const prisma = getPrismaClient();

    try {
      return await prisma.routeEstimation.create({
        data: {
          userId,
          originName,
          originLatitude,
          originLongitude,
          destinationName,
          destinationLatitude,
          destinationLongitude,
          baseDistanceKm,
          adjustedDistanceKm,
          baseDurationMinutes,
          adjustedDurationMinutes,
          riskScore,
          providerName,
          routeSummary,
        },
      });
    } catch (error) {
      throw new Error(`Failed to create route estimation: ${error.message}`);
    }
  }

  async createRouteFactors(routeEstimationId, factors) {
    const prisma = getPrismaClient();

    try {
      if (!factors || !factors.length) {
        return [];
      }

      const createdFactors = [];

      for (const factor of factors) {
        const created = await prisma.routeFactors.create({
          data: {
            routeEstimationId,
            factorType: factor.factorType,
            referenceId: factor.referenceId || null,
            weightValue: factor.weightValue,
            description: factor.description || null,
          },
        });

        createdFactors.push(created);
      }

      return createdFactors;
    } catch (error) {
      throw new Error(`Failed to create route factors: ${error.message}`);
    }
  }

  async getRouteEstimationById(id) {
    const prisma = getPrismaClient();

    try {
      return await prisma.routeEstimation.findUnique({
        where: { id },
        include: {
          factors: true,
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
        },
      });
    } catch (error) {
      throw new Error(`Failed to fetch route estimation: ${error.message}`);
    }
  }
}

module.exports = new RouteEstimationRepository();