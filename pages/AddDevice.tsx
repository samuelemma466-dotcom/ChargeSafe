import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Laptop, Smartphone, Battery, HelpCircle, CheckCircle, Clock, Tag, User, Hash, Printer, Plus } from 'lucide-react';
import QRCode from 'qrcode';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { DeviceType, DeviceEntry, FormState } from '../types';
import { Button, Input, Label } from '../components/UI';

const AddDevice: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [isLoading, setIsLoading] = useState(false);
  
  // Initial time for display
  const [startTimeDisplay, setStartTimeDisplay] = useState('');

  // Form State
  const [formData, setFormData] = useState<FormState>({
    type: DeviceType.PHONE,
    description: '',
    customerName: '',
    fee: ''
  });

  // Success State
  const [registeredDevice, setRegisteredDevice] = useState<DeviceEntry | null>(null);

  useEffect(() => {
    // Format current time nicely: "10:30 AM"
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

  const generateOrderNumber = () => {
    // Generate CS-#### (e.g., CS-8492)
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `CS-${randomNum}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsLoading(true);

    try {
      const orderId = generateOrderNumber();
      
      const qrCodeDataUrl = await QRCode.toDataURL(orderId, {
        width: 300,
        margin: 2,
        color: {
          dark: '#1f2937',
          light: '#ffffff',
        },
      });

      const newDevice: DeviceEntry = {
        id: orderId,
        type: formData.type,
        description: formData.description,
        customerName: formData.customerName || 'Walk-in Customer',
        startTime: new Date().toISOString(),
        fee: parseFloat(formData.fee) || 0,
        status: 'charging',
        qrCodeBase64: qrCodeDataUrl
      };

      // Save to Firestore
      await setDoc(doc(db, 'shops', currentUser.uid, 'devices', orderId), newDevice);

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
          
          {/* Success Banner */}
          <div className="bg-green-500 p-8 text-center text-white relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <div className="bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm shadow-inner">
              <CheckCircle size={40} className="text-white" />
            </div>
            <h2 className="text-2xl font-black mb-1">Registered!</h2>
            <p className="text-green-100 font-mono text-lg tracking-wider opacity-90">{registeredDevice.id}</p>
          </div>

          {/* Receipt Content */}
          <div className="p-8">
             <div className="flex justify-center mb-8">
               <div className="p-4 bg-white border-2 border-dashed border-gray-200 rounded-2xl">
                 {registeredDevice.qrCodeBase64 && (
                   <img 
                      src={registeredDevice.qrCodeBase64} 
                      alt={`QR Code for ${registeredDevice.id}`}
                      className="w-48 h-48 object-contain"
                   />
                 )}
               </div>
             </div>
             
             <div className="space-y-4 bg-gray-50 p-4 rounded-xl">
                <div className="flex justify-between items-center border-b border-gray-200 pb-3 border-dashed">
                  <span className="text-gray-500 text-sm font-medium">Customer</span>
                  <span className="font-bold text-gray-900">{registeredDevice.customerName}</span>
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

          {/* Actions */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 grid grid-cols-2 gap-4">
            <Button variant="outline" onClick={() => window.print()} icon={Printer} className="text-sm">
              Print
            </Button>
            <Button onClick={() => navigate('/')} className="text-sm">
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
    <div className="min-h-screen bg-white md:bg-gray-50 flex justify-center">
      <div className="w-full max-w-lg bg-white min-h-screen md:min-h-fit md:my-8 md:rounded-3xl md:shadow-lg flex flex-col">
        
        {/* Navbar / Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 px-6 py-4 border-b border-gray-100 flex items-center justify-between md:rounded-t-3xl">
          <button 
            onClick={() => navigate('/')} 
            className="p-3 -ml-3 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Check-in Device</h1>
          <div className="w-10" /> 
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <form id="add-device-form" onSubmit={handleSubmit} className="space-y-8">
            
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

            {/* Step 1: Device Type - VISUAL GRID */}
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
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 ${
                      formData.type === item.id
                        ? 'border-primary-600 bg-primary-50 text-primary-700 ring-2 ring-primary-200 ring-offset-1'
                        : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    <item.icon size={28} className="mb-2" />
                    <span className="font-semibold text-sm">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Description */}
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

            {/* Step 3: Customer */}
            <Input
              label="Customer Name"
              name="customerName"
              placeholder="e.g. Mama Tobi"
              value={formData.customerName}
              onChange={handleChange}
              icon={User}
              autoComplete="off"
            />

            {/* Step 4: Fee with Quick Chips */}
            <div>
              <Label htmlFor="fee">Charging Fee</Label>
              <div className="relative mb-3">
                <Input
                  name="fee"
                  type="number"
                  placeholder="0"
                  value={formData.fee}
                  onChange={handleChange}
                  icon={Hash}
                  inputMode="numeric"
                />
                <span className="absolute right-5 top-[18px] text-gray-400 font-bold text-lg">₦</span>
              </div>
              
              {/* Quick Fee Chips */}
              <div className="flex flex-wrap gap-2">
                 {['200', '300', '500', '1000'].map((amt) => (
                   <button
                     key={amt}
                     type="button"
                     onClick={() => handleQuickFee(amt)}
                     className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold border border-gray-200 transition-colors"
                   >
                     ₦{amt}
                   </button>
                 ))}
              </div>
            </div>

          </form>
        </div>

        {/* Sticky Bottom Footer */}
        <div className="p-6 border-t border-gray-100 bg-white md:rounded-b-3xl safe-pb">
          <Button 
            type="submit" 
            form="add-device-form" 
            fullWidth 
            className="h-14 text-lg"
            isLoading={isLoading}
          >
            Check-in Device
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddDevice;