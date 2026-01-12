import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, RefreshCw, Printer } from 'lucide-react';
import QRCode from 'qrcode';
import { Button, Input } from '../components/UI';

const Slots: React.FC = () => {
  const navigate = useNavigate();
  const [slotId, setSlotId] = useState('SLOT-01');
  const [qrDataUrl, setQrDataUrl] = useState('');

  // Generate QR whenever slotId changes
  useEffect(() => {
    const generate = async () => {
      if (!slotId) return;
      try {
        const url = await QRCode.toDataURL(slotId, {
          width: 400,
          margin: 1,
          color: {
            dark: '#1f2937',
            light: '#ffffff',
          },
        });
        setQrDataUrl(url);
      } catch (err) {
        console.error("QR Generation Error", err);
      }
    };
    // Debounce slightly
    const timer = setTimeout(generate, 300);
    return () => clearTimeout(timer);
  }, [slotId]);

  const handleNextSlot = () => {
    // Attempt to increment number in string (e.g. SLOT-01 -> SLOT-02)
    const match = slotId.match(/(\d+)$/);
    if (match) {
      const num = parseInt(match[0], 10) + 1;
      const prefix = slotId.substring(0, match.index);
      // Keep leading zeros
      const newNumStr = num.toString().padStart(match[0].length, '0');
      setSlotId(prefix + newNumStr);
    } else {
      setSlotId(slotId + '-1');
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;

    // Use a canvas to compose the final image with text and white background
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const size = 500;
    const padding = 40;
    
    // Setup Canvas
    canvas.width = size;
    canvas.height = size + 100; // Extra space for text

    if (ctx) {
      // 1. Fill White Background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Draw QR Code
      const img = new Image();
      img.src = qrDataUrl;
      img.onload = () => {
        // Draw image centered horizontally
        ctx.drawImage(img, padding, padding, size - (padding * 2), size - (padding * 2));

        // 3. Draw Text
        ctx.font = 'bold 36px Inter, sans-serif';
        ctx.fillStyle = '#111827';
        ctx.textAlign = 'center';
        ctx.fillText(slotId, size / 2, size + 10);

        ctx.font = '20px Inter, sans-serif';
        ctx.fillStyle = '#6B7280';
        ctx.fillText('ChargeSafe', size / 2, size + 50);

        // 4. Trigger Download
        const link = document.createElement('a');
        link.download = `${slotId}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      };
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center">
      <div className="w-full max-w-lg bg-white min-h-screen md:min-h-fit md:my-8 md:rounded-3xl md:shadow-lg flex flex-col">
        
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 px-6 py-4 border-b border-gray-100 flex items-center justify-between md:rounded-t-3xl">
          <button 
            onClick={() => navigate('/')} 
            className="p-3 -ml-3 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Manage Slots</h1>
          <div className="w-10"></div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 space-y-6">
            <div className="text-center mb-6">
                <h2 className="text-2xl font-black text-gray-900 mb-2">Create Slot Card</h2>
                <p className="text-gray-400 text-sm">Generate and print permanent QR codes for your physical charging slots.</p>
            </div>

            {/* Controls */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-4">
                <Input 
                    label="Slot ID"
                    value={slotId}
                    onChange={(e) => setSlotId(e.target.value.toUpperCase())}
                    placeholder="e.g. SLOT-01"
                    className="font-mono uppercase font-bold text-center tracking-wider text-lg"
                />
                
                <Button 
                    variant="secondary" 
                    fullWidth 
                    onClick={handleNextSlot}
                    icon={RefreshCw}
                    className="h-12"
                >
                    Next Slot
                </Button>
            </div>

            {/* Preview Card */}
            <div className="bg-white border-2 border-gray-900 rounded-3xl p-6 shadow-xl relative overflow-hidden mx-auto max-w-[320px]">
                <div className="absolute top-0 left-0 right-0 h-4 bg-gray-900"></div>
                
                <div className="flex flex-col items-center text-center mt-4">
                     {qrDataUrl ? (
                         <img src={qrDataUrl} alt="QR" className="w-56 h-56 object-contain mix-blend-multiply" />
                     ) : (
                         <div className="w-56 h-56 bg-gray-100 rounded-xl animate-pulse"></div>
                     )}
                     
                     <h3 className="text-3xl font-black text-gray-900 mt-4 tracking-tight">{slotId}</h3>
                     <p className="text-gray-400 font-medium text-sm mt-1 uppercase tracking-widest">ChargeSafe</p>
                </div>
            </div>

            {/* Download Action */}
            <Button 
                onClick={handleDownload} 
                fullWidth 
                className="h-16 text-lg shadow-xl shadow-primary-600/20"
                icon={Download}
            >
                Download Image
            </Button>
            
            <p className="text-center text-xs text-gray-400 mt-4">
                Tip: Print this image and stick it on your charging shelf or card.
            </p>
        </div>
      </div>
    </div>
  );
};

export default Slots;