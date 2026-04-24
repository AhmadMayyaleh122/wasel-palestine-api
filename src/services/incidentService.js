const incidentRepository = require('../repositories/incidentRepository');
const alertRepository = require('../repositories/alertRepository');
const { getPrismaClient } = require('../prisma/prismaClient');

class IncidentService {
  /**
   * Get all incidents with validation
   */
  async getAllIncidents(filters = {}, options = {}) {
    try {
      // Validate pagination
      if (options.page && options.page < 1) {
        throw new Error('Page must be greater than 0');
      }
      if (options.limit && (options.limit < 1 || options.limit > 100)) {
        throw new Error('Limit must be between 1 and 100');
      }

      // Validate sort order
      if (options.sortOrder && !['asc', 'desc'].includes(options.sortOrder)) {
        throw new Error('Sort order must be "asc" or "desc"');
      }

      const result = await incidentRepository.getAllIncidents(filters, options);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get single incident by ID
   */
  async getIncidentById(incidentId) {
    try {
      if (!incidentId) {
        throw new Error('Incident ID is required');
      }

      const incident = await incidentRepository.getIncidentById(incidentId);
      return {
        success: true,
        data: incident,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create new incident and derive source metadata from the caller role
   */
  async createIncident(data, userId, userRole) {
    try {
      // Validation
      if (!data.title || !data.title.trim()) {
        throw new Error('Incident title is required');
      }

      if (!data.description || !data.description.trim()) {
        throw new Error('Incident description is required');
      }

      if (!data.categoryId) {
        throw new Error('Category ID is required');
      }

      if (!data.latitude || !data.longitude) {
        throw new Error('Latitude and longitude are required');
      }

      // Validate coordinates
      const lat = parseFloat(data.latitude);
      const lon = parseFloat(data.longitude);

      if (isNaN(lat) || isNaN(lon)) {
        throw new Error('Invalid latitude or longitude');
      }

      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        throw new Error('Invalid coordinates');
      }

      // Verify category exists
      const prisma = getPrismaClient();
      const category = await prisma.incidentCategory.findUnique({
        where: { id: data.categoryId },
      });

      if (!category) {
        throw new Error('Invalid category ID');
      }

      if(data.checkpointId) {
        const checkpoint = await prisma.checkpoint.findUnique({
          where: { id: data.checkpointId },
        });
        if (!checkpoint) {
          throw new Error('Invalid checkpoint ID');
        }
      }

      // Validate severity if provided
      if (data.severity) {
        const validSeverities = ['low', 'medium', 'high', 'critical'];
        if (!validSeverities.includes(data.severity)) {
          throw new Error(`Invalid severity. Must be one of: ${validSeverities.join(', ')}`);
        }
      }

      const incident = await incidentRepository.createIncident({
        title: data.title.trim(),
        description: data.description.trim(),
        categoryId: data.categoryId,
        checkpointId: data.checkpointId || null,
        createdByUserId: userId,
        latitude: lat,
        longitude: lon,
        severity: data.severity || 'medium',
        status: ['admin', 'moderator'].includes(userRole) ? 'verified' : 'reported',
        sourceType: ['admin', 'moderator'].includes(userRole) ? 'moderator' : 'crowd',
        startsAt: data.startsAt || new Date(),
      });

      return {
        success: true,
        message: 'Incident created successfully',
        data: incident,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Update incident status
   */
  async updateIncidentStatus(incidentId, newStatus, userId, notes = null) {
    try {
      if (!incidentId) {
        throw new Error('Incident ID is required');
      }

      if (!newStatus) {
        throw new Error('New status is required');
      }

      const validStatuses = ['reported', 'verified', 'monitoring', 'resolved', 'closed', 'rejected'];
      if (!validStatuses.includes(newStatus)) {
        throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }

      // Verify incident exists
      await incidentRepository.getIncidentById(incidentId);

      const incident = await incidentRepository.updateIncidentStatus(
        incidentId,
        newStatus,
        userId,
        notes
      );

      return {
        success: true,
        message: 'Incident status updated successfully',
        data: incident,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Verify incident
   */
  async verifyIncident(incidentId, userId, notes = null) {
    try {
      if (!incidentId) {
        throw new Error('Incident ID is required');
      }

      // Verify incident exists
      await incidentRepository.getIncidentById(incidentId);

      const incident = await incidentRepository.verifyIncident(incidentId, userId, notes);

      // Trigger alerts for matching subscriptions
      try {
        const subscriptions = await alertRepository.findMatchingSubscriptions({
          categoryId: incident.categoryId,        });
        if (subscriptions.length > 0) {
          await alertRepository.createAlertRecords({
            subscriptions,
            incidentId: incident.id,
            title: `New verified incident: ${incident.title}`,
            message: incident.description,
          });
        }
      } catch (alertError) {
        console.error('Alert triggering failed:', alertError);
      }

      return {
        success: true,
        message: 'Incident verified successfully',
        data: incident,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Close incident
   */
  async closeIncident(incidentId, userId, notes = null) {
    try {
      if (!incidentId) {
        throw new Error('Incident ID is required');
      }

      // Verify incident exists
      await incidentRepository.getIncidentById(incidentId);

      const incident = await incidentRepository.closeIncident(incidentId, userId, notes);

      return {
        success: true,
        message: 'Incident closed successfully',
        data: incident,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get incidents by checkpoint
   */
  async getIncidentsByCheckpoint(checkpointId, limit = 20) {
    try {
      if (!checkpointId) {
        throw new Error('Checkpoint ID is required');
      }

      const incidents = await incidentRepository.getIncidentsByCheckpoint(checkpointId, limit);
      return {
        success: true,
        data: incidents,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get high severity incidents
   */
  async getHighSeverityIncidents(limit = 50) {
    try {
      const incidents = await incidentRepository.getHighSeverityIncidents(limit);
      return {
        success: true,
        data: incidents,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get incidents by category
   */
  async getIncidentsByCategory(categoryId, limit = 20) {
    try {
      if (!categoryId) {
        throw new Error('Category ID is required');
      }

      const incidents = await incidentRepository.getIncidentsByCategory(categoryId, limit);
      return {
        success: true,
        data: incidents,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Update incident details
   */
  async updateIncidentDetails(incidentId, data) {
    try {
      if (!incidentId) {
        throw new Error('Incident ID is required');
      }

      // Verify incident exists
      await incidentRepository.getIncidentById(incidentId);

      // Validate coordinates if provided
      if (data.latitude !== undefined || data.longitude !== undefined) {
        const lat = parseFloat(data.latitude);
        const lon = parseFloat(data.longitude);

        if (isNaN(lat) || isNaN(lon)) {
          throw new Error('Invalid latitude or longitude');
        }

        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
          throw new Error('Invalid coordinates');
        }
      }

      const incident = await incidentRepository.updateIncidentDetails(incidentId, {
        title: data.title?.trim() || undefined,
        description: data.description?.trim() || undefined,
        severity: data.severity || undefined,
        latitude: data.latitude || undefined,
        longitude: data.longitude || undefined,
        checkpointId: data.checkpointId || undefined,
      });

      return {
        success: true,
        message: 'Incident updated successfully',
        data: incident,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get incident statistics (raw SQL aggregations)
   */
  async getIncidentStats() {
    try {
      const stats = await incidentRepository.getIncidentStats();
      return { success: true, data: stats };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete incident
   */
  async deleteIncident(incidentId) {
    try {
      if (!incidentId) {
        throw new Error('Incident ID is required');
      }

      // Verify incident exists
      await incidentRepository.getIncidentById(incidentId);

      const incident = await incidentRepository.deleteIncident(incidentId);

      return {
        success: true,
        message: 'Incident deleted successfully',
        data: incident,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = new IncidentService();
