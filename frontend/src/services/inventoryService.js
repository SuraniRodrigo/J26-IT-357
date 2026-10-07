import { apiRequest } from './apiClient';

/**
 * Executes the adaptive inventory optimization pipeline for a material.
 */
export async function optimizeInventory(payload) {
  return apiRequest('/api/inventory/optimize', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Executes detailed optimization returning full policy metadata.
 */
export async function optimizeInventoryDetailed(payload) {
  return apiRequest('/api/inventory/optimize/detailed', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Fetches system health and module versioning status.
 */
export async function getInventoryHealth() {
  return apiRequest('/api/inventory/health');
}

/**
 * Fetches the full monitored product catalog with mock upstream feeds.
 */
export async function getInventoryProducts() {
  return apiRequest('/api/inventory/products');
}

/**
 * Fetches high-level executive summary KPIs across the portfolio.
 */
export async function getInventorySummary() {
  return apiRequest('/api/inventory/summary');
}

/**
 * Runs stress testing across Normal, Moderate, and Severe disruption scenarios.
 */
export async function runScenarioAnalysis(payload) {
  return apiRequest('/api/inventory/scenario', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Fetches downstream integration contract records for Module 4 (Line Optimizer).
 */
export async function getProductionInterface() {
  return apiRequest('/api/inventory/production-interface');
}

/**
 * Fetches authentic research benchmarks (Baseline vs Adaptive vs Forecast-Risk-Aware).
 */
export async function getResearchResults() {
  return apiRequest('/api/inventory/research-results');
}

/**
 * Fetches raw mock upstream signals for verification.
 */
export async function getDemoUpstreamFeeds() {
  return apiRequest('/api/inventory/demo-upstream');
}
