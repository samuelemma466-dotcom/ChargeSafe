import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, LogIn } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { Button, Input } from '../components/UI';

const Login: React.FC = () => {
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err: any) {
      console.error(err);
      let msg = "Invalid email or password.";
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        msg = "Account not found. Please setup a shop first.";
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-6">
      
      <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="w-20 h-20 bg-primary-600 rounded-3xl rotate-3 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary-600/30">
          <ShieldCheck size={40} className="text-white -rotate-3" />
        </div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">ChargeSafe</h1>
        <p className="text-gray-500 mt-2 text-sm font-medium">Manage your charging shop.</p>
      </div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-8 animate-in fade-in zoom-in duration-500">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">Welcome Back</h2>
          <p className="text-gray-400 text-sm">Login to your dashboard</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-6 border border-red-100 flex items-start">
            <span className="mr-2">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Email Address"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            icon={Mail}
            type="email"
            autoComplete="email"
          />

          <Input
            label="Password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            icon={Lock}
            type="password"
            autoComplete="current-password"
          />

          <div className="pt-4">
            <Button 
              type="submit" 
              fullWidth 
              icon={LogIn}
              isLoading={isLoading}
              className="shadow-lg shadow-primary-600/20 h-12 text-lg"
            >
              Login
            </Button>
          </div>
        </form>

        <div className="mt-8 text-center border-t border-gray-100 pt-6">
          <button 
            onClick={() => navigate('/register-shop')}
            className="text-sm text-primary-600 font-bold hover:text-primary-800 transition-colors"
          >
            Don't have an account? Setup Shop
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;