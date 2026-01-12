import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
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

  const fetchShopDetails = async (uid: string) => {
    try {
      const docRef = doc(db, 'shops', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setShopDetails({ 
          shopName: data.shopName, 
          phone: data.phone,
          location: data.location || { city: '', street: '', landmark: '' },
          email: data.email
        });
      }
    } catch (error) {
      console.error("Error fetching shop details:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchShopDetails(user.uid);
      } else {
        setShopDetails(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  const refreshShopDetails = async () => {
    if (currentUser) {
      await fetchShopDetails(currentUser.uid);
    }
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