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
import { Button, Input, Badge, Modal } from '../components/UI';

const DeviceDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { currentUser } = useAuth();
  
  const [device, setDevice] = useState<DeviceEntry | null>((location.state as { device: DeviceEntry })?.device || null);
  const [loading, setLoading] = useState(!device);
  const [error, setError] = useState('');
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);

  const [verificationCode, setVerificationCode] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);

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
    if (verificationCode.trim().toUpperCase() === device.id) {
      setToast({ type: 'success', message: 'Device Verified!' });
      // Open modal instead of auto-collecting for safety
      setIsCollectModalOpen(true);
    } else {
      setToast({ type: 'error', message: 'Wrong Order Number' });
    }
  };

  const markReady = async () => {
    await updateStatus('ready');
    setToast({ type: 'success', message: 'Device marked as Ready' });
  };

  const confirmCollected = async () => {
    await updateStatus('collected', { endTime: new Date().toISOString() });
    setIsCollectModalOpen(false);
    setToast({ type: 'success', message: 'Transaction Completed' });
    navigate('/'); // Go back to dashboard after collection
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
          <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-xl flex items-center space-x-3 animate-in slide-in-from-top-4 fade-in duration-300 ${
            toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}>
            {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span className="font-bold text-sm">{toast.message}</span>
          </div>
        )}

        {/* HEADER */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 px-6 py-4 border-b border-gray-100 flex items-center justify-between md:rounded-t-3xl">
          <button 
            onClick={() => navigate('/')} 
            className="p-3 -ml-3 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Device Details</h1>
          <button className="p-3 -mr-3 text-gray-400 hover:text-primary-600 rounded-full hover:bg-gray-50">
            <Share2 size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* 1. STATUS & ID CARD */}
          <div className="bg-white border border-gray-200 rounded-3xl shadow-sm p-8 text-center relative overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-2 ${
              device.status === 'charging' ? 'bg-blue-500' : 
              device.status === 'ready' ? 'bg-green-500' : 'bg-gray-400'
            }`} />
            
            <Badge 
              variant={getStatusColor(device.status) as any} 
              className="mb-4 px-4 py-1.5 text-xs font-bold"
            >
              {device.status}
            </Badge>

            <h2 className="text-4xl font-black text-gray-900 mb-1 tracking-tight">{device.id}</h2>
            <p className="text-gray-400 text-xs font-bold tracking-widest uppercase mb-6">Order Number</p>

            <div className="flex justify-center mb-6">
               <div className="p-4 bg-white border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center">
                 {device.qrCodeBase64 ? (
                   <img 
                      src={device.qrCodeBase64} 
                      alt="Device QR Code" 
                      className={`w-32 h-32 object-contain ${device.status === 'collected' ? 'opacity-30 grayscale' : ''}`}
                   />
                 ) : (
                   <div className="text-gray-400 text-sm font-medium">No Code</div>
                 )}
               </div>
            </div>

            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 bg-gray-50 py-2 px-4 rounded-full inline-flex">
              <Clock size={16} />
              <span className="font-medium">Started: {new Date(device.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          {/* 2. INFO DETAILS */}
          <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-5">
            <div className="flex items-center">
              <div className="bg-white p-3 rounded-2xl text-primary-600 shadow-sm mr-4 border border-gray-100">
                <DeviceIcon size={24} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-400 font-bold uppercase mb-0.5">Device</p>
                <p className="font-bold text-gray-900 text-lg">{device.description}</p>
                <p className="text-sm text-gray-500 font-medium">{device.type}</p>
              </div>
            </div>
            
            <div className="w-full h-px bg-gray-200" />

            <div className="flex items-center">
              <div className="bg-white p-3 rounded-2xl text-primary-600 shadow-sm mr-4 border border-gray-100">
                <User size={24} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-400 font-bold uppercase mb-0.5">Customer</p>
                <p className="font-bold text-gray-900 text-lg">{device.customerName}</p>
              </div>
            </div>

            {device.fee > 0 && (
              <>
                <div className="w-full h-px bg-gray-200" />
                <div className="flex items-center justify-between pt-1">
                  <span className="text-gray-500 font-medium">To Pay</span>
                  <span className="text-2xl font-black text-gray-900">₦{device.fee.toLocaleString()}</span>
                </div>
              </>
            )}
          </div>

          {/* 3. VERIFICATION SECTION (Only if not collected) */}
          {device.status !== 'collected' && (
            <div className="bg-blue-50/60 border border-blue-100 rounded-3xl p-6">
              <div className="flex items-center mb-4 text-blue-800">
                <Scan size={22} className="mr-2" />
                <h3 className="font-bold text-lg">Pickup Verification</h3>
              </div>
              
              <div className="space-y-4">
                <Input 
                  placeholder="Enter CS-####"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="bg-white text-center text-lg font-bold tracking-widest uppercase placeholder:normal-case placeholder:tracking-normal placeholder:font-normal"
                />
                <Button 
                  fullWidth 
                  onClick={handleVerify}
                  disabled={!verificationCode}
                  className="shadow-md shadow-blue-200 bg-blue-600 hover:bg-blue-700"
                >
                  Verify & Collect
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* STICKY BOTTOM ACTIONS */}
        <div className="p-6 bg-white border-t border-gray-100 md:rounded-b-3xl">
          <div className="grid grid-cols-1 gap-3">
            {device.status === 'charging' && (
              <Button fullWidth onClick={markReady} className="bg-gray-900 hover:bg-gray-800 h-14 text-lg">
                Mark Ready for Pickup
              </Button>
            )}
            
            {device.status === 'ready' && (
              <Button fullWidth onClick={() => setIsCollectModalOpen(true)} variant="primary" className="bg-green-600 hover:bg-green-700 h-14 text-lg">
                Confirm Collection
              </Button>
            )}

            {device.status === 'collected' && (
              <div className="text-center py-2 flex items-center justify-center text-green-600 font-bold bg-green-50 rounded-2xl h-14">
                <CheckCircle size={22} className="mr-2" />
                Device Collected
              </div>
            )}
          </div>
        </div>

        {/* CONFIRM COLLECTION MODAL */}
        <Modal 
          isOpen={isCollectModalOpen} 
          onClose={() => setIsCollectModalOpen(false)}
          title="Confirm Collection"
        >
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                Are you sure you want to mark <strong>{device.id}</strong> as collected?
              </p>
              {device.fee > 0 && (
                <div className="mt-4 p-3 bg-gray-50 rounded-xl">
                   <p className="text-xs text-gray-500 uppercase font-bold">Collect Payment</p>
                   <p className="text-2xl font-black text-gray-900">₦{device.fee.toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>
          <div className="mt-6 flex space-x-3">
             <Button fullWidth variant="outline" onClick={() => setIsCollectModalOpen(false)}>
               Cancel
             </Button>
             <Button fullWidth variant="primary" className="bg-green-600 hover:bg-green-700" onClick={confirmCollected}>
               Yes, Collected
             </Button>
          </div>
        </Modal>
        
      </div>
    </div>
  );
};

export default DeviceDetails;