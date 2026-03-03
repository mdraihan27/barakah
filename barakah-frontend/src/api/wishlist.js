import API from './client';

export const wishlistAPI = {
  getWishlist: () => API.get('/wishlist'),
  addItem: (data) => API.post('/wishlist', data),
  removeItem: (itemId) => API.delete(`/wishlist/${itemId}`),
};
