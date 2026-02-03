import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Search, 
  Download, 
  Calendar, 
  Smartphone, 
  Laptop, 
  Battery, 
  HelpCircle,
  Filter,
  Clock,
  ChevronDown,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { DeviceEntry, DeviceType, PosTransaction } from '../types';
import { Input, Badge, BottomNav, Skeleton } from '../components/UI';

const History: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'charging' | 'pos'>('charging');
  
  const [chargingData, setChargingData] = useState<DeviceEntry[]>([]);
  const [posData, setPosData] = useState<PosTransaction[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  // Fetch History Data Real-time
  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);

    const chargeQ = query(
      collection(db, 'shops', currentUser.uid, 'devices'),
      orderBy('startTime', 'desc')
    );
    
    const unsubscribeCharge = onSnapshot(chargeQ, (snapshot) => {
      const fetchedCharge: DeviceEntry[] = [];
      snapshot.forEach((doc) => fetchedCharge.push(doc.data() as DeviceEntry));
      setChargingData(fetchedCharge);
      // We'll let POS load independently or wait for both? 
      // For smoothness, we can check if both initialized, but setting state is fine
    });

    const posQ = query(
      collection(db, 'shops', currentUser.uid, 'pos_transactions'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribePos = onSnapshot(posQ, (snapshot) => {
      const fetchedPos: PosTransaction[] = [];
      snapshot.forEach((doc) => fetchedPos.push(doc.data() as PosTransaction));
      setPosData(fetchedPos);
      setLoading(false); // Assume done when POS loads, strictly we could track both
    });

    return () => {
      unsubscribeCharge();
      unsubscribePos();
    };
  }, [currentUser]);

  // --- STATS COMPUTATION ---
  const stats = useMemo(() => {
    const monthCharge = chargingData.filter(d => d.startTime.startsWith(selectedMonth));
    const monthPos = posData.filter(d => d.timestamp.startsWith(selectedMonth));
    
    const chargeRev = monthCharge.reduce((acc, curr) => acc + (curr.fee || 0), 0);
    const posFeeRev = monthPos.reduce((acc, curr) => acc + (curr.fee || 0), 0);

    return {
      count: monthCharge.length + monthPos.length,
      revenue: chargeRev + posFeeRev,
      chargeRevenue: chargeRev,
      posRevenue: posFeeRev,
      monthName: new Date(selectedMonth + "-01").toLocaleString('default', { month: 'long', year: 'numeric' })
    };
  }, [chargingData, posData, selectedMonth]);

  // --- FILTERING LIST ---
  const filteredList = useMemo(() => {
    const q = searchQuery.toLowerCase();
    
    if (activeTab === 'charging') {
        return chargingData.filter(item => {
            const inMonth = item.startTime.startsWith(selectedMonth);
            const matchesSearch = 
                item.id.toLowerCase().includes(q) ||
                item.customerName.toLowerCase().includes(q) ||
                item.description.toLowerCase().includes(q);
            return inMonth && matchesSearch;
        });
    } else {
        return posData.filter(item => {
            const inMonth = item.timestamp.startsWith(selectedMonth);
            const matchesSearch = 
                (item.customerName || '').toLowerCase().includes(q) ||
                (item.customerPhone || '').toLowerCase().includes(q);
            return inMonth && matchesSearch;
        });
    }
  }, [chargingData, posData, searchQuery, selectedMonth, activeTab]);

  const getIcon = (type: DeviceType) => {
    switch (type) {
      case DeviceType.PHONE: return Smartphone;
      case DeviceType.LAPTOP: return Laptop;
      case DeviceType.POWER_BANK: return Battery;
      default: return HelpCircle;
    }
  };

  const calculateDuration = (start: string, end?: string) => {
    if (!end) return 'N/A';
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.round((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHrs > 0) return `${diffHrs}h ${diffMins}m`;
    return `${diffMins} mins`;
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      
      {/* HEADER */}
      <div className="sticky top-0 bg-slate-950/95 backdrop-blur-sm z-10 px-6 py-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={() => navigate('/')} 
            className="p-2 -ml-2 rounded-full hover:bg-slate-800 text-slate-400 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center space-x-2">
             <Calendar size={18} className="text-slate-400" />
             <input 
               type="month"
               value={selectedMonth}
               onChange={(e) => setSelectedMonth(e.target.value)}
               className="font-bold text-white bg-transparent border-none focus:ring-0 p-0 text-lg cursor-pointer appearance-none"
             />
             <ChevronDown size={14} className="text-slate-400" />
          </div>
          <button 
            className="p-2 -mr-2 text-primary-400 hover:bg-slate-800 rounded-full"
            title="Download Report"
          >
            <Download size={20} />
          </button>
        </div>

        {/* SEARCH & TABS */}
        <div className="space-y-3">
            <Input 
                placeholder={`Search ${stats.monthName}...`}
                icon={Search} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mb-0" 
            />
            <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl">
                <button
                    onClick={() => setActiveTab('charging')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                        activeTab === 'charging' ? 'bg-slate-800 shadow-sm text-white' : 'text-slate-500 hover:text-slate-300'
                    }`}
                >
                    Device Charging
                </button>
                <button
                    onClick={() => setActiveTab('pos')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                        activeTab === 'pos' ? 'bg-slate-800 shadow-sm text-white' : 'text-slate-500 hover:text-slate-300'
                    }`}
                >
                    POS / Logbook
                </button>
            </div>
        </div>
      </div>

      {/* MONTHLY SUMMARY CARD */}
      <div className="p-6 pb-2">
         <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-3xl p-6 text-white shadow-xl shadow-black/20">
            <h2 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">{stats.monthName} Revenue</h2>
            <div className="flex items-end space-x-2 mb-6">
                <span className="text-4xl font-black tracking-tight text-white">₦{stats.revenue.toLocaleString()}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 border-t border-slate-700 pt-4">
               <div>
                  <p className="text-slate-400 text-[10px] uppercase mb-1">Charging</p>
                  <p className="font-bold text-lg">₦{stats.chargeRevenue.toLocaleString()}</p>
               </div>
               <div>
                  <p className="text-slate-400 text-[10px] uppercase mb-1">POS Fees</p>
                  <p className="font-bold text-lg">₦{stats.posRevenue.toLocaleString()}</p>
               </div>
            </div>
         </div>
      </div>

      {/* RECORDS LIST */}
      <main className="px-6 py-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-semibold text-slate-500">
              {activeTab === 'charging' ? 'Device Logs' : 'Transaction Logs'}
          </h2>
          <div className="text-xs text-slate-400 bg-slate-900 border border-slate-800 px-2 py-1 rounded-md">
            {filteredList.length} entries
          </div>
        </div>

        {loading ? (
           <div className="space-y-4">
             <Skeleton className="h-24 w-full" />
             <Skeleton className="h-24 w-full" />
           </div>
        ) : (
          <div className="space-y-4">
            {filteredList.length === 0 ? (
              <div className="text-center py-16 bg-slate-900 rounded-3xl border border-dashed border-slate-800">
                <div className="mx-auto w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-3">
                  <Filter className="text-slate-600" />
                </div>
                <p className="text-slate-500 font-medium">No records found</p>
              </div>
            ) : (
                activeTab === 'charging' ? (
                    // CHARGING LIST
                    (filteredList as DeviceEntry[]).map((record) => {
                        const DeviceIcon = getIcon(record.type);
                        return (
                        <div key={record.id} className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm hover:border-slate-700 transition-colors">
                            <div className="flex justify-between items-start mb-3 border-b border-slate-800 pb-2">
                            <div className="flex items-center space-x-2">
                                <span className="text-xs font-mono font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                                {record.id}
                                </span>
                                <Badge variant="gray" className="text-[10px]">
                                {record.status === 'collected' ? 'Collected' : 'Active'}
                                </Badge>
                            </div>
                            <span className="text-primary-400 font-bold">₦{record.fee}</span>
                            </div>

                            <div className="flex items-start space-x-3 mb-3">
                            <div className="h-10 w-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-500 flex-shrink-0">
                                <DeviceIcon size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-sm">{record.customerName}</h3>
                                <p className="text-xs text-slate-400">{record.description}</p>
                            </div>
                            </div>

                            <div className="flex justify-between items-center text-xs text-slate-500 bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                            <div className="flex items-center space-x-1">
                                <Calendar size={12} />
                                <span>{new Date(record.startTime).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                                <Clock size={12} />
                                <span>Time: <span className="text-slate-400 font-medium">{calculateDuration(record.startTime, record.endTime)}</span></span>
                            </div>
                            </div>
                        </div>
                        );
                    })
                ) : (
                    // POS LIST
                    (filteredList as PosTransaction[]).map((tx) => (
                        <div key={tx.id} className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-col">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                                        tx.type === 'withdrawal' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'
                                    }`}>
                                        {tx.type === 'withdrawal' ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-white text-sm">{tx.customerName}</p>
                                        <p className="text-[10px] text-slate-500">
                                            {new Date(tx.timestamp).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`font-black text-sm ${
                                        tx.type === 'withdrawal' ? 'text-slate-200' : 'text-green-400'
                                    }`}>
                                        ₦{tx.amount.toLocaleString()}
                                    </p>
                                    <p className="text-[10px] text-slate-500">Fee: ₦{tx.fee}</p>
                                </div>
                            </div>
                        </div>
                    ))
                )
            )}
          </div>
        )}
      </main>
      
      <BottomNav />
    </div>
  );
};

export default History;
