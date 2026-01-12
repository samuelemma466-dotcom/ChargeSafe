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
  CheckCircle, 
  Archive, 
  ChevronRight,
  History,
  LogOut,
  Database,
  Sun,
  Moon
} from 'lucide-react';
import { collection, query, onSnapshot, writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Input, Badge } from '../components/UI';
import { DeviceEntry, DeviceType, DeviceStatus } from '../types';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, shopDetails, logout } = useAuth();
  
  const [devices, setDevices] = useState<DeviceEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DeviceStatus>('all');
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('');

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

    // Set Greeting
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    return () => unsubscribe();
  }, [currentUser]);

  // --- STATS COMPUTATION ---
  const stats = useMemo(() => {
    return {
      charging: devices.filter(d => d.status === 'charging').length,
      ready: devices.filter(d => d.status === 'ready').length,
      collected: devices.filter(d => d.status === 'collected').length,
    };
  }, [devices]);

  // --- FILTERING ---
  const filteredDevices = useMemo(() => {
    const lowerQuery = searchQuery.toLowerCase();
    return devices.filter(device => {
      const matchesSearch = 
        device.id.toLowerCase().includes(lowerQuery) || 
        device.customerName.toLowerCase().includes(lowerQuery) ||
        device.description.toLowerCase().includes(lowerQuery);
      
      const matchesStatus = statusFilter === 'all' || device.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [devices, searchQuery, statusFilter]);

  // --- SEED DATABASE ---
  const handleSeedDatabase = async () => {
    if (!currentUser) return;
    if (!window.confirm("This will add mock data to your database. Continue?")) return;
    
    setLoading(true);
    const batch = writeBatch(db);
    const mockData: DeviceEntry[] = [
      { id: 'CS-8492', type: DeviceType.PHONE, description: 'Tecno Spark 10', customerName: 'Mama Tobi', startTime: new Date().toISOString(), fee: 500, status: 'charging' },
      { id: 'CS-8493', type: DeviceType.POWER_BANK, description: 'Oraimo 20000mAh', customerName: 'Brother Paul', startTime: new Date(Date.now() - 3600000).toISOString(), fee: 300, status: 'ready' },
      { id: 'CS-8494', type: DeviceType.LAPTOP, description: 'HP Pavilion', customerName: 'Chinedu', startTime: new Date(Date.now() - 7200000).toISOString(), endTime: new Date().toISOString(), fee: 1000, status: 'collected' },
      { id: 'CS-8495', type: DeviceType.PHONE, description: 'Infinix Hot 30', customerName: 'Sola', startTime: new Date().toISOString(), fee: 500, status: 'charging' },
      { id: 'CS-8496', type: DeviceType.OTHER, description: 'Standing Fan', customerName: 'Iya Basira', startTime: new Date().toISOString(), fee: 1500, status: 'charging' },
    ];

    mockData.forEach((device) => {
      const docRef = doc(db, 'shops', currentUser.uid, 'devices', device.id);
      batch.set(docRef, device);
    });

    try {
      await batch.commit();
      alert("Database seeded successfully!");
    } catch (e) {
      console.error("Error seeding:", e);
      alert("Error seeding database.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: DeviceStatus) => {
    switch (status) {
      case 'charging': return 'blue';
      case 'ready': return 'green';
      case 'collected': return 'gray';
      default: return 'gray';
    }
  };

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

  const handleLogout = async () => {
    if(window.confirm('Are you sure you want to log out?')) {
      await logout();
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 relative">
      
      {/* HEADER SECTION */}
      <header className="bg-white sticky top-0 z-10 border-b border-gray-100 shadow-sm">
        <div className="px-6 pt-8 pb-4">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center text-gray-500 text-sm font-medium mb-1">
                {greeting === 'Good Evening' ? <Moon size={14} className="mr-1.5" /> : <Sun size={14} className="mr-1.5" />}
                {greeting}
              </div>
              <h1 className="text-2xl font-black text-gray-900 truncate max-w-[220px] leading-tight">
                {shopDetails?.shopName || 'My Shop'}
              </h1>
            </div>
            <button 
              onClick={() => navigate('/add')}
              className="bg-primary-600 text-white p-4 rounded-2xl shadow-lg shadow-primary-600/30 active:scale-95 transition-all hover:bg-primary-700"
            >
              <Plus size={24} strokeWidth={3} />
            </button>
          </div>

          {/* SEARCH BAR */}
          <div className="relative">
            <Input 
              placeholder="Search by name, Order #..." 
              icon={Search} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-gray-50 border-transparent focus:bg-white"
            />
          </div>
        </div>
      </header>

      {/* STATS SUMMARY (Horizontal Scroll) */}
      <div className="px-6 py-5 overflow-x-auto whitespace-nowrap hide-scrollbar flex space-x-3 bg-gray-50/50 backdrop-blur-sm -mx-2 px-8">
        <button 
          onClick={() => setStatusFilter('charging')}
          className={`inline-flex flex-col p-4 rounded-3xl border shadow-sm min-w-[140px] transition-all text-left ${statusFilter === 'charging' ? 'bg-blue-600 border-blue-600 text-white shadow-blue-200' : 'bg-white border-white text-gray-600'}`}
        >
          <div className={`flex items-center space-x-2 mb-3 ${statusFilter === 'charging' ? 'text-blue-100' : 'text-blue-600'}`}>
            <Zap size={20} fill={statusFilter === 'charging' ? "currentColor" : "none"} />
            <span className="text-xs font-bold uppercase tracking-wider">Charging</span>
          </div>
          <span className={`text-3xl font-black ${statusFilter === 'charging' ? 'text-white' : 'text-gray-900'}`}>{stats.charging}</span>
        </button>

        <button 
          onClick={() => setStatusFilter('ready')}
          className={`inline-flex flex-col p-4 rounded-3xl border shadow-sm min-w-[140px] transition-all text-left ${statusFilter === 'ready' ? 'bg-green-600 border-green-600 text-white shadow-green-200' : 'bg-white border-white text-gray-600'}`}
        >
          <div className={`flex items-center space-x-2 mb-3 ${statusFilter === 'ready' ? 'text-green-100' : 'text-green-600'}`}>
            <CheckCircle size={20} />
            <span className="text-xs font-bold uppercase tracking-wider">Ready</span>
          </div>
          <span className={`text-3xl font-black ${statusFilter === 'ready' ? 'text-white' : 'text-gray-900'}`}>{stats.ready}</span>
        </button>

        <button 
          onClick={() => setStatusFilter('collected')}
          className={`inline-flex flex-col p-4 rounded-3xl border shadow-sm min-w-[140px] transition-all text-left ${statusFilter === 'collected' ? 'bg-gray-800 border-gray-800 text-white shadow-gray-200' : 'bg-white border-white text-gray-600'}`}
        >
          <div className={`flex items-center space-x-2 mb-3 ${statusFilter === 'collected' ? 'text-gray-300' : 'text-gray-500'}`}>
            <Archive size={20} />
            <span className="text-xs font-bold uppercase tracking-wider">Collected</span>
          </div>
          <span className={`text-3xl font-black ${statusFilter === 'collected' ? 'text-white' : 'text-gray-900'}`}>{stats.collected}</span>
        </button>
      </div>

      {/* DEVICE LIST */}
      <main className="px-6 pb-6">
        <div className="flex justify-between items-center mb-4 px-1">
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-bold text-gray-800">
              {statusFilter === 'all' ? 'All Devices' : `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Devices`}
            </h2>
            <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">
              {filteredDevices.length}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            {statusFilter !== 'all' && (
              <button 
                onClick={() => setStatusFilter('all')}
                className="text-xs text-primary-600 font-bold bg-primary-50 px-3 py-1.5 rounded-full"
              >
                Show All
              </button>
            )}
            {/* SEED BUTTON (Helper for testing) */}
            {devices.length === 0 && !loading && (
              <button onClick={handleSeedDatabase} className="text-xs text-gray-400 flex items-center hover:text-primary-600 transition-colors">
                <Database size={12} className="mr-1" /> Seed
              </button>
            )}
          </div>
        </div>

        {loading ? (
           <div className="flex flex-col items-center justify-center py-20 space-y-4 opacity-60">
             <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-primary-600"></div>
             <p className="text-sm font-medium text-gray-500">Loading devices...</p>
           </div>
        ) : (
          <div className="space-y-4">
            {filteredDevices.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <Search className="text-gray-300 w-8 h-8" />
                </div>
                <h3 className="text-gray-900 font-bold text-lg">No devices found</h3>
                <p className="text-gray-400 text-sm mt-1 max-w-[200px]">
                  {statusFilter !== 'all' ? `No ${statusFilter} devices at the moment.` : "Tap the + button to add your first customer."}
                </p>
              </div>
            ) : (
              filteredDevices.map((device) => {
                const DeviceIcon = getIcon(device.type);
                return (
                  <div 
                    key={device.id} 
                    onClick={() => handleDeviceClick(device)}
                    className="bg-white p-5 rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] active:scale-[0.98] transition-all cursor-pointer group border border-transparent hover:border-primary-100"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-colors ${
                          device.status === 'charging' ? 'bg-blue-50 text-blue-600' :
                          device.status === 'ready' ? 'bg-green-50 text-green-600' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          <DeviceIcon size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-base mb-0.5">{device.customerName}</h3>
                          <div className="flex items-center space-x-2">
                             <span className="text-xs text-gray-500 font-medium">{device.description}</span>
                             <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                             <span className="text-[10px] text-gray-400 font-mono tracking-wide">{device.id}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                         <div className="mb-1">
                           <Badge variant={getStatusColor(device.status) as any}>
                              {device.status}
                           </Badge>
                         </div>
                         <p className="text-[11px] text-gray-400 font-medium">
                           {new Date(device.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                         </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>

       {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 px-6 py-2 flex justify-around items-center z-50 pb-safe">
        <button 
          onClick={() => navigate('/')}
          className="flex flex-col items-center text-primary-600 p-2"
        >
          <Zap size={26} fill="currentColor" />
          <span className="text-[10px] font-bold mt-1">Home</span>
        </button>
        <button 
          onClick={() => navigate('/history')}
          className="flex flex-col items-center text-gray-400 hover:text-gray-600 transition-colors p-2"
        >
          <History size={26} />
          <span className="text-[10px] font-bold mt-1">History</span>
        </button>
        <button 
          onClick={handleLogout}
          className="flex flex-col items-center text-gray-400 hover:text-red-500 transition-colors p-2"
        >
          <LogOut size={26} />
          <span className="text-[10px] font-bold mt-1">Logout</span>
        </button>
      </nav>
      
      {/* iOS Safe Area Spacer */}
      <div className="h-6 w-full bg-white fixed bottom-0 z-50"></div>
    </div>
  );
};

export default Dashboard;