import React, { useState, useEffect, useRef } from 'react';
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
  Scan, 
  Share2,
  Phone,
  Maximize2,
  X,
  QrCode
} from 'lucide-react';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
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
  const [showImageModal, setShowImageModal] = useState(false);

  // Manual Verification State
  const [verificationCode, setVerificationCode] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Secure Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const scannerRef = useRef<any>(null);

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

  // Clean up scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
           scannerRef.current.stop().catch(console.error);
        } catch (e) { /* ignore */ }
      }
    };
  }, []);

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

  // Manual Verify (Legacy/Fallback)
  const handleVerify = async () => {
    if (!device) return;
    if (verificationCode.trim().toUpperCase() === device.id) {
      setToast({ type: 'success', message: 'Device Verified!' });
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
    if (!currentUser) return;

    // 1. Update Device Status in Shop Collection
    await updateStatus('collected', { endTime: new Date().toISOString() });

    // 2. Clear Slot in 'slots' collection if QR ID exists
    if (device?.qrId) {
       try {
         const slotRef = doc(db, 'slots', device.qrId);
         await setDoc(slotRef, {
             slotId: device.qrId,
             deviceId: null,
             ownerId: currentUser.uid
         }, { merge: true });
       } catch (err) {
         console.error("Error updating slot status:", err);
       }
    }

    setIsCollectModalOpen(false);
    setToast({ type: 'success', message: 'Transaction Completed' });
    navigate('/'); 
  };

  const handleShare = async () => {
    if (!device) return;
    
    const text = `ChargeSafe Receipt\nOrder: ${device.id}\nCustomer: ${device.customerName}\nDevice: ${device.description}\nFee: ₦${device.fee.toLocaleString()}\nStatus: ${device.status.toUpperCase()}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Receipt ${device.id}`,
          text: text,
        });
      } catch (err) {
        console.error('Error sharing', err);
      }
    } else {
      navigator.clipboard.writeText(text);
      setToast({ type: 'success', message: 'Receipt copied to clipboard' });
    }
  };

  // --- SECURE SCANNER LOGIC ---
  const startScanner = () => {
    setIsScanning(true);
    setScanError('');

    setTimeout(() => {
        const Html5Qrcode = (window as any).Html5Qrcode;
        if (!Html5Qrcode) {
            setToast({ type: 'error', message: "Scanner library not loaded" });
            setIsScanning(false);
            return;
        }

        const scanner = new Html5Qrcode("checkout-scanner-reader");
        scannerRef.current = scanner;

        scanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText: string) => {
                // Validation: Check if scanned QR matches the device's assigned QR ID
                if (device && decodedText === device.qrId) {
                    scanner.stop().then(() => {
                        scanner.clear();
                        setIsScanning(false);
                        // Valid Slot -> Execute Checkout
                        confirmCollected();
                    });
                } else {
                    setScanError(`Invalid Slot! Scanned: ${decodedText}`);
                }
            },
            () => {}
        ).catch((err: any) => {
            console.error(err);
            setToast({ type: 'error', message: "Camera permission failed" });
            setIsScanning(false);
        });
    }, 100);
  };

  const stopScanner = async () => {
      if (scannerRef.current) {
          try {
             await scannerRef.current.stop();
             scannerRef.current.clear();
          } catch(e) { console.error(e); }
      }
      setIsScanning(false);
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
      
      {/* FULL SCREEN SCANNER OVERLAY */}
      {isScanning && (
          <div className="fixed inset-0 z-[100] bg-black flex flex-col">
              <div className="p-4 pt-safe flex justify-between items-center z-20">
                  <button onClick={stopScanner} className="p-3 bg-white/20 rounded-full text-white backdrop-blur-sm">
                      <X size={24} />
                  </button>
                  <h2 className="text-white font-bold text-lg">Scan Slot {device.qrId}</h2>
                  <div className="w-10"></div>
              </div>
              
              <div className="flex-1 relative flex items-center justify-center bg-gray-900">
                   <div id="checkout-scanner-reader" className="w-full h-full object-cover"></div>
                   
                   {/* Validation Feedback Overlay */}
                   {scanError && (
                       <div className="absolute top-1/2 left-0 right-0 mt-36 text-center">
                           <div className="inline-flex items-center bg-red-600 text-white px-4 py-2 rounded-full font-bold shadow-lg animate-bounce">
                               <AlertCircle size={20} className="mr-2" />
                               {scanError}
                           </div>
                       </div>
                   )}
              </div>

              <div className="p-6 pb-10 bg-gray-900 text-center text-gray-400">
                  <p>Scan the QR code attached to the charging slot to verify and collect this device.</p>
              </div>
          </div>
      )}

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
          <button 
            onClick={handleShare}
            className="p-3 -mr-3 text-gray-400 hover:text-primary-600 rounded-full hover:bg-gray-50 transition-colors"
          >
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
            <div className="flex items-center justify-center space-x-2 mb-6">
               <p className="text-gray-400 text-xs font-bold tracking-widest uppercase">Order Number</p>
               {device.qrId && (
                   <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold font-mono border border-gray-200">
                       {device.qrId}
                   </span>
               )}
            </div>

            {/* NEW: Device Image Thumbnail if exists */}
            {device.deviceImage && (
              <div 
                className="mb-6 relative group cursor-pointer inline-block"
                onClick={() => setShowImageModal(true)}
              >
                <img 
                  src={device.deviceImage} 
                  alt="Device Condition" 
                  className="w-full max-w-[200px] h-32 object-cover rounded-xl border border-gray-200 shadow-sm" 
                />
                <div className="absolute inset-0 bg-black/20 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Maximize2 className="text-white" size={24} />
                </div>
              </div>
            )}

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
                {device.customerPhone && (
                  <a href={`tel:${device.customerPhone}`} className="text-primary-600 text-sm font-bold flex items-center mt-1 hover:underline">
                    <Phone size={14} className="mr-1" />
                    {device.customerPhone}
                  </a>
                )}
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

          {/* 3. VERIFICATION SECTION */}
          {device.status !== 'collected' && (
            <div className={`border rounded-3xl p-6 ${device.qrId ? 'bg-yellow-50/60 border-yellow-100' : 'bg-blue-50/60 border-blue-100'}`}>
              <div className={`flex items-center mb-4 ${device.qrId ? 'text-yellow-800' : 'text-blue-800'}`}>
                {device.qrId ? <QrCode size={22} className="mr-2" /> : <Scan size={22} className="mr-2" />}
                <h3 className="font-bold text-lg">
                    {device.qrId ? 'Secure Checkout' : 'Pickup Verification'}
                </h3>
              </div>
              
              {device.qrId ? (
                  // Secure Flow: Must Scan Slot
                  <div className="text-center">
                      <p className="text-sm text-gray-600 mb-4">
                          This device is secured in <strong>{device.qrId}</strong>. 
                          You must scan the slot QR code to checkout.
                      </p>
                      <Button 
                        fullWidth 
                        onClick={startScanner}
                        icon={Scan}
                        className="shadow-md shadow-yellow-200 bg-yellow-600 hover:bg-yellow-700 text-white border-transparent"
                      >
                        Scan Slot to Collect
                      </Button>
                  </div>
              ) : (
                  // Manual Flow (Legacy/Walk-in)
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
              )}
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
               device.qrId ? (
                  <Button fullWidth onClick={startScanner} variant="primary" icon={Scan} className="bg-yellow-600 hover:bg-yellow-700 h-14 text-lg">
                    Scan {device.qrId} to Checkout
                  </Button>
               ) : (
                  <Button fullWidth onClick={() => setIsCollectModalOpen(true)} variant="primary" className="bg-green-600 hover:bg-green-700 h-14 text-lg">
                    Confirm Collection
                  </Button>
               )
            )}

            {device.status === 'collected' && (
              <div className="text-center py-2 flex items-center justify-center text-green-600 font-bold bg-green-50 rounded-2xl h-14">
                <CheckCircle size={22} className="mr-2" />
                Device Collected
              </div>
            )}
          </div>
        </div>

        {/* MODALS */}
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
        
        {/* IMAGE PREVIEW MODAL */}
        {showImageModal && device.deviceImage && (
          <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" onClick={() => setShowImageModal(false)}>
             <img src={device.deviceImage} className="max-w-full max-h-full rounded-lg" alt="Full Preview" />
             <button className="absolute top-4 right-4 text-white p-2">
               <span className="sr-only">Close</span>
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
             </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeviceDetails;