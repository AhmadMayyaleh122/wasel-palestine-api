const checkpointRepository = require('../repositories/checkpointRepository');

class CheckpointService {
  /**
   * Get all checkpoints with validation
   */
  async getAllCheckpoints(filters = {}, options = {}) {
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

      const result = await checkpointRepository.getAllCheckpoints(filters, options);
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
   * Get single checkpoint by ID
   */
  async getCheckpointById(checkpointId) {
    try {
      if (!checkpointId) {
        throw new Error('Checkpoint ID is required');
      }

      const checkpoint = await checkpointRepository.getCheckpointById(checkpointId);
      return {
        success: true,
        data: checkpoint,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create new checkpoint (admin/moderator only)
   */
  async createCheckpoint(data, userId, userRole) {
    try {
      // Authorization check
      if (!['admin', 'moderator'].includes(userRole)) {
        throw new Error('Only admins and moderators can create checkpoints');
      }

      // Validation
      if (!data.name || !data.name.trim()) {
        throw new Error('Checkpoint name is required');
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

      if (lat < -90 || lat > 90) {
        throw new Error('Latitude must be between -90 and 90');
      }

      if (lon < -180 || lon > 180) {
        throw new Error('Longitude must be between -180 and 180');
      }

      if (!data.addressText || !data.addressText.trim()) {
        throw new Error('Address text is required');
      }

      const checkpoint = await checkpointRepository.createCheckpoint({
        name: data.name.trim(),
        latitude: lat,
        longitude: lon,
        addressText: data.addressText.trim(),
        directionHint: data.directionHint?.trim() || null,
        externalCode: data.externalCode?.trim() || null,
        areaId: data.areaId || null,
        currentStatus: data.currentStatus || 'unknown',
        isActive: true,
      });

      return {
        success: true,
        message: 'Checkpoint created successfully',
        data: checkpoint,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Update checkpoint status (admin/moderator only)
   */
  async updateCheckpointStatus(checkpointId, newStatus, userId, userRole, notes = null) {
    try {
      // Authorization check
      if (!['admin', 'moderator'].includes(userRole)) {
        throw new Error('Only admins and moderators can update checkpoints');
      }

      if (!checkpointId) {
        throw new Error('Checkpoint ID is required');
      }

      if (!newStatus) {
        throw new Error('New status is required');
      }

      const validStatuses = ['open', 'delayed', 'partially_closed', 'closed', 'unknown'];
      if (!validStatuses.includes(newStatus)) {
        throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }

      // Verify checkpoint exists
      await checkpointRepository.getCheckpointById(checkpointId);

      const checkpoint = await checkpointRepository.updateCheckpointStatus(
        checkpointId,
        newStatus,
        userId,
        notes
      );

      return {
        success: true,
        message: 'Checkpoint status updated successfully',
        data: checkpoint,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Update checkpoint details (admin/moderator only)
   */
  async updateCheckpointDetails(checkpointId, data, userRole) {
    try {
      // Authorization check
      if (!['admin', 'moderator'].includes(userRole)) {
        throw new Error('Only admins and moderators can update checkpoints');
      }

      if (!checkpointId) {
        throw new Error('Checkpoint ID is required');
      }

      // Verify checkpoint exists
      await checkpointRepository.getCheckpointById(checkpointId);

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

      const checkpoint = await checkpointRepository.updateCheckpointDetails(checkpointId, {
        name: data.name?.trim() || undefined,
        addressText: data.addressText?.trim() || undefined,
        directionHint: data.directionHint?.trim() || undefined,
        areaId: data.areaId || undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
      });

      return {
        success: true,
        message: 'Checkpoint updated successfully',
        data: checkpoint,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get checkpoint status history
   */
  async getCheckpointStatusHistory(checkpointId, limit = 50) {
    try {
      if (!checkpointId) {
        throw new Error('Checkpoint ID is required');
      }

      const history = await checkpointRepository.getCheckpointStatusHistory(checkpointId, limit);
      return {
        success: true,
        data: history,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get checkpoints by area
   */
  async getCheckpointsByArea(areaId) {
    try {
      if (!areaId) {
        throw new Error('Area ID is required');
      }

      const checkpoints = await checkpointRepository.getCheckpointsByArea(areaId);
      return {
        success: true,
        data: checkpoints,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Deactivate checkpoint (admin only)
   */
  async deactivateCheckpoint(checkpointId, userRole) {
    try {
      if (userRole !== 'admin') {
        throw new Error('Only admins can deactivate checkpoints');
      }

      if (!checkpointId) {
        throw new Error('Checkpoint ID is required');
      }

      // Verify checkpoint exists
      await checkpointRepository.getCheckpointById(checkpointId);

      const checkpoint = await checkpointRepository.deactivateCheckpoint(checkpointId);
      return {
        success: true,
        message: 'Checkpoint deactivated successfully',
        data: checkpoint,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = new CheckpointService();
