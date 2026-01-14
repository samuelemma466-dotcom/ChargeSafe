import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import AddDevice from './pages/AddDevice';
import DeviceDetails from './pages/DeviceDetails';
import History from './pages/History';
import Login from './pages/Login';
import RegisterShop from './shops/RegisterShop'; // Import from shops
import EditShop from './shops/EditShop'; // Import from shops
import ShopList from './shops/ShopList'; // Import from shops
import Scan from './pages/Scan';
import Slots from './pages/Slots';
import Profile from './pages/Profile';
import { useAuth } from './contexts/AuthContext';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        {/* Updated Register Route */}
        <Route path="/register-shop" element={<RegisterShop />} />
        
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/scan" 
          element={
            <ProtectedRoute>
              <Scan />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/slots" 
          element={
            <ProtectedRoute>
              <Slots />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/add" 
          element={
            <ProtectedRoute>
              <AddDevice />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/device/:id" 
          element={
            <ProtectedRoute>
              <DeviceDetails />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/history" 
          element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } 
        />

        {/* New Shop Management Routes */}
        <Route 
          path="/edit-shop" 
          element={
            <ProtectedRoute>
              <EditShop />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/shops" 
          element={
            <ProtectedRoute>
              <ShopList />
            </ProtectedRoute>
          } 
        />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;