import API from './client';

export const notificationsAPI = {
  getNotifications: (skip = 0, limit = 50) =>
    API.get('/notifications', { params: { skip, limit } }),
  markAsRead: (notificationId) =>
    API.patch(`/notifications/${notificationId}/read`),
  markAllAsRead: () => API.post('/notifications/read-all'),
};
