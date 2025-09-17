import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { BookOpen, Lock, Unlock, CheckCircle, Clock, Play, RotateCcw, AlertCircle, History, Eye, TrendingUp, Search, Filter, Grid, List, Plus } from 'lucide-react';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [examGroups, setExamGroups] = useState([]);
  const [studentProgress, setStudentProgress] = useState([]);
  const [reviewExams, setReviewExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [viewMode, setViewMode] = useState('grid');

  useEffect(() => {
    fetchExamGroups();
    fetchStudentProgress();
    fetchReviewExams();
    
    // Refresh data every 30 seconds to catch updates from teachers
    const interval = setInterval(() => {
      fetchStudentProgress();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchExamGroups = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/exams', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const exams = res.data.data;

      // Group exams by examGroup
      const groupedExams = {};
      exams.forEach(exam => {
        if (!groupedExams[exam.examGroup]) {
          groupedExams[exam.examGroup] = [];
        }
        groupedExams[exam.examGroup].push(exam);
      });

      // Sort exams within each group by order
      Object.keys(groupedExams).forEach(group => {
        groupedExams[group].sort((a, b) => a.order - b.order);
      });

      setExamGroups(groupedExams);
    } catch (error) {
      console.error('Error fetching exam groups:', error);
      toast.error('حدث خطأ أثناء تحميل المجموعات');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentProgress = async () => {
    try {
      const res = await axios.get('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      console.log('Student progress fetched:', res.data.user.examProgress);
      setStudentProgress(res.data.user.examProgress || []);
    } catch (error) {
      console.error('Error fetching student progress:', error);
    }
  };

  const fetchReviewExams = async () => {
    try {
      const res = await axios.get('/api/exams/review', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const reviewExamsData = res.data.data || [];
      
      // Group review exams by examGroup
      const groupedReviewExams = {};
      reviewExamsData.forEach(reviewExam => {
        const group = reviewExam.originalExamId?.examGroup || 0;
        if (!groupedReviewExams[group]) {
          groupedReviewExams[group] = [];
        }
        groupedReviewExams[group].push(reviewExam);
      });
      
      setReviewExams(groupedReviewExams);
    } catch (error) {
      console.error('Error fetching review exams:', error);
    }
  };

  const getExamStatus = (exam) => {
    const progress = studentProgress.find(p => p.examId === exam._id);
    console.log(`Exam ${exam.title} (${exam._id}):`, {
      hasProgress: !!progress,
      progressStatus: progress?.status,
      allProgress: studentProgress.map(p => ({ examId: p.examId, status: p.status }))
    });
    
    if (!progress) return 'locked';
    
    // Handle the new status values
    if (progress.status === 'locked') return 'locked';
    if (progress.status === 'unlocked') return 'unlocked';
    if (progress.status === 'completed') return 'completed';
    if (progress.status === 'in_progress') return 'in_progress';
    
    // Default to locked for any other status
    return 'locked';
  };

  const getExamPercentage = (exam) => {
    const progress = studentProgress.find(p => p.examId === exam._id);
    return progress ? progress.percentage : 0;
  };

  // Filter and search logic
  const filteredExams = () => {
    let allExams = [];
    Object.values(examGroups).flat().forEach(exam => {
      allExams.push(exam);
    });

    // Filter by search term
    if (searchTerm) {
      allExams = allExams.filter(exam => 
        exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exam.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by group
    if (selectedGroup !== 'all') {
      allExams = allExams.filter(exam => exam.examGroup.toString() === selectedGroup);
    }

    return allExams;
  };

  const groupedExams = () => {
    const filtered = filteredExams();
    const grouped = {};
    
    filtered.forEach(exam => {
      if (!grouped[exam.examGroup]) {
        grouped[exam.examGroup] = [];
      }
      grouped[exam.examGroup].push(exam);
    });

    // Sort exams within each group by order
    Object.keys(grouped).forEach(group => {
      grouped[group].sort((a, b) => a.order - b.order);
    });

    return grouped;
  };

  const availableGroups = () => {
    const groups = ['all'];
    Object.keys(examGroups).forEach(group => {
      if (examGroups[group].length > 0) {
        groups.push(group);
      }
    });
    return groups;
  };

  const handleStartExam = (exam) => {
    const status = getExamStatus(exam);
    
    if (status === 'locked') {
      toast.error('هذا الامتحان مقفل. يجب إكمال الامتحانات السابقة أولاً');
      return;
    }
    
    if (status === 'completed') {
      // Check if there's a review exam for this completed exam
      const progress = studentProgress.find(p => p.examId === exam._id);
      if (progress && progress.reviewExamId) {
        navigate(`/student/review-exam/${progress.reviewExamId}`);
      } else {
        toast.error('لا يوجد امتحان مراجعة متاح لهذا الامتحان');
      }
      return;
    }
    
    // Allow access to 'unlocked' and 'in_progress' exams
    if (status === 'unlocked' || status === 'in_progress') {
      navigate(`/student/exam/${exam._id}`);
      return;
    }
    
    // Default case - should not reach here
    toast.error('حالة الامتحان غير معروفة');
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'unlocked':
        return <Unlock className="h-5 w-5 text-blue-600" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'locked':
      default:
        return <Lock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'مكتمل';
      case 'unlocked':
        return 'متاح';
      case 'in_progress':
        return 'قيد التنفيذ';
      case 'locked':
      default:
        return 'مقفل';
    }
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
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">لوحة تحكم الطالب</h1>
            <p className="text-primary-100 text-lg">اختر المجموعة والامتحان الذي تريد حله</p>
          </div>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search Input */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="البحث في الامتحانات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Group Filter */}
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">جميع المجموعات</option>
                <option value="0">اختبارات التأسيس</option>
                {availableGroups().filter(g => g !== 'all' && g !== '0').map(group => (
                  <option key={group} value={group}>المجموعة {group}</option>
                ))}
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center space-x-1 rtl:space-x-reverse bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-white shadow-sm text-primary-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-white shadow-sm text-primary-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Grid className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-4 text-sm text-gray-600">
            عرض {filteredExams().length} من {Object.values(examGroups).flat().length} امتحان
          </div>
        </div>
      </div>

      {/* Exams Display */}
      {viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Object.keys(groupedExams()).length === 0 ? (
            <div className="col-span-full">
              <div className="text-center py-12 bg-white rounded-xl shadow-sm border">
                <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد امتحانات</h3>
                <p className="text-gray-500 mb-6">
                  {searchTerm ? 'لم يتم العثور على امتحانات تطابق البحث' : 'لا توجد امتحانات متاحة حالياً'}
                </p>
              </div>
            </div>
          ) : (
            Object.entries(groupedExams()).map(([groupNumber, groupExams]) => (
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
                  {groupExams.map((exam) => {
                    const status = getExamStatus(exam);
                    const progress = studentProgress.find(p => p.examId === exam._id);
                    
                    return (
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
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              status === 'completed' ? 'bg-green-100 text-green-800' :
                              status === 'unlocked' ? 'bg-blue-100 text-blue-800' :
                              status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {getStatusText(status)}
                            </span>
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
                          
                          <button
                            onClick={() => handleStartExam(exam)}
                            className={`flex items-center space-x-1 rtl:space-x-reverse text-sm px-3 py-2 rounded-lg transition-colors ${
                              status === 'locked' 
                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                : status === 'completed'
                                ? 'bg-orange-600 hover:bg-orange-700 text-white'
                                : 'bg-primary-600 hover:bg-primary-700 text-white'
                            }`}
                            disabled={status === 'locked'}
                          >
                            {status === 'completed' ? (
                              <>
                                <RotateCcw className="h-4 w-4" />
                                <span>امتحان المراجعة</span>
                                {progress?.bestReviewScore && (
                                  <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full mr-1">
                                    {progress.bestReviewScore}%
                                  </span>
                                )}
                              </>
                            ) : status === 'unlocked' || status === 'in_progress' ? (
                              <>
                                <Play className="h-4 w-4" />
                                <span>ابدأ الامتحان</span>
                              </>
                            ) : (
                              <>
                                <Lock className="h-4 w-4" />
                                <span>مقفل</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* List View */
        <div className="space-y-6">
          {Object.keys(groupedExams()).length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm border">
              <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد امتحانات</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm ? 'لم يتم العثور على امتحانات تطابق البحث' : 'لا توجد امتحانات متاحة حالياً'}
              </p>
            </div>
          ) : (
            Object.entries(groupedExams()).map(([groupNumber, groupExams]) => (
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

                {/* Group Exams Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الامتحان</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">التفاصيل</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الحالة</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الدرجة</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الإجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {groupExams.map((exam, index) => {
                        const status = getExamStatus(exam);
                        const progress = studentProgress.find(p => p.examId === exam._id);
                        
                        return (
                          <tr key={exam._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                                    status === 'completed' ? 'bg-green-100' :
                                    status === 'unlocked' ? 'bg-blue-100' :
                                    status === 'in_progress' ? 'bg-yellow-100' :
                                    'bg-gray-100'
                                  }`}>
                                    {getStatusIcon(status)}
                                  </div>
                                </div>
                                <div className="mr-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {exam.title}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    ترتيب {exam.order}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{exam.totalQuestions} سؤال</div>
                              <div className="text-sm text-gray-500">{exam.timeLimit} دقيقة</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                status === 'completed' ? 'bg-green-100 text-green-800' :
                                status === 'unlocked' ? 'bg-blue-100 text-blue-800' :
                                status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {getStatusText(status)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {status === 'completed' && progress ? `${progress.percentage}%` : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleStartExam(exam)}
                                className={`inline-flex items-center space-x-1 rtl:space-x-reverse px-3 py-2 rounded-lg text-sm transition-colors ${
                                  status === 'locked' 
                                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                    : status === 'completed'
                                    ? 'bg-orange-600 hover:bg-orange-700 text-white'
                                    : 'bg-primary-600 hover:bg-primary-700 text-white'
                                }`}
                                disabled={status === 'locked'}
                              >
                                {status === 'completed' ? (
                                  <>
                                    <RotateCcw className="h-4 w-4" />
                                    <span>امتحان المراجعة</span>
                                    {progress?.bestReviewScore && (
                                      <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full mr-1">
                                        {progress.bestReviewScore}%
                                      </span>
                                    )}
                                  </>
                                ) : status === 'unlocked' || status === 'in_progress' ? (
                                  <>
                                    <Play className="h-4 w-4" />
                                    <span>ابدأ الامتحان</span>
                                  </>
                                ) : (
                                  <>
                                    <Lock className="h-4 w-4" />
                                    <span>مقفل</span>
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Exam History Section */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2 rtl:space-x-reverse">
                <History className="h-5 w-5 text-primary-600" />
                <span>سجل الامتحانات</span>
              </h3>
              <p className="text-sm text-gray-600 mt-1">عرض نتائج الامتحانات السابقة وتفاصيل الإجابات</p>
            </div>
          </div>
        </div>
        <div className="card-body">
          {studentProgress.filter(p => p.status === 'completed').length > 0 ? (
            <div className="space-y-6">
              {/* Toggle List for Groups and Exams */}
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 border border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2 rtl:space-x-reverse">
                  <List className="h-5 w-5 text-primary-600" />
                  <span>الوصول السريع للامتحانات</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.keys(examGroups).map(groupKey => {
                    const groupNum = parseInt(groupKey);
                    const groupExams = examGroups[groupKey] || [];
                    const completedExams = groupExams.filter(exam => {
                      const progress = studentProgress.find(p => p.examId === exam._id && p.status === 'completed');
                      return progress;
                    });
                    
                    if (completedExams.length === 0) return null;
                    
                    return (
                      <div key={groupKey} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                        <h5 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2 rtl:space-x-reverse">
                          <div className="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-bold">
                            {groupNum}
                          </div>
                          <span>{groupNum === 0 ? 'اختبارات التأسيس' : `المجموعة ${groupNum}`}</span>
                        </h5>
                        <div className="space-y-2">
                          {completedExams.map(exam => {
                            const progress = studentProgress.find(p => p.examId === exam._id && p.status === 'completed');
                            return (
                              <button
                                key={exam._id}
                                onClick={() => navigate(`/student/exam-history/${exam._id}`)}
                                className="w-full text-right p-3 bg-gray-50 hover:bg-primary-50 rounded-lg border border-gray-200 hover:border-primary-200 transition-all duration-200 group"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900 group-hover:text-primary-700">
                                      امتحان {exam.order}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      {progress.percentage}% • {progress.score}/{exam.totalQuestions}
                                    </div>
                                  </div>
                                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    progress.percentage >= 80 ? 'bg-green-100 text-green-700' :
                                    progress.percentage >= 60 ? 'bg-blue-100 text-blue-700' :
                                    'bg-orange-100 text-orange-700'
                                  }`}>
                                    {progress.percentage >= 80 ? 'ممتاز' :
                                     progress.percentage >= 60 ? 'جيد' : 'مقبول'}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {studentProgress
                .filter(p => p.status === 'completed')
                .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
                .map((progress) => {
                  const exam = Object.values(examGroups).flat().find(e => e._id === progress.examId);
                  if (!exam) return null;
                  
                  return (
                    <div
                      key={progress._id}
                      className="bg-gradient-to-r from-white to-gray-50 border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 rtl:space-x-reverse mb-4">
                            <div className="flex items-center space-x-2 rtl:space-x-reverse">
                              <div className="p-2 bg-primary-100 rounded-lg">
                                <BookOpen className="h-4 w-4 text-primary-600" />
                              </div>
                              <div>
                                <h4 className="font-bold text-gray-900 text-lg">{exam.title}</h4>
                                <p className="text-sm text-gray-600">
                                  {exam.examGroup === 0 ? 'اختبارات التأسيس' : `المجموعة ${exam.examGroup}`} • امتحان {exam.order}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Score Display */}
                          <div className="flex items-center space-x-6 rtl:space-x-reverse mb-4">
                            <div className="text-center">
                              <div className={`text-3xl font-bold ${
                                progress.percentage >= 80 ? 'text-green-600' :
                                progress.percentage >= 60 ? 'text-blue-600' :
                                'text-orange-600'
                              }`}>
                                {progress.percentage}%
                              </div>
                              <div className="text-xs text-gray-500">الدرجة النهائية</div>
                            </div>
                            
                          </div>
                          
                          <div className="flex items-center space-x-4 rtl:space-x-reverse text-sm text-gray-500">
                            {progress.timeSpent && (
                              <div className="flex items-center space-x-1 rtl:space-x-reverse">
                                <Clock className="h-4 w-4" />
                                <span>الوقت المستغرق: {Math.floor(progress.timeSpent / 60)}:{(progress.timeSpent % 60).toString().padStart(2, '0')}</span>
                              </div>
                            )}
                            {progress.submittedAt && (
                              <div className="flex items-center space-x-1 rtl:space-x-reverse">
                                <span>تاريخ الإرسال: {new Date(progress.submittedAt).toLocaleDateString('ar-SA')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col space-y-3">
                          <button
                            onClick={() => navigate(`/student/exam-history/${exam._id}`)}
                            className="flex items-center justify-center space-x-2 rtl:space-x-reverse text-sm bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors shadow-md hover:shadow-lg"
                          >
                            <Eye className="h-4 w-4" />
                            <span>عرض التفاصيل</span>
                          </button>
                          
                          {progress.reviewExamId && (
                            <button
                              onClick={() => navigate(`/student/review-exam/${progress.reviewExamId}`)}
                              className="flex items-center justify-center space-x-2 rtl:space-x-reverse text-sm bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors shadow-md hover:shadow-lg relative"
                              title={`أفضل درجة: ${progress.bestReviewScore || 0}%`}
                            >
                              <RotateCcw className="h-4 w-4" />
                              <span>امتحان المراجعة</span>
                              {progress.bestReviewScore && (
                                <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                                  {progress.bestReviewScore}%
                                </span>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <History className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">لا توجد امتحانات مكتملة</h3>
              <p className="text-gray-600">ابدأ بحل الامتحانات لترى سجل النتائج هنا</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;