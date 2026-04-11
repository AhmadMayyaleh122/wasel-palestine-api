const routeEstimationRepository = require('../repositories/routeEstimationRepository');

class RouteEstimationService {
  toRadians(degrees) {
    return (degrees * Math.PI) / 180;
  }

  calculateDistanceKm(lat1, lon1, lat2, lon2) {
    const earthRadiusKm = 6371;
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
  }

  buildHeuristicEstimate({
    originName,
    originLatitude,
    originLongitude,
    destinationName,
    destinationLatitude,
    destinationLongitude,
    avoidCheckpoints,
    avoidAreas,
  }) {
    const baseDistanceKmRaw = this.calculateDistanceKm(
      originLatitude,
      originLongitude,
      destinationLatitude,
      destinationLongitude
    );

    const baseDistanceKm = Number(baseDistanceKmRaw.toFixed(2));
    const baseDurationMinutes = Math.max(1, Math.round((baseDistanceKm / 45) * 60));

    let adjustedDistanceKm = baseDistanceKm;
    let adjustedDurationMinutes = baseDurationMinutes;
    let riskScore = 0;

    const factors = [];

    adjustedDurationMinutes += 8;
    riskScore += 1.5;
    factors.push({
      factorType: 'congestion',
      weightValue: 8,
      description: 'Baseline urban congestion penalty applied',
    });

    if (avoidCheckpoints) {
      adjustedDistanceKm = Number((adjustedDistanceKm + 3).toFixed(2));
      adjustedDurationMinutes += 12;
      riskScore += 2;
      factors.push({
        factorType: 'user_constraint',
        weightValue: 12,
        description: 'Route adjusted to avoid checkpoints',
      });
    }

    if (Array.isArray(avoidAreas) && avoidAreas.length > 0) {
      const areaPenalty = avoidAreas.length * 5;
      adjustedDistanceKm = Number((adjustedDistanceKm + avoidAreas.length * 1.5).toFixed(2));
      adjustedDurationMinutes += areaPenalty;
      riskScore += avoidAreas.length * 1.2;
      factors.push({
        factorType: 'area_restriction',
        weightValue: areaPenalty,
        description: `Route adjusted to avoid ${avoidAreas.length} area(s)`,
      });
    }

    return {
      providerName: 'internal_heuristic',
      baseDistanceKm,
      adjustedDistanceKm,
      baseDurationMinutes,
      adjustedDurationMinutes,
      riskScore: Number(riskScore.toFixed(2)),
      routeSummary: {
        heuristic: true,
        averageSpeedKmh: 45,
        avoidCheckpoints: Boolean(avoidCheckpoints),
        avoidAreas: Array.isArray(avoidAreas) ? avoidAreas : [],
        notes: 'This estimate is based on heuristic distance and penalty factors.',
        originName: originName || null,
        destinationName: destinationName || null,
      },
      factors,
    };
  }

  async createRouteEstimation({
    userId,
    originName,
    originLatitude,
    originLongitude,
    destinationName,
    destinationLatitude,
    destinationLongitude,
    avoidCheckpoints,
    avoidAreas,
  }) {
    try {
      if (originLatitude === undefined || originLatitude === null) {
        throw new Error('Origin latitude is required');
      }

      if (originLongitude === undefined || originLongitude === null) {
        throw new Error('Origin longitude is required');
      }

      if (destinationLatitude === undefined || destinationLatitude === null) {
        throw new Error('Destination latitude is required');
      }

      if (destinationLongitude === undefined || destinationLongitude === null) {
        throw new Error('Destination longitude is required');
      }

      const oLat = Number(originLatitude);
      const oLng = Number(originLongitude);
      const dLat = Number(destinationLatitude);
      const dLng = Number(destinationLongitude);

      if (Number.isNaN(oLat) || oLat < -90 || oLat > 90) {
        throw new Error('Origin latitude must be a valid number between -90 and 90');
      }

      if (Number.isNaN(oLng) || oLng < -180 || oLng > 180) {
        throw new Error('Origin longitude must be a valid number between -180 and 180');
      }

      if (Number.isNaN(dLat) || dLat < -90 || dLat > 90) {
        throw new Error('Destination latitude must be a valid number between -90 and 90');
      }

      if (Number.isNaN(dLng) || dLng < -180 || dLng > 180) {
        throw new Error('Destination longitude must be a valid number between -180 and 180');
      }

      const estimate = this.buildHeuristicEstimate({
        originName,
        originLatitude: oLat,
        originLongitude: oLng,
        destinationName,
        destinationLatitude: dLat,
        destinationLongitude: dLng,
        avoidCheckpoints,
        avoidAreas,
      });

      const createdRoute = await routeEstimationRepository.createRouteEstimation({
        userId,
        originName: originName || null,
        originLatitude: oLat,
        originLongitude: oLng,
        destinationName: destinationName || null,
        destinationLatitude: dLat,
        destinationLongitude: dLng,
        baseDistanceKm: estimate.baseDistanceKm,
        adjustedDistanceKm: estimate.adjustedDistanceKm,
        baseDurationMinutes: estimate.baseDurationMinutes,
        adjustedDurationMinutes: estimate.adjustedDurationMinutes,
        riskScore: estimate.riskScore,
        providerName: estimate.providerName,
        routeSummary: estimate.routeSummary,
      });

      await routeEstimationRepository.createRouteFactors(createdRoute.id, estimate.factors);

      const fullRoute = await routeEstimationRepository.getRouteEstimationById(createdRoute.id);

      return {
        success: true,
        data: fullRoute,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = new RouteEstimationService();
