import { apiGet, apiPost, apiDelete, apiPut } from './api';

export async function fetchWeights(from, to) {
  const query = from && to ? `?from=${from}&to=${to}` : '';
  const data = await apiGet(`/api/weights${query}`);
  return data.weights;
}

export async function createWeight(payload) {
  // Returns the full { weight, updated } envelope: the tab shell needs
  // `updated` to decide replace-vs-append for same-day re-logs. Returning
  // only data.weight pushes undefined into state and crashes downstream
  // readers (latestWeight, Progress entries).
  const data = await apiPost('/api/weights', payload);
  return data;
}

export async function deleteWeight(id) {
  const data = await apiDelete(`/api/weights/${id}`);
  return data.deleted;
}

export async function fetchWeightGoal() {
  const data = await apiGet('/api/weights/goal');
  return data.goal;
}

export async function setWeightGoal(value) {
  const data = await apiPut('/api/weights/goal', { value });
  return data.goal;
}
