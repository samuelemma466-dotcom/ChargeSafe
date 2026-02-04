import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, ScanLine } from 'lucide-react';
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
    // Retry mechanism to ensure script is loaded
    let attempts = 0;
    const maxAttempts = 10;
    
    const initScanner = () => {
        const Html5Qrcode = (window as any).Html5Qrcode;
        if (!Html5Qrcode) {
            if (attempts < maxAttempts) {
                attempts++;
                setTimeout(initScanner, 300); // Retry after 300ms
                return;
            }
            setError("Scanner library not loaded. Please refresh.");
            return;
        }

        const scannerId = "reader";
        // Clear existing instance if any
        try {
             if (scannerRef.current) {
                 scannerRef.current.clear();
             }
        } catch(e) {}

        const qrCodeScanner = new Html5Qrcode(scannerId);
        scannerRef.current = qrCodeScanner;

        qrCodeScanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          },
          async (decodedText: string) => {
            if (isScanning) {
              await handleScan(decodedText);
            }
          },
          (_errorMessage: string) => {
            // Parse error, ignore to avoid spamming console
          }
        ).catch((err: any) => {
           console.error("Camera start error", err);
           setError("Camera permission denied or not available.");
        });
    };

    // Give DOM a moment to render #reader
    setTimeout(initScanner, 100);

    return () => {
      if (scannerRef.current) {
        try {
            scannerRef.current.stop().then(() => {
              scannerRef.current.clear();
            }).catch((err: any) => console.error("Failed to stop scanner", err));
        } catch (e) { console.error("Scanner cleanup error", e); }
      }
    };
  }, []);

  const handleScan = async (qrContent: string) => {
    // 1. Pause scanning
    if (scannerRef.current) {
        try {
            await scannerRef.current.pause();
        } catch (e) {}
    }
    setIsScanning(false);
    
    // 2. Process Content
    const cardId = qrContent.trim();

    if (!currentUser) return;

    try {
      // 3. Check if this card/slot is currently OCCUPIED (charging or ready)
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
      if (scannerRef.current) {
          try {
              scannerRef.current.resume();
          } catch(e) {}
      }
    }
  };

  return (
    <div className="h-full bg-black flex flex-col relative overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 pt-safe flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
        <button 
          onClick={() => navigate('/')} 
          className="p-3 rounded-full bg-slate-800/50 backdrop-blur-md text-white hover:bg-slate-700 transition-all border border-slate-700"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-white font-bold text-lg drop-shadow-md tracking-wide">SCANNER LINK</h1>
        <div className="w-10"></div>
      </div>

      {/* Scanner Viewport */}
      <div className="flex-1 flex items-center justify-center relative bg-slate-950">
        <div id="reader" className="w-full h-full object-cover opacity-80"></div>
        
        {/* Futuristic Overlay Graphic */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-72 h-72 border border-primary-500/30 rounded-3xl relative">
                {/* Corners */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary-500 -mt-1 -ml-1 rounded-tl-xl shadow-[0_0_10px_rgba(14,165,233,0.5)]"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary-500 -mt-1 -mr-1 rounded-tr-xl shadow-[0_0_10px_rgba(14,165,233,0.5)]"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary-500 -mb-1 -ml-1 rounded-bl-xl shadow-[0_0_10px_rgba(14,165,233,0.5)]"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary-500 -mb-1 -mr-1 rounded-br-xl shadow-[0_0_10px_rgba(14,165,233,0.5)]"></div>
                
                {/* Scanning Laser */}
                {isScanning && (
                   <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.8)] animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
                )}
                
                {/* Center Target */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/20">
                    <ScanLine size={48} strokeWidth={1} />
                </div>
            </div>
        </div>
      </div>

      {/* Footer / Status */}
      <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl p-8 min-h-[180px] flex flex-col items-center text-center -mt-6 z-10 relative pb-safe shadow-2xl">
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mb-6"></div>
        
        {error ? (
           <div className="text-red-400 flex items-center mb-2 bg-red-900/20 px-4 py-2 rounded-xl border border-red-500/20">
             <AlertCircle size={20} className="mr-2"/>
             <span className="font-bold">{error}</span>
           </div>
        ) : (
           <>
            <h2 className="text-xl font-bold text-white mb-2">Scan Slot QR</h2>
            <p className="text-slate-400 text-sm max-w-xs">Point your camera at a slot QR code to instantly check-in or manage a device.</p>
           </>
        )}
      </div>
    </div>
  );
};

export default Scan;