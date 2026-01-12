import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Phone, ArrowRight, ShieldCheck, Mail, Lock, LogIn, MapPin } from 'lucide-react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Button, Input } from '../components/UI';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { refreshShopDetails } = useAuth();
  
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Registration Fields
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
      if (isLogin) {
        // --- LOGIN ---
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // --- REGISTER ---
        if (!shopName) throw new Error("Shop Name is required.");
        if (!city || !street) throw new Error("Location details (City & Street) are required.");

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Save shop details to Firestore
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
      }
      
      navigate('/');
    } catch (err: any) {
      console.error(err);
      let msg = "An error occurred. Please try again.";
      
      // Handle Firebase Auth Errors
      if (err.code === 'auth/invalid-credential') {
        msg = "Invalid email or password.";
      } else if (err.code === 'auth/user-not-found') {
        msg = "No account found. Please register.";
      } else if (err.code === 'auth/wrong-password') {
        msg = "Incorrect password.";
      } else if (err.code === 'auth/email-already-in-use') {
        msg = "Email already registered. Please login.";
      } else if (err.code === 'auth/weak-password') {
        msg = "Password should be at least 6 characters.";
      } else if (err.message) {
        msg = err.message;
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

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-6 py-10">
      
      {/* Brand Logo Area */}
      <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="w-20 h-20 bg-primary-600 rounded-3xl rotate-3 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary-600/30">
          <ShieldCheck size={40} className="text-white -rotate-3" />
        </div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">ChargeSafe</h1>
        <p className="text-gray-500 mt-2 text-sm font-medium">Manage your charging shop with ease.</p>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-8 animate-in fade-in zoom-in duration-500">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">{isLogin ? 'Welcome Back' : 'Setup Shop'}</h2>
          <p className="text-gray-400 text-sm">{isLogin ? 'Login to your dashboard' : 'Enter details to get started'}</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-6 border border-red-100 flex items-start animate-in slide-in-from-top-1 fade-in duration-200">
            <span className="mr-2 flex-shrink-0">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          
          <Input
            label="Email Address"
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
            placeholder="••••••••"
            value={password}
            onChange={handleInputChange(setPassword)}
            required
            icon={Lock}
            type="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
          />

          {!isLogin && (
            <div className="space-y-5 pt-2 border-t border-gray-100 mt-4 animate-in slide-in-from-bottom-5 fade-in">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Shop Details</p>
              
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
                label="Phone Number"
                placeholder="e.g. 08012345678"
                value={phone}
                onChange={handleInputChange(setPhone)}
                icon={Phone}
                type="tel"
                autoComplete="tel"
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
                  placeholder="Landmark (Optional)"
                  value={landmark}
                  onChange={handleInputChange(setLandmark)}
                  className="bg-white"
                />
              </div>
            </div>
          )}

          <div className="pt-4">
            <Button 
              type="submit" 
              fullWidth 
              icon={isLogin ? LogIn : ArrowRight}
              isLoading={isLoading}
              className="shadow-lg shadow-primary-600/20 h-12 text-lg"
            >
              {isLogin ? 'Login' : 'Complete Setup'}
            </Button>
          </div>
        </form>

        <div className="mt-8 text-center border-t border-gray-100 pt-6">
          <button 
            onClick={toggleMode}
            className="text-sm text-primary-600 font-bold hover:text-primary-800 transition-colors"
          >
            {isLogin ? "Don't have an account? Setup Shop" : "Already have an account? Login"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;