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
 * Fetches the full monitored product catalog with mock upstream feeds.
 */
export async function getInventoryProducts() {
  return apiRequest('/api/inventory/products');
}

/**
 * Creates a new raw material SKU in the monitored portfolio.
 */
export async function createInventoryProduct(payload) {
  return apiRequest('/api/inventory/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Updates an existing raw material SKU in the inventory catalog.
 */
export async function updateInventoryProduct(productId, payload) {
  return apiRequest(`/api/inventory/products/${encodeURIComponent(productId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/**
 * Removes a raw material SKU from inventory monitoring.
 */
export async function deleteInventoryProduct(productId) {
  return apiRequest(`/api/inventory/products/${encodeURIComponent(productId)}`, {
    method: 'DELETE',
  });
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

/**
 * Fetches the newest demo supplier-risk report row linked to a Demand SKU.
 */
export async function getDemoDemandSupplierRisk(productId) {
  return apiRequest(`/api/inventory/demo-demand-supplier-risk/${encodeURIComponent(productId)}`);
}

/**
 * Fetches real upstream feeds from Module 1 (Demand) and Module 2 (Supply Risk).
 */
export async function fetchLiveUpstream() {
  return apiRequest('/api/inventory/upstream');
}

/**
 * Runs batch optimization across all monitored SKUs with optional policy overrides.
 */
export async function batchOptimizeInventory(params = {}) {
  return apiRequest('/api/inventory/optimize/batch', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/**
 * Fetches all purchase orders from the persistent SQLite database.
 */
export async function getPurchaseOrders() {
  return apiRequest('/api/inventory/purchase-orders');
}

/**
 * Creates a new purchase order in the persistent SQLite database.
 */
export async function createPurchaseOrder(payload) {
  return apiRequest('/api/inventory/purchase-orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
