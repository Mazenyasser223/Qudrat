import React, { createContext, useContext, useReducer, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { safeLocalStorage } from '../utils/storage';

// Configure axios base URL
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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
    try {
      dispatch({ type: 'AUTH_START' });
      const res = await axios.get('/api/auth/me');
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          user: res.data.user,
          token: state.token
        }
      });
    } catch (error) {
      console.error('Load user error:', error);
      dispatch({ type: 'AUTH_FAIL', payload: null });
      safeLocalStorage.removeItem('token');
    }
  };

  const login = async (email, password) => {
    try {
      dispatch({ type: 'AUTH_START' });
      const res = await axios.post('/api/auth/login', { email, password });
      
      const { token, user } = res.data;
      safeLocalStorage.setItem('token', token);
      
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user, token }
      });
      
      toast.success('تم تسجيل الدخول بنجاح');
      return { success: true, user };
    } catch (error) {
      const message = error.response?.data?.message || 'حدث خطأ أثناء تسجيل الدخول';
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
        localStorage.removeItem('token');
      } catch (error) {
        console.warn('Error removing token from localStorage:', error);
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
