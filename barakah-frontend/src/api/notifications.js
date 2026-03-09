import API from './client';

function toWsBaseUrl() {
  const httpBase = process.env.REACT_APP_API_BASE_URL || '';
  if (!httpBase) return '';
  return httpBase.replace(/^http/i, 'ws');
}

export const notificationsAPI = {
  getNotifications: (skip = 0, limit = 50) =>
    API.get('/notifications', { params: { skip, limit } }),
  markAsRead: (notificationId) =>
    API.patch(`/notifications/${notificationId}/read`),
  markAllAsRead: () => API.post('/notifications/read-all'),
  notificationsWsUrl: (token) => `${toWsBaseUrl()}/notifications/ws?token=${encodeURIComponent(token)}`,
};
