/**
 * API Analytics & Metrics Tracking
 * Tracks API usage, response times, and call metrics
 */

const logger = require('./logger');

class Analytics {
  constructor() {
    this.metrics = {
      totalRequests: 0,
      endpointCalls: {},
      responseTimes: {},
      errors: {},
      businessHoursBlocks: 0,
      callsInitiated: 0,
      callsBlocked: 0,
    };
  }

  /**
   * Track API request
   * @param {string} method - HTTP method
   * @param {string} path - Request path
   * @param {number} statusCode - Response status code
   * @param {number} duration - Response time in ms
   */
  trackRequest(method, path, statusCode, duration) {
    this.metrics.totalRequests++;
    
    const endpoint = `${method} ${path}`;
    
    // Track endpoint calls
    if (!this.metrics.endpointCalls[endpoint]) {
      this.metrics.endpointCalls[endpoint] = 0;
    }
    this.metrics.endpointCalls[endpoint]++;

    // Track response times
    if (!this.metrics.responseTimes[endpoint]) {
      this.metrics.responseTimes[endpoint] = [];
    }
    this.metrics.responseTimes[endpoint].push(duration);
    
    // Keep only last 100 response times per endpoint
    if (this.metrics.responseTimes[endpoint].length > 100) {
      this.metrics.responseTimes[endpoint].shift();
    }

    // Track errors (4xx, 5xx)
    if (statusCode >= 400) {
      if (!this.metrics.errors[endpoint]) {
        this.metrics.errors[endpoint] = { count: 0, statusCodes: {} };
      }
      this.metrics.errors[endpoint].count++;
      
      if (!this.metrics.errors[endpoint].statusCodes[statusCode]) {
        this.metrics.errors[endpoint].statusCodes[statusCode] = 0;
      }
      this.metrics.errors[endpoint].statusCodes[statusCode]++;

      logger.warn(`API Error: ${endpoint} - ${statusCode}`, {
        endpoint,
        statusCode,
        duration,
      });
    }

    // Log successful requests (info level for important endpoints)
    if (statusCode < 400 && (path.includes('/api/initiate-call') || path.includes('/api/batch-calls'))) {
      logger.info(`API Call: ${endpoint}`, {
        endpoint,
        statusCode,
        duration: `${duration}ms`,
      });
    }
  }

  /**
   * Track business hours block
   */
  trackBusinessHoursBlock() {
    this.metrics.businessHoursBlocks++;
    logger.info('Call blocked: Outside business hours');
  }

  /**
   * Track call initiation
   */
  trackCallInitiated() {
    this.metrics.callsInitiated++;
  }

  /**
   * Track blocked call
   */
  trackCallBlocked() {
    this.metrics.callsBlocked++;
  }

  /**
   * Get average response time for an endpoint
   * @param {string} endpoint - Endpoint to check
   * @returns {number} - Average response time in ms
   */
  getAverageResponseTime(endpoint) {
    const times = this.metrics.responseTimes[endpoint];
    if (!times || times.length === 0) return 0;
    
    const sum = times.reduce((a, b) => a + b, 0);
    return Math.round(sum / times.length);
  }

  /**
   * Get metrics summary
   * @returns {Object} - Current metrics
   */
  getMetrics() {
    const summary = {
      ...this.metrics,
      averageResponseTimes: {},
      errorRates: {},
    };

    // Calculate average response times
    Object.keys(this.metrics.responseTimes).forEach(endpoint => {
      summary.averageResponseTimes[endpoint] = this.getAverageResponseTime(endpoint);
    });

    // Calculate error rates
    Object.keys(this.metrics.errors).forEach(endpoint => {
      const totalCalls = this.metrics.endpointCalls[endpoint] || 1;
      const errorCount = this.metrics.errors[endpoint].count;
      summary.errorRates[endpoint] = {
        rate: ((errorCount / totalCalls) * 100).toFixed(2) + '%',
        count: errorCount,
        total: totalCalls,
      };
    });

    return summary;
  }

  /**
   * Reset metrics (useful for testing)
   */
  reset() {
    this.metrics = {
      totalRequests: 0,
      endpointCalls: {},
      responseTimes: {},
      errors: {},
      businessHoursBlocks: 0,
      callsInitiated: 0,
      callsBlocked: 0,
    };
  }
}

// Singleton instance
const analytics = new Analytics();

module.exports = analytics;
