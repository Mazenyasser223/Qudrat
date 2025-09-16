import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Plus, BookOpen, Clock, Users, Edit, Trash2, Eye, Search, Filter, Grid, List, MoreVertical, BarChart3, TrendingUp, Award } from 'lucide-react';

const Exams = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

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

  // Filter and search logic
  const filteredExams = exams.filter(exam => {
    const matchesSearch = exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exam.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = selectedGroup === 'all' || exam.examGroup.toString() === selectedGroup;
    return matchesSearch && matchesGroup;
  });

  const groupedExams = filteredExams.reduce((groups, exam) => {
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

  // Get unique groups for filter dropdown
  const availableGroups = [...new Set(exams.map(exam => exam.examGroup))].sort();

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
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">إدارة الامتحانات</h1>
            <p className="text-blue-100">إنشاء وإدارة الامتحانات والمجموعات بسهولة</p>
          </div>
          <button
            onClick={() => navigate('/teacher/exams/create')}
            className="bg-white text-blue-600 hover:bg-blue-50 px-6 py-3 rounded-lg font-semibold flex items-center space-x-2 rtl:space-x-reverse transition-colors shadow-lg"
          >
            <Plus className="h-5 w-5" />
            <span>إضافة امتحان جديد</span>
          </button>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="البحث في الامتحانات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Group Filter */}
            <div className="relative">
              <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="appearance-none pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white min-w-[150px]"
              >
                <option value="all">جميع المجموعات</option>
                <option value="0">اختبارات التأسيس</option>
                {availableGroups.filter(g => g !== 0).map(group => (
                  <option key={group} value={group}>المجموعة {group}</option>
                ))}
              </select>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center space-x-2 rtl:space-x-reverse bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Grid className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>
            عرض {filteredExams.length} من {exams.length} امتحان
          </span>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-blue-600 hover:text-blue-800"
            >
              مسح البحث
            </button>
          )}
        </div>
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

      {/* Exams Display */}
      {viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Object.keys(groupedExams).length === 0 ? (
            <div className="col-span-full">
              <div className="text-center py-12 bg-white rounded-xl shadow-sm border">
                <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد امتحانات</h3>
                <p className="text-gray-500 mb-6">
                  {searchTerm ? 'لم يتم العثور على امتحانات تطابق البحث' : 'ابدأ بإنشاء امتحان جديد'}
                </p>
                <button
                  onClick={() => navigate('/teacher/exams/create')}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  إضافة امتحان جديد
                </button>
              </div>
            </div>
          ) : (
            Object.entries(groupedExams).map(([groupNumber, groupExams]) => (
              <div key={groupNumber} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                {/* Group Header */}
                <div className={`p-4 ${
                  groupNumber === '0' 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' 
                    : 'bg-gradient-to-r from-gray-50 to-gray-100 border-b'
                }`}>
                  <h3 className={`text-lg font-semibold ${
                    groupNumber === '0' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {groupNumber === '0' ? 'اختبارات التأسيس' : `المجموعة ${groupNumber}`}
                  </h3>
                  <p className={`text-sm ${
                    groupNumber === '0' ? 'text-blue-100' : 'text-gray-600'
                  }`}>
                    {groupExams.length} امتحان
                  </p>
                </div>

                {/* Group Exams */}
                <div className="p-4 space-y-3">
                  {groupExams.map((exam) => (
                    <div
                      key={exam._id}
                      className="p-4 bg-gray-50 rounded-lg border hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">
                            {exam.title}
                          </h4>
                          <p className="text-sm text-gray-600">
                            ترتيب {exam.order}
                          </p>
                        </div>
                        <div className="flex items-center space-x-1 rtl:space-x-reverse">
                          <button
                            onClick={() => handleView(exam._id)}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                            title="عرض"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(exam._id)}
                            className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                            title="تعديل"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(exam._id)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                            title="حذف"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 mb-3">
                        <div className="flex items-center space-x-2 rtl:space-x-reverse">
                          <BookOpen className="h-4 w-4" />
                          <span>{exam.totalQuestions} سؤال</span>
                        </div>
                        <div className="flex items-center space-x-2 rtl:space-x-reverse">
                          <Clock className="h-4 w-4" />
                          <span>{exam.timeLimit} دقيقة</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 rtl:space-x-reverse text-sm text-gray-500">
                          <Users className="h-4 w-4" />
                          <span>{exam.statistics.totalAttempts} محاولة</span>
                        </div>
                        {exam.statistics.averageScore > 0 && (
                          <div className="flex items-center space-x-1 rtl:space-x-reverse text-sm text-green-600">
                            <TrendingUp className="h-4 w-4" />
                            <span>{exam.statistics.averageScore}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {Object.keys(groupedExams).length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد امتحانات</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm ? 'لم يتم العثور على امتحانات تطابق البحث' : 'ابدأ بإنشاء امتحان جديد'}
              </p>
              <button
                onClick={() => navigate('/teacher/exams/create')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                إضافة امتحان جديد
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الامتحان
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      المجموعة
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الأسئلة
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الوقت
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      المحاولات
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      متوسط الدرجات
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(groupedExams).map(([groupNumber, groupExams]) =>
                    groupExams.map((exam) => (
                      <tr key={exam._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {exam.title}
                            </div>
                            <div className="text-sm text-gray-500">
                              ترتيب {exam.order}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            groupNumber === '0' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {groupNumber === '0' ? 'التأسيس' : `المجموعة ${groupNumber}`}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center space-x-1 rtl:space-x-reverse">
                            <BookOpen className="h-4 w-4 text-gray-400" />
                            <span>{exam.totalQuestions}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center space-x-1 rtl:space-x-reverse">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span>{exam.timeLimit} دقيقة</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center space-x-1 rtl:space-x-reverse">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span>{exam.statistics.totalAttempts}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {exam.statistics.averageScore > 0 ? (
                            <div className="flex items-center space-x-1 rtl:space-x-reverse text-green-600">
                              <TrendingUp className="h-4 w-4" />
                              <span>{exam.statistics.averageScore}%</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2 rtl:space-x-reverse">
                            <button
                              onClick={() => handleView(exam._id)}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded"
                              title="عرض"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(exam._id)}
                              className="text-green-600 hover:text-green-900 p-1 rounded"
                              title="تعديل"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(exam._id)}
                              className="text-red-600 hover:text-red-900 p-1 rounded"
                              title="حذف"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">إجمالي الامتحانات</p>
              <p className="text-3xl font-bold text-gray-900">{exams.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <BookOpen className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">إجمالي المحاولات</p>
              <p className="text-3xl font-bold text-gray-900">
                {exams.reduce((sum, exam) => sum + exam.statistics.totalAttempts, 0)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Users className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">متوسط الدرجات</p>
              <p className="text-3xl font-bold text-gray-900">
                {exams.length > 0 
                  ? Math.round(exams.reduce((sum, exam) => sum + exam.statistics.averageScore, 0) / exams.length)
                  : 0}%
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">المجموعات النشطة</p>
              <p className="text-3xl font-bold text-gray-900">
                {Object.keys(groupedExams).length}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Exams;
