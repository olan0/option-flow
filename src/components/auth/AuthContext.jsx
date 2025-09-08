import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

/**
 * This provider creates a MOCK authentication state for local development.
 * It simulates a connected wallet without calling the live base44 authentication service,
 * which prevents the redirect loop to base44.app/login.
 */
export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userAddress, setUserAddress] = useState(null);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);

  // Simulate connecting to a wallet (e.g., Hiro, Xverse)
  const connect = (walletType = 'hiro') => {
    // In a real app, this would trigger the actual wallet extension.
    // For local development, we just set a mock address.
    const mockAddresses = {
      hiro: "SP2X0K0W3F5X5A0N2Z1J3Z2K8Z5C9Y8XQJ",
      xverse: "SP1A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P",
    };
    
    const mockAddress = mockAddresses[walletType] || mockAddresses.hiro;
    setUserAddress(mockAddress);
    setIsAuthenticated(true);
    setAuthModalOpen(false);
  };

  // Disconnect the simulated wallet
  const disconnect = () => {
    setUserAddress(null);
    setIsAuthenticated(false);
  };

  const value = {
    isAuthenticated,
    userAddress,
    isAuthModalOpen,
    connect,
    disconnect,
    openAuthModal: () => setAuthModalOpen(true),
    closeAuthModal: () => setAuthModalOpen(false),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}