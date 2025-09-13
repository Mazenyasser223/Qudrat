import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Users, BookOpen, BarChart3, TrendingUp, CheckCircle } from 'lucide-react';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../context/AuthContext';

const TeacherDashboard = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalExams: 0,
    completedExams: 0,
    averageScore: 0
  });
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();
  const { isAuthenticated, token } = useAuth();

  useEffect(() => {
    // Only fetch stats when user is authenticated and token is available
    if (isAuthenticated && token) {
      fetchDashboardStats();
    }
  }, [isAuthenticated, token]);

  // Real-time event listeners
  useEffect(() => {
    if (socket) {
      // Listen for exam submissions
      socket.on('exam-submitted', (data) => {
        console.log('📝 Exam submitted:', data);
        toast.success(`تم إرسال امتحان: ${data.studentName} - ${data.examTitle} (${data.percentage}%)`);
        // Refresh dashboard stats
        fetchDashboardStats();
      });

      // Listen for new students
      socket.on('student-added', (data) => {
        console.log('👨‍🎓 Student added:', data);
        toast.success(`تم إضافة طالب جديد: ${data.studentName}`);
        // Refresh dashboard stats
        fetchDashboardStats();
      });

      // Listen for deleted students
      socket.on('student-deleted', (data) => {
        console.log('🗑️ Student deleted:', data);
        toast.success(`تم حذف الطالب: ${data.studentName}`);
        // Refresh dashboard stats
        fetchDashboardStats();
      });

      // Cleanup listeners on unmount
      return () => {
        socket.off('exam-submitted');
        socket.off('student-added');
        socket.off('student-deleted');
      };
    }
  }, [socket]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching dashboard stats...');
      console.log('🔑 Auth token:', localStorage.getItem('token'));
      
      const [studentsRes, examsRes] = await Promise.all([
        axios.get('/api/users/students', {
          headers: {
            'Authorization': `Bearer ${token || localStorage.getItem('token')}`
          }
        }),
        axios.get('/api/exams', {
          headers: {
            'Authorization': `Bearer ${token || localStorage.getItem('token')}`
          }
        })
      ]);
      
      console.log('✅ API responses received:', { studentsRes, examsRes });

      const students = studentsRes.data.data;
      const exams = examsRes.data.data;

      // Calculate stats
      const totalStudents = students.length;
      const totalExams = exams.length;
      
      // Calculate completed exams and average score
      let completedExams = 0;
      let totalScore = 0;
      let totalAttempts = 0;

      students.forEach(student => {
        const completed = student.examProgress.filter(progress => progress.status === 'completed');
        completedExams += completed.length;
        completed.forEach(progress => {
          totalScore += progress.score;
          totalAttempts++;
        });
      });

      const averageScore = totalAttempts > 0 ? (totalScore / totalAttempts) : 0;

      setStats({
        totalStudents,
        totalExams,
        completedExams,
        averageScore: Math.round(averageScore * 100) / 100
      });
    } catch (error) {
      console.error('❌ Error fetching dashboard stats:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error data:', error.response?.data);
      toast.error('حدث خطأ أثناء تحميل إحصائيات لوحة التحكم');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'إجمالي الطلاب',
      value: stats.totalStudents,
      icon: Users,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      title: 'إجمالي الامتحانات',
      value: stats.totalExams,
      icon: BookOpen,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600'
    },
    {
      title: 'الامتحانات المكتملة',
      value: stats.completedExams,
      icon: CheckCircle,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600'
    },
    {
      title: 'متوسط الدرجات',
      value: `${stats.averageScore}%`,
      icon: TrendingUp,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">لوحة تحكم المدرس</h1>
        <p className="text-gray-600">مرحباً بك في منصة قدرات التعليمية</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.textColor}`} />
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">الإجراءات السريعة</h3>
          </div>
          <div className="card-body space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="text-gray-700">إدارة الطلاب</span>
              </div>
              <a
                href="/teacher/students"
                className="btn-primary text-sm"
              >
                عرض الطلاب
              </a>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <BookOpen className="h-5 w-5 text-green-600" />
                <span className="text-gray-700">إدارة الامتحانات</span>
              </div>
              <a
                href="/teacher/exams"
                className="btn-primary text-sm"
              >
                عرض الامتحانات
              </a>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                <span className="text-gray-700">التقارير والتحليلات</span>
              </div>
              <a
                href="/teacher/analytics"
                className="btn-primary text-sm"
              >
                عرض التقارير
              </a>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">نظرة عامة</h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">إجمالي الطلاب المسجلين</span>
                <span className="font-semibold text-gray-900">{stats.totalStudents}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">إجمالي الامتحانات المتاحة</span>
                <span className="font-semibold text-gray-900">{stats.totalExams}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">نسبة إكمال الامتحانات</span>
                <span className="font-semibold text-gray-900">
                  {stats.totalExams > 0 ? Math.round((stats.completedExams / (stats.totalStudents * stats.totalExams)) * 100) : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">متوسط الأداء العام</span>
                <span className="font-semibold text-gray-900">{stats.averageScore}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
