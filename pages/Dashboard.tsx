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
  ScanLine,
  QrCode,
  LayoutGrid,
  UserCircle
} from 'lucide-react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '../components/UI';
import { DeviceEntry, DeviceType } from '../types';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, shopDetails } = useAuth();
  
  const [devices, setDevices] = useState<DeviceEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [loading, setLoading] = useState(true);

  // --- REAL-TIME DATA FETCHING ---
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
        (device.qrId && device.qrId.toLowerCase().includes(lowerQuery))
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
    <div className="min-h-screen bg-gray-50 pb-24 relative">
      
      {/* HEADER SECTION */}
      <header className="bg-white sticky top-0 z-10 border-b border-gray-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]">
        <div className="px-5 pt-safe pt-6 pb-4">
          <div className="flex justify-between items-center mb-5">
            <div>
              <h1 className="text-xl font-black text-gray-900 truncate max-w-[200px]">
                {shopDetails?.shopName || 'ChargeSafe'}
              </h1>
              <p className="text-xs text-gray-400 font-medium mt-0.5">
                 {shopDetails?.location?.city ? `${shopDetails.location.city} • Device Manager` : 'Device Manager'}
              </p>
            </div>
            <div className="flex space-x-2">
              <button 
                onClick={() => navigate('/slots')}
                className="bg-gray-100 text-gray-700 p-3 rounded-xl active:scale-95 transition-all"
                aria-label="Manage Slots"
              >
                <QrCode size={22} />
              </button>
              <button 
                onClick={() => navigate('/scan')}
                className="bg-gray-900 text-white p-3 rounded-xl shadow-lg shadow-gray-900/20 active:scale-95 transition-all"
                aria-label="Scan QR Card"
              >
                <ScanLine size={22} />
              </button>
            </div>
          </div>

          {/* SEARCH BAR */}
          <div className="relative mb-2">
            <Input 
              placeholder="Search active devices..." 
              icon={Search} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-gray-100 border-transparent focus:bg-white h-12 rounded-xl text-base"
            />
          </div>

          {/* TABS */}
          <div className="flex p-1 bg-gray-100 rounded-xl mt-4">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 flex items-center justify-center py-2.5 text-sm font-bold rounded-lg transition-all ${
                activeTab === 'active' 
                  ? 'bg-white text-primary-600 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Zap size={16} className="mr-2" />
              Active
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 flex items-center justify-center py-2.5 text-sm font-bold rounded-lg transition-all ${
                activeTab === 'history' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <History size={16} className="mr-2" />
              History
            </button>
          </div>
        </div>
      </header>

      {/* DEVICE LIST */}
      <main className="px-5 py-6">
        {loading ? (
           <div className="flex flex-col items-center justify-center py-20 space-y-4 opacity-60">
             <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-primary-600"></div>
             <p className="text-sm font-medium text-gray-500">Syncing...</p>
           </div>
        ) : (
          <div className="space-y-3">
            {/* EMPTY STATES */}
            {filteredDevices.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  {activeTab === 'active' ? (
                    <Zap className="text-gray-300 w-10 h-10" />
                  ) : (
                    <Archive className="text-gray-300 w-10 h-10" />
                  )}
                </div>
                {activeTab === 'active' ? (
                  <>
                    <h3 className="text-gray-900 font-bold text-lg">No active devices</h3>
                    <p className="text-gray-400 text-sm mt-2 max-w-[240px] leading-relaxed">
                      Add a device to start charging or scan a customer's QR code.
                    </p>
                    <button 
                      onClick={() => navigate('/add')}
                      className="mt-6 text-primary-600 font-bold text-sm bg-primary-50 px-6 py-3 rounded-full hover:bg-primary-100 transition-colors"
                    >
                      Add New Device
                    </button>
                  </>
                ) : (
                  <>
                    <h3 className="text-gray-900 font-bold text-lg">No history found</h3>
                    <p className="text-gray-400 text-sm mt-2">No devices have been collected yet.</p>
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
                  className={`relative bg-white p-5 rounded-2xl shadow-sm border active:scale-[0.98] transition-all cursor-pointer group ${
                    isCharging ? 'border-l-4 border-l-yellow-400 border-t-transparent border-r-transparent border-b-transparent' : 
                    isReady ? 'border-l-4 border-l-green-500 border-t-transparent border-r-transparent border-b-transparent' : 
                    'border-gray-100 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`h-12 w-12 rounded-xl flex items-center justify-center transition-colors ${
                        isCharging ? 'bg-yellow-50 text-yellow-600' :
                        isReady ? 'bg-green-50 text-green-600' :
                        'bg-gray-100 text-gray-400'
                      }`}>
                        <DeviceIcon size={22} strokeWidth={2.5} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-[15px] leading-tight mb-1">{device.customerName}</h3>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                           <span className="font-medium">{device.description}</span>
                           {device.qrId && (
                             <>
                               <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                               <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono font-bold">
                                 {device.qrId}
                               </span>
                             </>
                           )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                       <span className={`text-xs font-bold uppercase px-2 py-1 rounded-md ${
                         isCharging ? 'bg-yellow-100 text-yellow-800' :
                         isReady ? 'bg-green-100 text-green-800' :
                         'bg-gray-100 text-gray-600'
                       }`}>
                         {device.status}
                       </span>
                       <p className="text-[11px] text-gray-400 font-medium mt-1.5">
                         {new Date(device.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                       </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* FAB - ADD BUTTON (Only on Active Tab) */}
      {activeTab === 'active' && (
        <button
          onClick={() => navigate('/add')}
          className="fixed right-6 bottom-24 bg-primary-600 text-white p-4 rounded-full shadow-xl shadow-primary-600/30 active:scale-90 transition-all z-20 hover:bg-primary-700"
        >
          <Plus size={28} strokeWidth={3} />
        </button>
      )}

      {/* BOTTOM NAV */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 px-6 py-2 flex justify-around items-center z-30 pb-safe">
        <button 
          onClick={() => { setActiveTab('active'); navigate('/'); }}
          className={`flex flex-col items-center p-2 transition-colors ${activeTab === 'active' ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <LayoutGrid size={24} strokeWidth={activeTab === 'active' ? 2.5 : 2} />
          <span className="text-[10px] font-bold mt-1">Dashboard</span>
        </button>
        
        {/* Empty spacer for FAB */}
        <div className="w-8"></div>

        <button 
          onClick={() => navigate('/profile')}
          className="flex flex-col items-center text-gray-400 hover:text-primary-600 transition-colors p-2"
        >
          <UserCircle size={24} />
          <span className="text-[10px] font-bold mt-1">Profile</span>
        </button>
      </nav>
    </div>
  );
};

export default Dashboard;