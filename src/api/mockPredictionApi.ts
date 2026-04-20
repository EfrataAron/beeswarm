import {
  ClassificationAlert,
  CLASSIFICATION_TYPES,
  generateSampleClassification,
} from "../utils/sampleClassificationData";

/**
 * Mock API for classification predictions
 * Replace this file with real API calls when model is ready
 * 
 * Integration pattern:
 * 1. Keep the same interface (getPrediction, getHivePredictions)
 * 2. Swap the implementation with actual HTTP calls
 * 3. Update base URL and authentication as needed
 */

// Configuration - change this when integrating real API
const MOCK_API_CONFIG = {
  enabled: true, // Set to false to use real API
  baseUrl: "http://localhost:3000", // Your API endpoint
  delayMs: 500, // Simulate network delay
};

/**
 * Get a prediction for a single hive
 * Real implementation would call: GET /api/v1/hives/{hiveId}/prediction
 */
export async function getPrediction(
  hiveId: string
): Promise<ClassificationAlert> {
  if (MOCK_API_CONFIG.enabled) {
    // Simulate network delay
    await new Promise((resolve) =>
      setTimeout(resolve, MOCK_API_CONFIG.delayMs)
    );

    // Return mock prediction
    return generateSampleClassification(hiveId);
  }

  // Real API implementation (when ready):
  // const response = await fetch(
  //   `${MOCK_API_CONFIG.baseUrl}/api/v1/hives/${hiveId}/prediction`,
  //   {
  //     headers: {
  //       Authorization: `Bearer ${authToken}`,
  //     },
  //   }
  // );
  // return response.json();

  throw new Error("Real API not yet implemented");
}

/**
 * Get predictions for multiple hives
 * Real implementation would call: GET /api/v1/hives/predictions?hiveIds=id1,id2,id3
 */
export async function getHivePredictions(
  hiveIds: string[]
): Promise<ClassificationAlert[]> {
  if (MOCK_API_CONFIG.enabled) {
    // Simulate network delay
    await new Promise((resolve) =>
      setTimeout(resolve, MOCK_API_CONFIG.delayMs)
    );

    // Return mock predictions
    return hiveIds.map((hiveId) => generateSampleClassification(hiveId));
  }

  // Real API implementation (when ready):
  // const params = new URLSearchParams({ hiveIds: hiveIds.join(",") });
  // const response = await fetch(
  //   `${MOCK_API_CONFIG.baseUrl}/api/v1/hives/predictions?${params}`,
  //   {
  //     headers: {
  //       Authorization: `Bearer ${authToken}`,
  //     },
  //   }
  // );
  // return response.json();

  throw new Error("Real API not yet implemented");
}

/**
 * Get prediction for a specific classification type (for testing)
 * This is a mock-only endpoint for testing specific scenarios
 */
export async function getPredictionForClassification(
  hiveId: string,
  classification: string
): Promise<ClassificationAlert> {
  if (MOCK_API_CONFIG.enabled) {
    await new Promise((resolve) =>
      setTimeout(resolve, MOCK_API_CONFIG.delayMs)
    );

    return generateSampleClassification(hiveId, classification);
  }

  throw new Error("Real API not yet implemented");
}

/**
 * Switch between mock and real API
 * Useful for testing and gradual migration
 */
export function setMockApiEnabled(enabled: boolean): void {
  MOCK_API_CONFIG.enabled = enabled;
}

export function isMockApiEnabled(): boolean {
  return MOCK_API_CONFIG.enabled;
}

/**
 * Update API configuration
 * Call this when integrating real API
 */
export function updateApiConfig(config: Partial<typeof MOCK_API_CONFIG>): void {
  Object.assign(MOCK_API_CONFIG, config);
}

/**
 * Get current API configuration
 */
export function getApiConfig(): typeof MOCK_API_CONFIG {
  return { ...MOCK_API_CONFIG };
}
