import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Store, 
  Phone, 
  MapPin, 
  Save, 
  LogOut, 
  CheckCircle, 
  AlertCircle 
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input } from '../components/UI';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, shopDetails, refreshShopDetails, logout } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    shopName: '',
    phone: '',
    city: '',
    street: '',
    landmark: ''
  });

  // Load initial data
  useEffect(() => {
    if (shopDetails) {
      setFormData({
        shopName: shopDetails.shopName || '',
        phone: shopDetails.phone || '',
        city: shopDetails.location?.city || '',
        street: shopDetails.location?.street || '',
        landmark: shopDetails.location?.landmark || ''
      });
    }
  }, [shopDetails]);

  // Toast Timer
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    // Validation
    if (!formData.shopName.trim() || !formData.city.trim() || !formData.street.trim()) {
      setToast({ type: 'error', message: 'Shop Name, City, and Street are required.' });
      return;
    }

    setLoading(true);

    try {
      const shopRef = doc(db, 'shops', currentUser.uid);
      await updateDoc(shopRef, {
        shopName: formData.shopName.trim(),
        phone: formData.phone.trim(),
        location: {
          city: formData.city.trim(),
          street: formData.street.trim(),
          landmark: formData.landmark.trim()
        }
      });
      
      await refreshShopDetails();
      setToast({ type: 'success', message: 'Profile updated successfully!' });
    } catch (error) {
      console.error("Update error:", error);
      setToast({ type: 'error', message: 'Failed to save changes.' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if(window.confirm('Are you sure you want to log out?')) {
      await logout();
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-safe">
      
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-xl flex items-center space-x-3 animate-in slide-in-from-top-4 fade-in duration-300 ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span className="font-bold text-sm">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <button 
          onClick={() => navigate('/')} 
          className="p-3 -ml-3 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Shop Profile</h1>
        <div className="w-10"></div>
      </div>

      <div className="p-6 max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3 text-primary-600 border-4 border-white shadow-lg">
             <Store size={36} />
          </div>
          <p className="text-gray-500 text-sm font-medium">{currentUser?.email}</p>
        </div>

        <form onSubmit={handleSave} className="space-y-8">
          
          {/* Section 1: Basic Info */}
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-50 pb-2">
              Basic Information
            </h3>
            
            <Input
              label="Shop Name"
              name="shopName"
              value={formData.shopName}
              onChange={handleChange}
              icon={Store}
              required
            />
            
            <Input
              label="Phone Number"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              icon={Phone}
              placeholder="e.g. 080..."
            />
          </div>

          {/* Section 2: Location */}
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-50 pb-2 flex items-center">
              <MapPin size={16} className="mr-2" />
              Location Details
            </h3>
            
            <Input
              label="City"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="City Name"
              required
            />

            <Input
              label="Street Address"
              name="street"
              value={formData.street}
              onChange={handleChange}
              placeholder="Number, Street Name"
              required
            />

            <Input
              label="Landmark (Optional)"
              name="landmark"
              value={formData.landmark}
              onChange={handleChange}
              placeholder="e.g. Opposite Market"
            />
          </div>

          <Button 
            type="submit" 
            fullWidth 
            isLoading={loading}
            icon={Save}
            className="h-14 text-lg shadow-xl shadow-primary-600/20"
          >
            Save Changes
          </Button>

        </form>

        <div className="mt-12 pt-8 border-t border-gray-200">
           <Button 
             variant="danger" 
             fullWidth 
             onClick={handleLogout}
             icon={LogOut}
             className="bg-red-50 text-red-600 hover:bg-red-100 shadow-none border border-red-100"
           >
             Logout
           </Button>
           <p className="text-center text-xs text-gray-400 mt-4">
             Version 1.1.0 • ChargeSafe
           </p>
        </div>

      </div>
    </div>
  );
};

export default Profile;