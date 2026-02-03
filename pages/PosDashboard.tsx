import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calculator, 
  History, 
  Wallet, 
  Save,
  UserCheck,
  UserX,
  CreditCard,
  Banknote,
  CheckCircle
} from 'lucide-react';
import { collection, query, orderBy, where, onSnapshot, addDoc, doc, getDoc, setDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input, Modal } from '../components/UI';
import { PosTransaction, CustomerProfile } from '../types';

const PosDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  
  // Data State
  const [transactions, setTransactions] = useState<PosTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Balancer State
  const [openingCash, setOpeningCash] = useState(() => localStorage.getItem('pos_opening_cash') || '0');
  const [openingFloat, setOpeningFloat] = useState(() => localStorage.getItem('pos_opening_float') || '0');
  
  // Transaction Form State
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txType, setTxType] = useState<'withdrawal' | 'deposit'>('withdrawal');
  const [amount, setAmount] = useState('');
  const [fee, setFee] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerTrust, setCustomerTrust] = useState<{status: 'unknown' | 'good' | 'bad', reason?: string}>({ status: 'unknown' });
  const [flagAsRisk, setFlagAsRisk] = useState(false);
  
  // Toast
  const [toast, setToast] = useState<string | null>(null);

  // Smart Calculator Settings
  const SUGGESTED_RATES = [
    { limit: 5000, charge: 100 },
    { limit: 10000, charge: 200 },
    { limit: 20000, charge: 300 },
    { limit: 1000000, charge: 500 }
  ];

  // --- FETCH DATA (TODAY ONLY) ---
  useEffect(() => {
    if (!currentUser) return;

    // Get Start of Today (00:00:00)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfDayISO = startOfDay.toISOString();

    // Real-time listener for TODAY'S transactions
    const q = query(
      collection(db, 'shops', currentUser.uid, 'pos_transactions'),
      where('timestamp', '>=', startOfDayISO),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: PosTransaction[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as PosTransaction));
      setTransactions(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // --- CALCULATIONS ---
  const totals = useMemo(() => {
    let cashInHand = parseFloat(openingCash) || 0;
    let terminalFloat = parseFloat(openingFloat) || 0;
    let dailyProfit = 0;

    transactions.forEach(tx => {
       dailyProfit += tx.fee;

       if (tx.type === 'withdrawal') {
           // Withdrawal: We give CASH, we get TRANSFER (Float increases)
           cashInHand -= tx.amount;
           terminalFloat += (tx.amount + tx.fee); 
       } else {
           // Deposit: We get CASH, we send TRANSFER (Float decreases)
           cashInHand += (tx.amount + tx.fee);
           terminalFloat -= tx.amount;
       }
    });

    return { cashInHand, terminalFloat, dailyProfit };
  }, [transactions, openingCash, openingFloat]);

  // --- ACTIONS ---
  
  const handleAmountChange = (val: string) => {
      setAmount(val);
      const numVal = parseFloat(val);
      if (!isNaN(numVal) && txType === 'withdrawal') {
          const rate = SUGGESTED_RATES.find(r => numVal <= r.limit);
          if (rate) setFee(rate.charge.toString());
      }
  };

  const checkCustomer = async (phone: string) => {
      if (phone.length < 10 || !currentUser) return;
      
      const docRef = doc(db, 'shops', currentUser.uid, 'customers', phone);
      const snap = await getDoc(docRef);
      
      if (snap.exists()) {
          const data = snap.data() as CustomerProfile;
          setCustomerName(data.name);
          if (data.isBadActor) {
              setCustomerTrust({ status: 'bad', reason: data.badActorReason || 'Previous Issue' });
              setFlagAsRisk(true); // Auto-check flag if they are already bad
          } else {
              setCustomerTrust({ status: 'good' });
              setFlagAsRisk(false);
          }
      } else {
          setCustomerTrust({ status: 'unknown' });
          setFlagAsRisk(false);
      }
  };

  const handleTxSubmit = async () => {
      if (!currentUser || !amount) return;

      const numAmount = parseFloat(amount);
      const numFee = parseFloat(fee) || 0;
      
      const newTx = {
          type: txType,
          amount: numAmount,
          fee: numFee,
          total: numAmount + numFee,
          customerName: customerName || 'Walk-in',
          customerPhone: customerPhone,
          timestamp: new Date().toISOString(),
          method: 'cash'
      };

      try {
          // 1. Save Transaction
          await addDoc(collection(db, 'shops', currentUser.uid, 'pos_transactions'), newTx);

          // 2. Update/Save Customer Directory
          if (customerPhone) {
              const custRef = doc(db, 'shops', currentUser.uid, 'customers', customerPhone);
              
              const updateData: any = {
                  phone: customerPhone,
                  name: customerName,
                  lastVisit: new Date().toISOString(),
                  visitCount: increment(1)
              };

              // Only update bad actor status if explicitly flagged or unflagged
              if (flagAsRisk) {
                  updateData.isBadActor = true;
                  updateData.badActorReason = 'Flagged at POS';
              } else if (customerTrust.status === 'bad' && !flagAsRisk) {
                  // Admin decided to forgive/unflag
                  updateData.isBadActor = false;
                  updateData.badActorReason = null;
              }

              await setDoc(custRef, updateData, { merge: true });
          }

          setToast(`${txType === 'withdrawal' ? 'Withdrawal' : 'Deposit'} Recorded!`);
          setTimeout(() => setToast(null), 3000);
          
          setIsTxModalOpen(false);
          resetForm();
      } catch (e) {
          console.error(e);
          alert("Failed to save transaction");
      }
  };

  const resetForm = () => {
      setAmount('');
      setFee('');
      setCustomerPhone('');
      setCustomerName('');
      setCustomerTrust({ status: 'unknown' });
      setFlagAsRisk(false);
  };

  const updateOpeningBalance = (type: 'cash' | 'float', val: string) => {
      if (type === 'cash') {
          setOpeningCash(val);
          localStorage.setItem('pos_opening_cash', val);
      } else {
          setOpeningFloat(val);
          localStorage.setItem('pos_opening_float', val);
      }
  };

  return (
    <div className="pb-24 animate-in fade-in slide-in-from-right-4 duration-300 relative">
        
        {/* TOAST */}
        {toast && (
            <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-slate-800 border border-slate-700 text-white px-6 py-3 rounded-full shadow-xl z-50 flex items-center animate-in slide-in-from-top-4">
                <CheckCircle size={18} className="mr-2 text-green-400" />
                <span className="font-bold text-sm">{toast}</span>
            </div>
        )}

        {/* TOP BALANCER CARDS */}
        <div className="bg-slate-900 text-white p-6 rounded-b-[2.5rem] shadow-2xl shadow-black/40 mb-6 border-b border-slate-800">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-sm font-bold text-primary-400 uppercase tracking-widest flex items-center">
                       <Wallet size={16} className="mr-2" /> Live Balancer
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">Track Cash vs Terminal</p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-slate-400 font-bold uppercase">Daily Profit</p>
                    <p className="text-2xl font-black text-primary-400">₦{totals.dailyProfit.toLocaleString()}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* CASH CARD */}
                <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
                    <div className="flex justify-between items-start mb-2">
                        <Banknote className="text-slate-400" size={20} />
                        <span className="text-[10px] font-bold bg-slate-700 px-2 py-0.5 rounded text-slate-300">CASH</span>
                    </div>
                    <p className="text-xl font-bold mb-3">₦{totals.cashInHand.toLocaleString()}</p>
                    <div className="relative">
                        <label className="text-[9px] font-bold text-slate-500 uppercase absolute -top-3 left-0">Opening Cash</label>
                        <input 
                           type="number" 
                           value={openingCash}
                           onChange={(e) => updateOpeningBalance('cash', e.target.value)}
                           className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-slate-300 focus:border-primary-500 outline-none transition-colors"
                        />
                    </div>
                </div>

                {/* FLOAT CARD */}
                <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
                    <div className="flex justify-between items-start mb-2">
                        <CreditCard className="text-slate-400" size={20} />
                        <span className="text-[10px] font-bold bg-slate-700 px-2 py-0.5 rounded text-slate-300">FLOAT</span>
                    </div>
                    <p className="text-xl font-bold mb-3">₦{totals.terminalFloat.toLocaleString()}</p>
                    <div className="relative">
                        <label className="text-[9px] font-bold text-slate-500 uppercase absolute -top-3 left-0">Opening Float</label>
                        <input 
                           type="number" 
                           value={openingFloat}
                           onChange={(e) => updateOpeningBalance('float', e.target.value)}
                           className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-slate-300 focus:border-primary-500 outline-none transition-colors"
                        />
                    </div>
                </div>
            </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="px-6 grid grid-cols-2 gap-4 mb-8">
            <button 
                onClick={() => { setTxType('withdrawal'); setIsTxModalOpen(true); }}
                className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 p-4 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-95 shadow-sm"
            >
                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center text-red-500 mb-2 shadow-inner">
                    <ArrowUpRight size={24} strokeWidth={3} />
                </div>
                <span className="font-black text-slate-200">Withdrawal</span>
                <span className="text-xs text-red-400 font-medium">Give Cash</span>
            </button>

            <button 
                onClick={() => { setTxType('deposit'); setIsTxModalOpen(true); }}
                className="bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 p-4 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-95 shadow-sm"
            >
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center text-green-500 mb-2 shadow-inner">
                    <ArrowDownLeft size={24} strokeWidth={3} />
                </div>
                <span className="font-black text-slate-200">Deposit</span>
                <span className="text-xs text-green-400 font-medium">Get Cash</span>
            </button>
        </div>

        {/* RECENT LOGBOOK */}
        <div className="px-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center">
                <History size={16} className="mr-2" /> Today's Logbook
            </h3>

            <div className="space-y-3">
                {loading ? (
                    <div className="text-center py-10 opacity-50 text-slate-500">Loading...</div>
                ) : transactions.length === 0 ? (
                    <div className="text-center py-10 bg-slate-900 rounded-2xl border border-dashed border-slate-800">
                        <p className="text-slate-500 font-medium">No transactions today</p>
                    </div>
                ) : (
                    transactions.map((tx) => (
                        <div key={tx.id} className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm flex items-center justify-between">
                            <div className="flex items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                                    tx.type === 'withdrawal' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'
                                }`}>
                                    {tx.type === 'withdrawal' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                                </div>
                                <div>
                                    <p className="font-bold text-white">{tx.customerName}</p>
                                    <p className="text-xs text-slate-400 flex items-center">
                                        {new Date(tx.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        <span className="mx-1">•</span>
                                        Fee: ₦{tx.fee}
                                    </p>
                                </div>
                            </div>
                            <span className={`font-black text-lg ${
                                tx.type === 'withdrawal' ? 'text-slate-200' : 'text-green-400'
                            }`}>
                                ₦{tx.amount.toLocaleString()}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* NEW TRANSACTION MODAL */}
        <Modal 
            isOpen={isTxModalOpen} 
            onClose={() => setIsTxModalOpen(false)} 
            title={txType === 'withdrawal' ? 'New Withdrawal' : 'New Deposit'}
        >
            <div className="space-y-5">
                {/* Auto-Calculator Banner */}
                {txType === 'withdrawal' && (
                    <div className="bg-blue-500/10 p-3 rounded-xl flex items-start text-blue-400 text-xs border border-blue-500/20">
                        <Calculator size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                        <p>Smart Calculator Active: Fees are suggested automatically based on amount.</p>
                    </div>
                )}

                <Input 
                    label="Amount"
                    type="number"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="0.00"
                    className="text-lg font-bold"
                    autoFocus
                />

                <Input 
                    label="Your Fee"
                    type="number"
                    value={fee}
                    onChange={(e) => setFee(e.target.value)}
                    placeholder="0.00"
                />

                <div className="relative">
                    <Input 
                        label="Customer Phone (Auto-lookup)"
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => {
                            setCustomerPhone(e.target.value);
                            if(e.target.value.length >= 10) checkCustomer(e.target.value);
                        }}
                        placeholder="080..."
                        icon={UserCheck}
                    />
                    {/* Trust Indicator */}
                    {customerTrust.status === 'good' && (
                         <div className="absolute right-3 top-[38px] text-green-400 flex items-center text-xs font-bold bg-green-500/10 px-2 py-1 rounded-full border border-green-500/20">
                             <UserCheck size={12} className="mr-1" /> Trusted
                         </div>
                    )}
                    {customerTrust.status === 'bad' && (
                         <div className="absolute right-3 top-[38px] text-red-400 flex items-center text-xs font-bold bg-red-500/10 px-2 py-1 rounded-full animate-pulse border border-red-500/20">
                             <UserX size={12} className="mr-1" /> Flagged
                         </div>
                    )}
                </div>

                <Input 
                    label="Customer Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Mama Tobi"
                />

                {/* SECURITY FLAG TOGGLE */}
                <div 
                   onClick={() => setFlagAsRisk(!flagAsRisk)}
                   className={`p-4 rounded-xl border-2 flex items-center cursor-pointer transition-all ${
                       flagAsRisk 
                       ? 'border-red-500 bg-red-500/10' 
                       : 'border-slate-800 bg-slate-900 hover:bg-slate-800'
                   }`}
                >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 ${
                        flagAsRisk ? 'border-red-500 bg-red-500 text-white' : 'border-slate-600'
                    }`}>
                        {flagAsRisk && <UserX size={14} />}
                    </div>
                    <div>
                        <p className={`text-sm font-bold ${flagAsRisk ? 'text-red-400' : 'text-slate-300'}`}>
                            Flag as High Risk
                        </p>
                        <p className="text-xs text-slate-500">Mark if customer attempts fake alerts or trouble.</p>
                    </div>
                </div>

                <Button 
                    fullWidth 
                    onClick={handleTxSubmit}
                    icon={Save}
                    className={`h-12 ${txType === 'withdrawal' ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'}`}
                >
                    Confirm {txType === 'withdrawal' ? 'Withdrawal' : 'Deposit'}
                </Button>
            </div>
        </Modal>
    </div>
  );
};

export default PosDashboard;