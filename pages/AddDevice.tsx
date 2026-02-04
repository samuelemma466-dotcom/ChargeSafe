import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, 
  Laptop, 
  Smartphone, 
  Battery, 
  HelpCircle, 
  CheckCircle, 
  Clock, 
  Tag, 
  User, 
  Printer, 
  ScanLine, 
  Phone, 
  Camera, 
  X, 
  Timer, 
  UserX, 
  AlertTriangle, 
  Tablet, 
  Headphones,
  Gamepad2,
  Watch
} from 'lucide-react';
import QRCode from 'qrcode';
import { doc, setDoc, getDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { DeviceType, DeviceEntry, CustomerProfile } from '../types';
import { Button, Input, Label, Badge } from '../components/UI';

// --- CONSTANTS ---
const DEVICE_TYPES = [
  { id: DeviceType.PHONE, label: 'Phone', icon: Smartphone, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  { id: DeviceType.POWER_BANK, label: 'Power Bank', icon: Battery, color: 'text-green-400 bg-green-500/10 border-green-500/20' },
  { id: DeviceType.LAPTOP, label: 'Laptop', icon: Laptop, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  { id: 'Tablet', label: 'Tablet', icon: Tablet, color: 'text-pink-400 bg-pink-500/10 border-pink-500/20' },
  { id: 'Audio', label: 'Audio', icon: Headphones, color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  { id: 'Game', label: 'Console', icon: Gamepad2, color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  { id: 'Watch', label: 'Watch', icon: Watch, color: 'text-teal-400 bg-teal-500/10 border-teal-500/20' },
  { id: DeviceType.OTHER, label: 'Other', icon: HelpCircle, color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
];

const PRESET_FEES = ['200', '300', '500', '1000'];

const AddDevice: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  
  // --- STATE ---
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  // Form Data
  const [type, setType] = useState<string>(DeviceType.PHONE);
  const [description, setDescription] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [fee, setFee] = useState('');
  const [qrId, setQrId] = useState<string>('');
  const [tagNumber, setTagNumber] = useState('');
  const [billingType, setBillingType] = useState<'fixed' | 'hourly'>('fixed');
  const [hourlyRate, setHourlyRate] = useState('100');
  const [deviceImage, setDeviceImage] = useState<string>('');

  // Validation / Lookup State
  const [customerStatus, setCustomerStatus] = useState<'new' | 'trusted' | 'risky'>('new');
  const [riskReason, setRiskReason] = useState('');
  const [flagRisk, setFlagRisk] = useState(false);
  const [slotStatus, setSlotStatus] = useState<'checking' | 'valid' | 'occupied' | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [registeredDevice, setRegisteredDevice] = useState<DeviceEntry | null>(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    // 1. Clock
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 60000);

    // 2. Handle Scanned QR (from Scan page)
    const scannedQr = (location.state as { qrId?: string })?.qrId;
    if (scannedQr) {
      setQrId(scannedQr);
      validateSlot(scannedQr);
    }

    return () => clearInterval(timer);
  }, []);

  // --- HELPERS ---

  const validateSlot = async (slotId: string) => {
    if (!currentUser) return;
    setSlotStatus('checking');
    try {
      // Check if slot is already occupied in 'slots' collection or via active devices
      const slotRef = doc(db, 'slots', slotId);
      const slotSnap = await getDoc(slotRef);
      
      if (slotSnap.exists() && slotSnap.data().status === 'occupied') {
        setSlotStatus('occupied');
      } else {
        setSlotStatus('valid');
      }
    } catch (e) {
      console.error("Slot check failed", e);
      setSlotStatus(null);
    }
  };

  const lookupCustomer = async (phoneVal: string) => {
    if (phoneVal.length < 10 || !currentUser) {
      setCustomerStatus('new');
      return;
    }

    try {
      const docRef = doc(db, 'shops', currentUser.uid, 'customers', phoneVal);
      const snap = await getDoc(docRef);
      
      if (snap.exists()) {
        const data = snap.data() as CustomerProfile;
        setCustomerName(prev => prev || data.name); // Only fill if empty
        
        if (data.isBadActor) {
          setCustomerStatus('risky');
          setRiskReason(data.badActorReason || 'Past Incident');
          setFlagRisk(true);
        } else {
          setCustomerStatus('trusted');
          setFlagRisk(false);
        }
      } else {
        setCustomerStatus('new');
      }
    } catch (e) {
      console.error("Lookup failed", e);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
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
        ctx?.drawImage(img, 0, 0, width, height);
        setDeviceImage(canvas.toDataURL('image/jpeg', 0.6));
      };
      if (event.target?.result) img.src = event.target.result as string;
    };
    reader.readAsDataURL(file);
  };

  // --- SUBMISSION ---

  const generateOrderNumber = () => {
    return `CS-${Math.floor(1000 + Math.random() * 9000)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || isLoading) return;
    
    // Prevent submission if slot is occupied
    if (slotStatus === 'occupied') {
        alert("This slot is currently occupied. Please choose another slot or scan a different code.");
        return;
    }

    if (!description || !type) {
      alert("Please fill in device details.");
      return;
    }

    setIsLoading(true);

    try {
      const orderId = generateOrderNumber();
      const nowISO = new Date().toISOString();

      // Generate QR for the Receipt
      const receiptQr = await QRCode.toDataURL(orderId, { margin: 1, color: { dark: '#000000', light: '#ffffff' } });

      // FIX: Use NULL instead of undefined for Firebase compatibility
      const newDevice: DeviceEntry = {
        id: orderId,
        qrId: qrId || null as any,
        tagNumber: tagNumber || null as any,
        type: type as DeviceType,
        description,
        customerName: customerName || 'Guest',
        customerPhone: customerPhone || null as any,
        deviceImage: deviceImage || null as any,
        startTime: nowISO,
        fee: billingType === 'fixed' ? (parseFloat(fee) || 0) : 0,
        billingType,
        hourlyRate: billingType === 'hourly' ? parseFloat(hourlyRate) : null as any,
        status: 'charging',
        qrCodeBase64: receiptQr
      };

      // 1. Save Device
      await setDoc(doc(db, 'shops', currentUser.uid, 'devices', orderId), newDevice);

      // 2. Update Slot (if used)
      if (qrId) {
        await setDoc(doc(db, 'slots', qrId), {
          slotId: qrId,
          deviceId: orderId,
          shopId: currentUser.uid,
          status: 'occupied',
          updatedAt: nowISO
        }, { merge: true });
      }

      // 3. Update Customer Directory
      if (customerPhone) {
        const custRef = doc(db, 'shops', currentUser.uid, 'customers', customerPhone);
        const custData: any = {
          phone: customerPhone,
          name: customerName || 'Guest',
          lastVisit: nowISO,
          visitCount: increment(1)
        };
        
        if (flagRisk) {
          custData.isBadActor = true;
          custData.badActorReason = 'Flagged at Check-in';
        } else if (customerStatus === 'risky' && !flagRisk) {
          custData.isBadActor = false; // Forgiven
        }

        await setDoc(custRef, custData, { merge: true });
      }

      setRegisteredDevice(newDevice);
      setStep('success');
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

    } catch (err) {
      console.error("Submit failed", err);
      alert("Error checking in device. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- RENDER SUCCESS VIEW ---
  if (step === 'success' && registeredDevice) {
    return (
      <div className="h-full bg-slate-950 flex flex-col p-4 animate-in fade-in duration-500 overflow-y-auto">
        <div className="flex-1 flex flex-col items-center justify-center min-h-[500px]">
          
          {/* DIGITAL TICKET */}
          <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl shadow-white/5 relative">
            
            {/* Ticket Header */}
            <div className="bg-slate-900 p-6 text-center border-b-4 border-primary-500 relative">
               <div className="w-3 h-3 bg-slate-950 rounded-full absolute -bottom-1.5 -left-1.5"></div>
               <div className="w-3 h-3 bg-slate-950 rounded-full absolute -bottom-1.5 -right-1.5"></div>
               <h2 className="text-white font-black text-xl tracking-wider">CHARGESAFE</h2>
               <p className="text-slate-400 text-xs font-mono uppercase mt-1">Check-in Receipt</p>
            </div>

            {/* Ticket Body */}
            <div className="p-8 flex flex-col items-center">
               <h1 className="text-4xl font-black text-slate-900 mb-2">{registeredDevice.id}</h1>
               <p className="text-slate-500 font-bold text-sm mb-6">{new Date(registeredDevice.startTime).toLocaleString()}</p>

               {/* QR Code */}
               <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 mb-6">
                 <img src={registeredDevice.qrCodeBase64} alt="Order QR" className="w-40 h-40 mix-blend-multiply" />
               </div>

               {/* Details */}
               <div className="w-full space-y-3">
                 <div className="flex justify-between items-center text-sm border-b border-dashed border-slate-200 pb-2">
                    <span className="text-slate-500">Customer</span>
                    <span className="font-bold text-slate-900">{registeredDevice.customerName}</span>
                 </div>
                 <div className="flex justify-between items-center text-sm border-b border-dashed border-slate-200 pb-2">
                    <span className="text-slate-500">Device</span>
                    <span className="font-bold text-slate-900">{registeredDevice.description}</span>
                 </div>
                 {registeredDevice.qrId && (
                   <div className="flex justify-between items-center text-sm border-b border-dashed border-slate-200 pb-2">
                      <span className="text-slate-500">Slot ID</span>
                      <span className="font-black text-primary-600">{registeredDevice.qrId}</span>
                   </div>
                 )}
                 <div className="flex justify-between items-center pt-1">
                    <span className="text-slate-500 font-bold">Total Due</span>
                    {registeredDevice.billingType === 'fixed' ? (
                       <span className="font-black text-xl text-slate-900">₦{registeredDevice.fee.toLocaleString()}</span>
                    ) : (
                       <span className="font-black text-lg text-slate-900">₦{registeredDevice.hourlyRate}/hr</span>
                    )}
                 </div>
               </div>
            </div>

            {/* Ticket Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-100 text-center">
               <p className="text-[10px] text-slate-400 font-mono">Keep this ticket to collect your device.</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 mb-safe grid grid-cols-2 gap-4 max-w-sm mx-auto w-full flex-none">
           <Button variant="secondary" onClick={() => window.print()} icon={Printer}>Print</Button>
           <Button onClick={() => navigate('/')} icon={CheckCircle}>Done</Button>
        </div>
      </div>
    );
  }

  // --- RENDER FORM VIEW ---
  return (
    <div className="h-full bg-slate-950 flex flex-col text-slate-200 relative overflow-hidden">
      
      {/* HEADER (Fixed) */}
      <div className="flex-none sticky top-0 z-20 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 pt-safe flex items-center justify-between">
        <button onClick={() => navigate('/')} className="p-2 rounded-full bg-slate-900 text-slate-400 hover:text-white">
           <ArrowLeft size={20} />
        </button>
        <div className="text-center">
           <h1 className="text-base font-bold text-white">New Device</h1>
           <div className="flex items-center justify-center text-[10px] text-primary-400 font-mono">
              <Clock size={10} className="mr-1" /> {currentTime}
           </div>
        </div>
        <div className="w-9"></div> {/* Spacer */}
      </div>

      {/* SCROLLABLE FORM */}
      <div className="flex-1 overflow-y-auto pb-32">
        <form id="add-form" onSubmit={handleSubmit} className="p-5 space-y-6">
           
           {/* SECTION 1: SLOT & ID */}
           <div className="grid grid-cols-2 gap-4">
              {/* Slot Indicator */}
              {qrId ? (
                <div className={`rounded-2xl p-4 border flex flex-col justify-center relative overflow-hidden ${
                  slotStatus === 'occupied' 
                  ? 'bg-red-500/10 border-red-500/30' 
                  : 'bg-primary-500/10 border-primary-500/30'
                }`}>
                   <div className="flex justify-between items-start mb-1 relative z-10">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        slotStatus === 'occupied' ? 'text-red-400' : 'text-primary-400'
                      }`}>Slot ID</span>
                      {slotStatus === 'occupied' && <AlertTriangle size={14} className="text-red-500" />}
                   </div>
                   <div className="font-black text-2xl text-white relative z-10">{qrId}</div>
                   {/* Background Icon */}
                   <ScanLine className="absolute -bottom-2 -right-2 text-white/5 w-16 h-16" />
                   
                   <button 
                     type="button" 
                     onClick={() => { setQrId(''); setSlotStatus(null); }}
                     className="absolute top-2 right-2 bg-black/20 rounded-full p-1 text-white/70 hover:text-white"
                   >
                     <X size={12} />
                   </button>

                   {/* Occupied Overlay */}
                   {slotStatus === 'occupied' && (
                       <div className="absolute inset-0 bg-red-950/80 backdrop-blur-[2px] z-20 flex items-center justify-center">
                           <span className="text-xs font-bold text-red-200 bg-red-900/80 px-2 py-1 rounded">OCCUPIED</span>
                       </div>
                   )}
                </div>
              ) : (
                <button 
                  type="button" 
                  onClick={() => navigate('/scan')}
                  className="rounded-2xl border-2 border-dashed border-slate-800 p-4 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-900 hover:border-slate-600 transition-all active:scale-95"
                >
                  <ScanLine size={24} className="mb-2 opacity-50" />
                  <span className="text-xs font-bold">Scan Slot QR</span>
                </button>
              )}

              {/* Tag Input */}
              <div className="relative">
                 <label className="absolute top-3 left-4 text-[10px] font-bold text-slate-500 uppercase">Token #</label>
                 <input 
                    type="text"
                    value={tagNumber}
                    onChange={(e) => setTagNumber(e.target.value)}
                    placeholder="--"
                    className="w-full h-full bg-slate-900 border border-slate-800 rounded-2xl pt-6 pb-2 px-4 text-xl font-bold text-white focus:border-primary-500 focus:ring-0 outline-none placeholder-slate-700"
                 />
                 <Tag className="absolute bottom-4 right-4 text-slate-700" size={16} />
              </div>
           </div>

           {/* SECTION 2: CUSTOMER */}
           <div className={`p-5 rounded-3xl border transition-colors ${
             customerStatus === 'risky' ? 'bg-red-500/5 border-red-500/30' : 
             customerStatus === 'trusted' ? 'bg-green-500/5 border-green-500/20' : 
             'bg-slate-900 border-slate-800'
           }`}>
              <div className="flex justify-between items-center mb-3">
                 <Label htmlFor="phone">Customer</Label>
                 {customerStatus === 'risky' && <Badge variant="red" className="flex items-center"><UserX size={10} className="mr-1"/> High Risk</Badge>}
                 {customerStatus === 'trusted' && <Badge variant="green" className="flex items-center"><CheckCircle size={10} className="mr-1"/> Trusted</Badge>}
              </div>
              
              <div className="space-y-3">
                 <Input 
                   name="phone"
                   type="tel" 
                   placeholder="Phone Number" 
                   icon={Phone} 
                   value={customerPhone}
                   onChange={(e) => {
                     setCustomerPhone(e.target.value);
                     if(e.target.value.length >= 10) lookupCustomer(e.target.value);
                   }}
                   className="bg-slate-950"
                 />
                 <Input 
                   name="name" 
                   placeholder="Customer Name" 
                   icon={User} 
                   value={customerName}
                   onChange={(e) => setCustomerName(e.target.value)}
                   className="bg-slate-950"
                 />
                 
                 {/* Risk Flag Toggle */}
                 <div 
                   onClick={() => setFlagRisk(!flagRisk)}
                   className="flex items-center space-x-3 cursor-pointer group"
                 >
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                      flagRisk ? 'bg-red-500 border-red-500' : 'border-slate-600 bg-slate-950'
                    }`}>
                       {flagRisk && <UserX size={12} className="text-white" />}
                    </div>
                    <span className={`text-xs font-bold ${flagRisk ? 'text-red-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
                       Flag as High Risk Customer
                    </span>
                 </div>
              </div>
           </div>

           {/* SECTION 3: DEVICE TYPE (Horizontal Scroll) */}
           <div>
              <Label htmlFor="type">Device Type</Label>
              <div className="flex overflow-x-auto pb-4 gap-3 hide-scrollbar -mx-5 px-5">
                 {DEVICE_TYPES.map((dt) => (
                    <button
                      key={dt.id}
                      type="button"
                      onClick={() => setType(dt.id)}
                      className={`flex-shrink-0 w-24 h-24 rounded-2xl border-2 flex flex-col items-center justify-center transition-all active:scale-95 ${
                        type === dt.id 
                        ? `${dt.color} ring-2 ring-offset-2 ring-offset-slate-950 ring-primary-500 border-transparent shadow-lg`
                        : 'bg-slate-900 border-slate-800 text-slate-500 grayscale opacity-70'
                      }`}
                    >
                       <dt.icon size={28} className="mb-2" />
                       <span className="text-[10px] font-bold">{dt.label}</span>
                    </button>
                 ))}
              </div>
              
              <Input 
                placeholder="Description (e.g. Black Samsung, cracked screen)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
           </div>

           {/* SECTION 4: BILLING */}
           <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                 <Label htmlFor="billing">Billing</Label>
                 <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setBillingType('fixed')}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                        billingType === 'fixed' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500'
                      }`}
                    >Fixed</button>
                    <button
                      type="button"
                      onClick={() => setBillingType('hourly')}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                        billingType === 'hourly' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500'
                      }`}
                    >Hourly</button>
                 </div>
              </div>

              {billingType === 'fixed' ? (
                <>
                   <div className="relative mb-3">
                      <Input 
                        type="number" 
                        value={fee} 
                        onChange={(e) => setFee(e.target.value)}
                        placeholder="0"
                        className="text-2xl font-black text-white pl-8 bg-slate-950"
                      />
                      <span className="absolute top-[18px] left-4 text-slate-500 font-bold text-xl">₦</span>
                   </div>
                   <div className="grid grid-cols-4 gap-2">
                      {PRESET_FEES.map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setFee(amt)}
                          className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                            fee === amt 
                            ? 'bg-primary-600 text-white border-primary-500' 
                            : 'bg-slate-950 text-slate-400 border-slate-800'
                          }`}
                        >
                          {amt}
                        </button>
                      ))}
                   </div>
                </>
              ) : (
                <div className="flex items-center p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                   <Timer size={20} className="text-blue-400 mr-3" />
                   <div>
                      <p className="text-xs font-bold text-blue-300 uppercase">Hourly Rate</p>
                      <div className="flex items-baseline">
                         <span className="text-sm text-slate-400 mr-1">₦</span>
                         <input 
                           type="number"
                           value={hourlyRate}
                           onChange={(e) => setHourlyRate(e.target.value)}
                           className="bg-transparent text-xl font-black text-white w-20 outline-none border-b border-blue-500/30 focus:border-blue-400"
                         />
                         <span className="text-sm text-slate-400 ml-1">/ hr</span>
                      </div>
                   </div>
                </div>
              )}
           </div>

           {/* SECTION 5: PHOTO */}
           <div>
              <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                capture="environment" 
                onChange={handleImageUpload} 
                className="hidden" 
              />
              
              {!deviceImage ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-32 rounded-3xl border-2 border-dashed border-slate-800 bg-slate-900/50 flex flex-col items-center justify-center text-slate-500 hover:text-white hover:border-slate-600 transition-colors"
                >
                  <Camera size={28} className="mb-2" />
                  <span className="text-xs font-bold">Add Proof Photo</span>
                </button>
              ) : (
                <div className="relative h-48 rounded-3xl overflow-hidden border border-slate-800 group">
                  <img src={deviceImage} alt="Preview" className="w-full h-full object-cover" />
                  <button 
                    type="button"
                    onClick={() => { setDeviceImage(''); if(fileInputRef.current) fileInputRef.current.value = ''; }}
                    className="absolute top-2 right-2 bg-black/60 text-white p-2 rounded-full backdrop-blur-sm hover:bg-black/80"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
           </div>
        </form>
      </div>

      {/* STICKY FOOTER (Fixed) */}
      <div className="flex-none p-4 bg-slate-950/80 backdrop-blur-xl border-t border-slate-800 pb-safe z-30">
         <Button 
            fullWidth 
            type="submit" 
            form="add-form"
            isLoading={isLoading}
            disabled={slotStatus === 'occupied'}
            className="h-14 text-lg font-black shadow-xl shadow-primary-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
         >
            {slotStatus === 'occupied' ? 'Slot Occupied' : 'Check In Device'}
         </Button>
      </div>
    </div>
  );
};

export default AddDevice;