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
  CreditCard,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { DeviceEntry, DeviceType } from '../types';
import { Button, Input, Badge } from '../components/UI';

const History: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [historyData, setHistoryData] = useState<DeviceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Fetch History Data
  useEffect(() => {
    const fetchHistory = async () => {
      if (!currentUser) return;
      
      try {
        const q = query(
          collection(db, 'shops', currentUser.uid, 'devices'),
          orderBy('startTime', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const fetchedData: DeviceEntry[] = [];
        querySnapshot.forEach((doc) => {
          fetchedData.push(doc.data() as DeviceEntry);
        });
        
        setHistoryData(fetchedData);
      } catch (err) {
        console.error("Error fetching history:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [currentUser]);

  // --- STATS COMPUTATION ---
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    const todayRecords = historyData.filter(d => d.startTime.startsWith(todayStr));
    const totalFees = historyData.reduce((acc, curr) => acc + (curr.fee || 0), 0);

    return {
      todayCount: todayRecords.length,
      totalCount: historyData.length,
      totalRevenue: totalFees
    };
  }, [historyData]);

  // --- FILTERING ---
  const filteredData = useMemo(() => {
    return historyData.filter(item => {
      const matchesSearch = 
        item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesDate = dateFilter ? item.startTime.startsWith(dateFilter) : true;

      return matchesSearch && matchesDate;
    });
  }, [historyData, searchQuery, dateFilter]);

  // --- HELPERS ---
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

  const handleExport = () => {
    alert("Exporting CSV... (Feature simulated)");
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      
      {/* HEADER */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={() => navigate('/')} 
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Records History</h1>
          <button 
            onClick={handleExport}
            className="p-2 -mr-2 text-primary-600 hover:bg-primary-50 rounded-full"
            title="Export Records"
          >
            <Download size={20} />
          </button>
        </div>

        {/* SEARCH & FILTER */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Input 
              placeholder="Search Order # or Name..." 
              icon={Search} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-0" // Override default margin
            />
          </div>
          <div className="relative">
            <input 
              type="date"
              className="h-[50px] rounded-xl border border-gray-300 px-3 bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none text-sm text-gray-600"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="px-6 py-6 overflow-x-auto whitespace-nowrap hide-scrollbar flex space-x-3">
        <div className="inline-block p-4 bg-primary-600 text-white rounded-2xl shadow-lg shadow-primary-600/20 min-w-[150px]">
          <div className="flex items-center space-x-2 mb-2 opacity-80">
            <CreditCard size={18} />
            <span className="text-xs font-semibold uppercase">Total Revenue</span>
          </div>
          <span className="text-2xl font-bold">₦{stats.totalRevenue.toLocaleString()}</span>
        </div>

        <div className="inline-block p-4 bg-white border border-gray-200 text-gray-900 rounded-2xl shadow-sm min-w-[140px]">
          <div className="flex items-center space-x-2 mb-2 text-gray-500">
            <CheckCircle2 size={18} />
            <span className="text-xs font-semibold uppercase">Total Devices</span>
          </div>
          <span className="text-2xl font-bold">{stats.totalCount}</span>
        </div>

        <div className="inline-block p-4 bg-white border border-gray-200 text-gray-900 rounded-2xl shadow-sm min-w-[140px]">
          <div className="flex items-center space-x-2 mb-2 text-gray-500">
            <Calendar size={18} />
            <span className="text-xs font-semibold uppercase">Today</span>
          </div>
          <span className="text-2xl font-bold">{stats.todayCount}</span>
        </div>
      </div>

      {/* RECORDS LIST */}
      <main className="px-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-semibold text-gray-500">Past Records</h2>
          <div className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-md">
            {filteredData.length} records
          </div>
        </div>

        {loading ? (
           <div className="flex justify-center py-12">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
           </div>
        ) : (
          <div className="space-y-4">
            {filteredData.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200">
                <div className="mx-auto w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                  <Filter className="text-gray-300" />
                </div>
                <p className="text-gray-500 font-medium">No records found</p>
                <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              filteredData.map((record) => {
                const DeviceIcon = getIcon(record.type);
                return (
                  <div key={record.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    {/* Top Row: ID & Fee */}
                    <div className="flex justify-between items-start mb-3 border-b border-gray-50 pb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                          {record.id}
                        </span>
                        <Badge variant="gray" className="text-[10px]">
                          {record.status === 'collected' ? 'Collected' : 'Active'}
                        </Badge>
                      </div>
                      <span className="text-primary-700 font-bold">₦{record.fee}</span>
                    </div>

                    {/* Main Content */}
                    <div className="flex items-start space-x-3 mb-3">
                      <div className="h-10 w-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-500 flex-shrink-0">
                        <DeviceIcon size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm">{record.customerName}</h3>
                        <p className="text-xs text-gray-500">{record.description}</p>
                      </div>
                    </div>

                    {/* Footer: Time Details */}
                    <div className="flex justify-between items-center text-xs text-gray-400 bg-gray-50 p-2 rounded-lg">
                      <div className="flex items-center space-x-1">
                        <Calendar size={12} />
                        <span>{new Date(record.startTime).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock size={12} />
                        <span>Duration: <span className="text-gray-600 font-medium">{calculateDuration(record.startTime, record.endTime)}</span></span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default History;
