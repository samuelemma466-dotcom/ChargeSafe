import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Trash2, 
  AlertTriangle, 
  Moon, 
  Globe, 
  CreditCard,
  Volume2,
  Printer,
  Bell
} from 'lucide-react';
import { collection, getDocs, deleteDoc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { Button } from '../components/UI';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { 
    theme, 
    currency, 
    language, 
    soundEnabled, 
    autoPrint, 
    alertsEnabled, 
    updateSetting, 
    playSound 
  } = useSettings();
  
  const [isDeleting, setIsDeleting] = useState(false);

  const handleToggle = (key: 'soundEnabled' | 'autoPrint' | 'alertsEnabled', currentVal: boolean) => {
      const newVal = !currentVal;
      updateSetting(key, newVal);
      playSound(newVal ? 'toggle-on' : 'toggle-off');
      if (navigator.vibrate) navigator.vibrate(50);
  };

  const handleFactoryReset = async () => {
    if (!currentUser) return;
    playSound('click');
    
    const confirm1 = window.confirm("⚠ WARNING: FACTORY RESET\n\nThis will permanently delete ALL:\n• Device History\n• Transactions\n• Customer Records\n\nAre you sure you want to continue?");
    if (!confirm1) return;

    const confirm2 = window.prompt("To confirm, type 'DELETE' in the box below:");
    if (confirm2 !== 'DELETE') {
        playSound('error');
        alert("Reset cancelled. Incorrect confirmation code.");
        return;
    }

    setIsDeleting(true);

    try {
      const uid = currentUser.uid;
      
      const devicesRef = collection(db, 'shops', uid, 'devices');
      const devicesSnap = await getDocs(devicesRef);
      const deviceDeletes = devicesSnap.docs.map(d => deleteDoc(d.ref));
      
      const custRef = collection(db, 'shops', uid, 'customers');
      const custSnap = await getDocs(custRef);
      const custDeletes = custSnap.docs.map(d => deleteDoc(d.ref));

      const txRef = collection(db, 'shops', uid, 'pos_transactions');
      const txSnap = await getDocs(txRef);
      const txDeletes = txSnap.docs.map(d => deleteDoc(d.ref));

      const slotsQuery = query(collection(db, 'slots'), where('shopId', '==', uid));
      const slotsSnap = await getDocs(slotsQuery);
      const slotUpdates = slotsSnap.docs.map(d => updateDoc(d.ref, { 
          status: 'available', 
          deviceId: null,
          updatedAt: new Date().toISOString() 
      }));

      await Promise.all([...deviceDeletes, ...custDeletes, ...txDeletes, ...slotUpdates]);
      
      playSound('success');
      alert("System Reset Successfully.\nAll data has been wiped.");
      navigate('/');
    } catch (err) {
      console.error("Reset failed", err);
      playSound('error');
      alert("An error occurred while resetting data. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-safe text-slate-200">
      
      {/* Header */}
      <div className="sticky top-0 bg-slate-950/95 backdrop-blur-sm z-10 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <button 
          onClick={() => { playSound('click'); navigate('/profile'); }}
          className="p-3 -ml-3 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-white">Settings</h1>
        <div className="w-10"></div>
      </div>

      <div className="p-6 max-w-lg mx-auto space-y-8 animate-in slide-in-from-right-4">
        
        {/* SECTION: PREFERENCES */}
        <section>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 ml-1">Preferences</h3>
            <div className="bg-slate-900 rounded-3xl border border-slate-800 p-5 space-y-6">
                
                {/* Theme */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <div className="p-2 bg-slate-800 rounded-lg text-slate-400 mr-3">
                            <Moon size={20} />
                        </div>
                        <span className="font-bold text-white">Appearance</span>
                    </div>
                    <select 
                        value={theme}
                        onChange={(e) => { 
                            updateSetting('theme', e.target.value); 
                            playSound('click'); 
                        }}
                        className="bg-slate-950 border border-slate-800 text-sm rounded-xl px-3 py-2 text-white outline-none focus:border-primary-500"
                    >
                        <option value="system">System</option>
                        <option value="dark">Dark Mode</option>
                        <option value="light">Light Mode</option>
                    </select>
                </div>

                {/* Language */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <div className="p-2 bg-slate-800 rounded-lg text-slate-400 mr-3">
                            <Globe size={20} />
                        </div>
                        <span className="font-bold text-white">Language</span>
                    </div>
                    <select 
                        value={language}
                        onChange={(e) => {
                            updateSetting('language', e.target.value);
                            playSound('click');
                        }}
                        className="bg-slate-950 border border-slate-800 text-sm rounded-xl px-3 py-2 text-white outline-none focus:border-primary-500"
                    >
                        <option value="en">English</option>
                        <option value="fr">Français</option>
                        <option value="ha">Hausa</option>
                        <option value="ig">Igbo</option>
                        <option value="yo">Yorùbá</option>
                    </select>
                </div>

                {/* Currency */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <div className="p-2 bg-slate-800 rounded-lg text-slate-400 mr-3">
                            <CreditCard size={20} />
                        </div>
                        <span className="font-bold text-white">Currency</span>
                    </div>
                    <select 
                        value={currency}
                        onChange={(e) => {
                            updateSetting('currency', e.target.value);
                            playSound('click');
                        }}
                        className="bg-slate-950 border border-slate-800 text-sm rounded-xl px-3 py-2 text-white outline-none focus:border-primary-500"
                    >
                        <option value="NGN">NGN (₦)</option>
                        <option value="USD">USD ($)</option>
                        <option value="GHS">GHS (₵)</option>
                        <option value="KES">KES (KSh)</option>
                    </select>
                </div>

            </div>
        </section>

        {/* SECTION: SYSTEM */}
        <section>
             <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 ml-1">System</h3>
             <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
                 
                 {/* Sound */}
                 <div className="p-4 flex items-center justify-between border-b border-slate-800">
                     <div className="flex items-center">
                         <Volume2 size={20} className="text-slate-400 mr-3" />
                         <span className="text-sm font-medium text-slate-200">Sound Effects</span>
                     </div>
                     <button 
                        onClick={() => handleToggle('soundEnabled', soundEnabled)}
                        className={`w-12 h-7 rounded-full p-1 transition-all ${soundEnabled ? 'bg-primary-600' : 'bg-slate-700'}`}
                     >
                         <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform ${soundEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                     </button>
                 </div>

                 {/* Auto Print */}
                 <div className="p-4 flex items-center justify-between border-b border-slate-800">
                     <div className="flex items-center">
                         <Printer size={20} className="text-slate-400 mr-3" />
                         <span className="text-sm font-medium text-slate-200">Auto-Print Receipts</span>
                     </div>
                     <button 
                        onClick={() => handleToggle('autoPrint', autoPrint)}
                        className={`w-12 h-7 rounded-full p-1 transition-all ${autoPrint ? 'bg-primary-600' : 'bg-slate-700'}`}
                     >
                         <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform ${autoPrint ? 'translate-x-5' : 'translate-x-0'}`} />
                     </button>
                 </div>

                 {/* Alerts */}
                 <div className="p-4 flex items-center justify-between">
                     <div className="flex items-center">
                         <Bell size={20} className="text-slate-400 mr-3" />
                         <span className="text-sm font-medium text-slate-200">Security Alerts</span>
                     </div>
                     <button 
                        onClick={() => handleToggle('alertsEnabled', alertsEnabled)}
                        className={`w-12 h-7 rounded-full p-1 transition-all ${alertsEnabled ? 'bg-primary-600' : 'bg-slate-700'}`}
                     >
                         <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform ${alertsEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                     </button>
                 </div>
             </div>
        </section>

        {/* SECTION: DANGER ZONE */}
        <section>
            <h3 className="text-sm font-bold text-red-500 uppercase tracking-wider mb-4 ml-1 flex items-center">
                <AlertTriangle size={14} className="mr-1" /> Danger Zone
            </h3>
            
            <div className="bg-red-500/5 rounded-3xl border border-red-500/20 p-5">
                <h4 className="font-bold text-white mb-2">Factory Reset Data</h4>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                    This action will clear all devices, transaction logs, and customer history associated with this shop account. This action cannot be undone.
                </p>

                <Button 
                    variant="danger" 
                    fullWidth
                    onClick={handleFactoryReset}
                    isLoading={isDeleting}
                    icon={Trash2}
                    className="bg-red-600 hover:bg-red-500 border-transparent"
                >
                    {isDeleting ? 'Erasing Data...' : 'Reset All Data'}
                </Button>
            </div>
        </section>

      </div>
    </div>
  );
};

export default Settings;