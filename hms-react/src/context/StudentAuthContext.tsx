import React, { createContext, useContext, useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { apiClient, setCsrfToken, setStudentAuthToken } from '../services/apiClient';

export interface StudentUser {
  Student_ID: number;
  Name: string;
  Email: string;
  Phone: string;
  Gender: string;
  DOB: string | null;
  Department: string;
  Year_of_Study: number;
  Role: 'Student';
}

interface StudentAuthContextType {
  student: StudentUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  networkStatus: 'connected' | 'checking' | 'error';
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const StudentAuthContext = createContext<StudentAuthContextType | undefined>(undefined);

export const StudentAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [student, setStudent] = useState<StudentUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [networkStatus, setNetworkStatus] = useState<'connected' | 'checking' | 'error'>('checking');

  // Check network health independently of auth
  const checkHealth = async () => {
    try {
      const res = await apiClient.get('/health');
      if (res.data?.status === 'healthy' || res.data?.status === 'success' || res.data?.status === 'ok') {
        setNetworkStatus('connected');
      } else {
        setNetworkStatus('error');
      }
    } catch {
      setNetworkStatus('error');
    }
  };

  // Check student session on startup
  useEffect(() => {
    let isMounted = true;

    async function checkStudentAuth() {
      await checkHealth();

      try {
        const response = await apiClient.get<{
          status: string;
          student: StudentUser;
          csrf_token?: string;
          token?: string;
          access_token?: string;
        }>('/student/auth/me');

        if (isMounted && response.data?.status === 'success' && response.data.student) {
          setStudent(response.data.student);
          const token = response.data.token || response.data.access_token;
          if (token) {
            setStudentAuthToken(token);
          }
          if (response.data.csrf_token) {
            setCsrfToken(response.data.csrf_token);
          }
        } else if (isMounted) {
          setStudent(null);
          setStudentAuthToken(null);
        }
      } catch {
        if (isMounted) {
          setStudent(null);
          setStudentAuthToken(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    checkStudentAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (identifier: string, password: string) => {
    const response = await apiClient.post<{
      status: string;
      student: StudentUser;
      csrf_token?: string;
      token?: string;
      access_token?: string;
    }>('/student/auth/login', { identifier, password });

    if (response.data?.status === 'success' && response.data.student) {
      setStudent(response.data.student);
      const token = response.data.token || response.data.access_token;
      if (token) {
        setStudentAuthToken(token);
      }
      if (response.data.csrf_token) {
        setCsrfToken(response.data.csrf_token);
      }
      setNetworkStatus('connected');
    } else {
      throw new Error('Student authentication response was invalid.');
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/student/auth/logout');
    } catch {
      // Ignore network errors on logout to allow clean local state teardown
    } finally {
      setStudentAuthToken(null);
      setStudent(null);
    }
  };

  const refreshProfile = async () => {
    try {
      const response = await apiClient.get<{
        status: string;
        student: StudentUser;
        csrf_token?: string;
      }>('/student/auth/me');

      if (response.data?.status === 'success' && response.data.student) {
        setStudent(response.data.student);
        if (response.data.csrf_token) {
          setCsrfToken(response.data.csrf_token);
        }
      }
    } catch {
      // Keep existing student if transient failure
    }
  };

  return (
    <StudentAuthContext.Provider
      value={{
        student,
        isAuthenticated: !!student,
        loading,
        networkStatus,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </StudentAuthContext.Provider>
  );
};

export const useStudentAuth = (): StudentAuthContextType => {
  const context = useContext(StudentAuthContext);
  if (!context) {
    throw new Error('useStudentAuth must be used within a StudentAuthProvider');
  }
  return context;
};

export const StudentProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useStudentAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 space-y-4">
        <div className="w-10 h-10 border-4 border-institutional-200 border-t-institutional-800 rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-500">Verifying student session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/student/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
