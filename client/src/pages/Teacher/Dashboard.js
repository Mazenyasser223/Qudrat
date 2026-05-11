import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, BookOpen, ArrowRight, FolderPlus } from 'lucide-react';

const TeacherDashboard = () => {
  const navigate = useNavigate();

  const quickActions = [
    {
      title: 'إدارة الطلاب',
      description: 'عرض وإدارة حسابات الطلاب',
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      href: '/teacher/students'
    },
    {
      title: 'إدارة الامتحانات',
      description: 'إنشاء وإدارة الامتحانات بسهولة',
      icon: BookOpen,
      color: 'from-primary-500 to-primary-600',
      bgColor: 'bg-primary-50',
      iconColor: 'text-primary-600',
      href: '/teacher/exams'
    },
    {
      title: 'إدارة المجموعات',
      description: 'إنشاء وإدارة مجموعات الامتحانات بسهولة',
      icon: FolderPlus,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      href: '/teacher/exam-groups'
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 dark:from-primary-700 dark:to-primary-800 rounded-xl p-8 text-white mb-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">لوحة تحكم المدرس</h1>
          <p className="text-primary-100 dark:text-primary-200 text-lg">مرحباً بك في منصة قدرات التعليمية</p>
        </div>
      </div>

      {/* Quick Actions Section */}
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">الإجراءات السريعة</h2>
          <p className="text-gray-600 dark:text-gray-300 text-lg">اختر الإجراء الذي تريد تنفيذه</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {quickActions.map((action, index) => (
            <div
              key={index}
              className="group cursor-pointer"
              onClick={() => navigate(action.href)}
            >
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden border dark:border-gray-700">
                {/* Gradient Header */}
                <div className={`bg-gradient-to-r ${action.color} p-6 text-white`}>
                  <div className="flex items-center justify-between">
                    <div className="p-3 bg-white bg-opacity-20 rounded-xl">
                      <action.icon className="h-8 w-8" />
                    </div>
                    <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{action.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">{action.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg ${action.bgColor} dark:bg-gray-700`}>
                      <action.icon className={`h-5 w-5 ${action.iconColor} dark:text-gray-300`} />
                    </div>
                    <span className="text-sm font-medium text-primary-600 dark:text-primary-400 group-hover:text-primary-700 dark:group-hover:text-primary-300">
                      ابدأ الآن
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default TeacherDashboard;
