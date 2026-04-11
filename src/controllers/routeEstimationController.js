const routeEstimationService = require('../services/routeEstimationService');

class RouteEstimationController {
  async createRouteEstimation(req, res) {
    try {
      const {
        originName,
        originLatitude,
        originLongitude,
        destinationName,
        destinationLatitude,
        destinationLongitude,
        avoidCheckpoints,
        avoidAreas,
      } = req.body;

      const result = await routeEstimationService.createRouteEstimation({
        userId: req.user?.id || null,
        originName,
        originLatitude,
        originLongitude,
        destinationName,
        destinationLatitude,
        destinationLongitude,
        avoidCheckpoints,
        avoidAreas,
      });

      if (!result.success) {
        return res.status(400).json({
          status: 'error',
          message: result.error,
        });
      }

      return res.status(201).json({
        status: 'success',
        message: 'Route estimation created successfully',
        data: result.data,
      });
    } catch (error) {
      console.error('Error creating route estimation:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }
  }
}

module.exports = new RouteEstimationController();