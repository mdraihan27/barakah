import API from './client';

export const authAPI = {
  signup: (data) => API.post('/auth/signup', data),
  login: (data) => API.post('/auth/login', data),
  sendVerificationCode: (email) => API.post('/auth/send-verification-code', { email }),
  verifyEmail: (email, code) => API.post('/auth/verify-email', { email, code }),
  forgotPassword: (email) => API.post('/auth/forgot-password', { email }),
  resetPassword: (data) => API.post('/auth/reset-password', data),
  getGoogleOAuthURL: () => API.get('/auth/google'),
  getMe: () => API.get('/auth/me'),
};
