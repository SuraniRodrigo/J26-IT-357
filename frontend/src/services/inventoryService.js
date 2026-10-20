import { apiRequest } from './apiClient';

export async function optimizeInventory(payload) {
  return apiRequest('/api/inventory/optimize', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getLatestSupplyRisk() {
  return apiRequest('/api/supply/latest-risk');
}

