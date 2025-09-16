import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { BarChart3, Users, BookOpen, TrendingUp, Download, Eye } from 'lucide-react';

const Analytics = () => {
  const [analytics, setAnalytics] = useState({
    students: [],
    exams: [],
    overallStats: {
      totalStudents: 0,
      totalExams: 0,
      completedExams: 0,
      averageScore: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [studentsRes, examsRes] = await Promise.all([
        axios.get('/api/users/students'),
        axios.get('/api/exams')
      ]);

      const students = studentsRes.data.data;
      const exams = examsRes.data.data;

      // Calculate overall statistics
      let totalCompletedExams = 0;
      let totalScore = 0;
      let totalAttempts = 0;

      students.forEach(student => {
        const completed = student.examProgress.filter(progress => progress.status === 'completed');
        totalCompletedExams += completed.length;
        completed.forEach(progress => {
          totalScore += progress.score;
          totalAttempts++;
        });
      });

      const averageScore = totalAttempts > 0 ? (totalScore / totalAttempts) : 0;

      setAnalytics({
        students,
        exams,
        overallStats: {
          totalStudents: students.length,
          totalExams: exams.length,
          completedExams: totalCompletedExams,
          averageScore: Math.round(averageScore * 100) / 100
        }
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('حدث خطأ أثناء تحميل التحليلات');
    } finally {
      setLoading(false);
    }
  };

  const getStudentProgress = (student) => {
    const completed = student.examProgress.filter(progress => progress.status === 'completed');
    const total = student.examProgress.length;
    return total > 0 ? Math.round((completed.length / total) * 100) : 0;
  };

  const getStudentAverageScore = (student) => {
    const completed = student.examProgress.filter(progress => progress.status === 'completed');
    if (completed.length === 0) return 0;
    const totalScore = completed.reduce((sum, progress) => sum + progress.percentage, 0);
    return Math.round(totalScore / completed.length);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">التقارير والتحليلات</h1>
            <p className="text-primary-100">متابعة أداء الطلاب وتقدمهم في الامتحانات</p>
          </div>
          <div className="p-4 bg-white bg-opacity-20 rounded-lg">
            <BarChart3 className="h-8 w-8 text-white" />
          </div>
        </div>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">إجمالي الطلاب</p>
              <p className="text-3xl font-bold text-gray-900">{analytics.overallStats.totalStudents}</p>
            </div>
            <div className="p-3 bg-primary-100 rounded-lg">
              <Users className="h-6 w-6 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">إجمالي الامتحانات</p>
              <p className="text-3xl font-bold text-gray-900">{analytics.overallStats.totalExams}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <BookOpen className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">امتحانات مكتملة</p>
              <p className="text-3xl font-bold text-gray-900">{analytics.overallStats.completedExams}</p>
            </div>
            <div className="p-3 bg-primary-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">متوسط الدرجات</p>
              <p className="text-3xl font-bold text-gray-900">{analytics.overallStats.averageScore}%</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Students Performance */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">أداء الطلاب</h3>
          <p className="text-gray-600 mt-1">نظرة عامة على أداء جميع الطلاب</p>
        </div>
        <div className="p-0">
          {analytics.students.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">لا توجد بيانات طلاب متاحة</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الطالب
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الامتحانات المكتملة
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      متوسط الدرجات
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      نسبة التقدم
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analytics.students.map((student) => (
                    <tr key={student._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                              <Users className="h-5 w-5 text-primary-600" />
                            </div>
                          </div>
                          <div className="mr-4">
                            <div className="text-sm font-medium text-gray-900">
                              {student.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {student.studentId || 'بدون رقم طالب'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {student.examProgress.filter(p => p.status === 'completed').length} / {student.examProgress.length}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getStudentAverageScore(student)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className="bg-primary-600 h-2 rounded-full"
                              style={{ width: `${getStudentProgress(student)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600">{getStudentProgress(student)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => setSelectedStudent(student)}
                          className="text-primary-600 hover:text-primary-900 flex items-center space-x-1 rtl:space-x-reverse"
                        >
                          <Eye className="h-4 w-4" />
                          <span>عرض التفاصيل</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Student Detail Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-0 border-0 w-11/12 md:w-3/4 lg:w-2/3 shadow-2xl rounded-xl bg-white">
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-white">
                    تفاصيل أداء {selectedStudent.name}
                  </h3>
                  <p className="text-primary-100 mt-1">عرض تفصيلي لنتائج الامتحانات</p>
                </div>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="text-white hover:text-primary-200 p-2 rounded-lg hover:bg-white hover:bg-opacity-20 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">

              <div className="space-y-4">
                {selectedStudent.examProgress.map((progress, index) => {
                  const exam = analytics.exams.find(e => e._id === progress.examId);
                  if (!exam) return null;

                  return (
                    <div
                      key={index}
                      className={`p-6 rounded-xl border-2 transition-all hover:shadow-md ${
                        progress.status === 'completed'
                          ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-200'
                          : progress.status === 'unlocked'
                          ? 'bg-gradient-to-r from-primary-50 to-primary-100 border-primary-200'
                          : 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 rtl:space-x-reverse mb-2">
                            <div className={`p-2 rounded-lg ${
                              progress.status === 'completed'
                                ? 'bg-green-200'
                                : progress.status === 'unlocked'
                                ? 'bg-primary-200'
                                : 'bg-gray-200'
                            }`}>
                              <BookOpen className={`h-5 w-5 ${
                                progress.status === 'completed'
                                  ? 'text-green-700'
                                  : progress.status === 'unlocked'
                                  ? 'text-primary-700'
                                  : 'text-gray-700'
                              }`} />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900 text-lg">{exam.title}</h4>
                              <p className="text-sm text-gray-600">
                                {exam.examGroup === 0 ? 'اختبارات التأسيس' : `المجموعة ${exam.examGroup}`} - امتحان {exam.order}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${
                            progress.status === 'completed'
                              ? 'text-green-700'
                              : progress.status === 'unlocked'
                              ? 'text-primary-700'
                              : 'text-gray-700'
                          }`}>
                            {progress.status === 'completed' && `${progress.percentage}%`}
                            {progress.status === 'unlocked' && 'متاح'}
                            {progress.status === 'locked' && 'مقفل'}
                          </div>
                          {progress.status === 'completed' && (
                            <div className="text-sm text-gray-600 mt-1">
                              {progress.score}/{exam.totalQuestions} نقطة
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="btn-secondary"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
