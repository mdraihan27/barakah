import API from './client';

export const authAPI = {
  signup: (data) => API.post('/auth/signup', data),
  login: (data) => API.post('/auth/login', data),
  refresh: (refreshToken) => API.post('/auth/refresh', { refresh_token: refreshToken }),
  sendVerificationCode: (email) => API.post('/auth/send-verification-code', { email }),
  verifyEmail: (email, code) => API.post('/auth/verify-email', { email, code }),
  forgotPassword: (email) => API.post('/auth/forgot-password', { email }),
  resetPassword: (data) => API.post('/auth/reset-password', data),
  uploadMyAvatar: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return API.patch('/auth/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  updateMyRole: (role) => API.patch('/auth/me/role', { role }),
  getGoogleOAuthURL: () => API.get('/auth/google'),
  getMe: () => API.get('/auth/me'),
};
