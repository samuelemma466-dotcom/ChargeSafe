import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { DeviceEntry } from '../types';

const Scan: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(true);
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    // Dynamically access Html5Qrcode to ensure it exists
    const Html5Qrcode = (window as any).Html5Qrcode;
    if (!Html5Qrcode) {
      setError("Scanner library not loaded. Please refresh.");
      return;
    }

    const scannerId = "reader";
    const qrCodeScanner = new Html5Qrcode(scannerId);
    scannerRef.current = qrCodeScanner;

    const startScanning = async () => {
      try {
        await qrCodeScanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          },
          async (decodedText: string) => {
            // Success Callback
            if (isScanning) {
              await handleScan(decodedText);
            }
          },
          (errorMessage: string) => {
            // Parse error, ignore to avoid spamming console
          }
        );
      } catch (err) {
        console.error("Camera start error", err);
        setError("Camera permission denied or not available.");
      }
    };

    startScanning();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().then(() => {
          scannerRef.current.clear();
        }).catch((err: any) => console.error("Failed to stop scanner", err));
      }
    };
  }, []);

  const handleScan = async (qrContent: string) => {
    // 1. Pause scanning
    if (scannerRef.current) {
        await scannerRef.current.pause();
    }
    setIsScanning(false);
    
    // 2. Process Content
    const cardId = qrContent.trim();

    if (!currentUser) return;

    try {
      // 3. Check if this card/slot is currently OCCUPIED (charging or ready)
      // If it is 'collected', it means the slot is technically free for a new user.
      const devicesRef = collection(db, 'shops', currentUser.uid, 'devices');
      
      const q = query(devicesRef, where("qrId", "==", cardId));
      const querySnapshot = await getDocs(q);

      let activeDevice: DeviceEntry | null = null;

      querySnapshot.forEach((doc) => {
        const d = doc.data() as DeviceEntry;
        // Check for any non-completed status
        if (d.status === 'charging' || d.status === 'ready') {
          activeDevice = d;
        }
      });

      if (activeDevice) {
        // SLOT IS OCCUPIED -> Go to Details to manage/collect
        navigate(`/device/${(activeDevice as DeviceEntry).id}`, { state: { device: activeDevice } });
      } else {
        // SLOT IS EMPTY -> Go to Add Device to register new
        navigate('/add', { state: { qrId: cardId } });
      }

    } catch (err) {
      console.error("Error looking up device", err);
      setError("Error checking card status.");
      setIsScanning(true);
      if (scannerRef.current) scannerRef.current.resume();
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 pt-safe flex justify-between items-center bg-gradient-to-b from-black/70 to-transparent">
        <button 
          onClick={() => navigate('/')} 
          className="p-3 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-all"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-white font-bold text-lg drop-shadow-md">Scan QR Slot</h1>
        <div className="w-10"></div>
      </div>

      {/* Scanner Viewport */}
      <div className="flex-1 flex items-center justify-center relative bg-gray-900">
        <div id="reader" className="w-full h-full object-cover"></div>
        
        {/* Overlay Graphic */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-64 h-64 border-2 border-primary-500 rounded-3xl relative opacity-80">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary-500 -mt-1 -ml-1 rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary-500 -mt-1 -mr-1 rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary-500 -mb-1 -ml-1 rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary-500 -mb-1 -mr-1 rounded-br-lg"></div>
                {isScanning && (
                   <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-primary-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse"></div>
                )}
            </div>
        </div>
      </div>

      {/* Footer / Status */}
      <div className="bg-white rounded-t-3xl p-8 min-h-[160px] flex flex-col items-center text-center -mt-6 z-10 relative pb-safe">
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mb-6"></div>
        
        {error ? (
           <div className="text-red-500 flex items-center mb-2">
             <AlertCircle size={20} className="mr-2"/>
             <span className="font-bold">{error}</span>
           </div>
        ) : (
           <>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Scan Slot QR</h2>
            <p className="text-gray-400 text-sm">Point your camera at a slot QR code to check-in or manage a device.</p>
           </>
        )}
      </div>
    </div>
  );
};

export default Scan;