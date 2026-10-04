import { apiGet, apiPost, apiDelete, apiPut } from './api';

export async function fetchWeights(from, to) {
  const query = from && to ? `?from=${from}&to=${to}` : '';
  const data = await apiGet(`/api/weights${query}`);
  return data.weights;
}

export async function createWeight(payload) {
  const data = await apiPost('/api/weights', payload);
  return data.weight;
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
