const { getPrismaClient } = require('../prisma/prismaClient');

class CheckpointRepository {
  /**
   * Get all checkpoints with filters, sorting, and pagination
   */
  async getAllCheckpoints(filters = {}, options = {}) {
    const prisma = getPrismaClient();
    
    const {
      status,
      isActive = true,
      areaId,
      search,
    } = filters;

    const {
      page = 1,
      limit = 20,
      sortBy = 'name',
      sortOrder = 'asc',
    } = options;

    const skip = (page - 1) * limit;

    // Build where clause
    const where = {
      isActive,
    };

    if (status) {
      where.currentStatus = status;
    }

    if (areaId) {
      where.areaId = areaId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { addressText: { contains: search, mode: 'insensitive' } },
        { externalCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    try {
      const [checkpoints, total] = await Promise.all([
        prisma.checkpoint.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            area: true,
            statusHistory: {
              orderBy: { changedAt: 'desc' },
              take: 5,
            },
          },
        }),
        prisma.checkpoint.count({ where }),
      ]);

      return {
        data: checkpoints,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Failed to fetch checkpoints: ${error.message}`);
    }
  }

  /**
   * Get single checkpoint by ID
   */
  async getCheckpointById(checkpointId) {
    const prisma = getPrismaClient();

    try {
      const checkpoint = await prisma.checkpoint.findUnique({
        where: { id: checkpointId },
        include: {
          area: true,
          statusHistory: {
            orderBy: { changedAt: 'desc' },
          },
          incidents: {
            where: { status: { not: 'closed' } },
            take: 10,
          },
        },
      });

      if (!checkpoint) {
        throw new Error('Checkpoint not found');
      }

      return checkpoint;
    } catch (error) {
      throw new Error(`Failed to fetch checkpoint: ${error.message}`);
    }
  }

  /**
   * Create new checkpoint
   */
  async createCheckpoint(data) {
    const prisma = getPrismaClient();

    try {
      const checkpoint = await prisma.checkpoint.create({
        data: {
          name: data.name,
          externalCode: data.externalCode,
          latitude: data.latitude,
          longitude: data.longitude,
          addressText: data.addressText,
          directionHint: data.directionHint,
          areaId: data.areaId,
          currentStatus: data.currentStatus || 'unknown',
          isActive: data.isActive !== false,
        },
        include: {
          area: true,
        },
      });

      return checkpoint;
    } catch (error) {
      throw new Error(`Failed to create checkpoint: ${error.message}`);
    }
  }

  /**
   * Update checkpoint status
   */
  async updateCheckpointStatus(checkpointId, newStatus, userId, notes = null) {
    const prisma = getPrismaClient();

    try {
      // Update checkpoint current status
      const checkpoint = await prisma.checkpoint.update({
        where: { id: checkpointId },
        data: { currentStatus: newStatus },
        include: { area: true },
      });

      // Record status change in history
      await prisma.checkpointStatusHistory.create({
        data: {
          checkpointId,
          status: newStatus,
          notes,
          changedByUserId: userId,
        },
      });

      return checkpoint;
    } catch (error) {
      throw new Error(`Failed to update checkpoint status: ${error.message}`);
    }
  }

  /**
   * Update checkpoint details
   */
  async updateCheckpointDetails(checkpointId, data) {
    const prisma = getPrismaClient();

    try {
      const checkpoint = await prisma.checkpoint.update({
        where: { id: checkpointId },
        data: {
          name: data.name,
          addressText: data.addressText,
          directionHint: data.directionHint,
          areaId: data.areaId,
          isActive: data.isActive,
        },
        include: { area: true },
      });

      return checkpoint;
    } catch (error) {
      throw new Error(`Failed to update checkpoint: ${error.message}`);
    }
  }

  /**
   * Get checkpoint status history
   */
  async getCheckpointStatusHistory(checkpointId, limit = 50) {
    const prisma = getPrismaClient();

    try {
      const history = await prisma.checkpointStatusHistory.findMany({
        where: { checkpointId },
        orderBy: { changedAt: 'desc' },
        take: limit,
        include: {
          changedBy: {
            select: { id: true, fullName: true, email: true },
          },
        },
      });

      return history;
    } catch (error) {
      throw new Error(`Failed to fetch status history: ${error.message}`);
    }
  }

  /**
   * Get checkpoints by area
   */
  async getCheckpointsByArea(areaId) {
    const prisma = getPrismaClient();

    try {
      const checkpoints = await prisma.checkpoint.findMany({
        where: {
          areaId,
          isActive: true,
        },
        include: {
          statusHistory: {
            orderBy: { changedAt: 'desc' },
            take: 1,
          },
        },
      });

      return checkpoints;
    } catch (error) {
      throw new Error(`Failed to fetch checkpoints by area: ${error.message}`);
    }
  }

  /**
   * Deactivate checkpoint
   */
  async deactivateCheckpoint(checkpointId) {
    const prisma = getPrismaClient();

    try {
      const checkpoint = await prisma.checkpoint.update({
        where: { id: checkpointId },
        data: { isActive: false },
      });

      return checkpoint;
    } catch (error) {
      throw new Error(`Failed to deactivate checkpoint: ${error.message}`);
    }
  }
}

module.exports = new CheckpointRepository();
