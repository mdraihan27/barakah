import { Routes, Route, Navigate } from 'react-router-dom';
import App from './App';

// Auth pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import GoogleCallback from './pages/GoogleCallback';

// Dashboard
import Dashboard from './pages/dashboard/Dashboard';
import Profile from './pages/dashboard/Profile';

// Shop owner pages
import MyShops from './pages/dashboard/shop/MyShops';
import CreateShop from './pages/dashboard/shop/CreateShop';
import EditShop from './pages/dashboard/shop/EditShop';
import ShopDetail from './pages/dashboard/shop/ShopDetail';
import AddProduct from './pages/dashboard/shop/AddProduct';
import EditProduct from './pages/dashboard/shop/EditProduct';

// Consumer pages
import Explore from './pages/dashboard/consumer/Explore';
import PublicShopDetail from './pages/dashboard/consumer/PublicShopDetail';
import ProductDetail from './pages/dashboard/consumer/ProductDetail';
import Search from './pages/dashboard/consumer/Search';
import Wishlist from './pages/dashboard/consumer/Wishlist';

// Chat & notifications
import Conversations from './pages/dashboard/chat/Conversations';
import ChatRoom from './pages/dashboard/chat/ChatRoom';
import Notifications from './pages/dashboard/notifications/Notifications';

// Guards
import ProtectedRoute from './components/common/ProtectedRoute';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<App />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/auth/google/callback" element={<GoogleCallback />} />

      {/* Protected — Dashboard */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/dashboard/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

      {/* Shop owner */}
      <Route path="/dashboard/shops" element={<ProtectedRoute><MyShops /></ProtectedRoute>} />
      <Route path="/dashboard/shops/create" element={<ProtectedRoute><CreateShop /></ProtectedRoute>} />
      <Route path="/dashboard/shops/:id" element={<ProtectedRoute><ShopDetail /></ProtectedRoute>} />
      <Route path="/dashboard/shops/:id/edit" element={<ProtectedRoute><EditShop /></ProtectedRoute>} />
      <Route path="/dashboard/shops/:shopId/products/add" element={<ProtectedRoute><AddProduct /></ProtectedRoute>} />
      <Route path="/dashboard/products/:productId" element={<ProtectedRoute><EditProduct /></ProtectedRoute>} />

      {/* Consumer */}
      <Route path="/dashboard/explore" element={<ProtectedRoute><Explore /></ProtectedRoute>} />
      <Route path="/dashboard/shop/:id" element={<ProtectedRoute><PublicShopDetail /></ProtectedRoute>} />
      <Route path="/dashboard/product/:id" element={<ProtectedRoute><ProductDetail /></ProtectedRoute>} />
      <Route path="/dashboard/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
      <Route path="/dashboard/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />

      {/* Chat & Notifications */}
      <Route path="/dashboard/chat" element={<ProtectedRoute><Conversations /></ProtectedRoute>} />
      <Route path="/dashboard/chat/:id" element={<ProtectedRoute><ChatRoom /></ProtectedRoute>} />
      <Route path="/dashboard/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
