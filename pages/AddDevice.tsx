import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Laptop, Smartphone, Battery, HelpCircle, CheckCircle, Clock, Tag, User, Printer, ScanLine, Wallet, Phone, Camera, X, Share2 } from 'lucide-react';
import QRCode from 'qrcode';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { DeviceType, DeviceEntry, FormState } from '../types';
import { Button, Input, Label } from '../components/UI';

const AddDevice: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [isLoading, setIsLoading] = useState(false);
  
  // Initial time for display
  const [startTimeDisplay, setStartTimeDisplay] = useState('');

  // Check for pre-scanned QR ID
  const scannedQrId = (location.state as { qrId?: string })?.qrId;

  // Form State
  const [formData, setFormData] = useState<FormState>({
    type: DeviceType.PHONE,
    description: '',
    customerName: '',
    customerPhone: '',
    fee: '',
    qrId: scannedQrId || ''
  });

  const [deviceImage, setDeviceImage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const now = new Date();
    setStartTimeDisplay(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTypeSelect = (type: DeviceType) => {
    setFormData(prev => ({ ...prev, type }));
  };

  const handleQuickFee = (amount: string) => {
    setFormData(prev => ({ ...prev, fee: amount }));
  };

  // --- IMAGE HANDLING ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Resize image to max 800px width to save space
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          setDeviceImage(canvas.toDataURL('image/jpeg', 0.7)); // 70% quality
        }
      };
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setDeviceImage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const generateOrderNumber = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `CS-${randomNum}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (isLoading) return;
    setIsLoading(true);

    try {
      const orderId = generateOrderNumber();
      const qrContent = formData.qrId || `Order: ${orderId}`;
      
      const qrCodeDataUrl = await QRCode.toDataURL(qrContent, {
        width: 300,
        margin: 2,
        color: { dark: '#1f2937', light: '#ffffff' },
      });

      const newDevice: DeviceEntry = {
        id: orderId,
        qrId: formData.qrId,
        type: formData.type,
        description: formData.description,
        customerName: formData.customerName || 'Walk-in Customer',
        customerPhone: formData.customerPhone,
        deviceImage: deviceImage,
        startTime: new Date().toISOString(),
        fee: parseFloat(formData.fee) || 0,
        status: 'charging',
        qrCodeBase64: qrCodeDataUrl
      };

      // 1. Save to Device History
      await setDoc(doc(db, 'shops', currentUser.uid, 'devices', orderId), newDevice);

      // 2. Update Slots Collection (New Feature)
      if (formData.qrId) {
        await setDoc(doc(db, 'slots', formData.qrId), {
            slotId: formData.qrId,
            deviceId: orderId,
            ownerId: currentUser.uid
        }, { merge: true });
      }

      setRegisteredDevice(newDevice);
      setStep('success');
      
      if (navigator.vibrate) navigator.vibrate(200);
    } catch (error) {
      console.error("Error adding device: ", error);
      alert("Failed to register device. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const [registeredDevice, setRegisteredDevice] = useState<DeviceEntry | null>(null);

  const handleShareReceipt = async () => {
    if (!registeredDevice) return;
    
    const text = `ChargeSafe Receipt\nOrder: ${registeredDevice.id}\nCustomer: ${registeredDevice.customerName}\nDevice: ${registeredDevice.description}\nFee: ₦${registeredDevice.fee.toLocaleString()}\nDate: ${new Date(registeredDevice.startTime).toLocaleString()}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Receipt ${registeredDevice.id}`,
          text: text,
        });
      } catch (err) {
        // Ignore AbortError when user cancels share
        if ((err as Error).name !== 'AbortError') {
          console.error('Error sharing', err);
        }
      }
    } else {
       // Fallback for desktop or unsupported browsers
       if(navigator.clipboard) {
           await navigator.clipboard.writeText(text);
           alert("Receipt details copied to clipboard!");
       } else {
           alert("Sharing not supported on this device.");
       }
    }
  };

  const getTypeIcon = (type: DeviceType) => {
    switch (type) {
      case DeviceType.PHONE: return Smartphone;
      case DeviceType.LAPTOP: return Laptop;
      case DeviceType.POWER_BANK: return Battery;
      default: return HelpCircle;
    }
  };

  // ----------------------------------------------------------------------
  // VIEW: Success / Receipt
  // ----------------------------------------------------------------------
  if (step === 'success' && registeredDevice) {
    const TypeIcon = getTypeIcon(registeredDevice.type);
    
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden relative">
          
          <div className="bg-green-500 p-8 text-center text-white relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <div className="bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm shadow-inner">
              <CheckCircle size={40} className="text-white" />
            </div>
            <h2 className="text-2xl font-black mb-1">Registered!</h2>
            <p className="text-green-100 font-mono text-lg tracking-wider opacity-90">{registeredDevice.id}</p>
          </div>

          <div className="p-8">
             {registeredDevice.qrId && (
               <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-6 flex items-center justify-center space-x-2 text-yellow-800">
                  <ScanLine size={16} />
                  <span className="font-bold text-sm">Linked to Slot: {registeredDevice.qrId}</span>
               </div>
             )}
             
             <div className="space-y-4 bg-gray-50 p-4 rounded-xl">
                <div className="flex justify-between items-center border-b border-gray-200 pb-3 border-dashed">
                  <span className="text-gray-500 text-sm font-medium">Customer</span>
                  <span className="font-bold text-gray-900 text-right">
                    {registeredDevice.customerName}
                    {registeredDevice.customerPhone && (
                      <div className="text-xs text-gray-400 font-normal">{registeredDevice.customerPhone}</div>
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-200 pb-3 border-dashed">
                  <span className="text-gray-500 text-sm font-medium">Device</span>
                  <div className="flex items-center text-gray-900 font-bold">
                    <TypeIcon size={16} className="mr-2 text-primary-600" />
                    {registeredDevice.description}
                  </div>
                </div>
                {registeredDevice.fee > 0 && (
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-gray-500 text-sm font-medium">Fee to Collect</span>
                    <span className="font-black text-xl text-primary-600">₦{registeredDevice.fee.toLocaleString()}</span>
                  </div>
                )}
             </div>
          </div>

          <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 grid grid-cols-3 gap-3">
            <Button variant="outline" onClick={() => window.print()} icon={Printer} className="text-sm px-2">
              Print
            </Button>
            <Button variant="secondary" onClick={handleShareReceipt} icon={Share2} className="text-sm px-2">
              Share
            </Button>
            <Button onClick={() => navigate('/')} className="text-sm px-2">
              Done
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------------
  // VIEW: Input Form
  // ----------------------------------------------------------------------
  return (
    <div className="h-[100dvh] bg-white md:bg-gray-50 flex justify-center">
      <div className="w-full max-w-lg bg-white h-full md:h-auto md:min-h-fit md:my-8 md:rounded-3xl md:shadow-lg flex flex-col">
        
        {/* Navbar */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 px-6 py-4 border-b border-gray-100 flex items-center justify-between md:rounded-t-3xl pt-safe">
          <button 
            onClick={() => navigate('/')} 
            className="p-3 -ml-3 rounded-full hover:bg-gray-100 text-gray-600 transition-colors active:scale-90"
            aria-label="Back"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Check-in Device</h1>
          <div className="w-10" /> 
        </div>

        {/* Scrollable Form */}
        <div className="flex-1 overflow-y-auto px-6 py-6 scroll-smooth">
          <form id="add-device-form" onSubmit={handleSubmit} className="space-y-8 pb-10">
            
            {/* Start Time Banner */}
            <div className="flex items-center justify-between bg-blue-50/50 rounded-2xl p-4 border border-blue-100">
               <div className="flex items-center space-x-3 text-blue-700">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase opacity-70">Check-in Time</p>
                    <p className="font-bold text-gray-900">{startTimeDisplay}</p>
                  </div>
               </div>
            </div>

             {/* PRE-FILLED QR ID / SCAN BUTTON */}
             {formData.qrId ? (
               <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-xl animate-in slide-in-from-top-2 flex justify-between items-center">
                 <div className="flex items-center">
                   <ScanLine size={20} className="text-green-700 mr-2" />
                   <div>
                     <p className="text-xs font-bold text-green-600 uppercase">Linked Slot</p>
                     <p className="font-bold text-gray-900">{formData.qrId}</p>
                   </div>
                 </div>
                 <button 
                   type="button" 
                   onClick={() => setFormData(prev => ({ ...prev, qrId: '' }))}
                   className="text-xs text-red-500 font-bold underline"
                 >
                   Remove
                 </button>
               </div>
             ) : (
                <button 
                  type="button" 
                  onClick={() => navigate('/scan')}
                  className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl flex items-center justify-center text-gray-500 font-bold hover:bg-gray-50 hover:border-gray-400 transition-all active:scale-[0.98]"
                >
                  <ScanLine className="mr-2" size={20} />
                  Scan Slot QR
                </button>
             )}

            {/* Device Type */}
            <div>
              <Label htmlFor="type" required>Select Device Type</Label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: DeviceType.PHONE, label: 'Phone', icon: Smartphone },
                  { id: DeviceType.POWER_BANK, label: 'Power Bank', icon: Battery },
                  { id: DeviceType.LAPTOP, label: 'Laptop', icon: Laptop },
                  { id: DeviceType.OTHER, label: 'Other', icon: HelpCircle },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleTypeSelect(item.id)}
                    className={`flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all duration-200 active:scale-95 ${
                      formData.type === item.id
                        ? 'border-primary-600 bg-primary-50 text-primary-700 ring-2 ring-primary-200 ring-offset-1 shadow-sm'
                        : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    <item.icon size={30} className={`mb-3 ${formData.type === item.id ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                    <span className="font-bold text-sm">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <Input
              label="Description"
              name="description"
              placeholder="e.g. Samsung A54, Red Case"
              value={formData.description}
              onChange={handleChange}
              required
              icon={Tag}
              autoComplete="off"
            />

            {/* Device Photo */}
            <div>
              <Label htmlFor="photo">Device Photo (Optional)</Label>
              <input 
                type="file" 
                accept="image/*" 
                capture="environment"
                ref={fileInputRef}
                className="hidden"
                onChange={handleImageUpload}
              />
              
              {!deviceImage ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-8 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-gray-400 transition-colors"
                >
                  <div className="bg-gray-100 p-3 rounded-full mb-2">
                    <Camera size={24} className="text-gray-600" />
                  </div>
                  <span className="font-bold text-sm">Take Photo of Device</span>
                  <span className="text-xs mt-1">Capture condition or visual ID</span>
                </button>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-gray-200 group">
                  <img src={deviceImage} alt="Device Preview" className="w-full h-48 object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={clearImage}
                      className="bg-white/20 backdrop-blur-md text-white p-2 rounded-full hover:bg-white/30"
                    >
                      <X size={24} />
                    </button>
                  </div>
                  <button
                     type="button"
                     onClick={clearImage}
                     className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full md:hidden"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Customer Info */}
            <div className="space-y-5 bg-gray-50 p-5 rounded-3xl border border-gray-100">
              <div className="flex items-center text-gray-400 font-bold text-xs uppercase tracking-wider mb-2">
                 <User size={14} className="mr-1.5" /> Customer Details
              </div>
              
              <Input
                name="customerName"
                placeholder="Name (e.g. Mama Tobi)"
                value={formData.customerName}
                onChange={handleChange}
                className="bg-white"
                autoComplete="off"
              />

              <Input
                name="customerPhone"
                type="tel"
                placeholder="Phone (Optional)"
                value={formData.customerPhone}
                onChange={handleChange}
                icon={Phone}
                className="bg-white"
                autoComplete="off"
              />
            </div>

            {/* Fee */}
            <div>
              <Label htmlFor="fee">Charging Fee</Label>
              <div className="relative mb-3">
                <Input
                  name="fee"
                  type="number"
                  placeholder="0"
                  value={formData.fee}
                  onChange={handleChange}
                  icon={Wallet}
                  inputMode="numeric"
                  className="text-lg font-bold text-gray-900"
                />
                <span className="absolute right-5 top-[18px] text-gray-400 font-bold text-lg pointer-events-none">₦</span>
              </div>
              
              {/* Quick Fee Chips */}
              <div className="grid grid-cols-4 gap-2">
                 {['200', '300', '500', '1000'].map((amt) => (
                   <button
                     key={amt}
                     type="button"
                     onClick={() => handleQuickFee(amt)}
                     className={`py-3 rounded-xl text-sm font-bold border transition-colors active:scale-95 ${
                        formData.fee === amt 
                        ? 'bg-primary-600 text-white border-primary-600 shadow-md' 
                        : 'bg-gray-100 text-gray-700 border-gray-100 hover:bg-gray-200'
                     }`}
                   >
                     ₦{amt}
                   </button>
                 ))}
              </div>
            </div>

            {/* Branding */}
            <div className="flex justify-center pt-4 opacity-50">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Powered by ChargeSafe
              </span>
            </div>

          </form>
        </div>

        {/* Sticky Bottom Footer */}
        <div className="p-6 border-t border-gray-100 bg-white md:rounded-b-3xl pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
          <Button 
            type="submit" 
            form="add-device-form" 
            fullWidth 
            className="h-14 text-lg shadow-xl shadow-primary-600/20"
            isLoading={isLoading}
          >
            {isLoading ? 'Saving...' : 'Check-in Device'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddDevice;