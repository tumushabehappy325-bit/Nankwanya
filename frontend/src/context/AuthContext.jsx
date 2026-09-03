import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const DEFAULT_ADMIN = {
  id: 'usr_admin_mrrh',
  name: 'Sr. Mary Kyomukama',
  title: 'Blood Bank In-Charge',
  phone: '+256772123456',
  role: 'admin',
  facilityId: 'fac_mrrh',
  facilityName: 'Mbarara Regional Referral Hospital (MRRH)',
  facilityLat: -0.6085,
  facilityLng: 30.6565
};

const DEFAULT_DONOR = {
  id: 'usr_donor_1',
  name: 'Katushabe Allen',
  phone: '+256770000001',
  role: 'donor',
  bloodType: 'O+',
  lat: -0.6020,
  lng: 30.6510,
  neighborhood: 'Kamukuzi, Mbarara',
  lastDonationDate: '2026-05-14',
  totalDonations: 6
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('nankwanya_user');
    return saved ? JSON.parse(saved) : DEFAULT_ADMIN;
  });

  const [activeTab, setActiveTab] = useState('admin'); // 'landing', 'admin', 'donor', 'history'

  useEffect(() => {
    localStorage.setItem('nankwanya_user', JSON.stringify(user));
  }, [user]);

  const loginAsAdmin = (customAdmin) => {
    const adminUser = customAdmin || DEFAULT_ADMIN;
    setUser(adminUser);
    setActiveTab('admin');
  };

  const loginAsDonor = (customDonor) => {
    const donorUser = customDonor || DEFAULT_DONOR;
    setUser(donorUser);
    setActiveTab('donor');
  };

  const updateUserProfile = (updates) => {
    setUser(prev => ({ ...prev, ...updates }));
  };

  const logout = () => {
    setUser(null);
    setActiveTab('landing');
  };

  return (
    <AuthContext.Provider value={{
      user,
      activeTab,
      setActiveTab,
      loginAsAdmin,
      loginAsDonor,
      updateUserProfile,
      logout,
      isAdmin: user?.role === 'admin',
      isDonor: user?.role === 'donor'
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
