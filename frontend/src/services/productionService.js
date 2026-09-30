import { apiRequest } from './apiClient';

export async function optimizeProduction(payload) {
  return apiRequest('/api/production/optimize', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
