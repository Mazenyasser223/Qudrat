import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User, BookOpen, Users } from 'lucide-react';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
  const isStudent = user?.role === 'student';

  return (
    <header className="bg-white shadow-lg border-b border-green-200 bg-gradient-to-r from-white to-green-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to={isTeacher ? '/teacher' : '/student'} className="flex items-center space-x-3 rtl:space-x-reverse">
              <img 
                src="/logo.png" 
                alt="Qudrat Logo" 
                className="h-10 w-auto"
              />
              <span className="text-xl font-bold text-green-800">Qudrat</span>
            </Link>
          </div>

          {/* Navigation */}
          {user && (
            <nav className="hidden md:flex items-center space-x-8 rtl:space-x-reverse">
              {isTeacher && (
                <>
                  <Link
                    to="/teacher/students"
                    className="flex items-center space-x-1 rtl:space-x-reverse text-gray-700 hover:text-green-600 transition-colors"
                  >
                    <Users className="h-4 w-4" />
                    <span>الطلاب</span>
                  </Link>
                  <Link
                    to="/teacher/exams"
                    className="flex items-center space-x-1 rtl:space-x-reverse text-gray-700 hover:text-green-600 transition-colors"
                  >
                    <BookOpen className="h-4 w-4" />
                    <span>الامتحانات</span>
                  </Link>
                </>
              )}
              {isStudent && (
                <Link
                  to="/student/exams"
                  className="flex items-center space-x-1 rtl:space-x-reverse text-gray-700 hover:text-primary-600 transition-colors"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>الامتحانات</span>
                </Link>
              )}
            </nav>
          )}

          {/* User Menu */}
          {user && (
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  {user.name}
                </span>
                <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full">
                  {user?.role === 'admin' ? 'مدير' : isTeacher ? 'مدرس' : 'طالب'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 rtl:space-x-reverse text-gray-700 hover:text-red-600 transition-colors"
                title="تسجيل الخروج"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">خروج</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
