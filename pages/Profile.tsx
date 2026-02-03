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
  AlertCircle,
  Edit2,
  ShieldCheck,
  Hash,
  X,
  Bell,
  Printer,
  Volume2,
  Users,
  ChevronRight,
  HelpCircle,
  Zap
} from 'lucide-react';
import { doc, updateDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input, BottomNav } from '../components/UI';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, shopDetails, refreshShopDetails, logout } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Real-time Stats
  const [activeCount, setActiveCount] = useState(0);
  const [staffCount, setStaffCount] = useState(1); // Default to owner

  // Local Settings State (Mock for UI)
  const [settings, setSettings] = useState({
    sound: true,
    autoPrint: false,
    alerts: true
  });

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
        city: shopDetails.city || shopDetails.location?.city || '',
        street: shopDetails.address || shopDetails.location?.street || '',
        landmark: shopDetails.location?.landmark || ''
      });
    }
  }, [shopDetails]);

  // Real-time Active Device Count
  useEffect(() => {
    if (!currentUser) return;

    // Listen for devices that are 'charging' or 'ready'
    const q = query(
      collection(db, 'shops', currentUser.uid, 'devices'),
      where('status', 'in', ['charging', 'ready'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setActiveCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [currentUser]);

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
        address: formData.street.trim(),
        city: formData.city.trim(),
        location: {
          city: formData.city.trim(),
          street: formData.street.trim(),
          landmark: formData.landmark.trim()
        }
      });
      
      setToast({ type: 'success', message: 'Profile updated successfully!' });
      setIsEditing(false);
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

  const toggleSetting = (key: keyof typeof settings) => {
      setSettings(prev => ({ ...prev, [key]: !prev[key] }));
      if (navigator.vibrate) navigator.vibrate(50);
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      
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
      <div className="sticky top-0 bg-slate-950/95 backdrop-blur-sm z-10 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <button 
          onClick={() => navigate('/')} 
          className="p-3 -ml-3 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-white">Command Center</h1>
        <div className="w-10"></div>
      </div>

      <div className="p-6 max-w-lg mx-auto">
        
        {/* VIEW MODE: DASHBOARD */}
        {!isEditing && shopDetails ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
             
             {/* 1. Shop Identity Card (Credit Card Style) */}
             <div className="relative w-full aspect-[1.586/1] rounded-3xl overflow-hidden shadow-2xl shadow-blue-900/20 group transition-transform active:scale-[0.98]">
                {/* Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900"></div>
                
                {/* Pattern Overlay */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                
                {/* Content */}
                <div className="absolute inset-0 p-6 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div className="bg-white/10 backdrop-blur-md border border-white/20 p-2 rounded-xl">
                            <Store size={24} className="text-white" />
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">Shop ID</p>
                            <p className="text-white font-mono font-bold tracking-wider">{shopDetails.uid?.slice(0, 8).toUpperCase()}</p>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center space-x-2 mb-1">
                            <h2 className="text-2xl font-black text-white tracking-tight leading-none">{shopDetails.shopName}</h2>
                            <ShieldCheck size={18} className="text-blue-300" />
                        </div>
                        <div className="flex justify-between items-end">
                            <p className="text-blue-200 text-xs font-medium flex items-center">
                                <MapPin size={12} className="mr-1" /> {shopDetails.city}
                            </p>
                            <div className="flex items-center space-x-1 bg-green-500/20 backdrop-blur-sm px-2 py-1 rounded-lg border border-green-400/30">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                <span className="text-[10px] font-bold text-green-100 uppercase">Online</span>
                            </div>
                        </div>
                    </div>
                </div>
             </div>

             {/* 2. Quick Stats Grid */}
             <div className="grid grid-cols-3 gap-3">
                 <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-center">
                     <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center mb-2">
                         <Zap size={16} />
                     </div>
                     <span className="text-2xl font-black text-white">{activeCount}</span>
                     <span className="text-[10px] text-slate-500 font-bold uppercase">Active</span>
                 </div>
                 <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-center">
                     <div className="w-8 h-8 rounded-full bg-green-500/10 text-green-400 flex items-center justify-center mb-2">
                         <Hash size={16} />
                     </div>
                     <span className="text-2xl font-black text-white">{shopDetails.slots || 0}</span>
                     <span className="text-[10px] text-slate-500 font-bold uppercase">Slots</span>
                 </div>
                 <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-center">
                     <div className="w-8 h-8 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center mb-2">
                         <Users size={16} />
                     </div>
                     <span className="text-2xl font-black text-white">{staffCount}</span>
                     <span className="text-[10px] text-slate-500 font-bold uppercase">Staff</span>
                 </div>
             </div>

             {/* 3. Settings & Actions List */}
             <div className="space-y-4">
                 <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider ml-1">Configuration</h3>
                 
                 {/* Main Edit Button */}
                 <button 
                    onClick={() => setIsEditing(true)}
                    className="w-full bg-slate-900 hover:bg-slate-800 p-4 rounded-2xl border border-slate-800 flex items-center justify-between transition-colors group"
                 >
                     <div className="flex items-center">
                         <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400 mr-4 group-hover:bg-blue-500/20 transition-colors">
                             <Edit2 size={20} />
                         </div>
                         <div className="text-left">
                             <p className="text-white font-bold">Edit Profile</p>
                             <p className="text-xs text-slate-500">Update name, address, phone</p>
                         </div>
                     </div>
                     <ChevronRight size={18} className="text-slate-600" />
                 </button>

                 {/* Toggles Container */}
                 <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
                     
                     {/* Sound */}
                     <div className="p-4 flex items-center justify-between border-b border-slate-800">
                         <div className="flex items-center">
                             <Volume2 size={20} className="text-slate-400 mr-3" />
                             <span className="text-sm font-medium text-slate-200">Sound Effects</span>
                         </div>
                         <button 
                            onClick={() => toggleSetting('sound')}
                            className={`w-12 h-7 rounded-full p-1 transition-all ${settings.sound ? 'bg-primary-600' : 'bg-slate-700'}`}
                         >
                             <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform ${settings.sound ? 'translate-x-5' : 'translate-x-0'}`} />
                         </button>
                     </div>

                     {/* Auto Print */}
                     <div className="p-4 flex items-center justify-between border-b border-slate-800">
                         <div className="flex items-center">
                             <Printer size={20} className="text-slate-400 mr-3" />
                             <span className="text-sm font-medium text-slate-200">Auto-Print Receipts</span>
                         </div>
                         <button 
                            onClick={() => toggleSetting('autoPrint')}
                            className={`w-12 h-7 rounded-full p-1 transition-all ${settings.autoPrint ? 'bg-primary-600' : 'bg-slate-700'}`}
                         >
                             <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform ${settings.autoPrint ? 'translate-x-5' : 'translate-x-0'}`} />
                         </button>
                     </div>

                     {/* Alerts */}
                     <div className="p-4 flex items-center justify-between">
                         <div className="flex items-center">
                             <Bell size={20} className="text-slate-400 mr-3" />
                             <span className="text-sm font-medium text-slate-200">Security Alerts</span>
                         </div>
                         <button 
                            onClick={() => toggleSetting('alerts')}
                            className={`w-12 h-7 rounded-full p-1 transition-all ${settings.alerts ? 'bg-primary-600' : 'bg-slate-700'}`}
                         >
                             <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform ${settings.alerts ? 'translate-x-5' : 'translate-x-0'}`} />
                         </button>
                     </div>
                 </div>

                 {/* Support Link */}
                 <button className="w-full bg-slate-900 hover:bg-slate-800 p-4 rounded-2xl border border-slate-800 flex items-center justify-between transition-colors">
                     <div className="flex items-center">
                         <HelpCircle size={20} className="text-slate-400 mr-3" />
                         <span className="text-sm font-medium text-slate-200">Help & Support</span>
                     </div>
                     <ChevronRight size={18} className="text-slate-600" />
                 </button>
             </div>

             <div className="pt-4">
                <Button 
                  variant="danger" 
                  fullWidth 
                  onClick={handleLogout}
                  icon={LogOut}
                  className="bg-red-500/10 text-red-500 hover:bg-red-500/20 shadow-none border border-red-500/20"
                >
                  Sign Out
                </Button>
                <p className="text-center text-xs text-slate-600 mt-4 font-mono">ChargeSafe v1.2.0 • Build 8402</p>
             </div>
          </div>
        ) : (
          /* EDIT MODE: FORM */
          <form onSubmit={handleSave} className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
             <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-bold text-white">Edit Shop Details</h3>
                <button 
                  type="button" 
                  onClick={() => setIsEditing(false)} 
                  className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                >
                  <X size={20} />
                </button>
             </div>

             <div className="space-y-5">
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

                <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 space-y-4">
                  <div className="flex items-center text-slate-500 mb-1">
                      <MapPin size={16} className="mr-2" />
                      <span className="text-xs font-bold uppercase">Location Data</span>
                  </div>
                  <Input
                    label="City"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    required
                    className="bg-slate-950 border-slate-800"
                  />
                  <Input
                    label="Street Address"
                    name="street"
                    value={formData.street}
                    onChange={handleChange}
                    required
                    className="bg-slate-950 border-slate-800"
                  />
                  <Input
                    label="Landmark"
                    name="landmark"
                    value={formData.landmark}
                    onChange={handleChange}
                    className="bg-slate-950 border-slate-800"
                  />
                </div>
             </div>

             <div className="pt-4 flex space-x-3">
                <Button 
                   type="button" 
                   variant="outline" 
                   fullWidth 
                   onClick={() => setIsEditing(false)}
                >
                   Cancel
                </Button>
                <Button 
                   type="submit" 
                   fullWidth 
                   isLoading={loading}
                   icon={Save}
                >
                   Save Changes
                </Button>
             </div>
          </form>
        )}

      </div>
      
      <BottomNav />
    </div>
  );
};

export default Profile;
