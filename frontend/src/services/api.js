/**
 * API Service Client for Nankwanya
 */

const API_BASE = '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/stats`);
  return res.json();
}

export async function fetchFacilities() {
  const res = await fetch(`${API_BASE}/facilities`);
  return res.json();
}

export async function fetchDonors(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/donors${query ? `?${query}` : ''}`);
  return res.json();
}

export async function fetchDonorById(id) {
  const res = await fetch(`${API_BASE}/donors/${id}`);
  return res.json();
}

export async function registerOrUpdateDonor(donorData) {
  const res = await fetch(`${API_BASE}/donors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(donorData)
  });
  return res.json();
}

export async function updateDonorLocation(id, { lat, lng }) {
  const res = await fetch(`${API_BASE}/donors/${id}/location`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lng })
  });
  return res.json();
}

export async function createBloodRequest(requestData) {
  const res = await fetch(`${API_BASE}/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestData)
  });
  return res.json();
}

export async function fetchBloodRequests(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/requests${query ? `?${query}` : ''}`);
  return res.json();
}

export async function fetchBloodRequestById(id) {
  const res = await fetch(`${API_BASE}/requests/${id}`);
  return res.json();
}

export async function updateRequestStatus(id, status) {
  const res = await fetch(`${API_BASE}/requests/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  return res.json();
}

export async function fetchAlerts(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/alerts${query ? `?${query}` : ''}`);
  return res.json();
}

export async function respondToAlert(alertId, action) {
  const res = await fetch(`${API_BASE}/alerts/${alertId}/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }) // 'confirm' or 'decline'
  });
  return res.json();
}

export async function simulateSmsResponse({ alertId, donorId, donorPhone, action = 'confirm' }) {
  const res = await fetch(`${API_BASE}/alerts/simulate-response`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alertId, donorId, donorPhone, action })
  });
  return res.json();
}
