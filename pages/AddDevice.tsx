import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Laptop, Smartphone, Battery, HelpCircle, CheckCircle, Clock, Tag, User, Printer, ScanLine, Wallet, Phone, Camera, X, Share2, Timer, UserCheck, AlertTriangle, UserX } from 'lucide-react';
import QRCode from 'qrcode';
import { doc, setDoc, getDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { DeviceType, DeviceEntry, FormState, CustomerProfile } from '../types';
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

  // New Features State
  const [tagNumber, setTagNumber] = useState('');
  const [billingType, setBillingType] = useState<'fixed' | 'hourly'>('fixed');
  const [hourlyRate, setHourlyRate] = useState('100');
  
  // Customer Trust State
  const [customerTrust, setCustomerTrust] = useState<{status: 'unknown' | 'good' | 'bad', reason?: string}>({ status: 'unknown' });
  const [flagAsRisk, setFlagAsRisk] = useState(false);

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
  
  // Customer Lookup Logic
  const handlePhoneChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setFormData(prev => ({ ...prev, customerPhone: val }));
      
      if (val.length >= 10 && currentUser) {
          const docRef = doc(db, 'shops', currentUser.uid, 'customers', val);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
              const data = snap.data() as CustomerProfile;
              setFormData(prev => ({ ...prev, customerName: data.name }));
              
              if (data.isBadActor) {
                  setCustomerTrust({ status: 'bad', reason: data.badActorReason || 'Previous Incident' });
                  setFlagAsRisk(true); // Auto-flag known bad actors
              } else {
                  setCustomerTrust({ status: 'good' });
                  setFlagAsRisk(false);
              }
          } else {
              setCustomerTrust({ status: 'unknown' });
              setFlagAsRisk(false);
          }
      }
  };

  const handleTypeSelect = (type: DeviceType) => {
    setFormData(prev => ({ ...prev, type }));
  };

  const handleQuickFee = (amount: string) => {
    setFormData(prev => ({ ...prev, fee: amount }));
    setBillingType('fixed');
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
          setDeviceImage(canvas.toDataURL('image/jpeg', 0.6)); // 60% quality for smaller storage
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
        tagNumber: tagNumber.trim() || undefined,
        type: formData.type,
        description: formData.description,
        customerName: formData.customerName || 'Walk-in Customer',
        customerPhone: formData.customerPhone,
        deviceImage: deviceImage,
        startTime: new Date().toISOString(),
        fee: billingType === 'fixed' ? (parseFloat(formData.fee) || 0) : 0, // Fee is 0 initially if hourly
        billingType: billingType,
        hourlyRate: billingType === 'hourly' ? parseFloat(hourlyRate) : undefined,
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
            ownerId: currentUser.uid,
            shopId: currentUser.uid, // Ensuring ownership trace
            status: 'occupied',
            createdAt: new Date().toISOString()
        }, { merge: true });
      }

      // 3. Save/Update Customer Profile (Auto-Directory)
      if (formData.customerPhone) {
          const custRef = doc(db, 'shops', currentUser.uid, 'customers', formData.customerPhone);
          const updateData: any = {
              phone: formData.customerPhone,
              name: formData.customerName,
              lastVisit: new Date().toISOString(),
              visitCount: increment(1)
          };

          if (flagAsRisk) {
              updateData.isBadActor = true;
              updateData.badActorReason = 'Flagged at Check-in';
          } else if (customerTrust.status === 'bad' && !flagAsRisk) {
              updateData.isBadActor = false;
          }

          await setDoc(custRef, updateData, { merge: true });
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
    
    let feeText = `Fee: ₦${registeredDevice.fee.toLocaleString()}`;
    if (registeredDevice.billingType === 'hourly') {
        feeText = `Rate: ₦${registeredDevice.hourlyRate}/hr`;
    }

    const text = `ChargeSafe Receipt\nOrder: ${registeredDevice.id}\nCustomer: ${registeredDevice.customerName}\nDevice: ${registeredDevice.description}\n${feeText}\nDate: ${new Date(registeredDevice.startTime).toLocaleString()}`;

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
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
        <div className="w-full max-w-md bg-slate-900 rounded-3xl shadow-xl shadow-black/50 overflow-hidden relative border border-slate-800">
          
          <div className="bg-green-600 p-8 text-center text-white relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <div className="bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm shadow-inner">
              <CheckCircle size={40} className="text-white" />
            </div>
            <h2 className="text-2xl font-black mb-1">Registered!</h2>
            <p className="text-green-100 font-mono text-lg tracking-wider opacity-90">{registeredDevice.id}</p>
          </div>

          <div className="p-8">
             {registeredDevice.qrId && (
               <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 mb-6 flex items-center justify-center space-x-2 text-yellow-500">
                  <ScanLine size={16} />
                  <span className="font-bold text-sm">Linked to Slot: {registeredDevice.qrId}</span>
               </div>
             )}
             
             {registeredDevice.tagNumber && (
               <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 mb-6 flex items-center justify-center space-x-2 text-blue-400">
                  <Tag size={16} />
                  <span className="font-bold text-sm">Tag / Token #{registeredDevice.tagNumber}</span>
               </div>
             )}
             
             <div className="space-y-4 bg-slate-800/50 p-4 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center border-b border-slate-700 pb-3 border-dashed">
                  <span className="text-slate-400 text-sm font-medium">Customer</span>
                  <span className="font-bold text-white text-right">
                    {registeredDevice.customerName}
                    {registeredDevice.customerPhone && (
                      <div className="text-xs text-slate-500 font-normal">{registeredDevice.customerPhone}</div>
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-700 pb-3 border-dashed">
                  <span className="text-slate-400 text-sm font-medium">Device</span>
                  <div className="flex items-center text-white font-bold">
                    <TypeIcon size={16} className="mr-2 text-primary-500" />
                    {registeredDevice.description}
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-1">
                  <span className="text-slate-400 text-sm font-medium">Billing</span>
                  {registeredDevice.billingType === 'hourly' ? (
                      <span className="font-bold text-lg text-primary-400">₦{registeredDevice.hourlyRate}/hr</span>
                  ) : (
                      <span className="font-black text-xl text-primary-400">₦{registeredDevice.fee.toLocaleString()}</span>
                  )}
                </div>
             </div>
          </div>

          <div className="bg-slate-900 px-6 py-4 border-t border-slate-800 grid grid-cols-3 gap-3">
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
    <div className="h-[100dvh] bg-slate-950 md:bg-slate-950 flex justify-center text-slate-200">
      <div className="w-full max-w-lg bg-slate-950 h-full md:h-auto md:min-h-fit md:my-8 md:rounded-3xl md:shadow-lg flex flex-col">
        
        {/* Navbar */}
        <div className="sticky top-0 bg-slate-950/95 backdrop-blur-sm z-10 px-6 py-4 border-b border-slate-800 flex items-center justify-between md:rounded-t-3xl pt-safe">
          <button 
            onClick={() => navigate('/')} 
            className="p-3 -ml-3 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors active:scale-90"
            aria-label="Back"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-lg font-bold text-white">Check-in Device</h1>
          <div className="w-10" /> 
        </div>

        {/* Scrollable Form */}
        <div className="flex-1 overflow-y-auto px-6 py-6 scroll-smooth">
          <form id="add-device-form" onSubmit={handleSubmit} className="space-y-8 pb-10">
            
            {/* Start Time Banner */}
            <div className="flex items-center justify-between bg-blue-500/10 rounded-2xl p-4 border border-blue-500/20">
               <div className="flex items-center space-x-3 text-blue-400">
                  <div className="bg-blue-500/20 p-2 rounded-lg">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase opacity-70">Check-in Time</p>
                    <p className="font-bold text-white">{startTimeDisplay}</p>
                  </div>
               </div>
            </div>

            {/* LOCATION / TOKEN INPUTS */}
            <div className="grid grid-cols-2 gap-4">
                 {/* PRE-FILLED QR ID / SCAN BUTTON */}
                 {formData.qrId ? (
                   <div className="bg-green-500/10 border-l-4 border-green-500 p-3 rounded-r-xl flex flex-col justify-center">
                     <p className="text-[10px] font-bold text-green-400 uppercase mb-1">Slot</p>
                     <div className="flex justify-between items-center">
                         <p className="font-bold text-white">{formData.qrId}</p>
                         <button type="button" onClick={() => setFormData(prev => ({ ...prev, qrId: '' }))}>
                             <X size={14} className="text-green-400" />
                         </button>
                     </div>
                   </div>
                 ) : (
                    <button 
                      type="button" 
                      onClick={() => navigate('/scan')}
                      className="border-2 border-dashed border-slate-700 rounded-xl p-3 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-900 hover:border-slate-600 transition-colors"
                    >
                      <ScanLine size={18} className="mb-1" />
                      <span className="text-xs font-bold">Scan Slot</span>
                    </button>
                 )}

                 {/* PHYSICAL TAG INPUT */}
                 <div className="relative">
                    <input 
                       className="w-full h-full rounded-xl bg-slate-900 border border-slate-800 text-white pl-9 pr-3 py-3 text-sm font-bold focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all placeholder-slate-600"
                       placeholder="Token #"
                       value={tagNumber}
                       onChange={(e) => setTagNumber(e.target.value)}
                    />
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                 </div>
            </div>

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
                        ? 'border-primary-500 bg-primary-500/20 text-primary-400 ring-2 ring-primary-500/20 ring-offset-0 shadow-sm'
                        : 'border-slate-800 bg-slate-900 text-slate-500 hover:border-slate-700 hover:bg-slate-800'
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
              <Label htmlFor="photo">Proof of Condition (Selfie/Device)</Label>
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
                  className="w-full py-8 border-2 border-dashed border-slate-700 rounded-2xl flex flex-col items-center justify-center text-slate-500 hover:bg-slate-900 hover:border-slate-500 transition-colors"
                >
                  <div className="bg-slate-800 p-3 rounded-full mb-2">
                    <Camera size={24} className="text-slate-400" />
                  </div>
                  <span className="font-bold text-sm">Take Photo</span>
                  <span className="text-xs mt-1 text-center max-w-[200px] text-slate-500">Capture device damage OR customer holding device</span>
                </button>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-slate-700 group">
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
                </div>
              )}
            </div>

            {/* Customer Info (With Lookup) */}
            <div className={`space-y-5 bg-slate-900 p-5 rounded-3xl border transition-colors ${
                customerTrust.status === 'bad' ? 'border-red-500/30 bg-red-500/5' : 'border-slate-800'
            }`}>
              <div className="flex items-center justify-between">
                  <div className="flex items-center text-slate-400 font-bold text-xs uppercase tracking-wider mb-2">
                     <User size={14} className="mr-1.5" /> Customer Details
                  </div>
                  {customerTrust.status === 'bad' && (
                     <div className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded-full flex items-center border border-red-500/20">
                         <AlertTriangle size={12} className="mr-1" /> Flagged
                     </div>
                  )}
                  {customerTrust.status === 'good' && (
                     <div className="text-xs font-bold text-green-400 bg-green-500/10 px-2 py-1 rounded-full flex items-center border border-green-500/20">
                         <UserCheck size={12} className="mr-1" /> Trusted
                     </div>
                  )}
              </div>
              
              <Input
                name="customerPhone"
                type="tel"
                placeholder="Phone (Auto-Lookup)"
                value={formData.customerPhone}
                onChange={handlePhoneChange}
                icon={Phone}
                className="bg-slate-800"
                autoComplete="off"
              />

              <Input
                name="customerName"
                placeholder="Name"
                value={formData.customerName}
                onChange={handleChange}
                className="bg-slate-800"
                autoComplete="off"
              />

              {/* SECURITY FLAG TOGGLE */}
              <div 
                  onClick={() => setFlagAsRisk(!flagAsRisk)}
                  className={`p-3 rounded-xl border-2 flex items-center cursor-pointer transition-all ${
                      flagAsRisk 
                      ? 'border-red-500 bg-red-500/10' 
                      : 'border-transparent bg-slate-800 hover:bg-slate-700 hover:border-slate-600'
                  }`}
              >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 ${
                      flagAsRisk ? 'border-red-500 bg-red-500 text-white' : 'border-slate-500'
                  }`}>
                      {flagAsRisk && <UserX size={12} />}
                  </div>
                  <div>
                      <p className={`text-xs font-bold ${flagAsRisk ? 'text-red-400' : 'text-slate-300'}`}>
                          Flag as High Risk
                      </p>
                  </div>
              </div>
            </div>

            {/* Fee Section */}
            <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800">
               <div className="flex justify-between items-center mb-4">
                  <Label htmlFor="fee">Charging Fee</Label>
                  {/* Toggle Switch */}
                  <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
                      <button
                         type="button"
                         onClick={() => setBillingType('fixed')}
                         className={`text-xs font-bold px-3 py-1.5 rounded-md transition-all ${
                             billingType === 'fixed' ? 'bg-slate-600 shadow-sm text-white' : 'text-slate-400 hover:text-white'
                         }`}
                      >Fixed</button>
                      <button
                         type="button"
                         onClick={() => setBillingType('hourly')}
                         className={`text-xs font-bold px-3 py-1.5 rounded-md transition-all flex items-center ${
                             billingType === 'hourly' ? 'bg-slate-600 shadow-sm text-white' : 'text-slate-400 hover:text-white'
                         }`}
                      ><Timer size={12} className="mr-1"/> Hourly</button>
                  </div>
               </div>
              
              {billingType === 'fixed' ? (
                  <>
                    <div className="relative mb-3">
                        <Input
                        name="fee"
                        type="number"
                        placeholder="0"
                        value={formData.fee}
                        onChange={handleChange}
                        icon={Wallet}
                        inputMode="numeric"
                        className="text-lg font-bold text-white bg-slate-800"
                        />
                        <span className="absolute right-5 top-[18px] text-slate-500 font-bold text-lg pointer-events-none">₦</span>
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
                                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                            }`}
                        >
                            ₦{amt}
                        </button>
                        ))}
                    </div>
                  </>
              ) : (
                  // Hourly Rate Input
                  <div className="bg-blue-500/10 p-4 rounded-2xl border border-blue-500/20">
                      <p className="text-xs text-blue-400 font-medium mb-2">Fee will be calculated at checkout based on duration.</p>
                      <div className="flex items-center space-x-3">
                          <span className="font-bold text-slate-300">Rate/Hour:</span>
                          <div className="relative flex-1">
                             <input 
                               type="number" 
                               value={hourlyRate}
                               onChange={(e) => setHourlyRate(e.target.value)}
                               className="w-full rounded-xl bg-slate-800 border-slate-700 text-white focus:ring-blue-500 py-2 pl-8 font-bold"
                             />
                             <span className="absolute left-3 top-2.5 text-slate-500">₦</span>
                          </div>
                      </div>
                  </div>
              )}
            </div>

            {/* Branding */}
            <div className="flex justify-center pt-4 opacity-30">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Powered by ChargeSafe
              </span>
            </div>

          </form>
        </div>

        {/* Sticky Bottom Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-950 md:rounded-b-3xl pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.2)] z-20">
          <Button 
            type="submit" 
            form="add-device-form" 
            fullWidth 
            className="h-14 text-lg shadow-xl shadow-primary-900/50"
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