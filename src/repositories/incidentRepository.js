const { getPrismaClient } = require('../prisma/prismaClient');
const pool = require('../db/database');

class IncidentRepository {
  /**
   * Raw SQL: aggregate incident statistics by severity, status, and category.
   * Demonstrates raw query capability alongside Prisma ORM.
   */
  async getIncidentStats() {
    const bySeverityQuery = `
      SELECT severity, COUNT(*)::int AS count
      FROM incidents
      GROUP BY severity
      ORDER BY count DESC
    `;

    const byStatusQuery = `
      SELECT status, COUNT(*)::int AS count
      FROM incidents
      GROUP BY status
      ORDER BY count DESC
    `;

    const byCategoryQuery = `
      SELECT ic.label AS category, ic.code, COUNT(i.id)::int AS count
      FROM incident_categories ic
      LEFT JOIN incidents i ON i.category_id = ic.id
      GROUP BY ic.id, ic.label, ic.code
      ORDER BY count DESC
    `;

    const totalsQuery = `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'verified')::int AS verified,
        COUNT(*) FILTER (WHERE status = 'reported')::int AS reported,
        COUNT(*) FILTER (WHERE severity IN ('high', 'critical'))::int AS high_severity_active,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::int AS last_24h
      FROM incidents
    `;

    const [severityResult, statusResult, categoryResult, totalsResult] = await Promise.all([
      pool.query(bySeverityQuery),
      pool.query(byStatusQuery),
      pool.query(byCategoryQuery),
      pool.query(totalsQuery),
    ]);

    return {
      totals: totalsResult.rows[0],
      bySeverity: severityResult.rows,
      byStatus: statusResult.rows,
      byCategory: categoryResult.rows,
    };
  }

  /**
   * Get all incidents with filters, sorting, and pagination
   */
  async getAllIncidents(filters = {}, options = {}) {
    const prisma = getPrismaClient();

    const {
      status,
      severity,
      categoryId,
      checkpointId,
      sourceType,
      search,
    } = filters;

    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    const skip = (page - 1) * limit;

    // Build where clause
    const where = {};

    if (status) {
      where.status = status;
    }

    if (severity) {
      where.severity = severity;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (checkpointId) {
      where.checkpointId = checkpointId;
    }

    if (sourceType) {
      where.sourceType = sourceType;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    try {
      const [incidents, total] = await Promise.all([
        prisma.incident.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            checkpoint: {
              select: { id: true, name: true, latitude: true, longitude: true },
            },
            category: true,
            createdBy: {
              select: { id: true, fullName: true, email: true },
            },
          },
        }),
        prisma.incident.count({ where }),
      ]);

      return {
        data: incidents,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Failed to fetch incidents: ${error.message}`);
    }
  }

  /**
   * Get single incident by ID
   */
  async getIncidentById(incidentId) {
    const prisma = getPrismaClient();

    try {
      const incident = await prisma.incident.findUnique({
        where: { id: incidentId },
        include: {
          checkpoint: {
            select: { id: true, name: true, latitude: true, longitude: true, currentStatus: true },
          },
          category: true,
          createdBy: {
            select: { id: true, fullName: true, email: true, role: true },
          },
          alertRecords: {
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
          moderationActions: {
            include: {
              actor: { select: { id: true, fullName: true } },
            },
          },
        },
      });

      if (!incident) {
        throw new Error('Incident not found');
      }

      return incident;
    } catch (error) {
      throw new Error(`Failed to fetch incident: ${error.message}`);
    }
  }

  /**
   * Create new incident
   */
  async createIncident(data) {
    const prisma = getPrismaClient();

    try {
      const incident = await prisma.incident.create({
        data: {
          title: data.title,
          description: data.description,
          categoryId: data.categoryId,
          checkpointId: data.checkpointId,
          createdByUserId: data.createdByUserId,
          latitude: data.latitude,
          longitude: data.longitude,
          severity: data.severity || 'medium',
          status: data.status || 'reported',
          sourceType: data.sourceType || 'crowd',
          startsAt: data.startsAt || new Date(),
        },
        include: {
          checkpoint: true,
          category: true,
          createdBy: {
            select: { id: true, fullName: true, email: true },
          },
        },
      });

      return incident;
    } catch (error) {
      throw new Error(`Failed to create incident: ${error.message}`);
    }
  }

  /**
   * Update incident status
   */
  async updateIncidentStatus(incidentId, newStatus, userId, notes = null) {
    const prisma = getPrismaClient();

    try {
      const incident = await prisma.incident.update({
        where: { id: incidentId },
        data: {
          status: newStatus,
          verifiedAt: newStatus === 'verified' ? new Date() : undefined,
          closedAt: newStatus === 'closed' || newStatus === 'resolved' ? new Date() : undefined,
        },
        include: {
          checkpoint: true,
          category: true,
        },
      });

      // Record moderation action
      await prisma.moderationAction.create({
        data: {
          incidentId,
          actorUserId: userId,
          actionType: newStatus === 'verified' ? 'verify_incident' : 'close_incident',
          notes,
        },
      });

      return incident;
    } catch (error) {
      throw new Error(`Failed to update incident status: ${error.message}`);
    }
  }

  /**
   * Update incident details
   */
  async updateIncidentDetails(incidentId, data) {
    const prisma = getPrismaClient();

    try {
      const incident = await prisma.incident.update({
        where: { id: incidentId },
        data: {
          title: data.title,
          description: data.description,
          severity: data.severity,
          latitude: data.latitude,
          longitude: data.longitude,
          checkpointId: data.checkpointId,
        },
        include: {
          checkpoint: true,
          category: true,
        },
      });

      return incident;
    } catch (error) {
      throw new Error(`Failed to update incident: ${error.message}`);
    }
  }

  /**
   * Get incidents by checkpoint
   */
  async getIncidentsByCheckpoint(checkpointId, limit = 20) {
    const prisma = getPrismaClient();

    try {
      const incidents = await prisma.incident.findMany({
        where: {
          checkpointId,
          status: { not: 'closed' },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          category: true,
          createdBy: {
            select: { id: true, fullName: true },
          },
        },
      });

      return incidents;
    } catch (error) {
      throw new Error(`Failed to fetch incidents by checkpoint: ${error.message}`);
    }
  }

  /**
   * Get active incidents by category
   */
  async getIncidentsByCategory(categoryId, limit = 20) {
    const prisma = getPrismaClient();

    try {
      const incidents = await prisma.incident.findMany({
        where: {
          categoryId,
          status: { not: 'closed' },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          checkpoint: true,
          createdBy: {
            select: { id: true, fullName: true },
          },
        },
      });

      return incidents;
    } catch (error) {
      throw new Error(`Failed to fetch incidents by category: ${error.message}`);
    }
  }

  /**
   * Get high-severity incidents
   */
  async getHighSeverityIncidents(limit = 50) {
    const prisma = getPrismaClient();

    try {
      const incidents = await prisma.incident.findMany({
        where: {
          severity: { in: ['high', 'critical'] },
          status: { not: 'closed' },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          checkpoint: true,
          category: true,
        },
      });

      return incidents;
    } catch (error) {
      throw new Error(`Failed to fetch high-severity incidents: ${error.message}`);
    }
  }

  /**
   * Close incident
   */
  async closeIncident(incidentId, userId, notes = null) {
    const prisma = getPrismaClient();

    try {
      const incident = await prisma.incident.update({
        where: { id: incidentId },
        data: {
          status: 'closed',
          closedAt: new Date(),
          endsAt: new Date(),
        },
        include: {
          checkpoint: true,
          category: true,
        },
      });

      // Record moderation action
      await prisma.moderationAction.create({
        data: {
          incidentId,
          actorUserId: userId,
          actionType: 'close_incident',
          notes,
        },
      });

      return incident;
    } catch (error) {
      throw new Error(`Failed to close incident: ${error.message}`);
    }
  }

  /**
   * Verify incident
   */
  async verifyIncident(incidentId, userId, notes = null) {
    const prisma = getPrismaClient();

    try {
      const incident = await prisma.incident.update({
        where: { id: incidentId },
        data: {
          status: 'verified',
          verifiedAt: new Date(),
        },
        include: {
          checkpoint: true,
          category: true,
        },
      });

      // Record moderation action
      await prisma.moderationAction.create({
        data: {
          incidentId,
          actorUserId: userId,
          actionType: 'verify_incident',
          notes,
        },
      });

      return incident;
    } catch (error) {
      throw new Error(`Failed to verify incident: ${error.message}`);
    }
  }

  /**
   * Delete incident
   */
  async deleteIncident(incidentId) {
    const prisma = getPrismaClient();

    try {
      const incident = await prisma.incident.delete({
        where: { id: incidentId },
        include: {
          checkpoint: true,
          category: true,
          createdBy: {
            select: { id: true, fullName: true, email: true },
          },
        },
      });

      return incident;
    } catch (error) {
      throw new Error(`Failed to delete incident: ${error.message}`);
    }
  }
}

module.exports = new IncidentRepository();
