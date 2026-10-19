import { apiRequest } from './apiClient';

export async function optimizeProduction(payload) {
  return apiRequest('/api/production/optimize', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function recalculateSchedule(payload) {
  return apiRequest('/api/v1/optimizer/recalculate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
