import React, { useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDarkMode } from '../../context/DarkModeContext';
import { LogOut, User, BookOpen, Users, Star, Moon, Sun } from 'lucide-react';

const Header = React.memo(() => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const navigate = useNavigate();

  const handleLogout = useCallback(() => {
    logout();
    navigate('/');
  }, [logout, navigate]);

  const isTeacher = useMemo(() => user?.role === 'teacher' || user?.role === 'admin', [user?.role]);
  const isStudent = useMemo(() => user?.role === 'student', [user?.role]);

  return (
    <header className="bg-white dark:bg-gray-800 shadow-lg border-b border-green-200 dark:border-gray-700 bg-gradient-to-r from-white to-green-50 dark:from-gray-800 dark:to-gray-900 transition-colors duration-300">
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
              <span className="text-xl font-bold text-green-800 dark:text-green-400">Qudrat</span>
            </Link>
          </div>

          {/* Navigation */}
          {user && (
            <nav className="hidden md:flex items-center space-x-8 rtl:space-x-reverse">
              {isTeacher && (
                <>
                  <Link
                    to="/teacher/students"
                    className="flex items-center space-x-1 rtl:space-x-reverse text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                  >
                    <Users className="h-4 w-4" />
                    <span>الطلاب</span>
                  </Link>
                  <Link
                    to="/teacher/exams"
                    className="flex items-center space-x-1 rtl:space-x-reverse text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                  >
                    <BookOpen className="h-4 w-4" />
                    <span>الامتحانات</span>
                  </Link>
                  <Link
                    to="/teacher/reviews"
                    className="flex items-center space-x-1 rtl:space-x-reverse text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                  >
                    <Star className="h-4 w-4" />
                    <span>التقييمات</span>
                  </Link>
                </>
              )}
            </nav>
          )}

          {/* Right Side: Dark Mode Button + User Menu */}
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            {/* Dark Mode Toggle Button - Always Visible */}
            <button
              onClick={toggleDarkMode}
              className="relative p-2.5 rounded-lg bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border-2 border-gray-300 dark:border-gray-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 shadow-md hover:shadow-lg transform hover:scale-105"
              aria-label={isDarkMode ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن'}
              title={isDarkMode ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن'}
            >
              {isDarkMode ? (
                <Sun className="h-5 w-5 text-yellow-500" />
              ) : (
                <Moon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              )}
            </button>

            {/* User Menu */}
            {user && (
              <>
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {user.name}
                  </span>
                  <span className="text-xs text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/50 px-2 py-1 rounded-full">
                    {user?.role === 'admin' ? 'مدير' : isTeacher ? 'مدرس' : 'طالب'}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 rtl:space-x-reverse text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  title="تسجيل الخروج"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">خروج</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
});

Header.displayName = 'Header';

export default Header;
