import { apiRequest } from './apiClient';

export async function forecastDemand(payload) {
  return apiRequest('/api/demand/forecast', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function reconcileDemandHierarchy(payload) {
  return apiRequest('/api/demand/reconcile', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchDemandHierarchy() {
  return apiRequest('/api/demand/hierarchy');
}

export async function fetchRealProducts(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/api/demand/products${query ? `?${query}` : ''}`);
}

export async function fetchRealCategories(source = 'dataco') {
  return apiRequest(`/api/demand/categories?source=${source}`);
}

export async function fetchRealDepartments(source = 'dataco') {
  return apiRequest(`/api/demand/departments?source=${source}`);
}

export async function fetchHistoricalObservations(identifier, days = 90, source = 'auto') {
  const query = new URLSearchParams({
    identifier,
    days: days.toString(),
    source,
  }).toString();
  return apiRequest(`/api/demand/historical?${query}`);
}

export async function fetchDatasetSummary() {
  return apiRequest('/api/demand/dataset-summary');
}

export async function fetchDemandDrivers() {
  return apiRequest('/api/demand/drivers');
}

