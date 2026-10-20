import { apiRequest } from './apiClient';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export async function predictSupplyRisk(payload) {
  return apiRequest('/api/supply/predict', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getLatestSupplyRisk() {
  return apiRequest('/api/supply/latest-risk');
}

export async function downloadSupplyRiskReport() {
  const response = await fetch(`${API_BASE_URL}/api/supply/export`);
  if (!response.ok) {
    throw new Error(`Export failed: ${response.status}`);
  }
  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.setAttribute('download', 'supplier_risk_report.csv');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(downloadUrl);
}

