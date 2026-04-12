const { getPrismaClient } = require('../prisma/prismaClient');

class ReportRepository {
  async createReport({
    submittedByUserId,
    categoryId,
    description,
    latitude,
    longitude,
    duplicateOfReportId = null,
  }) {
    const prisma = getPrismaClient();

    try {
      const report = await prisma.report.create({
        data: {
          submittedByUserId,
          categoryId,
          description,
          latitude,
          longitude,
          duplicateOfReportId,
        },
        include: {
          submittedBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
          category: true,
          duplicateOf: {
            select: {
              id: true,
              description: true,
              submittedAt: true,
            },
          },
        },
      });

      return report;
    } catch (error) {
      throw new Error(`Failed to create report: ${error.message}`);
    }
  }

  async getReportById(reportId) {
    const prisma = getPrismaClient();

    try {
      return await prisma.report.findUnique({
        where: { id: reportId },
      });
    } catch (error) {
      throw new Error(`Failed to fetch report: ${error.message}`);
    }
  }

  async getVoteByReportAndUser(reportId, userId) {
    const prisma = getPrismaClient();

    try {
      return await prisma.reportVote.findUnique({
        where: {
          reportId_userId: {
            reportId,
            userId,
          },
        },
      });
    } catch (error) {
      throw new Error(`Failed to fetch vote: ${error.message}`);
    }
  }

  async createVote({ reportId, userId, voteType }) {
    const prisma = getPrismaClient();

    try {
      const vote = await prisma.reportVote.create({
        data: {
          reportId,
          userId,
          voteType,
        },
        include: {
          report: {
            select: {
              id: true,
              description: true,
              status: true,
            },
          },
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });

      return vote;
    } catch (error) {
      throw new Error(`Failed to create vote: ${error.message}`);
    }
  }
    async findPotentialDuplicate({ categoryId, latitude, longitude, sinceDate }) {
    const prisma = getPrismaClient();

    try {
      const report = await prisma.report.findFirst({
        where: {
          categoryId,
          submittedAt: {
            gte: sinceDate,
          },
          latitude: {
            gte: latitude - 0.01,
            lte: latitude + 0.01,
          },
          longitude: {
            gte: longitude - 0.01,
            lte: longitude + 0.01,
          },
        },
        orderBy: {
          submittedAt: 'desc',
        },
      });

      return report;
    } catch (error) {
      throw new Error(`Failed to search for duplicate report: ${error.message}`);
    }
  }

  async createValidationCheck({ reportId, checkType, outcome, score, notes }) {
    const prisma = getPrismaClient();

    try {
      return await prisma.reportValidationCheck.create({
        data: {
          reportId,
          checkType,
          outcome,
          score,
          notes,
        },
      });
    } catch (error) {
      throw new Error(`Failed to create validation check: ${error.message}`);
    }
  }
    async updateReportStatus({ reportId, status }) {
    const prisma = getPrismaClient();

    try {
      return await prisma.report.update({
        where: { id: reportId },
        data: {
          status,
          reviewedAt: new Date(),
        },
        include: {
          submittedBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
          category: true,
          duplicateOf: {
            select: {
              id: true,
              description: true,
              submittedAt: true,
            },
          },
        },
      });
    } catch (error) {
      throw new Error(`Failed to update report status: ${error.message}`);
    }
  }

  async createModerationAction({ moderatorUserId, reportId, actionType, notes }) {
    const prisma = getPrismaClient();

    try {
      return await prisma.moderationAction.create({
        data: {
          actionType,
          notes: notes || null,
          actor: {
            connect: {
              id: moderatorUserId,
            },
          },
          report: {
            connect: {
              id: reportId,
            },
          },
        },
      });
    } catch (error) {
      throw new Error(`Failed to create moderation action: ${error.message}`);
    }
  }
  async getAllReports() {
    const prisma = getPrismaClient();

    try {
      return await prisma.report.findMany({
        include: {
          submittedBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
          category: true,
          duplicateOf: {
            select: {
              id: true,
              description: true,
              submittedAt: true,
            },
          },
        },
      });
    } catch (error) {
      throw new Error(`Failed to fetch all reports: ${error.message}`);
    }
  }

}

module.exports = new ReportRepository();