import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Store, Phone, MapPin, Save, CheckCircle, AlertCircle, Navigation, Hash, Crosshair } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input } from '../components/UI';
import { Coordinates } from '../types';

const EditShop: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, shopDetails, refreshShopDetails } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    shopName: '',
    phone: '',
    city: '',
    address: '',
    slots: '',
  });
  
  const [coordinates, setCoordinates] = useState<Coordinates>({ lat: 0, lng: 0 });

  // Load initial data including the new storage fields
  useEffect(() => {
    if (shopDetails) {
      setFormData({
        shopName: shopDetails.shopName || '',
        phone: shopDetails.phone || '',
        city: shopDetails.city || shopDetails.location?.city || '',
        address: shopDetails.address || shopDetails.location?.street || '', // Prioritize 'address'
        slots: shopDetails.slots ? shopDetails.slots.toString() : ''
      });
      if (shopDetails.coordinates) {
        setCoordinates(shopDetails.coordinates);
      }
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

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setToast({ type: 'error', message: "Geolocation not supported" });
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setIsLocating(false);
        setToast({ type: 'success', message: "Coordinates updated!" });
      },
      (err) => {
        console.error(err);
        setToast({ type: 'error', message: "Unable to retrieve location" });
        setIsLocating(false);
      }
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    // Validation
    if (!formData.shopName.trim() || !formData.address.trim()) {
      setToast({ type: 'error', message: 'Shop Name and Address are required.' });
      return;
    }

    setLoading(true);

    try {
      const shopRef = doc(db, 'shops', currentUser.uid);
      
      // Update specific fields as requested
      await updateDoc(shopRef, {
        shopName: formData.shopName.trim(),
        phone: formData.phone.trim(),
        city: formData.city.trim(),
        address: formData.address.trim(),
        slots: parseInt(formData.slots) || 0,
        coordinates: coordinates,
        // Maintain legacy
        location: {
            city: formData.city.trim(),
            street: formData.address.trim(),
            landmark: ''
        }
      });
      
      await refreshShopDetails();
      setToast({ type: 'success', message: 'Shop details updated!' });
      
      // Navigate back after short delay
      setTimeout(() => navigate('/profile'), 1000);
    } catch (error) {
      console.error("Update error:", error);
      setToast({ type: 'error', message: 'Failed to save changes.' });
    } finally {
      setLoading(false);
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
          onClick={() => navigate(-1)} 
          className="p-3 -ml-3 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Edit Shop</h1>
        <div className="w-10"></div>
      </div>

      <div className="p-6 max-w-lg mx-auto">
        <form onSubmit={handleSave} className="space-y-8">
          
          {/* Section 1: Basic Info */}
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm animate-in slide-in-from-bottom-2">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-50 pb-2">
              General Info
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

            <Input
              label="Total Slots"
              name="slots"
              value={formData.slots}
              onChange={handleChange}
              icon={Hash}
              type="number"
              placeholder="0"
            />
          </div>

          {/* Section 2: Location */}
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm animate-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-2">
                 <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center">
                    <MapPin size={16} className="mr-2" />
                    Location
                 </h3>
                 {coordinates.lat !== 0 && (
                    <div className="flex items-center space-x-1 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                        <Crosshair size={10} />
                        <span>Lat: {coordinates.lat.toFixed(4)}</span>
                    </div>
                 )}
            </div>
            
            <Input
              label="Address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Full Address"
              required
            />

            <Input
              label="City"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="City Name"
            />

            <button
                type="button"
                onClick={handleGetLocation}
                disabled={isLocating}
                className="w-full mt-2 flex items-center justify-center py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-100 transition-colors"
            >
                {isLocating ? 'Getting Location...' : (
                    <><Navigation size={16} className="mr-2" /> Update GPS Coordinates</>
                )}
            </button>
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
      </div>
    </div>
  );
};

export default EditShop;