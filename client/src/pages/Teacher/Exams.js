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
  const [freeExams, setFreeExams] = useState([]);
  const [showFreeExamModal, setShowFreeExamModal] = useState(false);
  const [selectedExamForFree, setSelectedExamForFree] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // Check backend health first
    checkBackendHealth();
    
    // Add timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (loading) {
        setLoading(false);
        toast.error('انتهت مهلة التحميل، يرجى المحاولة مرة أخرى');
      }
    }, 30000); // 30 seconds timeout
    
    return () => clearTimeout(timeout);
  }, []);

  const checkBackendHealth = async () => {
    try {
      console.log('Checking backend health...');
      const response = await axios.get('/api/health', { timeout: 5000 });
      console.log('Backend is healthy:', response.data);
      // If backend is healthy, fetch data
      fetchExams();
      fetchFreeExams();
    } catch (error) {
      console.error('Backend health check failed:', error);
      // Try to fetch anyway, but with better error handling
      fetchExams();
      fetchFreeExams();
    }
  };

  const retryFetch = () => {
    setRetryCount(prev => prev + 1);
    setLoading(true);
    checkBackendHealth();
  };

  const fetchExams = async () => {
    try {
      setLoading(true);
      console.log('=== FETCHING EXAMS ===');
      console.log('API URL:', axios.defaults.baseURL + '/api/exams');
      console.log('Token present:', !!localStorage.getItem('token'));
      console.log('Token value:', localStorage.getItem('token')?.substring(0, 20) + '...');
      
      const res = await axios.get('/api/exams', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        timeout: 30000 // 30 second timeout for main exams (they have more data)
      });
      
      console.log('=== EXAMS RESPONSE ===');
      console.log('Status:', res.status);
      console.log('Headers:', res.headers);
      console.log('Data:', res.data);
      console.log('Data type:', typeof res.data);
      console.log('Data.data:', res.data?.data);
      console.log('Data.data length:', res.data?.data?.length);
      
      const examsData = res.data?.data || [];
      console.log('Setting exams:', examsData);
      setExams(examsData);
      
      if (examsData.length === 0) {
        console.warn('No exams returned from API');
        toast.error('لا توجد امتحانات في النظام');
      }
    } catch (error) {
      console.error('=== EXAMS ERROR ===');
      console.error('Error object:', error);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Error response:', error.response);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers
      });
      
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        toast.error('انتهت مهلة الاتصال بالخادم، يرجى المحاولة مرة أخرى');
      } else if (error.response?.status === 401) {
        toast.error('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى');
        localStorage.removeItem('token');
        navigate('/login');
      } else if (error.response?.status === 403) {
        toast.error('ليس لديك صلاحية للوصول إلى هذه الصفحة');
        navigate('/student');
      } else if (error.response?.status >= 500) {
        toast.error('خطأ في الخادم، يرجى المحاولة لاحقاً');
      } else if (!error.response) {
        toast.error('لا يمكن الاتصال بالخادم، تحقق من اتصال الإنترنت');
      } else {
        toast.error('حدث خطأ أثناء تحميل الامتحانات');
      }
      setExams([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFreeExams = async () => {
    try {
      console.log('=== FETCHING FREE EXAMS ===');
      console.log('API URL:', axios.defaults.baseURL + '/api/exams/free/manage');
      
      const res = await axios.get('/api/exams/free/manage', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log('=== FREE EXAMS RESPONSE ===');
      console.log('Status:', res.status);
      console.log('Data:', res.data);
      console.log('Data.data:', res.data?.data);
      console.log('Data.data length:', res.data?.data?.length);
      
      const freeExamsData = res.data?.data || [];
      console.log('Setting free exams:', freeExamsData);
      setFreeExams(freeExamsData);
    } catch (error) {
      console.error('=== FREE EXAMS ERROR ===');
      console.error('Error:', error);
      console.error('Error response:', error.response);
      
      if (error.response?.status === 401) {
        // Don't show error for free exams if auth fails, just set empty array
        setFreeExams([]);
      } else {
        toast.error('حدث خطأ أثناء تحميل الامتحانات المجانية');
        setFreeExams([]);
      }
    }
  };

  const handleSetAsFree = (exam) => {
    setSelectedExamForFree(exam);
    setShowFreeExamModal(true);
  };

  const handleRemoveFromFree = async (examId) => {
    try {
      await axios.put(`/api/exams/${examId}/remove-free`, {}, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      toast.success('تم إزالة الامتحان من الامتحانات المجانية');
      fetchFreeExams();
      fetchExams(); // Refresh exams list to update free exam status
    } catch (error) {
      console.error('Error removing exam from free:', error);
      toast.error('حدث خطأ أثناء إزالة الامتحان من المجانية');
    }
  };

  const handleConfirmSetAsFree = async (freeExamOrder) => {
    try {
      await axios.put(`/api/exams/${selectedExamForFree._id}/set-free`, 
        { freeExamOrder }, 
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      toast.success('تم تعيين الامتحان كامتحان مجاني');
      setShowFreeExamModal(false);
      setSelectedExamForFree(null);
      fetchFreeExams();
      fetchExams(); // Refresh exams list to update free exam status
    } catch (error) {
      console.error('Error setting exam as free:', error);
      toast.error(error.response?.data?.message || 'حدث خطأ أثناء تعيين الامتحان كمجاني');
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
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="spinner"></div>
        <p className="text-gray-600">جاري تحميل الامتحانات...</p>
        {retryCount > 0 && (
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-2">محاولة {retryCount}</p>
            <button
              onClick={retryFetch}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              إعادة المحاولة
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-6 text-white">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold mb-2">إدارة الامتحانات</h1>
            <p className="text-primary-100">إنشاء وإدارة الامتحانات والمجموعات بسهولة</p>
        </div>
        <button
          onClick={() => navigate('/teacher/exams/create')}
            className="bg-white text-primary-600 hover:bg-primary-50 px-6 py-3 rounded-lg font-semibold flex items-center space-x-2 rtl:space-x-reverse transition-colors shadow-lg"
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
                className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            
            {/* Group Filter */}
            <div className="relative">
              <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="appearance-none pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white min-w-[150px]"
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
                viewMode === 'grid' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Grid className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'
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
              className="text-primary-600 hover:text-primary-800"
            >
              مسح البحث
        </button>
          )}
        </div>
      </div>

      {/* Free Exams Management Section */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2 rtl:space-x-reverse">
            <Award className="h-5 w-5 text-orange-600" />
            <span>إدارة الامتحانات المجانية</span>
          </h3>
          <p className="text-sm text-gray-600 mt-1">إدارة الامتحانات الثلاثة المعروضة في الصفحة الرئيسية</p>
        </div>
        <div className="card-body">
          {freeExams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {freeExams.map((exam) => (
                <div key={exam._id} className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-orange-800">
                      الامتحان المجاني #{exam.freeExamOrder}
                    </h4>
                    <button
                      onClick={() => handleRemoveFromFree(exam._id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      إزالة
                    </button>
                  </div>
                  <p className="text-sm text-orange-700 mb-2">{exam.title}</p>
                  <div className="text-xs text-orange-600">
                    {exam.totalQuestions} سؤال • {exam.timeLimit} دقيقة
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Award className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>لا توجد امتحانات مجانية محددة</p>
              <p className="text-sm">اختر امتحانات من القائمة أدناه لتعيينها كامتحانات مجانية</p>
            </div>
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
                  className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
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
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white' 
                    : 'bg-gradient-to-r from-gray-50 to-gray-100 border-b'
                }`}>
                  <h3 className={`text-lg font-semibold ${
                    groupNumber === '0' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {groupNumber === '0' ? 'اختبارات التأسيس' : `المجموعة ${groupNumber}`}
                  </h3>
                  <p className={`text-sm ${
                    groupNumber === '0' ? 'text-primary-100' : 'text-gray-600'
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
                            className="p-2 text-primary-600 hover:bg-primary-100 rounded-lg transition-colors"
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
                          {!exam.isFreeExam && (
                            <button
                              onClick={() => handleSetAsFree(exam)}
                              className="p-2 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors"
                              title="تعيين كامتحان مجاني"
                            >
                              <Award className="h-4 w-4" />
                            </button>
                          )}
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

                      {exam.statistics?.averageScore > 0 && (
                        <div className="flex items-center justify-end space-x-1 rtl:space-x-reverse text-sm text-green-600">
                          <TrendingUp className="h-4 w-4" />
                          <span>{exam.statistics?.averageScore}%</span>
                        </div>
                      )}
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
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {exam.title}
                            </div>
                            <div className="text-sm text-gray-500">
                              ترتيب {exam.order}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            groupNumber === '0' 
                              ? 'bg-primary-100 text-primary-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {groupNumber === '0' ? 'التأسيس' : `المجموعة ${groupNumber}`}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          <div className="flex items-center justify-end space-x-1 rtl:space-x-reverse">
                            <BookOpen className="h-4 w-4 text-gray-400" />
                            <span>{exam.totalQuestions}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          <div className="flex items-center justify-end space-x-1 rtl:space-x-reverse">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span>{exam.timeLimit} دقيقة</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {exam.statistics?.averageScore > 0 ? (
                            <div className="flex items-center justify-end space-x-1 rtl:space-x-reverse text-green-600">
                              <TrendingUp className="h-4 w-4" />
                              <span>{exam.statistics?.averageScore}%</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                          <div className="flex items-center justify-end space-x-2 rtl:space-x-reverse">
                            <button
                              onClick={() => handleView(exam._id)}
                              className="text-primary-600 hover:text-primary-900 p-1 rounded"
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
                            {!exam.isFreeExam && (
                              <button
                                onClick={() => handleSetAsFree(exam)}
                                className="text-orange-600 hover:text-orange-900 p-1 rounded"
                                title="تعيين كامتحان مجاني"
                              >
                                <Award className="h-4 w-4" />
                              </button>
                            )}
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

      {/* Free Exam Order Selection Modal */}
      {showFreeExamModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              تعيين امتحان كمجاني
            </h3>
            <p className="text-gray-600 mb-4">
              اختر ترتيب الامتحان المجاني لـ <strong>{selectedExamForFree?.title}</strong>
            </p>
            <div className="space-y-3 mb-6">
              {[1, 2, 3].map((order) => {
                const isTaken = freeExams.some(exam => exam.freeExamOrder === order);
                return (
                  <button
                    key={order}
                    onClick={() => handleConfirmSetAsFree(order)}
                    disabled={isTaken}
                    className={`w-full p-3 rounded-lg border text-right transition-colors ${
                      isTaken
                        ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-orange-50 border-orange-200 text-orange-800 hover:bg-orange-100'
                    }`}
                  >
                    <div className="font-semibold">
                      الامتحان المجاني #{order}
                    </div>
                    <div className="text-sm">
                      {order === 1 && 'اختبار تأسيسي شامل للمفاهيم الأساسية'}
                      {order === 2 && 'اختبار تجريبي للمستوى المتوسط'}
                      {order === 3 && 'اختبار متقدم للمستوى العالي'}
                    </div>
                    {isTaken && (
                      <div className="text-xs text-red-600 mt-1">
                        محجوز حالياً
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex space-x-3 rtl:space-x-reverse">
              <button
                onClick={() => {
                  setShowFreeExamModal(false);
                  setSelectedExamForFree(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Exams;
