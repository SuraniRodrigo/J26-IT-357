import { apiRequest } from './apiClient';

export async function forecastDemand(payload) {
  return apiRequest('/api/demand/forecast', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
