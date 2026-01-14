import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Phone, ArrowRight, ShieldCheck, Mail, Lock, MapPin } from 'lucide-react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Button, Input } from '../components/UI';
import { useAuth } from '../contexts/AuthContext';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { refreshShopDetails } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [street, setStreet] = useState('');
  const [landmark, setLandmark] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!shopName) throw new Error("Shop Name is required.");
      if (!city || !street) throw new Error("Location details are required.");

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, 'shops', user.uid), {
        uid: user.uid,
        email: user.email,
        shopName: shopName.trim(),
        phone: phone.trim(),
        location: {
          city: city.trim(),
          street: street.trim(),
          landmark: landmark.trim()
        },
        createdAt: new Date().toISOString()
      });
      
      await refreshShopDetails();
      navigate('/');
    } catch (err: any) {
      console.error(err);
      let msg = "Registration failed. Please try again.";
      
      if (err.code === 'auth/email-already-in-use') {
        msg = "Email already registered. Please login.";
      } else if (err.code === 'auth/weak-password') {
        msg = "Password should be at least 6 characters.";
      } else if (err.message) {
        msg = err.message.replace('Firebase: ', '');
      }
      
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
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-6 py-10">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-600/30">
          <Store size={32} className="text-white" />
        </div>
        <h1 className="text-2xl font-black text-gray-900">Setup Shop</h1>
        <p className="text-gray-500 text-sm">Create your ChargeSafe account</p>
      </div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-8">
        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-6 border border-red-100 flex items-start">
            <span className="mr-2">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Email"
            placeholder="name@example.com"
            value={email}
            onChange={handleInputChange(setEmail)}
            required
            icon={Mail}
            type="email"
          />

          <Input
            label="Password"
            placeholder="Min 6 chars"
            value={password}
            onChange={handleInputChange(setPassword)}
            required
            icon={Lock}
            type="password"
          />

          <div className="pt-2 border-t border-gray-100 mt-4 space-y-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Shop Profile</p>
              
              <Input
                label="Shop Name"
                placeholder="e.g. Mama Tobi Charging"
                value={shopName}
                onChange={handleInputChange(setShopName)}
                required
                icon={Store}
              />

              <Input
                label="Phone"
                placeholder="e.g. 08012345678"
                value={phone}
                onChange={handleInputChange(setPhone)}
                icon={Phone}
                type="tel"
              />

              <div className="space-y-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="flex items-center text-gray-500 mb-1">
                  <MapPin size={16} className="mr-2" />
                  <span className="text-xs font-bold uppercase">Location</span>
                </div>
                <Input
                  placeholder="City (e.g. Lagos)"
                  value={city}
                  onChange={handleInputChange(setCity)}
                  required
                  className="bg-white"
                />
                <Input
                  placeholder="Street Address"
                  value={street}
                  onChange={handleInputChange(setStreet)}
                  required
                  className="bg-white"
                />
                <Input
                  placeholder="Landmark"
                  value={landmark}
                  onChange={handleInputChange(setLandmark)}
                  className="bg-white"
                />
              </div>
          </div>

          <Button 
            type="submit" 
            fullWidth 
            icon={ArrowRight}
            isLoading={isLoading}
            className="shadow-lg shadow-primary-600/20 h-12 text-lg mt-4"
          >
            Create Account
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => navigate('/login')}
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Already have an account? <span className="font-bold text-primary-600">Login</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Register;