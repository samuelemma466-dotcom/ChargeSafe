import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  QrCode,
  ShieldCheck,
  ShieldAlert,
  Timer,
  Tag
} from 'lucide-react';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { DeviceEntry, DeviceType, DeviceStatus } from '../types';
import { Button, Badge, Modal } from '../components/UI';

const DeviceDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { currentUser } = useAuth();
  
  const [device, setDevice] = useState<DeviceEntry | null>((location.state as { device: DeviceEntry })?.device || null);
  const [loading, setLoading] = useState(!device);
  const [error, setError] = useState('');
  
  // Checkout States
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Secure Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const scannerRef = useRef<any>(null);
  
  // Timer State for Auto-Billing
  const [currentFee, setCurrentFee] = useState<number>(0);
  const [elapsedString, setElapsedString] = useState('');

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

  // --- AUTO BILLING LOGIC ---
  useEffect(() => {
      if (!device) return;

      const calculate = () => {
          if (device.status === 'collected') {
              // Fee is fixed once collected
              setCurrentFee(device.fee);
              if(device.endTime) {
                  const diff = new Date(device.endTime).getTime() - new Date(device.startTime).getTime();
                  const hours = Math.floor(diff / (1000 * 60 * 60));
                  const mins = Math.round((diff % (1000 * 60 * 60)) / (1000 * 60));
                  setElapsedString(`${hours}h ${mins}m`);
              }
              return;
          }

          // Dynamic calculation
          const now = new Date();
          const start = new Date(device.startTime);
          const diffMs = now.getTime() - start.getTime();
          
          // Format String
          const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
          const diffMins = Math.round((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          setElapsedString(`${diffHrs}h ${diffMins}m`);

          if (device.billingType === 'hourly' && device.hourlyRate) {
              const hoursDecimal = Math.max(diffMs / (1000 * 60 * 60), 0.5); // Minimum 30 mins charge
              // Simple Round Up Logic or Exact
              const fee = Math.ceil(hoursDecimal * device.hourlyRate); 
              setCurrentFee(fee);
          } else {
              setCurrentFee(device.fee);
          }
      };

      calculate();
      const interval = setInterval(calculate, 60000); // Update every minute
      return () => clearInterval(interval);
  }, [device]);

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
      setToast({ type: 'error', message: 'Failed to update status. Check connection.' });
      throw err;
    }
  };

  const markReady = async () => {
    try {
      // If hourly, we might snapshot the fee here, but usually fee is finalized at collection
      await updateStatus('ready');
      setToast({ type: 'success', message: 'Device marked as Ready' });
    } catch (e) {
      // Error handled in updateStatus
    }
  };

  const confirmCollected = async () => {
    if (!currentUser) return;

    try {
        // 1. Update Device Status with FINAL FEE if hourly
        const finalData: Partial<DeviceEntry> = { 
            endTime: new Date().toISOString(),
            status: 'collected'
        };
        
        if (device?.billingType === 'hourly') {
            finalData.fee = currentFee;
        }

        await updateStatus('collected', finalData);

        // 2. Clear Slot in 'slots' collection if QR ID exists
        if (device?.qrId) {
           const slotRef = doc(db, 'slots', device.qrId);
           // Release the slot
           await setDoc(slotRef, {
               slotId: device.qrId,
               deviceId: null,
               status: 'available',
               shopId: currentUser.uid,
               updatedAt: new Date().toISOString()
           }, { merge: true });
        }

        setIsCollectModalOpen(false);
        setToast({ type: 'success', message: 'Transaction Completed' });
        navigate('/'); 
    } catch (err) {
        console.error("Transaction failed", err);
        setToast({ type: 'error', message: 'Transaction failed. Try again.' });
    }
  };

  const handleShare = async () => {
    if (!device) return;
    
    const text = `ChargeSafe Receipt\nOrder: ${device.id}\nCustomer: ${device.customerName}\nDevice: ${device.description}\nFee: ₦${currentFee.toLocaleString()}\nStatus: ${device.status.toUpperCase()}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Receipt ${device.id}`,
          text: text,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Error sharing', err);
        }
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
                const scannedId = decodedText.trim();
                
                // 1. Validate Scanned ID against Device Slot
                if (device && scannedId === device.qrId) {
                    // MATCH FOUND
                    if (navigator.vibrate) navigator.vibrate(200);
                    scanner.stop().then(() => {
                        scanner.clear();
                        setIsScanning(false);
                        setIsCollectModalOpen(true); // Open modal immediately after success
                    });
                } else {
                    // MISMATCH
                    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                    setScanError(`Mismatch! Device is in ${device?.qrId}, but you scanned ${scannedId}`);
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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-950"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500"></div></div>;
  if (error || !device) return <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-6 text-center"><AlertCircle className="text-red-500 mb-4" size={48} /><h2 className="text-lg font-bold text-white">{error || 'Device Not Found'}</h2><Button className="mt-4" onClick={() => navigate('/')}>Back to Dashboard</Button></div>;

  const DeviceIcon = getIcon(device.type);

  return (
    <div className="min-h-screen bg-slate-950 flex justify-center pb-6">
      
      {/* FULL SCREEN SCANNER OVERLAY */}
      {isScanning && (
          <div className="fixed inset-0 z-[100] bg-black flex flex-col">
              <div className="p-4 pt-safe flex justify-between items-center z-20">
                  <button onClick={stopScanner} className="p-3 bg-white/20 rounded-full text-white backdrop-blur-sm">
                      <X size={24} />
                  </button>
                  <h2 className="text-white font-bold text-lg">Verify Slot {device.qrId}</h2>
                  <div className="w-10"></div>
              </div>
              
              <div className="flex-1 relative flex items-center justify-center bg-gray-900">
                   <div id="checkout-scanner-reader" className="w-full h-full object-cover"></div>
                   
                   {/* Validation Feedback Overlay */}
                   {scanError && (
                       <div className="absolute top-1/2 left-0 right-0 mt-36 text-center px-6">
                           <div className="inline-block bg-red-600 text-white px-6 py-4 rounded-2xl font-bold shadow-xl animate-bounce border-2 border-white/20">
                               <div className="flex items-center justify-center mb-1">
                                   <ShieldAlert size={24} className="mr-2" />
                                   <span>Security Mismatch</span>
                               </div>
                               <div className="text-sm font-normal opacity-90">{scanError}</div>
                           </div>
                       </div>
                   )}
              </div>

              <div className="p-6 pb-10 bg-gray-900 text-center text-gray-400">
                  <p className="font-bold text-white mb-2">Security Check Required</p>
                  <p className="text-sm">Scan QR code {device.qrId} to release this device.</p>
              </div>
          </div>
      )}

      <div className="w-full max-w-lg bg-slate-950 md:my-8 md:rounded-3xl md:shadow-lg min-h-screen md:min-h-fit flex flex-col">
        
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
        <div className="sticky top-0 bg-slate-950/95 backdrop-blur-sm z-10 px-6 py-4 border-b border-slate-800 flex items-center justify-between md:rounded-t-3xl">
          <button 
            onClick={() => navigate('/')} 
            className="p-3 -ml-3 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-lg font-bold text-white">Device Details</h1>
          <button 
            onClick={handleShare}
            className="p-3 -mr-3 text-slate-400 hover:text-primary-400 rounded-full hover:bg-slate-800 transition-colors"
          >
            <Share2 size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* 1. STATUS & ID CARD */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-sm p-8 text-center relative overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-2 ${
              device.status === 'charging' ? 'bg-blue-500' : 
              device.status === 'ready' ? 'bg-green-500' : 'bg-slate-700'
            }`} />
            
            <Badge 
              variant={getStatusColor(device.status) as any} 
              className="mb-4 px-4 py-1.5 text-xs font-bold"
            >
              {device.status}
            </Badge>

            <h2 className="text-4xl font-black text-white mb-1 tracking-tight">{device.id}</h2>
            <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
               <p className="text-slate-500 text-xs font-bold tracking-widest uppercase">Order Number</p>
               {device.qrId && (
                   <span className="bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded text-[10px] font-bold font-mono border border-yellow-500/20">
                       Slot {device.qrId}
                   </span>
               )}
               {device.tagNumber && (
                   <span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded text-[10px] font-bold font-mono border border-blue-500/20">
                       Tag #{device.tagNumber}
                   </span>
               )}
            </div>

            {/* Device Image Thumbnail */}
            {device.deviceImage && (
              <div 
                className="mb-6 relative group cursor-pointer inline-block"
                onClick={() => setShowImageModal(true)}
              >
                <img 
                  src={device.deviceImage} 
                  alt="Device Condition" 
                  className="w-full max-w-[200px] h-32 object-cover rounded-xl border border-slate-700 shadow-sm" 
                />
                <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Maximize2 className="text-white" size={24} />
                </div>
              </div>
            )}

            <div className="flex items-center justify-center space-x-2 text-sm text-slate-400 bg-slate-800 py-2 px-4 rounded-full inline-flex">
              <Clock size={16} />
              <span className="font-medium">{new Date(device.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {elapsedString} elapsed</span>
            </div>
          </div>

          {/* 2. INFO DETAILS */}
          <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 space-y-5">
            <div className="flex items-center">
              <div className="bg-slate-800 p-3 rounded-2xl text-primary-400 shadow-sm mr-4 border border-slate-700">
                <DeviceIcon size={24} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-500 font-bold uppercase mb-0.5">Device</p>
                <p className="font-bold text-white text-lg">{device.description}</p>
                <p className="text-sm text-slate-400 font-medium">{device.type}</p>
              </div>
            </div>
            
            <div className="w-full h-px bg-slate-800" />

            <div className="flex items-center">
              <div className="bg-slate-800 p-3 rounded-2xl text-primary-400 shadow-sm mr-4 border border-slate-700">
                <User size={24} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-500 font-bold uppercase mb-0.5">Customer</p>
                <p className="font-bold text-white text-lg">{device.customerName}</p>
                {device.customerPhone && (
                  <a href={`tel:${device.customerPhone}`} className="text-primary-400 text-sm font-bold flex items-center mt-1 hover:underline">
                    <Phone size={14} className="mr-1" />
                    {device.customerPhone}
                  </a>
                )}
              </div>
            </div>

            <div className="w-full h-px bg-slate-800" />
            <div className="flex items-center justify-between pt-1">
                <div>
                   <span className="text-slate-400 font-medium block">Current Fee</span>
                   {device.billingType === 'hourly' && (
                       <span className="text-xs text-primary-300 bg-primary-900/40 px-2 py-0.5 rounded-full font-bold">
                           @ ₦{device.hourlyRate}/hr
                       </span>
                   )}
                </div>
                <span className="text-2xl font-black text-white">₦{currentFee.toLocaleString()}</span>
            </div>
          </div>

          {/* 3. VERIFICATION SECTION */}
          {device.status !== 'collected' && (
            <div className={`border rounded-3xl p-6 ${device.qrId ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-blue-500/10 border-blue-500/20'}`}>
              <div className={`flex items-center mb-4 ${device.qrId ? 'text-yellow-400' : 'text-blue-400'}`}>
                {device.qrId ? <ShieldCheck size={22} className="mr-2" /> : <Scan size={22} className="mr-2" />}
                <h3 className="font-bold text-lg">
                    {device.qrId ? 'Security Check' : 'Pickup Verification'}
                </h3>
              </div>
              
              {device.qrId ? (
                  // Secure Flow: Must Scan Slot
                  <div className="text-center">
                      <p className="text-sm text-slate-300 font-medium mb-4">
                          Device locked to slot <strong>{device.qrId}</strong>.
                      </p>
                      <Button 
                        fullWidth 
                        onClick={startScanner}
                        icon={Scan}
                        className="shadow-md shadow-yellow-900/20 bg-yellow-600 hover:bg-yellow-500 text-white border-transparent py-4 text-base"
                      >
                        Scan Slot to Release
                      </Button>
                      <p className="text-xs text-slate-500 mt-3 flex items-center justify-center">
                          <ShieldCheck size={12} className="mr-1" /> Manual checkout disabled
                      </p>
                  </div>
              ) : (
                  // Manual Flow
                  <div className="text-center p-4 bg-slate-900 rounded-xl border border-blue-500/30">
                     <p className="text-slate-400 text-sm mb-4">No security slot assigned. Please verify customer identity manually.</p>
                     <Button 
                        fullWidth 
                        onClick={() => setIsCollectModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-500"
                     >
                        Confirm Collection
                     </Button>
                  </div>
              )}
            </div>
          )}
        </div>

        {/* STICKY BOTTOM ACTIONS */}
        <div className="p-6 bg-slate-950 border-t border-slate-800 md:rounded-b-3xl">
          <div className="grid grid-cols-1 gap-3">
            {device.status === 'charging' && (
              <Button fullWidth onClick={markReady} className="bg-slate-800 hover:bg-slate-700 border border-slate-700 h-14 text-lg">
                Mark Ready for Pickup
              </Button>
            )}
            
            {device.status === 'ready' && (
               device.qrId ? (
                  <Button fullWidth onClick={startScanner} variant="primary" icon={Scan} className="bg-yellow-600 hover:bg-yellow-500 h-14 text-lg">
                    Scan {device.qrId} to Checkout
                  </Button>
               ) : (
                  <Button fullWidth onClick={() => setIsCollectModalOpen(true)} variant="primary" className="bg-green-600 hover:bg-green-500 h-14 text-lg">
                    Confirm Collection
                  </Button>
               )
            )}

            {device.status === 'collected' && (
              <div className="text-center py-2 flex items-center justify-center text-green-400 font-bold bg-green-500/10 border border-green-500/20 rounded-2xl h-14">
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
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-500/20 mb-4">
              <CheckCircle className="h-6 w-6 text-green-400" />
            </div>
            <div className="mt-2">
              <p className="text-sm text-slate-400">
                Are you sure you want to mark <strong>{device.id}</strong> as collected?
              </p>
              
              <div className="mt-4 p-3 bg-slate-800 rounded-xl border border-slate-700">
                  <p className="text-xs text-slate-500 uppercase font-bold">Total to Collect</p>
                  <p className="text-2xl font-black text-white">₦{currentFee.toLocaleString()}</p>
                  {device.billingType === 'hourly' && (
                      <p className="text-xs text-blue-400 mt-1 font-medium">({elapsedString} duration)</p>
                  )}
              </div>
            </div>
          </div>
          <div className="mt-6 flex space-x-3">
             <Button fullWidth variant="outline" onClick={() => setIsCollectModalOpen(false)}>
               Cancel
             </Button>
             <Button fullWidth variant="primary" className="bg-green-600 hover:bg-green-500" onClick={confirmCollected}>
               Yes, Collected
             </Button>
          </div>
        </Modal>
        
        {/* IMAGE PREVIEW MODAL */}
        {showImageModal && device.deviceImage && (
          <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4" onClick={() => setShowImageModal(false)}>
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