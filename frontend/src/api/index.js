import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Tables API
export const tablesApi = {
  getAll: () => api.get('/tables'),
  getById: (id) => api.get(`/tables/${id}`),
  create: (data) => api.post('/tables', data),
  updateStatus: (id, status, current_order_id) => api.patch(`/tables/${id}/status`, { status, current_order_id }),
  update: (id, data) => api.put(`/tables/${id}`, data),
  delete: (id) => api.delete(`/tables/${id}`)
};

// Menu API
export const menuApi = {
  getMenu: () => api.get('/menu'),
  getCategories: () => api.get('/menu/categories'),
  createItem: (data) => api.post('/menu/items', data),
  toggleAvailability: (id, is_available) => api.patch(`/menu/items/${id}/availability`, { is_available }),
  updateItem: (id, data) => api.put(`/menu/items/${id}`, data),
  deleteItem: (id) => api.delete(`/menu/items/${id}`)
};

// Orders API
export const ordersApi = {
  getAll: (params) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  addItems: (id, items) => api.post(`/orders/${id}/items`, { items }),
  updateStatus: (id, status) => api.patch(`/orders/${id}/status`, { status })
};

// Kitchen KDS API
export const kitchenApi = {
  getQueue: () => api.get('/kitchen/queue'),
  updateItemStatus: (itemId, status) => api.patch(`/kitchen/items/${itemId}/status`, { status }),
  updateTicketStatus: (orderId, status) => api.patch(`/kitchen/orders/${orderId}/batch-status`, { status })
};

// Billing API
export const billingApi = {
  getPreview: (orderId, params) => api.get(`/billing/preview/${orderId}`, { params }),
  checkout: (data) => api.post('/billing/checkout', data),
  getHistory: () => api.get('/billing/history')
};

// Analytics API
export const analyticsApi = {
  getOverview: () => api.get('/analytics/overview')
};

export default api;
