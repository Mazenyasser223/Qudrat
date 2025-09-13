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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">التقارير والتحليلات</h1>
        <p className="text-gray-600">متابعة أداء الطلاب وتقدمهم في الامتحانات</p>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="card-body text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-3">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{analytics.overallStats.totalStudents}</div>
            <div className="text-sm text-gray-600">إجمالي الطلاب</div>
          </div>
        </div>

        <div className="card">
          <div className="card-body text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mx-auto mb-3">
              <BookOpen className="h-6 w-6 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{analytics.overallStats.totalExams}</div>
            <div className="text-sm text-gray-600">إجمالي الامتحانات</div>
          </div>
        </div>

        <div className="card">
          <div className="card-body text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-3">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{analytics.overallStats.completedExams}</div>
            <div className="text-sm text-gray-600">امتحانات مكتملة</div>
          </div>
        </div>

        <div className="card">
          <div className="card-body text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-lg mx-auto mb-3">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{analytics.overallStats.averageScore}%</div>
            <div className="text-sm text-gray-600">متوسط الدرجات</div>
          </div>
        </div>
      </div>

      {/* Students Performance */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">أداء الطلاب</h3>
        </div>
        <div className="card-body p-0">
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
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  تفاصيل أداء {selectedStudent.name}
                </h3>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">إغلاق</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {selectedStudent.examProgress.map((progress, index) => {
                  const exam = analytics.exams.find(e => e._id === progress.examId);
                  if (!exam) return null;

                  return (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${
                        progress.status === 'completed'
                          ? 'bg-green-50 border-green-200'
                          : progress.status === 'unlocked'
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{exam.title}</h4>
                          <p className="text-sm text-gray-600">
                            المجموعة {exam.examGroup} - امتحان {exam.order}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-medium ${
                            progress.status === 'completed'
                              ? 'text-green-700'
                              : progress.status === 'unlocked'
                              ? 'text-blue-700'
                              : 'text-gray-700'
                          }`}>
                            {progress.status === 'completed' && `${progress.percentage}%`}
                            {progress.status === 'unlocked' && 'متاح'}
                            {progress.status === 'locked' && 'مقفل'}
                          </div>
                          {progress.status === 'completed' && (
                            <div className="text-xs text-gray-500">
                              {progress.score}/{exam.totalQuestions}
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
