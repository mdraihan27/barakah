import API from './client';

export const reviewsAPI = {
  createReview: (shopId, data) => API.post(`/reviews/shops/${shopId}`, data),
  getShopReviews: (shopId, skip = 0, limit = 50) =>
    API.get(`/reviews/shops/${shopId}`, { params: { skip, limit } }),
};
