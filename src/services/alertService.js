const alertRepository = require('../repositories/alertRepository');

class AlertService {
  async createSubscription({ userId, categoryId, geofenceId, channel }) {
    try {
      if (!userId) {
        throw new Error('Authenticated user is required');
      }

      const parsedCategoryId =
        categoryId !== undefined && categoryId !== null && categoryId !== ''
          ? Number(categoryId)
          : null;

      const normalizedGeofenceId =
        geofenceId !== undefined && geofenceId !== null && String(geofenceId).trim() !== ''
          ? String(geofenceId).trim()
          : null;

      if (!parsedCategoryId && !normalizedGeofenceId) {
        throw new Error('At least one of categoryId or geofenceId is required');
      }

      if (parsedCategoryId !== null && Number.isNaN(parsedCategoryId)) {
        throw new Error('Category ID must be a valid number');
      }

      const normalizedChannel = channel ? String(channel).trim().toLowerCase() : 'in_app';

      const allowedChannels = ['in_app', 'email', 'sms_stub'];

      if (!allowedChannels.includes(normalizedChannel)) {
        throw new Error('Invalid alert channel');
      }

      const existingSubscription = await alertRepository.getDuplicateSubscription({
        userId,
        categoryId: parsedCategoryId,
        geofenceId: normalizedGeofenceId,
        channel: normalizedChannel,
      });

      if (existingSubscription) {
        throw new Error('A matching active subscription already exists');
      }

      const subscription = await alertRepository.createSubscription({
        userId,
        categoryId: parsedCategoryId,
        geofenceId: normalizedGeofenceId,
        channel: normalizedChannel,
      });

      return {
        success: true,
        data: subscription,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getUserSubscriptions(userId) {
    try {
      if (!userId) {
        throw new Error('Authenticated user is required');
      }

      const subscriptions = await alertRepository.getUserSubscriptions(userId);

      return {
        success: true,
        data: subscriptions,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = new AlertService();