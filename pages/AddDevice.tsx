import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Laptop, Smartphone, Battery, HelpCircle, CheckCircle, Clock, Tag, User, Hash, Share2, Printer } from 'lucide-react';
import QRCode from 'qrcode';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { DeviceType, DeviceEntry, FormState } from '../types';
import { Button, Input, Select, Label } from '../components/UI';

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
      
      // Generate QR Code as Base64 string
      // We store just the Order ID so it's easy to scan into input fields
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
      
      // Optional: Trigger a browser vibration if available for feedback
      if (navigator.vibrate) navigator.vibrate(200);
    } catch (error) {
      console.error("Error adding device: ", error);
      alert("Failed to register device. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to get icon based on type
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
          <div className="bg-green-500 p-6 text-center text-white">
            <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
              <CheckCircle size={32} className="text-white" />
            </div>
            <h2 className="text-xl font-bold">Device Registered!</h2>
            <p className="text-green-50 text-sm">Order #{registeredDevice.id}</p>
          </div>

          {/* Receipt Content */}
          <div className="p-8">
             <div className="flex justify-center mb-8">
               <div className="p-4 bg-white border-2 border-dashed border-gray-200 rounded-xl">
                 {registeredDevice.qrCodeBase64 && (
                   <img 
                      src={registeredDevice.qrCodeBase64} 
                      alt={`QR Code for ${registeredDevice.id}`}
                      className="w-40 h-40 object-contain"
                   />
                 )}
               </div>
             </div>
             
             <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                  <span className="text-gray-500 text-sm">Customer</span>
                  <span className="font-semibold text-gray-900">{registeredDevice.customerName}</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                  <span className="text-gray-500 text-sm">Device</span>
                  <div className="flex items-center text-gray-900 font-semibold">
                    <TypeIcon size={16} className="mr-2 text-primary-600" />
                    {registeredDevice.description}
                  </div>
                </div>
                <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                  <span className="text-gray-500 text-sm">Start Time</span>
                  <span className="font-semibold text-gray-900">
                    {new Date(registeredDevice.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
                {registeredDevice.fee > 0 && (
                  <div className="flex justify-between items-center pb-2">
                    <span className="text-gray-500 text-sm">Fee</span>
                    <span className="font-bold text-xl text-primary-600">₦{registeredDevice.fee.toLocaleString()}</span>
                  </div>
                )}
             </div>
          </div>

          {/* Actions */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 grid grid-cols-2 gap-3">
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
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Add New Device</h1>
          <div className="w-10" /> {/* Spacer for balance */}
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <form id="add-device-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Start Time Banner */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center text-blue-800 mb-6">
              <Clock className="w-5 h-5 mr-3 text-blue-600" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600/80">Check-in Time</p>
                <p className="text-lg font-bold">{startTimeDisplay}</p>
              </div>
            </div>

            {/* Device Type */}
            <Select
              label="Device Type"
              name="type"
              required
              value={formData.type}
              onChange={handleChange}
              options={[
                { value: DeviceType.PHONE, label: '📱 Mobile Phone' },
                { value: DeviceType.POWER_BANK, label: '🔋 Power Bank' },
                { value: DeviceType.LAPTOP, label: '💻 Laptop' },
                { value: DeviceType.OTHER, label: '🔌 Other Device' },
              ]}
            />

            {/* Device Description */}
            <Input
              label="Device Description"
              name="description"
              placeholder="e.g. Samsung A54, Black case with stickers"
              value={formData.description}
              onChange={handleChange}
              required
              icon={Tag}
              autoComplete="off"
            />

            {/* Customer Name */}
            <Input
              label="Customer Name / Nickname"
              name="customerName"
              placeholder="e.g. Mama Tobi"
              value={formData.customerName}
              onChange={handleChange}
              icon={User}
              autoComplete="off"
            />

            {/* Fee */}
            <div className="relative">
              <Input
                label="Charging Fee (Optional)"
                name="fee"
                type="number"
                placeholder="0"
                value={formData.fee}
                onChange={handleChange}
                icon={Hash}
                inputMode="numeric"
              />
              <span className="absolute right-4 top-[38px] text-gray-400 font-medium">₦</span>
            </div>

          </form>
        </div>

        {/* Sticky Bottom Footer */}
        <div className="p-6 border-t border-gray-100 bg-white md:rounded-b-3xl">
          <Button 
            type="submit" 
            form="add-device-form" 
            fullWidth 
            className="shadow-lg shadow-primary-500/30"
            isLoading={isLoading}
          >
            Register Device
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddDevice;