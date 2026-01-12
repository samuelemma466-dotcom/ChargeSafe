import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, 
  Smartphone, 
  Laptop, 
  Battery, 
  HelpCircle, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  User, 
  Tag, 
  Scan, 
  Share2 
} from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { DeviceEntry, DeviceType, DeviceStatus } from '../types';
import { Button, Input, Badge } from '../components/UI';

const DeviceDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { currentUser } = useAuth();
  
  // Try to get initial state from navigation, otherwise null (loading)
  const [device, setDevice] = useState<DeviceEntry | null>((location.state as { device: DeviceEntry })?.device || null);
  const [loading, setLoading] = useState(!device);
  const [error, setError] = useState('');

  const [verificationCode, setVerificationCode] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Fetch device if not passed via state
  useEffect(() => {
    const fetchDevice = async () => {
      if (!device && currentUser && id) {
        try {
          const docRef = doc(db, 'shops', currentUser.uid, 'devices', id);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            setDevice(docSnap.data() as DeviceEntry);
          } else {
            setError('Device not found');
          }
        } catch (err) {
          console.error("Error fetching device:", err);
          setError('Could not load device details');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchDevice();
  }, [id, currentUser, device]);

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const updateStatus = async (newStatus: DeviceStatus, updates: Partial<DeviceEntry> = {}) => {
    if (!currentUser || !device) return;

    try {
      const deviceRef = doc(db, 'shops', currentUser.uid, 'devices', device.id);
      const updateData = { status: newStatus, ...updates };
      
      await updateDoc(deviceRef, updateData);
      
      setDevice(prev => prev ? ({ ...prev, ...updateData }) : null);
    } catch (err) {
      console.error("Error updating status:", err);
      setToast({ type: 'error', message: 'Failed to update status' });
    }
  };

  const handleVerify = async () => {
    if (!device) return;
    // Simple verification logic: check if entered code matches ID
    if (verificationCode.trim().toUpperCase() === device.id) {
      setToast({ type: 'success', message: 'Device Verified – Hand over to Customer' });
      
      // Automatically mark as collected after verification
      setTimeout(async () => {
        await updateStatus('collected', { endTime: new Date().toISOString() });
      }, 1500);
    } else {
      setToast({ type: 'error', message: 'Device does not match Order Number' });
    }
  };

  const markReady = async () => {
    await updateStatus('ready');
    setToast({ type: 'success', message: 'Device marked as Ready for pickup' });
  };

  const markCollected = async () => {
    await updateStatus('collected', { endTime: new Date().toISOString() });
    setToast({ type: 'success', message: 'Transaction Completed' });
  };

  const getIcon = (type: DeviceType) => {
    switch (type) {
      case DeviceType.PHONE: return Smartphone;
      case DeviceType.LAPTOP: return Laptop;
      case DeviceType.POWER_BANK: return Battery;
      default: return HelpCircle;
    }
  };

  const getStatusColor = (status: DeviceStatus) => {
    switch (status) {
      case 'charging': return 'blue';
      case 'ready': return 'green';
      case 'collected': return 'gray';
      default: return 'gray';
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div></div>;
  if (error || !device) return <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center"><AlertCircle className="text-red-500 mb-4" size={48} /><h2 className="text-lg font-bold">{error || 'Device Not Found'}</h2><Button className="mt-4" onClick={() => navigate('/')}>Back to Dashboard</Button></div>;

  const DeviceIcon = getIcon(device.type);

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center pb-6">
      <div className="w-full max-w-lg bg-white md:my-8 md:rounded-3xl md:shadow-lg min-h-screen md:min-h-fit flex flex-col">
        
        {/* TOAST NOTIFICATION */}
        {toast && (
          <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-xl flex items-center space-x-3 animate-in slide-in-from-top-4 fade-in duration-300 ${
            toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}>
            {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span className="font-medium text-sm">{toast.message}</span>
          </div>
        )}

        {/* HEADER */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 px-6 py-4 border-b border-gray-100 flex items-center justify-between md:rounded-t-3xl">
          <button 
            onClick={() => navigate('/')} 
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Device Details</h1>
          <button className="p-2 -mr-2 text-gray-400 hover:text-primary-600">
            <Share2 size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* 1. STATUS & ID CARD */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 text-center relative overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-1.5 ${
              device.status === 'charging' ? 'bg-blue-500' : 
              device.status === 'ready' ? 'bg-green-500' : 'bg-gray-400'
            }`} />
            
            <Badge 
              variant={getStatusColor(device.status) as any} 
              className="mb-3 px-3 py-1 text-xs uppercase tracking-wider"
            >
              {device.status}
            </Badge>

            <h2 className="text-3xl font-black text-gray-900 mb-1">{device.id}</h2>
            <p className="text-gray-400 text-xs font-mono mb-6">ORDER NUMBER</p>

            <div className="flex justify-center mb-6">
               <div className="p-3 bg-white border border-gray-100 rounded-xl shadow-inner min-h-[160px] flex items-center justify-center">
                 {device.qrCodeBase64 ? (
                   <img 
                      src={device.qrCodeBase64} 
                      alt="Device QR Code" 
                      className={`w-36 h-36 object-contain ${device.status === 'collected' ? 'opacity-50 grayscale' : ''}`}
                   />
                 ) : (
                   <div className="text-gray-400 text-sm">QR Code not available</div>
                 )}
               </div>
            </div>

            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <Clock size={16} />
              <span>Started: {new Date(device.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          {/* 2. INFO DETAILS */}
          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-4">
            <div className="flex items-start">
              <div className="bg-white p-2.5 rounded-full text-primary-600 shadow-sm mr-4">
                <DeviceIcon size={20} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 font-semibold uppercase mb-0.5">Device</p>
                <p className="font-semibold text-gray-900">{device.description}</p>
                <p className="text-sm text-gray-500">{device.type}</p>
              </div>
            </div>
            
            <div className="w-full h-px bg-gray-200" />

            <div className="flex items-start">
              <div className="bg-white p-2.5 rounded-full text-primary-600 shadow-sm mr-4">
                <User size={20} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 font-semibold uppercase mb-0.5">Customer</p>
                <p className="font-semibold text-gray-900">{device.customerName}</p>
              </div>
            </div>

            {device.fee > 0 && (
              <>
                <div className="w-full h-px bg-gray-200" />
                <div className="flex items-center justify-between pt-1">
                  <span className="text-gray-600 font-medium">Total Charge</span>
                  <span className="text-xl font-bold text-primary-700">₦{device.fee.toLocaleString()}</span>
                </div>
              </>
            )}
          </div>

          {/* 3. VERIFICATION SECTION (Only if not collected) */}
          {device.status !== 'collected' && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
              <div className="flex items-center mb-4 text-blue-800">
                <Scan size={20} className="mr-2" />
                <h3 className="font-bold text-base">Pickup Verification</h3>
              </div>
              
              <div className="space-y-3">
                <Input 
                  label="Verify Order Number"
                  placeholder="Enter CS-####"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="bg-white"
                />
                <Button 
                  fullWidth 
                  onClick={handleVerify}
                  disabled={!verificationCode}
                  className="shadow-md shadow-blue-200"
                >
                  Verify Device
                </Button>
              </div>
              <p className="text-xs text-blue-600/70 mt-3 text-center">
                Ask customer for receipt or scan their code
              </p>
            </div>
          )}

          {/* 4. NOTES (Optional) */}
          <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4">
             <div className="flex items-start space-x-3">
               <Tag size={18} className="text-yellow-600 mt-0.5" />
               <div>
                 <p className="text-xs font-bold text-yellow-700 uppercase mb-1">Shop Notes</p>
                 <p className="text-sm text-yellow-800">Handle with care. Customer mentioned the charging port is slightly loose.</p>
               </div>
             </div>
          </div>
        </div>

        {/* STICKY BOTTOM ACTIONS */}
        <div className="p-6 bg-white border-t border-gray-100 md:rounded-b-3xl">
          <div className="grid grid-cols-1 gap-3">
            {device.status === 'charging' && (
              <Button fullWidth onClick={markReady} className="bg-gray-900 hover:bg-gray-800">
                Stop Charging & Mark Ready
              </Button>
            )}
            
            {device.status === 'ready' && (
              <Button fullWidth onClick={markCollected} variant="primary" className="bg-green-600 hover:bg-green-700">
                Skip Verify & Mark Collected
              </Button>
            )}

            {device.status === 'collected' && (
              <div className="text-center py-2 flex items-center justify-center text-green-600 font-medium">
                <CheckCircle size={20} className="mr-2" />
                Device Collected
              </div>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default DeviceDetails;