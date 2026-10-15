import { apiGet, apiPost, apiDelete, apiPut } from './api';
import { resolveTimeZone, UTC } from '../utils/format';

function withTimeZone(query, timeZone) {
  const tz = timeZone === undefined || timeZone === null ? UTC : resolveTimeZone(timeZone);
  return `${query}${query.includes('?') ? '&' : '?'}tz=${encodeURIComponent(tz)}`;
}

export async function fetchWeights(from, to, timeZone) {
  const query = from && to ? `?from=${from}&to=${to}` : '';
  const data = await apiGet(withTimeZone(`/api/weights${query}`, timeZone));
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

export async function setWeightGoal(value, opts = {}) {
  const body = { value };
  if (opts.pace) body.pace = opts.pace;
  if (opts.activityLevel) body.activityLevel = opts.activityLevel;
  const data = await apiPut('/api/weights/goal', body);
  // Full envelope { goal, plan, missing, user } so the caller can sync the
  // recomputed dailyGoalKcal in one tick. Callers read data.goal (lbs).
  return data;
}
