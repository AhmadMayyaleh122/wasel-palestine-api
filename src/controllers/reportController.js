const reportService = require('../services/reportService');

class ReportController {
  async createReport(req, res) {
    try {
      const { categoryId, description, latitude, longitude } = req.body;

      const result = await reportService.createReport({
        submittedByUserId: req.user.id,
        categoryId,
        description,
        latitude,
        longitude,
      });

      if (!result.success) {
        return res.status(400).json({
          status: 'error',
          message: result.error,
        });
      }

      return res.status(201).json({
        status: 'success',
        message: 'Report submitted successfully',
        data: result.data,
      });
    } catch (error) {
      console.error('Error creating report:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }
  }

  async voteOnReport(req, res) {
    try {
      const { id } = req.params;
      const { voteType } = req.body;

      const result = await reportService.voteOnReport({
        reportId: id,
        userId: req.user.id,
        voteType,
      });

      if (!result.success) {
        return res.status(400).json({
          status: 'error',
          message: result.error,
        });
      }

      return res.status(201).json({
        status: 'success',
        message: 'Vote submitted successfully',
        data: result.data,
      });
    } catch (error) {
      console.error('Error voting on report:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }
  }
    async updateReportStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      const result = await reportService.updateReportStatus({
        reportId: id,
        moderatorUserId: req.user.id,
        status,
        notes,
      });

      if (!result.success) {
        return res.status(400).json({
          status: 'error',
          message: result.error,
        });
      }

      return res.status(200).json({
        status: 'success',
        message: 'Report status updated successfully',
        data: result.data,
      });
    } catch (error) {
      console.error('Error updating report status:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }
  }
  async getAllReports(req,res) {
    try {
      const result = await reportService.getAllReports();
      if(!result.success){
        return res.status(400).json({
          status: 'error',
          message: result.error,
        }); 
      }
      return res.status(200).json({
        status: 'success',
        data: result.data,
      });
    } catch (error) {
      console.error('Error fetching reports:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }
  }
  async getReportById(req,res) {
    try {
      const { id } = req.params;
      const result = await reportService.getReportById(id); 
      if(!result.success){
        return res.status(400).json({
          status: 'error',
          message: result.error,
        }); 
      }
      return res.status(200).json({
        status: 'success',
        data: result.data,
      });
    } catch (error) {
      console.error('Error fetching report:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }
  }
  
}

module.exports = new ReportController();