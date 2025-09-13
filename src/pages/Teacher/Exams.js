import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Plus, BookOpen, Clock, Users, Edit, Trash2, Eye } from 'lucide-react';

const Exams = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/exams', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setExams(res.data.data);
    } catch (error) {
      console.error('Error fetching exams:', error);
      toast.error('حدث خطأ أثناء تحميل الامتحانات');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (examId) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الامتحان؟')) {
      try {
        await axios.delete(`/api/exams/${examId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        toast.success('تم حذف الامتحان بنجاح');
        fetchExams();
      } catch (error) {
        console.error('Error deleting exam:', error);
        toast.error('حدث خطأ أثناء حذف الامتحان');
      }
    }
  };

  const handleEdit = (examId) => {
    navigate(`/teacher/exams/edit/${examId}`);
  };

  const handleView = (examId) => {
    navigate(`/teacher/exams/view/${examId}`);
  };

  const groupedExams = exams.reduce((groups, exam) => {
    const group = exam.examGroup;
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(exam);
    return groups;
  }, {});

  // Sort exams within each group by order
  Object.keys(groupedExams).forEach(group => {
    groupedExams[group].sort((a, b) => a.order - b.order);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إدارة الامتحانات</h1>
          <p className="text-gray-600">إنشاء وإدارة الامتحانات والمجموعات</p>
        </div>
        <button
          onClick={() => navigate('/teacher/exams/create')}
          className="btn-primary flex items-center space-x-2 rtl:space-x-reverse"
        >
          <Plus className="h-4 w-4" />
          <span>إضافة امتحان</span>
        </button>
      </div>

      {/* Add Exam Form */}
      {showAddForm && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">إضافة امتحان جديد</h3>
          </div>
          <div className="card-body">
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">نموذج إضافة الامتحان قيد التطوير</p>
              <button
                onClick={() => setShowAddForm(false)}
                className="btn-secondary"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exam Groups */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* اختبارات التأسيس (Foundation Tests) - Group 0 */}
        <div className="card border-2 border-blue-200 bg-blue-50">
          <div className="card-header bg-blue-100">
            <h3 className="text-lg font-semibold text-blue-900">
              اختبارات التأسيس
            </h3>
            <p className="text-xs text-blue-700 mt-1">امتحانات التأسيس الأساسية</p>
          </div>
          <div className="card-body">
            {groupedExams[0] ? (
              <div className="space-y-3">
                {groupedExams[0].map((exam) => (
                  <div
                    key={exam._id}
                    className="p-3 bg-white rounded-lg border border-blue-200"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-900">
                        {exam.title}
                      </h4>
                      <span className="text-xs text-gray-500">
                        ترتيب {exam.order}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-4 rtl:space-x-reverse text-xs text-gray-500 mb-3">
                      <div className="flex items-center space-x-1 rtl:space-x-reverse">
                        <BookOpen className="h-3 w-3" />
                        <span>{exam.totalQuestions} سؤال</span>
                      </div>
                      <div className="flex items-center space-x-1 rtl:space-x-reverse">
                        <Clock className="h-3 w-3" />
                        <span>{exam.timeLimit} دقيقة</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1 rtl:space-x-reverse">
                        <Users className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {exam.statistics.totalAttempts} محاولة
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 rtl:space-x-reverse">
                        <button
                          onClick={() => handleView(exam._id)}
                          className="text-blue-600 hover:text-blue-900"
                          title="عرض"
                        >
                          <Eye className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleEdit(exam._id)}
                          className="text-green-600 hover:text-green-900"
                          title="تعديل"
                        >
                          <Edit className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(exam._id)}
                          className="text-red-600 hover:text-red-900"
                          title="حذف"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <BookOpen className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                <p className="text-sm text-blue-600">لا توجد امتحانات تأسيس</p>
                <button
                  onClick={() => navigate('/teacher/exams/create')}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  إضافة امتحان تأسيس
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Regular Groups 1-8 */}
        {Array.from({ length: 8 }, (_, i) => i + 1).map(groupNumber => (
          <div key={groupNumber} className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">
                المجموعة {groupNumber}
              </h3>
            </div>
            <div className="card-body">
              {groupedExams[groupNumber] ? (
                <div className="space-y-3">
                  {groupedExams[groupNumber].map((exam) => (
                    <div
                      key={exam._id}
                      className="p-3 bg-gray-50 rounded-lg border"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-900">
                          {exam.title}
                        </h4>
                        <span className="text-xs text-gray-500">
                          ترتيب {exam.order}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 rtl:space-x-reverse text-xs text-gray-500 mb-3">
                        <div className="flex items-center space-x-1 rtl:space-x-reverse">
                          <BookOpen className="h-3 w-3" />
                          <span>{exam.totalQuestions} سؤال</span>
                        </div>
                        <div className="flex items-center space-x-1 rtl:space-x-reverse">
                          <Clock className="h-3 w-3" />
                          <span>{exam.timeLimit} دقيقة</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1 rtl:space-x-reverse">
                          <Users className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {exam.statistics.totalAttempts} محاولة
                          </span>
                        </div>
                        <div className="flex items-center space-x-1 rtl:space-x-reverse">
                          <button
                            onClick={() => handleView(exam._id)}
                            className="text-blue-600 hover:text-blue-900"
                            title="عرض"
                          >
                            <Eye className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleEdit(exam._id)}
                            className="text-green-600 hover:text-green-900"
                            title="تعديل"
                          >
                            <Edit className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleDelete(exam._id)}
                            className="text-red-600 hover:text-red-900"
                            title="حذف"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <BookOpen className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">لا توجد امتحانات</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-blue-600">{exams.length}</div>
            <div className="text-sm text-gray-600">إجمالي الامتحانات</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-green-600">
              {exams.reduce((sum, exam) => sum + exam.statistics.totalAttempts, 0)}
            </div>
            <div className="text-sm text-gray-600">إجمالي المحاولات</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-purple-600">
              {exams.length > 0 
                ? Math.round(exams.reduce((sum, exam) => sum + exam.statistics.averageScore, 0) / exams.length)
                : 0}%
            </div>
            <div className="text-sm text-gray-600">متوسط الدرجات</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Exams;
