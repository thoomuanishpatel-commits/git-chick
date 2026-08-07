'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

export type UserRole = 
  | 'Department Official'
  | 'Administrator'
  | 'Emergency Coordinator'
  | 'Incident Operator'
  | 'Field Officer'
  | 'Project Examiner';

interface User {
  username: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  inactivityWarning: boolean;
  login: (username: string, password: string, rememberMe: boolean) => Promise<{ success: boolean; error?: string }>;
  loginAsExaminer: () => Promise<{ success: boolean }>;
  logout: () => void;
  updateRole: (role: UserRole) => void;
  dismissInactivityWarning: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Inactivity timeout limit: 10 minutes (600,000 ms)
const INACTIVITY_TIMEOUT = 10 * 60 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [inactivityWarning, setInactivityWarning] = useState<boolean>(false);

  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);

  // Helper: Clear active inactivity timers
  const clearInactivityTimer = () => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
    }
  };

  // Helper: Reset/restart inactivity timer
  const resetInactivityTimer = () => {
    if (!isAuthenticated) return;
    
    clearInactivityTimer();
    
    inactivityTimer.current = setTimeout(() => {
      handleAutoLogout();
    }, INACTIVITY_TIMEOUT);
  };

  const handleAutoLogout = () => {
    setInactivityWarning(true);
    logout();
  };

  const dismissInactivityWarning = () => {
    setInactivityWarning(false);
  };

  // Listen to user activity to reset timer
  useEffect(() => {
    if (!isAuthenticated) {
      clearInactivityTimer();
      return;
    }

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    const handleActivity = () => resetInactivityTimer();

    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Initialize timer
    resetInactivityTimer();

    return () => {
      clearInactivityTimer();
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [isAuthenticated]);

  // Load session from storage on mount
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('tsdma_auth_token') || sessionStorage.getItem('tsdma_auth_token');
      const storedUser = localStorage.getItem('tsdma_user_data') || sessionStorage.getItem('tsdma_user_data');
      
      if (storedToken && storedUser) {
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
      }
    } catch (e) {
      console.error('Failed to restore auth session:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (username: string, password: string, rememberMe: boolean): Promise<{ success: boolean; error?: string }> => {
    // Artificial loading transition for realism and security checks
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Hardcoded credentials
    const isPrimary = username.toLowerCase() === 'officer@tsdma.gov.in' && password === 'EocPassword2026!';
    const isSecondary = username === '123456' && password === '123456';

    if (isPrimary || isSecondary) {
      const newUser: User = {
        username: isSecondary ? '123456' : 'officer@tsdma.gov.in',
        role: 'Department Official', // Default initial role
      };

      const mockToken = 'tsdma_secure_jwt_' + Math.random().toString(36).substring(2);
      const storage = rememberMe ? localStorage : sessionStorage;

      try {
        storage.setItem('tsdma_auth_token', mockToken);
        storage.setItem('tsdma_user_data', JSON.stringify(newUser));
        
        // Ensure standard session storage does not bleed if user switches persistence style
        if (rememberMe) {
          sessionStorage.removeItem('tsdma_auth_token');
          sessionStorage.removeItem('tsdma_user_data');
        } else {
          localStorage.removeItem('tsdma_auth_token');
          localStorage.removeItem('tsdma_user_data');
        }

        setUser(newUser);
        setIsAuthenticated(true);
        setInactivityWarning(false);
        return { success: true };
      } catch (e) {
        return { success: false, error: 'Storage write failed. Please check cookie/privacy settings.' };
      }
    }

    return { success: false, error: 'Invalid Department Credentials' };
  };

  const loginAsExaminer = async (): Promise<{ success: boolean }> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const newUser: User = {
      username: 'examiner@tsdma.gov.in',
      role: 'Project Examiner',
    };
    const mockToken = 'tsdma_examiner_token_' + Math.random().toString(36).substring(2);
    try {
      sessionStorage.setItem('tsdma_auth_token', mockToken);
      sessionStorage.setItem('tsdma_user_data', JSON.stringify(newUser));
      setUser(newUser);
      setIsAuthenticated(true);
      setInactivityWarning(false);
      return { success: true };
    } catch (e) {
      return { success: false };
    }
  };

  const logout = () => {
    // Clear storage keys
    localStorage.removeItem('tsdma_auth_token');
    localStorage.removeItem('tsdma_user_data');
    sessionStorage.removeItem('tsdma_auth_token');
    sessionStorage.removeItem('tsdma_user_data');

    // Reset local react state
    setUser(null);
    setIsAuthenticated(false);
    clearInactivityTimer();
  };

  const updateRole = (role: UserRole) => {
    if (!user) return;
    const updatedUser = { ...user, role };
    setUser(updatedUser);

    // Save updated role back to active persistence layer
    const isRemembered = localStorage.getItem('tsdma_auth_token') !== null;
    const storage = isRemembered ? localStorage : sessionStorage;
    storage.setItem('tsdma_user_data', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        inactivityWarning,
        login,
        loginAsExaminer,
        logout,
        updateRole,
        dismissInactivityWarning,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
