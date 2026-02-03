import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Layers, Type, Printer, Palette, Check, RefreshCw, LayoutTemplate, ShieldAlert, CreditCard, Box } from 'lucide-react';
import QRCode from 'qrcode';
import { Button, Input } from '../components/UI';
import { useAuth } from '../contexts/AuthContext';
import { StickerConfig } from '../types';

const THEME_COLORS = {
    'blue': { hex: '#2563eb', label: 'Blue' },
    'red': { hex: '#dc2626', label: 'Red' },
    'green': { hex: '#16a34a', label: 'Green' },
    'black': { hex: '#111827', label: 'Black' },
    'gold': { hex: '#ca8a04', label: 'Gold' },
    'purple': { hex: '#7c3aed', label: 'Purple' },
};

const Slots: React.FC = () => {
  const navigate = useNavigate();
  const { shopDetails } = useAuth();
  
  // Studio State
  const [activeTab, setActiveTab] = useState<'design' | 'text' | 'print'>('design');
  const [slotId, setSlotId] = useState('SLOT-01');
  const [qrUrl, setQrUrl] = useState('');
  
  // Configuration State
  const [config, setConfig] = useState<StickerConfig>({
      themeColor: 'blue',
      showLogo: true,
      shopNameOverride: shopDetails?.shopName || 'ChargeSafe',
      footerText: 'Scan to Check-in',
      showCaution: false,
      layout: 'badge'
  });

  // Batch State
  const [batchStart, setBatchStart] = useState('1');
  const [batchCount, setBatchCount] = useState('10');
  const [isGenerating, setIsGenerating] = useState(false);

  // 1. Generate QR Code when slotId changes
  useEffect(() => {
    const generateQR = async () => {
      try {
        const url = await QRCode.toDataURL(slotId, {
           width: 600, margin: 1, 
           color: { dark: '#000000', light: '#ffffff' },
           errorCorrectionLevel: 'H'
        });
        setQrUrl(url);
      } catch (e) { console.error(e); }
    };
    generateQR();
  }, [slotId]);

  // 2. Canvas Drawing Logic (The "Renderer")
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
      const renderSticker = () => {
          const canvas = canvasRef.current;
          if (!canvas || !qrUrl) return;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          // Dimensions (High Res for Print: 600x900 ~ 2x3 aspect ratio)
          const width = 600;
          const height = 900;
          canvas.width = width;
          canvas.height = height;

          const theme = THEME_COLORS[config.themeColor as keyof typeof THEME_COLORS] || THEME_COLORS['blue'];
          const themeHex = theme.hex;

          // --- CLEAR CANVAS ---
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);

          // --- HELPER: DRAW STRIPES ---
          const drawStripes = (y: number, h: number) => {
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, y, width, h);
            ctx.clip();
            ctx.fillStyle = themeHex;
            ctx.fillRect(0, y, width, h);
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            const stripeW = 40;
            for(let i = -height; i < width; i += stripeW * 2) {
                ctx.beginPath();
                ctx.moveTo(i, y);
                ctx.lineTo(i + stripeW, y);
                ctx.lineTo(i + stripeW + h, y + h);
                ctx.lineTo(i + h, y + h);
                ctx.fill();
            }
            ctx.restore();
          };

          const img = new Image();
          img.src = qrUrl;

          img.onload = () => {
            
            // ==========================================
            // LAYOUT: BADGE (Standard ID Card Look)
            // ==========================================
            if (config.layout === 'badge') {
                // Header
                ctx.fillStyle = themeHex;
                ctx.fillRect(0, 0, width, 220);
                
                // Curve at bottom of header
                ctx.beginPath();
                ctx.ellipse(width/2, 220, width/1.2, 40, 0, 0, Math.PI * 2);
                ctx.fillStyle = themeHex;
                ctx.fill();

                // Shop Name
                ctx.fillStyle = '#FFFFFF';
                ctx.font = 'bold 42px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.shadowColor = "rgba(0,0,0,0.3)";
                ctx.shadowBlur = 4;
                ctx.fillText(config.shopNameOverride, width / 2, 100);
                ctx.shadowBlur = 0;

                // Logo Circle
                if (config.showLogo) {
                   ctx.beginPath();
                   ctx.arc(width / 2, 220, 60, 0, Math.PI * 2);
                   ctx.fillStyle = '#FFFFFF';
                   ctx.fill();
                   ctx.lineWidth = 4;
                   ctx.strokeStyle = themeHex;
                   ctx.stroke();
                   // Icon
                   ctx.fillStyle = themeHex;
                   ctx.font = '50px serif';
                   ctx.textAlign = 'center';
                   ctx.textBaseline = 'middle';
                   ctx.fillText('⚡', width/2, 222);
                   ctx.textBaseline = 'alphabetic'; // Reset
                }

                // QR Code
                const qrSize = 420;
                const qrY = 300;
                ctx.drawImage(img, (width - qrSize)/2, qrY, qrSize, qrSize);

                // Slot ID
                ctx.fillStyle = '#111827';
                ctx.font = '900 85px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(slotId, width / 2, 800);

                // Footer
                ctx.fillStyle = '#6B7280';
                ctx.font = '500 24px Inter, sans-serif';
                ctx.fillText(config.footerText, width / 2, 845);
            }

            // ==========================================
            // LAYOUT: INDUSTRIAL (Hazard/Rugged Look)
            // ==========================================
            else if (config.layout === 'industrial') {
                // Hazard Stripes Header
                drawStripes(0, 100);
                
                // Header Text Box
                ctx.fillStyle = '#000000';
                ctx.fillRect(40, 60, width - 80, 80);
                
                ctx.fillStyle = '#FFFFFF'; // White text on black box
                ctx.font = 'bold 36px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(config.shopNameOverride.toUpperCase(), width / 2, 112);

                // QR Code (Boxed)
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 8;
                ctx.strokeRect(60, 200, width - 120, width - 120);
                ctx.drawImage(img, 70, 210, width - 140, width - 140);

                // Slot ID (Stencil style)
                ctx.fillStyle = themeHex;
                ctx.font = '900 110px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(slotId, width / 2, 780);

                // Footer Warning
                if (config.showCaution) {
                    ctx.fillStyle = '#dc2626';
                    ctx.font = 'bold 30px sans-serif';
                    ctx.fillText("⚠ " + config.footerText.toUpperCase(), width/2, 840);
                } else {
                    ctx.fillStyle = '#000000';
                    ctx.font = 'bold 24px monospace';
                    ctx.fillText(config.footerText, width / 2, 840);
                }

                // Bottom Stripes
                drawStripes(height - 40, 40);
            }

            // ==========================================
            // LAYOUT: SIMPLE (Minimalist/Clean)
            // ==========================================
            else {
                // Thick Colored Border
                ctx.strokeStyle = themeHex;
                ctx.lineWidth = 40;
                ctx.strokeRect(0, 0, width, height);

                // Shop Name
                ctx.fillStyle = themeHex;
                ctx.font = 'bold 32px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(config.shopNameOverride, width / 2, 120);

                // QR Code (Maximized)
                const qrSize = 480;
                ctx.drawImage(img, (width - qrSize)/2, 180, qrSize, qrSize);

                // Slot ID
                ctx.fillStyle = '#111827';
                ctx.font = '900 90px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(slotId, width / 2, 780);

                // Small Footer
                ctx.fillStyle = '#9CA3AF';
                ctx.font = '24px Inter, sans-serif';
                ctx.fillText(config.footerText, width / 2, 830);
            }
          };
      };

      // Delay slightly for font loading/image generation
      setTimeout(renderSticker, 50);
  }, [qrUrl, config, slotId]);

  // --- ACTIONS ---
  
  const handleDownloadSingle = () => {
      if (canvasRef.current) {
          const link = document.createElement('a');
          link.download = `ChargeSafe_${config.layout}_${slotId}.png`;
          link.href = canvasRef.current.toDataURL('image/png');
          link.click();
      }
  };

  const handleGenerateBatch = async () => {
      setIsGenerating(true);
      setTimeout(() => {
          alert(`Batch Generation Ready! \n\nIn a real app, this would generate a PDF containing ${batchCount} unique stickers starting from ${batchStart}. \n\nDownloading sample...`);
          handleDownloadSingle();
          setIsGenerating(false);
      }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row h-screen overflow-hidden text-slate-200">
      
      {/* 1. PREVIEW PANE (Top/Left) */}
      <div className="w-full md:w-1/2 bg-[url('https://www.transparenttextures.com/patterns/graphy.png')] bg-slate-900 flex flex-col items-center justify-center p-6 relative h-[45vh] md:h-full border-b md:border-b-0 md:border-r border-slate-800">
         <div className="absolute top-4 left-4 z-10">
            <button onClick={() => navigate('/')} className="bg-slate-800 p-3 rounded-full hover:bg-slate-700 shadow-sm border border-slate-700 transition-all active:scale-95 text-white">
                <ArrowLeft size={20} />
            </button>
         </div>
         
         <div className="relative group">
             {/* The Canvas Card */}
             <div className="bg-white p-0 rounded-none shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] transform transition-transform duration-500 hover:scale-[1.02]">
                 <canvas 
                    ref={canvasRef} 
                    className="w-auto h-auto block"
                    style={{ maxHeight: '60vh', maxWidth: '100%', height: '450px' }}
                 />
             </div>
             
             {/* Reflection Effect */}
             <div className="absolute -bottom-4 left-4 right-4 h-4 bg-black/40 blur-xl rounded-[100%]"></div>
         </div>

         <div className="absolute bottom-6 flex space-x-2">
             <span className="bg-black/50 backdrop-blur px-3 py-1 rounded-full text-xs font-mono font-bold text-slate-400 border border-slate-700">
                600 x 900px • 300 DPI
             </span>
         </div>
      </div>

      {/* 2. STUDIO CONTROLS (Bottom/Right) */}
      <div className="w-full md:w-1/2 bg-slate-950 flex flex-col h-[55vh] md:h-full">
          
          {/* Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-950">
              {[
                { id: 'design', icon: Palette, label: 'Design' },
                { id: 'text', icon: Type, label: 'Content' },
                { id: 'print', icon: Printer, label: 'Batch' }
              ].map(tab => (
                  <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 py-4 font-bold text-sm flex items-center justify-center transition-colors ${
                        activeTab === tab.id 
                        ? 'text-primary-400 border-b-2 border-primary-500 bg-primary-500/10' 
                        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                      <tab.icon size={18} className="mr-2" /> {tab.label}
                  </button>
              ))}
          </div>

          {/* Scrollable Controls */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
              {/* --- DESIGN TAB --- */}
              {activeTab === 'design' && (
                  <div className="space-y-8 animate-in slide-in-from-right-4 fade-in duration-300">
                      
                      {/* Layout Selector */}
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Card Layout</label>
                          <div className="grid grid-cols-3 gap-3">
                              {[
                                  { id: 'badge', label: 'Badge', icon: CreditCard },
                                  { id: 'simple', label: 'Simple', icon: LayoutTemplate },
                                  { id: 'industrial', label: 'Rugged', icon: Box },
                              ].map((layout) => (
                                  <button
                                    key={layout.id}
                                    onClick={() => setConfig({ ...config, layout: layout.id as any })}
                                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                                        config.layout === layout.id
                                        ? 'border-primary-500 bg-primary-500/20 text-primary-400'
                                        : 'border-slate-800 bg-slate-900 text-slate-500 hover:border-slate-700'
                                    }`}
                                  >
                                      <layout.icon size={24} className="mb-2" />
                                      <span className="text-xs font-bold">{layout.label}</span>
                                  </button>
                              ))}
                          </div>
                      </div>

                      {/* Color Selector */}
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Theme Color</label>
                          <div className="flex flex-wrap gap-3">
                              {Object.entries(THEME_COLORS).map(([name, theme]) => (
                                  <button
                                    key={name}
                                    onClick={() => setConfig({ ...config, themeColor: name })}
                                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-sm ${
                                        config.themeColor === name ? 'ring-2 ring-offset-2 ring-slate-500' : ''
                                    }`}
                                    style={{ backgroundColor: theme.hex }}
                                    title={theme.label}
                                  >
                                      {config.themeColor === name && <Check size={20} className="text-white drop-shadow-md" />}
                                  </button>
                              ))}
                          </div>
                      </div>

                      {/* Toggles */}
                      <div className="space-y-3">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Elements</label>
                          
                          <button 
                             onClick={() => setConfig({ ...config, showLogo: !config.showLogo })}
                             className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 transition-colors"
                          >
                             <div className="flex items-center text-slate-300 font-bold">
                                 <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mr-3">⚡</div>
                                 Show Center Logo
                             </div>
                             <div className={`w-12 h-6 rounded-full p-1 transition-colors ${config.showLogo ? 'bg-green-500' : 'bg-slate-700'}`}>
                                 <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${config.showLogo ? 'translate-x-6' : 'translate-x-0'}`} />
                             </div>
                          </button>

                          <button 
                             onClick={() => setConfig({ ...config, showCaution: !config.showCaution })}
                             className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 transition-colors"
                          >
                             <div className="flex items-center text-slate-300 font-bold">
                                 <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mr-3">
                                     <ShieldAlert size={16} />
                                 </div>
                                 High Caution Mode
                             </div>
                             <div className={`w-12 h-6 rounded-full p-1 transition-colors ${config.showCaution ? 'bg-red-500' : 'bg-slate-700'}`}>
                                 <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${config.showCaution ? 'translate-x-6' : 'translate-x-0'}`} />
                             </div>
                          </button>
                      </div>
                  </div>
              )}

              {/* --- TEXT TAB --- */}
              {activeTab === 'text' && (
                  <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start">
                          <RefreshCw size={20} className="text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                          <p className="text-sm text-blue-300">Changes update the preview instantly.</p>
                      </div>

                      <Input 
                          label="Preview Slot ID"
                          value={slotId}
                          onChange={(e) => setSlotId(e.target.value.toUpperCase())}
                          className="font-mono uppercase font-bold tracking-wider"
                      />
                      <Input 
                          label="Shop Name (Header)"
                          value={config.shopNameOverride}
                          onChange={(e) => setConfig({ ...config, shopNameOverride: e.target.value })}
                      />
                      
                      <div>
                          <label className="block text-sm font-bold text-slate-400 mb-2">Footer Instruction</label>
                          <Input 
                              value={config.footerText}
                              onChange={(e) => setConfig({ ...config, footerText: e.target.value })}
                              className="mb-3"
                          />
                          <div className="flex flex-wrap gap-2">
                              {['Scan to Pay', 'No Refunds', 'Pay First', 'Do Not Remove', 'Staff Only'].map(txt => (
                                  <button 
                                    key={txt}
                                    onClick={() => setConfig({ ...config, footerText: txt })}
                                    className="px-3 py-1.5 bg-slate-900 text-xs font-bold text-slate-400 rounded-lg hover:bg-slate-800 transition-colors border border-slate-800"
                                  >
                                      {txt}
                                  </button>
                              ))}
                          </div>
                      </div>
                  </div>
              )}

              {/* --- BATCH TAB --- */}
              {activeTab === 'print' && (
                  <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                      <div className="bg-purple-500/10 p-5 rounded-2xl border border-purple-500/20 text-purple-300">
                          <h4 className="font-bold flex items-center mb-2">
                              <Layers size={18} className="mr-2" /> Batch Generation
                          </h4>
                          <p className="text-sm opacity-80 leading-relaxed">
                              This tool will generate a sequence of stickers (e.g. Slot 1 to 20) and arrange them on an A4 sized sheet for easy printing.
                          </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-5">
                          <Input 
                              label="Start Number"
                              type="number"
                              value={batchStart}
                              onChange={(e) => setBatchStart(e.target.value)}
                              className="font-mono"
                          />
                          <Input 
                              label="Quantity"
                              type="number"
                              value={batchCount}
                              onChange={(e) => setBatchCount(e.target.value)}
                              className="font-mono"
                          />
                      </div>
                      
                      <Button 
                         fullWidth 
                         onClick={handleGenerateBatch} 
                         isLoading={isGenerating}
                         icon={Printer}
                         className="h-14 bg-white text-slate-900 hover:bg-slate-200 shadow-xl shadow-white/5 border-transparent"
                      >
                         Generate Print Sheet
                      </Button>
                  </div>
              )}
          </div>

          {/* Sticky Action Footer (Mobile Only mostly) */}
          <div className="p-4 border-t border-slate-800 bg-slate-950 pb-safe">
              {activeTab !== 'print' && (
                  <Button 
                    fullWidth 
                    onClick={handleDownloadSingle}
                    icon={Download}
                    className="h-14 text-lg shadow-xl shadow-primary-500/20"
                  >
                     Download Image
                  </Button>
              )}
          </div>
      </div>
    </div>
  );
};

export default Slots;