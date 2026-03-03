import API from './client';

export const searchAPI = {
  searchProducts: (q, lat, lng, radiusKm = 10, limit = 50) =>
    API.get('/search/products', { params: { q, lat, lng, radius_km: radiusKm, limit } }),
};
