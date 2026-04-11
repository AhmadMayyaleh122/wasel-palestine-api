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

    const congestionPenaltyMinutes = 8;
    adjustedDurationMinutes += congestionPenaltyMinutes;
    riskScore += 1.5;
    factors.push({
      factorType: 'congestion',
      weightValue: congestionPenaltyMinutes,
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

  async getOpenRouteServiceEstimate({
    originLatitude,
    originLongitude,
    destinationLatitude,
    destinationLongitude,
    avoidCheckpoints,
    avoidAreas,
  }) {
    const apiKey = process.env.ORS_API_KEY;

    if (!apiKey) {
      return null;
    }

    const url = 'https://api.openrouteservice.org/v2/directions/driving-car/geojson';

    const body = {
      coordinates: [
        [originLongitude, originLatitude],
        [destinationLongitude, destinationLatitude],
      ],
    };

    // ORS supports route options via POST body. We only map user-side constraints lightly here.
    if (avoidCheckpoints || (Array.isArray(avoidAreas) && avoidAreas.length > 0)) {
      body.options = {};
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ORS request failed with status ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      const feature = data?.features?.[0];
      const summary = feature?.properties?.summary;

      if (!feature || !summary) {
        throw new Error('Invalid ORS response format');
      }

      const baseDistanceKm = Number((summary.distance / 1000).toFixed(2));
      const baseDurationMinutes = Math.max(1, Math.round(summary.duration / 60));

      let adjustedDistanceKm = baseDistanceKm;
      let adjustedDurationMinutes = baseDurationMinutes;
      let riskScore = 0;

      const factors = [];

      if (avoidCheckpoints) {
        adjustedDistanceKm = Number((adjustedDistanceKm + 2).toFixed(2));
        adjustedDurationMinutes += 10;
        riskScore += 2;
        factors.push({
          factorType: 'user_constraint',
          weightValue: 10,
          description: 'Checkpoint avoidance penalty applied on top of ORS route',
        });
      }

      if (Array.isArray(avoidAreas) && avoidAreas.length > 0) {
        const areaPenalty = avoidAreas.length * 4;
        adjustedDistanceKm = Number((adjustedDistanceKm + avoidAreas.length * 1.2).toFixed(2));
        adjustedDurationMinutes += areaPenalty;
        riskScore += avoidAreas.length * 1.2;
        factors.push({
          factorType: 'area_restriction',
          weightValue: areaPenalty,
          description: `Area avoidance penalty applied for ${avoidAreas.length} area(s)`,
        });
      }

      return {
        providerName: 'openrouteservice',
        baseDistanceKm,
        adjustedDistanceKm,
        baseDurationMinutes,
        adjustedDurationMinutes,
        riskScore: Number(riskScore.toFixed(2)),
        routeSummary: {
          heuristic: false,
          ors: true,
          summary,
          bbox: data?.bbox || null,
          featureProperties: feature?.properties || null,
          avoidCheckpoints: Boolean(avoidCheckpoints),
          avoidAreas: Array.isArray(avoidAreas) ? avoidAreas : [],
          notes: 'Base route generated by OpenRouteService, then adjusted with local constraints.',
        },
        factors,
      };
    } catch (error) {
      console.error('ORS integration failed, falling back to heuristic:', error.message);
      return null;
    }
  }
    async getOpenWeatherImpact({ latitude, longitude }) {
    const apiKey = process.env.OPENWEATHER_API_KEY;

    if (!apiKey) {
      return null;
    }

    const url =
      `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenWeather request failed with status ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      const weatherMain = data?.weather?.[0]?.main?.toLowerCase() || '';
      const weatherDescription = data?.weather?.[0]?.description || '';
      const windSpeed = Number(data?.wind?.speed || 0);
      const visibility = Number(data?.visibility || 0);
      const temperature = data?.main?.temp ?? null;

      let durationPenalty = 0;
      let riskPenalty = 0;
      let description = 'Weather conditions have minimal impact on route';

      const badConditions = ['rain', 'thunderstorm', 'snow', 'drizzle'];
      const reducedVisibilityConditions = ['mist', 'fog', 'haze', 'smoke', 'dust', 'sand', 'ash'];

      if (badConditions.includes(weatherMain)) {
        durationPenalty += 12;
        riskPenalty += 2.5;
        description = `Weather impact: ${weatherDescription}`;
      } else if (reducedVisibilityConditions.includes(weatherMain) || visibility < 5000) {
        durationPenalty += 8;
        riskPenalty += 1.8;
        description = `Reduced visibility conditions: ${weatherDescription || 'low visibility'}`;
      }

      if (windSpeed > 10) {
        durationPenalty += 4;
        riskPenalty += 1.2;
        description += `, elevated wind speed (${windSpeed} m/s)`;
      }

      return {
        provider: 'openweathermap',
        durationPenalty,
        riskPenalty,
        factor: {
          factorType: 'weather',
          weightValue: durationPenalty,
          description,
        },
        weatherSummary: {
          provider: 'openweathermap',
          main: weatherMain,
          description: weatherDescription,
          temperature,
          windSpeed,
          visibility,
          raw: data,
        },
      };
    } catch (error) {
      console.error('OpenWeather integration failed, continuing without weather factor:', error.message);
      return null;
    }
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

      const orsEstimate = await this.getOpenRouteServiceEstimate({
        originLatitude: oLat,
        originLongitude: oLng,
        destinationLatitude: dLat,
        destinationLongitude: dLng,
        avoidCheckpoints,
        avoidAreas,
      });

      const estimate =
        orsEstimate ||
        this.buildHeuristicEstimate({
          originName,
          originLatitude: oLat,
          originLongitude: oLng,
          destinationName,
          destinationLatitude: dLat,
          destinationLongitude: dLng,
          avoidCheckpoints,
          avoidAreas,
        });

      const weatherImpact = await this.getOpenWeatherImpact({
        latitude: oLat,
        longitude: oLng,
      });

      if (weatherImpact) {
        estimate.adjustedDurationMinutes += weatherImpact.durationPenalty;
        estimate.riskScore = Number((estimate.riskScore + weatherImpact.riskPenalty).toFixed(2));
        estimate.factors.push(weatherImpact.factor);
        estimate.routeSummary.weather = weatherImpact.weatherSummary;
      }

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
