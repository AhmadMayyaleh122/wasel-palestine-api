const incidentService = require('../services/incidentService');

class IncidentController {
  /**
   * GET /api/v1/incidents
   * Get all incidents with filtering
   */
  async getAllIncidents(req, res) {
    try {
      const filters = {
        status: req.query.status,
        severity: req.query.severity,
        categoryId: req.query.categoryId ? parseInt(req.query.categoryId) : undefined,
        checkpointId: req.query.checkpointId,
        sourceType: req.query.sourceType,
        search: req.query.search,
      };

      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'desc',
      };

      const result = await incidentService.getAllIncidents(filters, options);

      if (!result.success) {
        return res.status(400).json({
          status: 'error',
          message: result.error,
        });
      }

      return res.status(200).json({
        status: 'success',
        message: 'Incidents retrieved successfully',
        data: result.data,
      });
    } catch (error) {
      console.error('Error fetching incidents:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }
  }

  /**
   * GET /api/v1/incidents/:id
   * Get single incident
   */
  async getIncidentById(req, res) {
    try {
      const { id } = req.params;

      const result = await incidentService.getIncidentById(id);

      if (!result.success) {
        return res.status(404).json({
          status: 'error',
          message: result.error,
        });
      }

      return res.status(200).json({
        status: 'success',
        message: 'Incident retrieved successfully',
        data: result.data,
      });
    } catch (error) {
      console.error('Error fetching incident:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }
  }

  /**
   * POST /api/v1/incidents
   * Create new incident
   */
  async createIncident(req, res) {
    try {
      const { title, description, categoryId, checkpointId, latitude, longitude, severity, startsAt } = req.body;

      const result = await incidentService.createIncident(
        {
          title,
          description,
          categoryId,
          checkpointId,
          latitude,
          longitude,
          severity,
          startsAt,
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
      console.error('Error creating incident:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }
  }

  /**
   * PUT /api/v1/incidents/:id/status
   * Update incident status
   */
  async updateIncidentStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      const result = await incidentService.updateIncidentStatus(id, status, req.user.id, req.user.role, notes);

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
      console.error('Error updating incident status:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }
  }

  /**
   * PUT /api/v1/incidents/:id
   * Update incident details
   */
  async updateIncidentDetails(req, res) {
    try {
      const { id } = req.params;
      const { title, description, severity, latitude, longitude, checkpointId } = req.body;

      const result = await incidentService.updateIncidentDetails(
        id,
        {
          title,
          description,
          severity,
          latitude,
          longitude,
          checkpointId,
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
      console.error('Error updating incident:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }
  }

  /**
   * POST /api/v1/incidents/:id/verify
   * Verify incident
   */
  async verifyIncident(req, res) {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const result = await incidentService.verifyIncident(id, req.user.id, req.user.role, notes);

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
      console.error('Error verifying incident:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }
  }

  /**
   * POST /api/v1/incidents/:id/close
   * Close incident
   */
  async closeIncident(req, res) {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const result = await incidentService.closeIncident(id, req.user.id, req.user.role, notes);

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
      console.error('Error closing incident:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }
  }

  /**
   * GET /api/v1/checkpoints/:checkpointId/incidents
   * Get incidents by checkpoint
   */
  async getIncidentsByCheckpoint(req, res) {
    try {
      const { checkpointId } = req.params;
      const limit = parseInt(req.query.limit) || 20;

      const result = await incidentService.getIncidentsByCheckpoint(checkpointId, limit);

      if (!result.success) {
        return res.status(404).json({
          status: 'error',
          message: result.error,
        });
      }

      return res.status(200).json({
        status: 'success',
        message: 'Incidents retrieved successfully',
        data: result.data,
      });
    } catch (error) {
      console.error('Error fetching incidents by checkpoint:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }
  }

  /**
   * GET /api/v1/categories/:categoryId/incidents
   * Get incidents by category
   */
  async getIncidentsByCategory(req, res) {
    try {
      const { categoryId } = req.params;
      const limit = parseInt(req.query.limit) || 20;

      const result = await incidentService.getIncidentsByCategory(categoryId, limit);

      if (!result.success) {
        return res.status(404).json({
          status: 'error',
          message: result.error,
        });
      }

      return res.status(200).json({
        status: 'success',
        message: 'Incidents retrieved successfully',
        data: result.data,
      });
    } catch (error) {
      console.error('Error fetching incidents by category:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }
  }

  /**
   * GET /api/v1/incidents/high-severity
   * Get high severity incidents
   */
  async getHighSeverityIncidents(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 50;

      const result = await incidentService.getHighSeverityIncidents(limit);

      if (!result.success) {
        return res.status(400).json({
          status: 'error',
          message: result.error,
        });
      }

      return res.status(200).json({
        status: 'success',
        message: 'High severity incidents retrieved successfully',
        data: result.data,
      });
    } catch (error) {
      console.error('Error fetching high severity incidents:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }
  }
}

module.exports = new IncidentController();
