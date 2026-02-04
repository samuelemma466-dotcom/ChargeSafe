import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  User, 
  ShieldAlert, 
  ShieldCheck, 
  Phone, 
  Calendar,
  MoreVertical,
  UserX,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { collection, query, orderBy, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Input, BottomNav, Skeleton, Modal, Button } from '../components/UI';
import { CustomerProfile } from '../types';

const Customers: React.FC = () => {
  const { currentUser } = useAuth();
  
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);

    const q = query(
        collection(db, 'shops', currentUser.uid, 'customers'),
        orderBy('lastVisit', 'desc')
    );
    
    // Real-time listener
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const data: CustomerProfile[] = [];
        snapshot.forEach((doc) => {
            data.push(doc.data() as CustomerProfile);
        });
        setCustomers(data);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching customers:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return customers.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.phone.includes(q)
    );
  }, [customers, searchQuery]);

  const toggleBadActor = async () => {
    if (!currentUser || !selectedCustomer) return;
    setActionLoading(true);
    
    try {
      const newStatus = !selectedCustomer.isBadActor;
      const ref = doc(db, 'shops', currentUser.uid, 'customers', selectedCustomer.phone);
      
      await updateDoc(ref, {
        isBadActor: newStatus,
        badActorReason: newStatus ? 'Flagged manually via directory' : null
      });

      // Local state update handled by onSnapshot automatically
      // Just need to close modal
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    } finally {
      setActionLoading(false);
    }
  };

  const openCustomer = (c: CustomerProfile) => {
    setSelectedCustomer(c);
    setIsModalOpen(true);
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 relative overflow-hidden">
      {/* Header */}
      <div className="flex-none sticky top-0 bg-slate-950/95 backdrop-blur-sm z-10 px-6 py-4 border-b border-slate-800 pt-safe">
        <h1 className="text-xl font-black text-white mb-4">Customer Directory</h1>
        <Input 
          placeholder="Search name or phone..." 
          icon={Search} 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mb-0"
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-24">
        {loading ? (
           Array(5).fill(0).map((_, i) => (
             <div key={i} className="flex items-center space-x-4">
               <Skeleton className="h-12 w-12 rounded-full" />
               <div className="space-y-2 flex-1">
                 <Skeleton className="h-4 w-1/2" />
                 <Skeleton className="h-3 w-1/3" />
               </div>
             </div>
           ))
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <User size={48} className="mx-auto mb-4 opacity-20" />
            <p>No customers found</p>
          </div>
        ) : (
          filteredCustomers.map((c) => (
            <div 
              key={c.phone} 
              onClick={() => openCustomer(c)}
              className={`p-4 rounded-2xl border flex items-center justify-between transition-colors cursor-pointer active:scale-[0.98] ${
                c.isBadActor 
                ? 'bg-red-500/5 border-red-500/20' 
                : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                   c.isBadActor ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                   {c.name.charAt(0).toUpperCase()}
                </div>
                <div>
                   <h3 className={`font-bold ${c.isBadActor ? 'text-red-200' : 'text-white'}`}>
                     {c.name}
                   </h3>
                   <div className="flex items-center text-xs text-slate-500 mt-0.5">
                      <Phone size={10} className="mr-1" /> {c.phone}
                   </div>
                </div>
              </div>

              <div className="text-right">
                 {c.isBadActor && (
                    <ShieldAlert size={20} className="text-red-500 mb-1 ml-auto" />
                 )}
                 <p className="text-[10px] font-bold text-slate-600 bg-slate-950 px-2 py-0.5 rounded-md inline-block border border-slate-800">
                    {c.visitCount} Visits
                 </p>
              </div>
            </div>
          ))
        )}
      </div>

      <BottomNav />

      {/* Detail Modal */}
      {selectedCustomer && (
        <Modal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          title="Customer Profile"
        >
          <div className="text-center mb-6">
            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center text-3xl font-black mb-4 ${
               selectedCustomer.isBadActor ? 'bg-red-500 text-white shadow-lg shadow-red-900/50' : 'bg-slate-800 text-slate-300'
            }`}>
              {selectedCustomer.name.charAt(0)}
            </div>
            <h2 className="text-2xl font-bold text-white">{selectedCustomer.name}</h2>
            <p className="text-primary-400 font-medium flex items-center justify-center mt-1">
               <Phone size={14} className="mr-1" /> {selectedCustomer.phone}
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 mb-6 grid grid-cols-2 gap-4">
             <div>
                <p className="text-xs text-slate-500 uppercase font-bold">Total Visits</p>
                <p className="text-xl font-white text-white">{selectedCustomer.visitCount}</p>
             </div>
             <div>
                <p className="text-xs text-slate-500 uppercase font-bold">Last Seen</p>
                <p className="text-sm font-white text-white mt-1">
                   {new Date(selectedCustomer.lastVisit).toLocaleDateString()}
                </p>
             </div>
          </div>

          <div className="space-y-3">
             {selectedCustomer.isBadActor ? (
                <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20 mb-4">
                   <h4 className="text-red-400 font-bold flex items-center text-sm mb-1">
                      <AlertTriangle size={16} className="mr-2" /> High Risk Customer
                   </h4>
                   <p className="text-xs text-red-200/70">
                      Reason: {selectedCustomer.badActorReason}
                   </p>
                </div>
             ) : (
                <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/20 mb-4">
                   <h4 className="text-green-400 font-bold flex items-center text-sm">
                      <CheckCircle size={16} className="mr-2" /> Trusted Status
                   </h4>
                </div>
             )}

             <Button 
               fullWidth 
               onClick={toggleBadActor}
               isLoading={actionLoading}
               variant={selectedCustomer.isBadActor ? 'primary' : 'danger'}
               icon={selectedCustomer.isBadActor ? ShieldCheck : UserX}
             >
               {selectedCustomer.isBadActor ? 'Mark as Trusted' : 'Flag as High Risk'}
             </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Customers;