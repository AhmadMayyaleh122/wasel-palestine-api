const alertService = require('../services/alertService');

class AlertController {
  async createSubscription(req, res) {
    try {
      const { categoryId, geofenceId, channel } = req.body;

      const result = await alertService.createSubscription({
        userId: req.user.id,
        categoryId,
        geofenceId,
        channel,
      });

      if (!result.success) {
        return res.status(400).json({
          status: 'error',
          message: result.error,
        });
      }

      return res.status(201).json({
        status: 'success',
        message: 'Alert subscription created successfully',
        data: result.data,
      });
    } catch (error) {
      console.error('Error creating alert subscription:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }
  }

  async getMySubscriptions(req, res) {
    try {
      const result = await alertService.getUserSubscriptions(req.user.id);

      if (!result.success) {
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
      console.error('Error fetching alert subscriptions:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }
  }
}

module.exports = new AlertController();