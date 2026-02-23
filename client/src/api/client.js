import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

export async function getTransactions(params = {}) {
  const { data } = await api.get('/transactions', { params });
  return data;
}

export async function createTransaction(tx) {
  const { data } = await api.post('/transactions', tx);
  return data;
}

export async function updateTransaction(id, tx) {
  const { data } = await api.put(`/transactions/${id}`, tx);
  return data;
}

export async function deleteTransaction(id) {
  await api.delete(`/transactions/${id}`);
}

export async function deleteAllTransactions() {
  const { data } = await api.delete('/transactions/all');
  return data;
}

export async function getSummary(params = {}) {
  const { data } = await api.get('/transactions/summary', { params });
  return data;
}

export async function getCategories() {
  const { data } = await api.get('/categories');
  return data;
}

export async function getRecurring() {
  const { data } = await api.get('/recurring');
  return data;
}

export async function createRecurring(tpl) {
  const { data } = await api.post('/recurring', tpl);
  return data;
}

export async function updateRecurring(id, tpl) {
  const { data } = await api.put(`/recurring/${id}`, tpl);
  return data;
}

export async function deleteRecurring(id) {
  await api.delete(`/recurring/${id}`);
}

export async function processRecurring() {
  const { data } = await api.post('/recurring/process');
  return data;
}

export async function getDeviations() {
  const { data } = await api.get('/recurring/deviations');
  return data;
}

export async function previewCsv(file) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post('/import/csv/preview', form);
  return data;
}

export async function importCsv(file, mapping) {
  const form = new FormData();
  form.append('file', file);
  Object.entries(mapping).forEach(([k, v]) => form.append(k, v));
  const { data } = await api.post('/import/csv', form);
  return data;
}
