import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import RegisterForm from '../components/Auth/RegisterForm';

const Register = () => {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated) {
    // Redirect based on user role
    if (user.role === 'teacher') {
      return <Navigate to="/teacher" replace />;
    } else if (user.role === 'student') {
      return <Navigate to="/student" replace />;
    }
  }

  return <RegisterForm />;
};

export default Register;
