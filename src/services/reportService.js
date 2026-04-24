const reportRepository = require('../repositories/reportRepository');

class ReportService {
  /**
   * Create a new crowdsourced report
   */
  async createReport({
    submittedByUserId,
    categoryId,
    description,
    latitude,
    longitude,
  }) {
    try {
      if (!submittedByUserId) {
        throw new Error('Authenticated user is required');
      }

      if (!categoryId) {
        throw new Error('Category ID is required');
      }

      if (!description || !description.trim()) {
        throw new Error('Description is required');
      }

      if (latitude === undefined || latitude === null) {
        throw new Error('Latitude is required');
      }

      if (longitude === undefined || longitude === null) {
        throw new Error('Longitude is required');
      }

      const parsedLatitude = Number(latitude);
      const parsedLongitude = Number(longitude);
      const parsedCategoryId = Number(categoryId);

      if (Number.isNaN(parsedLatitude) || parsedLatitude < -90 || parsedLatitude > 90) {
        throw new Error('Latitude must be a valid number between -90 and 90');
      }

      if (Number.isNaN(parsedLongitude) || parsedLongitude < -180 || parsedLongitude > 180) {
        throw new Error('Longitude must be a valid number between -180 and 180');
      }

      if (Number.isNaN(parsedCategoryId)) {
        throw new Error('Category ID must be a valid number');
      }

            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      const potentialDuplicate = await reportRepository.findPotentialDuplicate({
        categoryId: parsedCategoryId,
        latitude: parsedLatitude,
        longitude: parsedLongitude,
        sinceDate: oneHourAgo,
      });

      const report = await reportRepository.createReport({
        submittedByUserId,
        categoryId: parsedCategoryId,
        description: description.trim(),
        latitude: parsedLatitude,
        longitude: parsedLongitude,
        duplicateOfReportId: potentialDuplicate ? potentialDuplicate.id : null,
      });

      await reportRepository.createValidationCheck({
        reportId: report.id,
        checkType: 'duplicate_proximity',
        outcome: potentialDuplicate ? 'warn' : 'pass',
        score: potentialDuplicate ? 0.8 : 0.0,
        notes: potentialDuplicate
          ? `Potential duplicate of report ${potentialDuplicate.id}`
          : 'No nearby duplicate found within the last 60 minutes',
      });

      return {
        success: true,
        data: report,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
    async voteOnReport({ reportId, userId, voteType }) {
    try {
      if (!reportId) {
        throw new Error('Report ID is required');
      }

      if (!userId) {
        throw new Error('Authenticated user is required');
      }

      if (!voteType) {
        throw new Error('Vote type is required');
      }

      const normalizedVoteType = String(voteType).trim().toLowerCase();

      if (!['confirm', 'deny'].includes(normalizedVoteType)) {
        throw new Error('Vote type must be either confirm or deny');
      }

      const reportExists = await reportRepository.getReportById(reportId);

      if (!reportExists) {
        throw new Error('Report not found');
      }

      const existingVote = await reportRepository.getVoteByReportAndUser(reportId, userId);

      if (existingVote) {
        throw new Error('You have already voted on this report');
      }

      const vote = await reportRepository.createVote({
        reportId,
        userId,
        voteType: normalizedVoteType,
      });

      return {
        success: true,
        data: vote,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
  async updateReportStatus({ reportId, moderatorUserId, status, notes }) {
    try {
      if (!reportId) {
        throw new Error('Report ID is required');
      }

      if (!moderatorUserId) {
        throw new Error('Moderator user is required');
      }

      if (!status) {
        throw new Error('Status is required');
      }

      const normalizedStatus = String(status).trim().toLowerCase();

      const allowedStatuses = ['under_review', 'verified', 'rejected', 'spam','merged'];

      if (!allowedStatuses.includes(normalizedStatus)) {
        throw new Error('Invalid report status');
      }

      const existingReport = await reportRepository.getReportById(reportId);

      if (!existingReport) {
        throw new Error('Report not found');
      }

      const updatedReport = await reportRepository.updateReportStatus({
        reportId,
        status: normalizedStatus,
      });

      let actionType;

      switch (normalizedStatus) {
        case 'under_review':
          actionType = 'review_started';
          break;
        case 'verified':
          actionType = 'verify_report';
          break;
        case 'rejected':
          actionType = 'reject_report';
          break;
        case 'spam':
          actionType = 'reject_report';
          break;
        case 'merged':
          actionType = 'merge_report';
          break;
        default:
          throw new Error('Unsupported moderation action type');
      }

      await reportRepository.createModerationAction({
        moderatorUserId,
        reportId,
        actionType,
        notes: notes || `Report marked as ${normalizedStatus}`,
      });

      return {
        success: true,
        data: updatedReport,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
  async getAllReports({ page, limit, status } = {}) {
    try {
      const parsedPage = Math.max(1, parseInt(page) || 1);
      const parsedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));
      const result = await reportRepository.getAllReports({ page: parsedPage, limit: parsedLimit, status });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  async getReportById(reportId) {
    try {
      if (!reportId) {
        throw new Error('Report ID is required');
      }
      const report = await reportRepository.getReportById(reportId);

      if (!report) {
        throw new Error('Report not found');
      } 
      return {
        success: true,
        data: report,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    } 
  }
}

module.exports = new ReportService();