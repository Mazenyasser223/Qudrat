import React, { createContext, useContext, useReducer, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { safeLocalStorage } from '../utils/storage';

// Configure axios base URL
axios.defaults.baseURL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000');

/** Cursor agent ingest — only in local dev; never call user's loopback in production builds. */
const agentIngestDev = (payload) => {
  if (process.env.NODE_ENV !== 'development') return;
  fetch('http://127.0.0.1:7914/ingest/5963aa55-001a-43d9-a9b3-abb9b2119b35', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '97296c' },
    body: JSON.stringify(payload),
  }).catch(() => {});
};

const AuthContext = createContext();

// Safe localStorage getter with error handling
const getStoredToken = () => {
  return safeLocalStorage.getItem('token');
};

const initialState = {
  user: null,
  token: getStoredToken(),
  isAuthenticated: !!getStoredToken(),
  loading: true,
  error: null
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        loading: true,
        error: null
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
        error: null
      };
    case 'AUTH_FAIL':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: null
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Set up axios defaults
  useEffect(() => {
    if (state.token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [state.token]);

  // Load user on app start
  useEffect(() => {
    if (state.token) {
      loadUser();
    } else {
      dispatch({ type: 'AUTH_FAIL', payload: null });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUser = async () => {
    // #region agent log
    agentIngestDev({ sessionId: '97296c', location: 'AuthContext.js:loadUser', message: 'loadUser_start', data: { hasToken: !!state.token }, timestamp: Date.now(), hypothesisId: 'token_invalid' });
    // #endregion
    try {
      dispatch({ type: 'AUTH_START' });
      const res = await axios.get('/api/auth/me');
      // #region agent log
      agentIngestDev({ sessionId: '97296c', location: 'AuthContext.js:loadUser', message: 'loadUser_success', data: { status: res?.status }, timestamp: Date.now(), hypothesisId: 'token_invalid' });
      // #endregion
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          user: res.data.user,
          token: state.token
        }
      });
    } catch (error) {
      // #region agent log
      agentIngestDev({ sessionId: '97296c', location: 'AuthContext.js:loadUser', message: 'loadUser_fail', data: { status: error?.response?.status, noResponse: !!error?.request && !error?.response }, timestamp: Date.now(), hypothesisId: 'token_invalid' });
      // #endregion
      console.error('Load user error:', error);
      dispatch({ type: 'AUTH_FAIL', payload: null });
      safeLocalStorage.removeItem('token');
    }
  };

  const login = async (email, password) => {
    // #region agent log
    agentIngestDev({ sessionId: '97296c', location: 'AuthContext.js:login', message: 'login_start', data: {}, timestamp: Date.now(), hypothesisId: 'login_fail' });
    // #endregion
    try {
      dispatch({ type: 'AUTH_START' });
      const res = await axios.post('/api/auth/login', { email, password });
      // #region agent log
      agentIngestDev({ sessionId: '97296c', location: 'AuthContext.js:login', message: 'login_response', data: { status: res?.status, success: !!res?.data?.success }, timestamp: Date.now(), hypothesisId: 'login_fail' });
      // #endregion
      if (!res.data || !res.data.success) {
        const message = res.data?.message || 'فشل تسجيل الدخول';
        dispatch({ type: 'AUTH_FAIL', payload: message });
        toast.error(message);
        return { success: false, message };
      }
      
      const { token, user } = res.data;
      if (!token || !user) {
        const message = 'استجابة غير صحيحة من الخادم';
        dispatch({ type: 'AUTH_FAIL', payload: message });
        toast.error(message);
        return { success: false, message };
      }
      
      safeLocalStorage.setItem('token', token);
      
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user, token }
      });
      
      toast.success('تم تسجيل الدخول بنجاح');
      return { success: true, user };
    } catch (error) {
      // #region agent log
      agentIngestDev({ sessionId: '97296c', location: 'AuthContext.js:login', message: 'login_catch', data: { status: error?.response?.status, noResponse: !!error?.request && !error?.response }, timestamp: Date.now(), hypothesisId: 'cors_network' });
      // #endregion
      let message = 'حدث خطأ أثناء تسجيل الدخول';
      
      if (error.response) {
        // Server responded with error
        if (error.response.status === 429) {
          message = 'تم تجاوز الحد المسموح من المحاولات، يرجى المحاولة لاحقاً';
        } else if (error.response.status === 401) {
          message = error.response.data?.message || 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
        } else if (error.response.status === 403) {
          message = error.response.data?.message || 'ليس لديك صلاحية للوصول';
        } else if (error.response.status >= 500) {
          message = 'خطأ في الخادم، يرجى المحاولة لاحقاً';
        } else {
          message = error.response.data?.message || message;
        }
      } else if (error.request) {
        // Request made but no response
        message = 'لا يمكن الاتصال بالخادم، تحقق من اتصال الإنترنت';
      }
      
      dispatch({ type: 'AUTH_FAIL', payload: message });
      toast.error(message);
      return { success: false, message };
    }
  };

  const registerTeacher = async (name, email, password) => {
    try {
      dispatch({ type: 'AUTH_START' });
      const res = await axios.post('/api/auth/register', { name, email, password });
      
      const { token, user } = res.data;
      safeLocalStorage.setItem('token', token);
      
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user, token }
      });
      
      toast.success('تم إنشاء الحساب بنجاح');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'حدث خطأ أثناء إنشاء الحساب';
      dispatch({ type: 'AUTH_FAIL', payload: message });
      toast.error(message);
      return { success: false, message };
    }
  };

  const logout = () => {
    try {
      safeLocalStorage.removeItem('token');
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Error removing token from localStorage:', error);
      }
    }
    dispatch({ type: 'LOGOUT' });
    toast.success('تم تسجيل الخروج بنجاح');
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const updateUser = (userData) => {
    dispatch({ type: 'UPDATE_USER', payload: userData });
  };

  const value = {
    ...state,
    login,
    registerTeacher,
    logout,
    clearError,
    updateUser,
    loadUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
