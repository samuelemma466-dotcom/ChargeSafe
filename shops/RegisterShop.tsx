import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Store, Phone, ArrowRight, Mail, Lock, MapPin, Navigation, Hash, Crosshair } from 'lucide-react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Button, Input } from '../components/UI';
import { useAuth } from '../contexts/AuthContext';
import { Coordinates } from '../types';

const RegisterShop: React.FC = () => {
  const navigate = useNavigate();
  const { refreshShopDetails } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Data Storage Fields
  const [address, setAddress] = useState(''); 
  const [city, setCity] = useState(''); 
  const [slots, setSlots] = useState(''); 
  const [coordinates, setCoordinates] = useState<Coordinates>({ lat: 0, lng: 0 });

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setIsLocating(false);
      },
      (err) => {
        console.error(err);
        setError("Unable to retrieve location. Please allow permissions.");
        setIsLocating(false);
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!shopName) throw new Error("Shop Name is required.");
      if (!address) throw new Error("Shop Address is required.");

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, 'shops', user.uid), {
        uid: user.uid,
        ownerId: user.uid,
        email: user.email,
        shopName: shopName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
        slots: parseInt(slots) || 0,
        coordinates: coordinates,
        location: {
            city: city.trim(),
            street: address.trim(),
            landmark: ''
        },
        createdAt: new Date().toISOString()
      });
      
      await refreshShopDetails();
      navigate('/');
    } catch (err: any) {
      console.error(err);
      let msg = "Registration failed. Please try again.";
      if (err.code === 'auth/email-already-in-use') msg = "Email already registered.";
      if (err.code === 'auth/weak-password') msg = "Password too weak.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    setter(e.target.value);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 py-10 text-slate-200">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/20">
          <Store size={32} className="text-white" />
        </div>
        <h1 className="text-2xl font-black text-white">Setup Shop</h1>
        <p className="text-slate-500 text-sm">Create your ChargeSafe account</p>
      </div>

      <div className="w-full max-w-md bg-slate-900 rounded-3xl shadow-xl shadow-black/50 p-8 animate-in fade-in slide-in-from-bottom-5 border border-slate-800">
        {error && (
          <div className="bg-red-500/10 text-red-400 text-sm p-3 rounded-xl mb-6 border border-red-500/20 flex items-start">
            <span className="mr-2">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Section: Account */}
          <div className="space-y-5">
            <Input
                label="Email"
                placeholder="name@example.com"
                value={email}
                onChange={handleInputChange(setEmail)}
                required
                icon={Mail}
                type="email"
                autoComplete="email"
            />
            <Input
                label="Password"
                placeholder="Min 6 chars"
                value={password}
                onChange={handleInputChange(setPassword)}
                required
                icon={Lock}
                type="password"
                autoComplete="new-password"
            />
          </div>

          <div className="pt-4 border-t border-slate-800 mt-4 space-y-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Shop Profile</p>
              
              <Input
                label="Shop Name"
                placeholder="e.g. Mama Tobi Charging"
                value={shopName}
                onChange={handleInputChange(setShopName)}
                required
                icon={Store}
                autoComplete="organization"
              />

              <Input
                label="Phone"
                placeholder="e.g. 08012345678"
                value={phone}
                onChange={handleInputChange(setPhone)}
                icon={Phone}
                type="tel"
                autoComplete="tel"
              />

              <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-800 space-y-4">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center text-slate-500">
                        <MapPin size={16} className="mr-2" />
                        <span className="text-xs font-bold uppercase">Location Data</span>
                    </div>
                    {coordinates.lat !== 0 && (
                        <div className="flex items-center space-x-1 text-[10px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full font-bold border border-green-500/20">
                            <Crosshair size={10} />
                            <span>{coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}</span>
                        </div>
                    )}
                 </div>

                 <Input
                    placeholder="Full Shop Address"
                    value={address}
                    onChange={handleInputChange(setAddress)}
                    required
                    className="bg-slate-900"
                 />

                 <Input
                    placeholder="City"
                    value={city}
                    onChange={handleInputChange(setCity)}
                    className="bg-slate-900"
                 />

                 <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={isLocating}
                    className="w-full flex items-center justify-center py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors shadow-sm"
                 >
                    {isLocating ? (
                        <span className="flex items-center"><span className="animate-spin mr-2">⏳</span> Acquiring GPS...</span>
                    ) : (
                        <><Navigation size={16} className="mr-2" /> Capture Coordinates</>
                    )}
                 </button>
              </div>

              <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-800">
                  <Input
                    label="Total Slots"
                    placeholder="e.g. 50"
                    value={slots}
                    onChange={handleInputChange(setSlots)}
                    icon={Hash}
                    type="number"
                    className="bg-slate-900 mb-0"
                  />
              </div>
          </div>

          <Button 
            type="submit" 
            fullWidth 
            icon={ArrowRight}
            isLoading={isLoading}
            className="shadow-lg shadow-primary-500/20 h-12 text-lg mt-4"
          >
            Create Account
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link 
            to="/login"
            className="text-sm text-slate-500 hover:text-white transition-colors"
          >
            Already have an account? <span className="font-bold text-primary-500">Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterShop;