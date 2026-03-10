import API from './client';

export const productsAPI = {
  getCatalogCategories: () => API.get('/products/catalog/categories'),
  getCatalogNames: (category) => API.get('/products/catalog/names', { params: { category } }),
  addCatalogName: (data) => API.post('/products/catalog/names', data),
  createProduct: (data) => API.post('/products', data),
  updateProduct: (productId, data) => API.patch(
    `/products/${productId}`,
    data,
    data instanceof FormData
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : undefined
  ),
  uploadProductImages: (files) => {
    const formData = new FormData();
    Array.from(files || []).forEach((file) => formData.append('images', file));
    return API.post('/uploads/product-images', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getProduct: (productId) => API.get(`/products/${productId}`),
  updatePrice: (productId, newPrice) =>
    API.post(`/products/${productId}/price`, { new_price: newPrice }),
  getProductsByShop: (shopId, skip = 0, limit = 50) =>
    API.get(`/products/shop/${shopId}`, { params: { skip, limit } }),
  getPriceHistory: (productId) => API.get(`/products/${productId}/price-history`),
  getRecentOwnerProducts: (limit = 20) => API.get('/products/owner/recent', { params: { limit } }),
};
