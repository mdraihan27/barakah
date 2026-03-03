import API from './client';

export const chatAPI = {
  getConversations: () => API.get('/chat/conversations'),
  createConversation: (participantId) =>
    API.post('/chat/conversations', { participant_id: participantId }),
  sendMessage: (conversationId, text) =>
    API.post(`/chat/conversations/${conversationId}/messages`, { text }),
  getMessages: (conversationId, skip = 0, limit = 50) =>
    API.get(`/chat/conversations/${conversationId}/messages`, { params: { skip, limit } }),
};
