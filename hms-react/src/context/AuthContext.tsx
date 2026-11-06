import React, { createContext, useContext, useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { apiClient, setCsrfToken } from '../services/apiClient';

export interface WardenUser {
  Warden_ID: number;
  Warden_Name: string;
  Username: string;
  Email: string | null;
  Role: string;
}

interface AuthContextType {
  warden: WardenUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [warden, setWarden] = useState<WardenUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Check existing session on startup
  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      try {
        const response = await apiClient.get<{
          status: string;
          warden: WardenUser;
          csrf_token?: string;
        }>('/auth/me');

        if (isMounted && response.data?.status === 'success' && response.data.warden) {
          setWarden(response.data.warden);
          if (response.data.csrf_token) {
            setCsrfToken(response.data.csrf_token);
          }
        } else if (isMounted) {
          setWarden(null);
          setCsrfToken(null);
        }
      } catch {
        if (isMounted) {
          setWarden(null);
          setCsrfToken(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (username: string, password: string) => {
    const response = await apiClient.post<{
      status: string;
      warden: WardenUser;
      csrf_token?: string;
    }>('/auth/login', { username, password });

    if (response.data?.status === 'success' && response.data.warden) {
      setWarden(response.data.warden);
      if (response.data.csrf_token) {
        setCsrfToken(response.data.csrf_token);
      }
    } else {
      throw new Error('Authentication response was invalid.');
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore network errors on logout to allow clean local exit
    } finally {
      setCsrfToken(null);
      setWarden(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        warden,
        isAuthenticated: !!warden,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-institutional-800 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Verifying authorization...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/management/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
