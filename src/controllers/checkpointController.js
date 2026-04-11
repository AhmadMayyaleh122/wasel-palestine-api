const checkpointService = require('../services/checkpointService');

class CheckpointController {
  /**
   * GET /api/v1/checkpoints
   * Get all checkpoints with filtering, pagination
   */
  async getAllCheckpoints(req, res) {
    try {
      const filters = {
        status: req.query.status,
        isActive: req.query.isActive !== 'false',
        areaId: req.query.areaId,
        search: req.query.search,
      };

      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        sortBy: req.query.sortBy || 'name',
        sortOrder: req.query.sortOrder || 'asc',
      };

      const result = await checkpointService.getAllCheckpoints(filters, options);

      if (!result.success) {
        return res.status(400).json({
          status: 'error',
          message: result.error,
        });
      }

      return res.status(200).json({
        status: 'success',
        message: 'Checkpoints retrieved successfully',
        data: result.data,
      });
    } catch (error) {
      console.error('Error fetching checkpoints:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }
  }

  /**
   * GET /api/v1/checkpoints/:id
   * Get single checkpoint
   */
  async getCheckpointById(req, res) {
    try {
      const { id } = req.params;

      const result = await checkpointService.getCheckpointById(id);

      if (!result.success) {
        return res.status(404).json({
          status: 'error',
          message: result.error,
        });
      }

      return res.status(200).json({
        status: 'success',
        message: 'Checkpoint retrieved successfully',
        data: result.data,
      });
    } catch (error) {
      console.error('Error fetching checkpoint:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }
  }

  /**
   * POST /api/v1/checkpoints
   * Create new checkpoint (admin/moderator only)
   */
  async createCheckpoint(req, res) {
    try {
      const { name, fullName, latitude, longitude, addressText, directionHint, externalCode, areaId, currentStatus } =
        req.body;

      const result = await checkpointService.createCheckpoint(
        {
          name: name || fullName,
          latitude,
          longitude,
          addressText,
          directionHint,
          externalCode,
          areaId,
          currentStatus,
        },
        req.user.id,
        req.user.role
      );

      if (!result.success) {
        return res.status(400).json({
          status: 'error',
          message: result.error,
        });
      }

      return res.status(201).json({
        status: 'success',
        message: result.message,
        data: result.data,
      });
    } catch (error) {
      console.error('Error creating checkpoint:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }
  }

  /**
   * PUT /api/v1/checkpoints/:id/status
   * Update checkpoint status
   */
  async updateCheckpointStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      const result = await checkpointService.updateCheckpointStatus(
        id,
        status,
        req.user.id,
        req.user.role,
        notes
      );

      if (!result.success) {
        return res.status(400).json({
          status: 'error',
          message: result.error,
        });
      }

      return res.status(200).json({
        status: 'success',
        message: result.message,
        data: result.data,
      });
    } catch (error) {
      console.error('Error updating checkpoint status:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }
  }

  /**
   * PUT /api/v1/checkpoints/:id
   * Update checkpoint details
   */
  async updateCheckpointDetails(req, res) {
    try {
      const { id } = req.params;
      const { name, addressText, directionHint, areaId, isActive } = req.body;

      const result = await checkpointService.updateCheckpointDetails(
        id,
        {
          name,
          addressText,
          directionHint,
          areaId,
          isActive,
        },
        req.user.role
      );

      if (!result.success) {
        return res.status(400).json({
          status: 'error',
          message: result.error,
        });
      }

      return res.status(200).json({
        status: 'success',
        message: result.message,
        data: result.data,
      });
    } catch (error) {
      console.error('Error updating checkpoint:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }
  }

  /**
   * GET /api/v1/checkpoints/:id/status-history
   * Get checkpoint status history
   */
  async getStatusHistory(req, res) {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit) || 50;

      const result = await checkpointService.getCheckpointStatusHistory(id, limit);

      if (!result.success) {
        return res.status(404).json({
          status: 'error',
          message: result.error,
        });
      }

      return res.status(200).json({
        status: 'success',
        message: 'Status history retrieved successfully',
        data: result.data,
      });
    } catch (error) {
      console.error('Error fetching status history:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }
  }

  /**
   * GET /api/v1/areas/:areaId/checkpoints
   * Get checkpoints by area
   */
  async getCheckpointsByArea(req, res) {
    try {
      const { areaId } = req.params;

      const result = await checkpointService.getCheckpointsByArea(areaId);

      if (!result.success) {
        return res.status(404).json({
          status: 'error',
          message: result.error,
        });
      }

      return res.status(200).json({
        status: 'success',
        message: 'Checkpoints retrieved successfully',
        data: result.data,
      });
    } catch (error) {
      console.error('Error fetching checkpoints by area:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }
  }

  /**
   * DELETE /api/v1/checkpoints/:id
   * Deactivate checkpoint (admin only)
   */
  async deactivateCheckpoint(req, res) {
    try {
      const { id } = req.params;

      const result = await checkpointService.deactivateCheckpoint(id, req.user.role);

      if (!result.success) {
        return res.status(400).json({
          status: 'error',
          message: result.error,
        });
      }

      return res.status(200).json({
        status: 'success',
        message: result.message,
        data: result.data,
      });
    } catch (error) {
      console.error('Error deactivating checkpoint:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }
  }
}

module.exports = new CheckpointController();
