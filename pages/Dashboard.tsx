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
  Filter, 
  ChevronRight,
  History,
  Settings,
  LogOut,
  Database
} from 'lucide-react';
import { collection, query, where, onSnapshot, writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Input, Badge, Button } from '../components/UI';
import { DeviceEntry, DeviceType, DeviceStatus } from '../types';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, shopDetails, logout } = useAuth();
  
  const [devices, setDevices] = useState<DeviceEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DeviceStatus>('all');
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
    <div className="min-h-screen bg-gray-50 pb-20 relative">
      
      {/* HEADER SECTION */}
      <header className="bg-white sticky top-0 z-10 border-b border-gray-200">
        <div className="px-6 pt-12 pb-4">
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Dashboard</p>
              <h1 className="text-2xl font-bold text-gray-900 truncate max-w-[200px]">
                {shopDetails?.shopName || 'My Shop'}
              </h1>
            </div>
            <button 
              onClick={() => navigate('/add')}
              className="bg-primary-600 text-white p-3 rounded-full shadow-lg shadow-primary-600/30 active:scale-95 transition-transform"
            >
              <Plus size={24} />
            </button>
          </div>

          {/* SEARCH BAR */}
          <div className="relative">
            <Input 
              placeholder="Search by name, Order #..." 
              icon={Search} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-gray-50 border-gray-200"
            />
          </div>
        </div>
      </header>

      {/* STATS SUMMARY (Horizontal Scroll) */}
      <div className="px-6 py-4 overflow-x-auto whitespace-nowrap hide-scrollbar flex space-x-3 bg-gray-50/50 backdrop-blur-sm">
        <button 
          onClick={() => setStatusFilter('charging')}
          className={`inline-flex flex-col p-4 rounded-2xl border shadow-sm min-w-[130px] transition-all text-left ${statusFilter === 'charging' ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500 ring-opacity-20' : 'bg-white border-blue-100 hover:border-blue-200'}`}
        >
          <div className="flex items-center space-x-2 text-blue-600 mb-2">
            <Zap size={18} />
            <span className="text-xs font-semibold uppercase">Charging</span>
          </div>
          <span className="text-2xl font-bold text-gray-900">{stats.charging}</span>
        </button>

        <button 
          onClick={() => setStatusFilter('ready')}
          className={`inline-flex flex-col p-4 rounded-2xl border shadow-sm min-w-[130px] transition-all text-left ${statusFilter === 'ready' ? 'bg-green-50 border-green-300 ring-2 ring-green-500 ring-opacity-20' : 'bg-white border-green-100 hover:border-green-200'}`}
        >
          <div className="flex items-center space-x-2 text-green-600 mb-2">
            <CheckCircle size={18} />
            <span className="text-xs font-semibold uppercase">Ready</span>
          </div>
          <span className="text-2xl font-bold text-gray-900">{stats.ready}</span>
        </button>

        <button 
          onClick={() => setStatusFilter('collected')}
          className={`inline-flex flex-col p-4 rounded-2xl border shadow-sm min-w-[130px] transition-all text-left ${statusFilter === 'collected' ? 'bg-gray-100 border-gray-300 ring-2 ring-gray-400 ring-opacity-20' : 'bg-white border-gray-100 hover:border-gray-200'}`}
        >
          <div className="flex items-center space-x-2 text-gray-500 mb-2">
            <Archive size={18} />
            <span className="text-xs font-semibold uppercase">Collected</span>
          </div>
          <span className="text-2xl font-bold text-gray-900">{stats.collected}</span>
        </button>
      </div>

      {/* DEVICE LIST */}
      <main className="px-6 pb-6">
        <div className="flex justify-between items-center mb-3 px-1">
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-semibold text-gray-500">
              {statusFilter === 'all' ? 'All Devices' : `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Devices`}
              <span className="ml-1">({filteredDevices.length})</span>
            </h2>
            {statusFilter !== 'all' && (
              <button 
                onClick={() => setStatusFilter('all')}
                className="text-xs text-primary-600 font-medium bg-primary-50 px-2 py-0.5 rounded-full"
              >
                Clear
              </button>
            )}
          </div>
          
          {/* SEED BUTTON (Helper for testing) */}
          {devices.length === 0 && !loading && (
             <button onClick={handleSeedDatabase} className="text-xs text-primary-600 flex items-center hover:underline">
               <Database size={12} className="mr-1" /> Seed Data
             </button>
          )}
        </div>

        {loading ? (
           <div className="flex justify-center py-12">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
           </div>
        ) : (
          <div className="space-y-3">
            {filteredDevices.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
                <div className="mx-auto w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                  <Search className="text-gray-300" />
                </div>
                <p className="text-gray-500">No devices found</p>
              </div>
            ) : (
              filteredDevices.map((device) => {
                const DeviceIcon = getIcon(device.type);
                return (
                  <div 
                    key={device.id} 
                    onClick={() => handleDeviceClick(device)}
                    className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between active:bg-gray-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className={`h-12 w-12 rounded-xl flex items-center justify-center transition-colors ${
                        device.status === 'charging' ? 'bg-blue-50 text-blue-600 group-hover:bg-blue-100' :
                        device.status === 'ready' ? 'bg-green-50 text-green-600 group-hover:bg-green-100' :
                        'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                      }`}>
                        <DeviceIcon size={22} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-[15px]">{device.customerName}</h3>
                        <p className="text-xs text-gray-500 font-medium mb-1">{device.description}</p>
                        <span className="text-[10px] text-gray-400 font-mono bg-gray-50 px-1.5 py-0.5 rounded">{device.id}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex flex-col items-end space-y-2">
                        <Badge variant={getStatusColor(device.status) as any}>
                          {device.status === 'charging' ? 'Charging' : device.status === 'ready' ? 'Ready' : 'Done'}
                        </Badge>
                        <span className="text-[11px] text-gray-400 font-medium">
                          {new Date(device.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <ChevronRight size={18} className="text-gray-300" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>

       {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex justify-around items-center z-50">
        <button 
          onClick={() => navigate('/')}
          className="flex flex-col items-center text-primary-600"
        >
          <Zap size={24} fill="currentColor" />
          <span className="text-[10px] font-medium mt-1">Home</span>
        </button>
        <button 
          onClick={() => navigate('/history')}
          className="flex flex-col items-center text-gray-400 hover:text-gray-600 transition-colors"
        >
          <History size={24} />
          <span className="text-[10px] font-medium mt-1">History</span>
        </button>
        <button 
          onClick={handleLogout}
          className="flex flex-col items-center text-gray-400 hover:text-red-500 transition-colors"
        >
          <LogOut size={24} />
          <span className="text-[10px] font-medium mt-1">Logout</span>
        </button>
      </nav>
    </div>
  );
};

export default Dashboard;