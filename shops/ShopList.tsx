import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Store, MapPin, Phone, Hash } from 'lucide-react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Input } from '../components/UI';
import { ShopProfile } from '../types';

const ShopList: React.FC = () => {
  const navigate = useNavigate();
  const [shops, setShops] = useState<ShopProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchShops = async () => {
      try {
        const q = query(collection(db, 'shops'), orderBy('createdAt', 'desc'));
        
        const querySnapshot = await getDocs(q).catch(() => getDocs(query(collection(db, 'shops'))));
        
        const fetchedShops: ShopProfile[] = [];
        querySnapshot.forEach((doc) => {
          fetchedShops.push(doc.data() as ShopProfile);
        });
        setShops(fetchedShops);
      } catch (err) {
        console.error("Error fetching shops:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchShops();
  }, []);

  const filteredShops = shops.filter(shop => {
    const cityName = shop.city || shop.location?.city || '';
    const shopName = shop.shopName || '';
    const q = searchQuery.toLowerCase();
    
    return shopName.toLowerCase().includes(q) || cityName.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-safe">
      {/* Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 px-6 py-4 border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={() => navigate('/')} 
            className="p-3 -ml-3 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Registered Shops</h1>
          <div className="w-10"></div>
        </div>

        <Input 
          placeholder="Search shops or cities..." 
          icon={Search} 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mb-0"
        />
      </div>

      {/* List */}
      <div className="p-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredShops.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Store size={48} className="mx-auto mb-4 opacity-30" />
                <p>No shops found</p>
              </div>
            ) : (
              filteredShops.map((shop, index) => {
                const displayAddress = shop.address || shop.location?.street || 'No address';
                const displayCity = shop.city || shop.location?.city || '';
                
                return (
                  <div 
                    key={index} 
                    className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-start space-x-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-12 h-12 bg-primary-50 rounded-full flex items-center justify-center text-primary-600 flex-shrink-0">
                      <Store size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                          <h3 className="font-bold text-gray-900 text-lg truncate pr-2">{shop.shopName}</h3>
                          {shop.slots ? (
                              <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-lg font-bold flex items-center flex-shrink-0">
                                <Hash size={10} className="mr-1" /> {shop.slots}
                              </span>
                          ) : null}
                      </div>
                      
                      <div className="flex items-start text-sm text-gray-500 mt-1">
                        <MapPin size={14} className="mr-1.5 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-2 leading-snug">
                          {displayAddress}, {displayCity}
                        </span>
                      </div>
                      
                      {shop.phone && (
                        <div className="flex items-center text-sm text-gray-500 mt-1.5">
                          <Phone size={14} className="mr-1.5 flex-shrink-0" />
                          <span>{shop.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopList;