import API from './client';

export const shopsAPI = {
  getMyShops: () => API.get('/shops'),
  createShop: (data) => API.post('/shops', data),
  updateShop: (shopId, data) => API.patch(
    `/shops/${shopId}`,
    data,
    data instanceof FormData
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : undefined
  ),
  uploadShopImage: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return API.post('/uploads/shop-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getShop: (shopId) => API.get(`/shops/${shopId}`),
  getNearbyShops: (lat, lng, radiusKm = 10, limit = 50) =>
    API.get('/shops/nearby', { params: { lat, lng, radius_km: radiusKm, limit } }),
};
