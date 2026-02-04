import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Smartphone, 
  Laptop, 
  Battery, 
  HelpCircle, 
  Zap, 
  Archive, 
  History,
  CreditCard
} from 'lucide-react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Input, BottomNav, Skeleton } from '../components/UI';
import { DeviceEntry, DeviceType } from '../types';
import PosDashboard from './PosDashboard';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, shopDetails } = useAuth();
  
  // Workspace Mode: 'charging' | 'pos'
  const [mode, setMode] = useState<'charging' | 'pos'>('charging');

  const [devices, setDevices] = useState<DeviceEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [loading, setLoading] = useState(true);

  // --- REAL-TIME DATA FETCHING (Only for Charging Mode) ---
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'shops', currentUser.uid, 'devices'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedDevices: DeviceEntry[] = [];
      snapshot.forEach((doc) => {
        fetchedDevices.push(doc.data() as DeviceEntry);
      });
      // Sort by startTime descending
      fetchedDevices.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      setDevices(fetchedDevices);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // --- FILTERING ---
  const filteredDevices = useMemo(() => {
    const lowerQuery = searchQuery.toLowerCase();
    
    // 1. Filter by Tab
    let filtered = devices.filter(d => {
      if (activeTab === 'active') {
        return d.status === 'charging' || d.status === 'ready';
      } else {
        return d.status === 'collected';
      }
    });

    // 2. Filter by Search
    if (searchQuery) {
      filtered = filtered.filter(device => 
        device.id.toLowerCase().includes(lowerQuery) || 
        device.customerName.toLowerCase().includes(lowerQuery) ||
        device.description.toLowerCase().includes(lowerQuery) ||
        (device.qrId && device.qrId.toLowerCase().includes(lowerQuery)) ||
        (device.tagNumber && device.tagNumber.toLowerCase().includes(lowerQuery))
      );
    }
    
    return filtered;
  }, [devices, searchQuery, activeTab]);

  const getIcon = (type: DeviceType) => {
    switch (type) {
      case DeviceType.PHONE: return Smartphone;
      case DeviceType.LAPTOP: return Laptop;
      case DeviceType.POWER_BANK: return Battery;
      default: return HelpCircle;
    }
  };

  const handleDeviceClick = (device: DeviceEntry) => {
    navigate(`/device/${device.id}`, { state: { device } });
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 relative overflow-hidden transition-colors duration-500">
      
      {/* HEADER SECTION (Fixed at Top) */}
      <header className="flex-none z-10 border-b shadow-lg shadow-black/20 transition-colors duration-300 bg-slate-950/90 backdrop-blur-md border-slate-800">
        <div className="px-5 pt-safe pt-6 pb-4">
          <div className="flex justify-between items-center mb-5">
            <div>
              <h1 className="text-xl font-black truncate max-w-[200px] text-white">
                {shopDetails?.shopName || 'ChargeSafe'}
              </h1>
              <p className="text-xs font-medium mt-0.5 text-slate-400">
                 {shopDetails?.location?.city ? `${shopDetails.location.city} • Shop Manager` : 'Shop Manager'}
              </p>
            </div>
            
            {/* WORKSPACE SWITCHER */}
            <div className={`flex p-1 rounded-xl bg-slate-900 border border-slate-800`}>
                <button
                   onClick={() => setMode('charging')}
                   className={`p-2 rounded-lg transition-all ${
                       mode === 'charging' 
                       ? 'bg-slate-800 text-primary-400 shadow-sm ring-1 ring-slate-700' 
                       : 'text-slate-500'
                   }`}
                >
                    <Zap size={20} fill={mode==='charging' ? 'currentColor' : 'none'} />
                </button>
                <button
                   onClick={() => setMode('pos')}
                   className={`p-2 rounded-lg transition-all ${
                       mode === 'pos' 
                       ? 'bg-green-500/10 text-green-400 shadow-sm ring-1 ring-green-500/20' 
                       : 'text-slate-500'
                   }`}
                >
                    <CreditCard size={20} />
                </button>
            </div>
          </div>

          {/* MODE SPECIFIC HEADER CONTROLS */}
          {mode === 'charging' ? (
              <>
                <div className="relative mb-2">
                    <Input 
                    placeholder="Search devices, tags..." 
                    icon={Search} 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-slate-900 border-slate-800 focus:bg-slate-800 h-12 rounded-xl text-base mb-0"
                    />
                </div>
                {/* TABS */}
                <div className="flex p-1 bg-slate-900 border border-slate-800 rounded-xl mt-4">
                    <button
                    onClick={() => setActiveTab('active')}
                    className={`flex-1 flex items-center justify-center py-2.5 text-sm font-bold rounded-lg transition-all ${
                        activeTab === 'active' 
                        ? 'bg-slate-800 text-primary-400 shadow-sm border border-slate-700' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                    >
                    <Zap size={16} className="mr-2" />
                    Active
                    </button>
                    <button
                    onClick={() => setActiveTab('history')}
                    className={`flex-1 flex items-center justify-center py-2.5 text-sm font-bold rounded-lg transition-all ${
                        activeTab === 'history' 
                        ? 'bg-slate-800 text-white shadow-sm border border-slate-700' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                    >
                    <History size={16} className="mr-2" />
                    History
                    </button>
                </div>
              </>
          ) : (
             // POS HEADER PLACEHOLDER
             <div className="flex items-center space-x-2 text-green-400 text-xs font-bold bg-green-500/10 border border-green-500/20 p-2 rounded-lg">
                 <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                 <span>POS System Online</span>
             </div>
          )}
        </div>
      </header>

      {/* MAIN CONTENT AREA (Scrollable) */}
      <main className={`flex-1 overflow-y-auto hide-scrollbar ${mode === 'charging' ? 'px-5 py-6 pb-28' : 'p-0 pb-24'}`}>
        
        {mode === 'pos' ? (
            <PosDashboard />
        ) : (
            // --- CHARGING VIEW ---
            <>
                {loading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                ) : (
                <div className="space-y-3">
                    {/* EMPTY STATES */}
                    {filteredDevices.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mb-4 border border-slate-800">
                        {activeTab === 'active' ? (
                            <Zap className="text-slate-700 w-10 h-10" />
                        ) : (
                            <Archive className="text-slate-700 w-10 h-10" />
                        )}
                        </div>
                        {activeTab === 'active' ? (
                        <>
                            <h3 className="text-white font-bold text-lg">No active devices</h3>
                            <p className="text-slate-500 text-sm mt-2 max-w-[240px] leading-relaxed">
                            Add a device to start charging or scan a customer's QR code.
                            </p>
                            <button 
                            onClick={() => navigate('/add')}
                            className="mt-6 text-primary-300 font-bold text-sm bg-slate-800 border border-slate-700 px-6 py-3 rounded-full hover:bg-slate-700 transition-colors"
                            >
                            Add New Device
                            </button>
                        </>
                        ) : (
                        <>
                            <h3 className="text-white font-bold text-lg">No history found</h3>
                            <p className="text-slate-500 text-sm mt-2">No devices have been collected yet.</p>
                        </>
                        )}
                    </div>
                    )}

                    {/* LIST ITEMS */}
                    {filteredDevices.map((device) => {
                    const DeviceIcon = getIcon(device.type);
                    const isCharging = device.status === 'charging';
                    const isReady = device.status === 'ready';

                    return (
                        <div 
                        key={device.id} 
                        onClick={() => handleDeviceClick(device)}
                        className={`relative bg-slate-900 p-5 rounded-2xl shadow-sm border active:scale-[0.98] transition-all cursor-pointer group ${
                            isCharging ? 'border-l-4 border-l-yellow-500 border-t-slate-800 border-r-slate-800 border-b-slate-800' : 
                            isReady ? 'border-l-4 border-l-green-500 border-t-slate-800 border-r-slate-800 border-b-slate-800' : 
                            'border-slate-800 opacity-60 hover:opacity-100'
                        }`}
                        >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                            <div className={`h-12 w-12 rounded-xl flex items-center justify-center transition-colors ${
                                isCharging ? 'bg-yellow-500/10 text-yellow-500' :
                                isReady ? 'bg-green-500/10 text-green-500' :
                                'bg-slate-800 text-slate-500'
                            }`}>
                                <DeviceIcon size={22} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-[15px] leading-tight mb-1">{device.customerName}</h3>
                                <div className="flex items-center space-x-2 text-xs text-slate-400">
                                <span className="font-medium">{device.description}</span>
                                {device.tagNumber && (
                                    <span className="bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded font-bold border border-blue-500/20">
                                        Tag #{device.tagNumber}
                                    </span>
                                )}
                                {device.qrId && (
                                    <>
                                    <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                                    <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono font-bold">
                                        {device.qrId}
                                    </span>
                                    </>
                                )}
                                </div>
                            </div>
                            </div>
                            
                            <div className="text-right">
                            <span className={`text-xs font-bold uppercase px-2 py-1 rounded-md ${
                                isCharging ? 'bg-yellow-500/10 text-yellow-500' :
                                isReady ? 'bg-green-500/10 text-green-500' :
                                'bg-slate-800 text-slate-500'
                            }`}>
                                {device.status}
                            </span>
                            <p className="text-[11px] text-slate-500 font-medium mt-1.5">
                                {new Date(device.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            </div>
                        </div>
                        </div>
                    );
                    })}
                </div>
                )}
            </>
        )}
      </main>

      {/* FAB - ADD BUTTON (Fixed position relative to viewport) */}
      {mode === 'charging' && activeTab === 'active' && (
        <button
          onClick={() => navigate('/add')}
          className="fixed right-6 bottom-24 bg-primary-600 text-white p-4 rounded-full shadow-xl shadow-primary-600/30 active:scale-90 transition-all z-20 hover:bg-primary-500"
        >
          <Plus size={28} strokeWidth={3} />
        </button>
      )}

      {/* BOTTOM NAV (Fixed at bottom) */}
      <BottomNav />
    </div>
  );
};

export default Dashboard;