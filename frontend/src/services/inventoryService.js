import { apiRequest } from './apiClient';

export async function optimizeInventory(payload) {
  return apiRequest('/api/inventory/optimize', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
