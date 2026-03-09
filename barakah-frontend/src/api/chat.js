import API from './client';

function toWsBaseUrl() {
  const httpBase = process.env.REACT_APP_API_BASE_URL || '';
  if (!httpBase) return '';
  return httpBase.replace(/^http/i, 'ws');
}

export const chatAPI = {
  getConversations: () => API.get('/chat/conversations'),
  getConversation: (conversationId) => API.get(`/chat/conversations/${conversationId}`),
  createConversation: (participantId) =>
    API.post('/chat/conversations', { participant_id: participantId }),
  sendMessage: (conversationId, text) =>
    API.post(`/chat/conversations/${conversationId}/messages`, { text }),
  getMessages: (conversationId, skip = 0, limit = 50) =>
    API.get(`/chat/conversations/${conversationId}/messages`, { params: { skip, limit } }),
  markConversationRead: (conversationId) =>
    API.post(`/chat/conversations/${conversationId}/read`),
  getUnreadSummary: () => API.get('/chat/unread-summary'),
  conversationWsUrl: (conversationId, token) =>
    `${toWsBaseUrl()}/chat/ws/conversations/${conversationId}?token=${encodeURIComponent(token)}`,
  userWsUrl: (token) =>
    `${toWsBaseUrl()}/chat/ws/user?token=${encodeURIComponent(token)}`,
};
