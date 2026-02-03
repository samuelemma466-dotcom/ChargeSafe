import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { ShopProfile } from '../types';

interface AuthContextType {
  currentUser: User | null;
  shopDetails: ShopProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshShopDetails: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [shopDetails, setShopDetails] = useState<ShopProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeShop: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(true);

      if (user) {
        // Real-time listener for Shop Details
        unsubscribeShop = onSnapshot(doc(db, 'shops', user.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setShopDetails({ 
              uid: user.uid,
              ownerId: data.ownerId,
              shopName: data.shopName, 
              email: data.email,
              phone: data.phone,
              address: data.address,
              city: data.city,
              slots: data.slots,
              coordinates: data.coordinates,
              location: data.location || { city: '', street: '', landmark: '' },
            });
          }
          setLoading(false);
        }, (error) => {
          console.error("Error fetching shop details:", error);
          setLoading(false);
        });
      } else {
        setShopDetails(null);
        if (unsubscribeShop) unsubscribeShop();
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeShop) unsubscribeShop();
    };
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  // Deprecated but kept for compatibility, listener handles updates automatically now
  const refreshShopDetails = async () => {
    // No-op for real-time listener
  }

  const value = {
    currentUser,
    shopDetails,
    loading,
    logout,
    refreshShopDetails
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
