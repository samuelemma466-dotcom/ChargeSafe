import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Phone, ArrowRight, ShieldCheck, Mail, Lock, LogIn } from 'lucide-react';
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
  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');

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
        if (!shopName) {
          throw new Error("Shop Name is required for registration.");
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Save shop details to Firestore
        await setDoc(doc(db, 'shops', user.uid), {
          uid: user.uid,
          email: user.email,
          shopName: shopName,
          phone: phone,
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
        // Firebase now groups user-not-found and wrong-password into this error for security
        msg = "Incorrect email or password. If you haven't registered yet, please create a shop account.";
      } else if (err.code === 'auth/user-not-found') {
        msg = "No account found with this email. Please register.";
      } else if (err.code === 'auth/wrong-password') {
        msg = "Incorrect password.";
      } else if (err.code === 'auth/email-already-in-use') {
        msg = "This email is already registered. Please login instead.";
      } else if (err.code === 'auth/weak-password') {
        msg = "Password should be at least 6 characters.";
      } else if (err.code === 'auth/network-request-failed') {
        msg = "Network error. Please check your internet connection.";
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-6">
      
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
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{isLogin ? 'Welcome Back' : 'Setup Shop'}</h2>
            <p className="text-gray-400 text-sm">{isLogin ? 'Login to your dashboard' : 'Enter details to get started'}</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4 border border-red-100 flex items-start animate-in slide-in-from-top-1 fade-in duration-200">
            <span className="mr-2">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
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
            placeholder="••••••••"
            value={password}
            onChange={handleInputChange(setPassword)}
            required
            icon={Lock}
            type="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
          />

          {!isLogin && (
            <>
              <Input
                label="Shop Name"
                placeholder="e.g. Mama Tobi Charging Station"
                value={shopName}
                onChange={handleInputChange(setShopName)}
                required
                icon={Store}
                autoComplete="organization"
              />

              <Input
                label="Phone Number (Optional)"
                placeholder="e.g. 08012345678"
                value={phone}
                onChange={handleInputChange(setPhone)}
                icon={Phone}
                type="tel"
                autoComplete="tel"
              />
            </>
          )}

          <div className="pt-2">
            <Button 
              type="submit" 
              fullWidth 
              icon={isLogin ? LogIn : ArrowRight}
              isLoading={isLoading}
              className="shadow-lg shadow-primary-600/20"
            >
              {isLogin ? 'Login' : 'Create Shop Account'}
            </Button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setEmail('');
              setPassword('');
            }}
            className="text-sm text-primary-600 font-semibold hover:text-primary-800 transition-colors"
          >
            {isLogin ? "Don't have an account? Setup Shop" : "Already have an account? Login"}
          </button>
        </div>
      </div>
      
      {/* Footer */}
      <div className="mt-12 text-center space-y-2">
        <p className="text-gray-400 text-xs">
          Simple • Secure • Reliable
        </p>
        <p className="text-gray-300 text-[10px]">
          v1.0.0
        </p>
      </div>
    </div>
  );
};

export default Login;