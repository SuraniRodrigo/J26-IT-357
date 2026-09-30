import { apiRequest } from './apiClient';

export async function predictSupplyRisk(payload) {
  return apiRequest('/api/supply/predict', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
