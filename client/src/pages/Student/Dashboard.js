import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { BookOpen, Lock, Unlock, CheckCircle, Clock, Play, RotateCcw, AlertCircle, Eye, TrendingUp, Search, Filter, Grid, List, Plus, History, ChevronDown, ChevronRight } from 'lucide-react';
import { useExamGroupSettings } from '../../context/ExamGroupSettingsContext';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { customGroups, curriculumGroupOrder, getGroupName } = useExamGroupSettings();
  const [examGroups, setExamGroups] = useState([]);
  const [studentProgress, setStudentProgress] = useState([]);
  const [reviewExams, setReviewExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [expandedGroups, setExpandedGroups] = useState({});

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

  const sortGroupKeys = useCallback((groupKeys) => {
    const curriculumRank = new Map(
      curriculumGroupOrder.map((slot, index) => [slot, index])
    );
    const customOrder = new Map(
      customGroups
        .filter((g) => g.groupNumber >= 9)
        .sort((a, b) => (a.displayOrder ?? a.groupNumber) - (b.displayOrder ?? b.groupNumber))
        .map((g, index) => [g.groupNumber, index])
    );

    return [...groupKeys].sort((a, b) => {
      const aNum = parseInt(a, 10);
      const bNum = parseInt(b, 10);
      if (aNum <= 8 && bNum <= 8) {
        return (curriculumRank.get(aNum) ?? aNum) - (curriculumRank.get(bNum) ?? bNum);
      }
      if (aNum <= 8) return -1;
      if (bNum <= 8) return 1;
      const ao = customOrder.has(aNum) ? customOrder.get(aNum) : aNum;
      const bo = customOrder.has(bNum) ? customOrder.get(bNum) : bNum;
      return ao - bo;
    });
  }, [curriculumGroupOrder, customGroups]);

  // Filter and search logic (memoized for performance)
  const filteredExams = useMemo(() => {
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
  }, [examGroups, searchTerm, selectedGroup]);

  const groupedExams = useMemo(() => {
    const grouped = {};
    
    filteredExams.forEach(exam => {
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
  }, [filteredExams]);

  const availableGroups = useMemo(() => {
    const groups = Object.keys(examGroups).filter((group) => examGroups[group].length > 0);
    return sortGroupKeys(groups);
  }, [examGroups, sortGroupKeys]);

  const sortedGroupedExamKeys = useMemo(
    () => sortGroupKeys(Object.keys(groupedExams)),
    [groupedExams, sortGroupKeys]
  );

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

  const toggleGroup = (groupKey) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  const scrollToExamHistory = () => {
    const examHistorySection = document.getElementById('exam-history-section');
    if (examHistorySection) {
      examHistorySection.scrollIntoView({ behavior: 'smooth' });
    }
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
        return <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500" />;
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
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 dark:from-primary-700 dark:to-primary-800 rounded-xl p-8 text-white">
        <div className="flex items-center justify-between">
      <div>
            <h1 className="text-4xl font-bold mb-2">لوحة تحكم الطالب</h1>
            <p className="text-primary-100 dark:text-primary-200 text-lg">اختر المجموعة والامتحان الذي تريد حله</p>
          </div>
        </div>
      </div>

      {/* Quick Navigation Button */}
      <div className="text-center">
        <button
          onClick={scrollToExamHistory}
          className="inline-flex items-center space-x-2 rtl:space-x-reverse px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl transform hover:scale-105"
        >
          <History className="h-5 w-5" />
          <span>سجل الامتحانات</span>
        </button>
      </div>

      {/* Search and Filter Section */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search Input */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
                <input
                  type="text"
                  placeholder="البحث في الامتحانات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                />
              </div>
            </div>

            {/* Group Filter */}
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              >
                <option value="all">جميع المجموعات</option>
                {availableGroups.map((group) => (
                  <option key={group} value={group}>{getGroupName(group)}</option>
                ))}
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center space-x-1 rtl:space-x-reverse bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-white dark:bg-gray-600 shadow-sm text-primary-600 dark:text-primary-400' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-white dark:bg-gray-600 shadow-sm text-primary-600 dark:text-primary-400' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Grid className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            عرض {filteredExams.length} من {Object.values(examGroups).flat().length} امتحان
          </div>
        </div>
      </div>

      {/* Exams Display */}
      {viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Object.keys(groupedExams).length === 0 ? (
            <div className="col-span-full">
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700">
                <BookOpen className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">لا توجد امتحانات</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  {searchTerm ? 'لم يتم العثور على امتحانات تطابق البحث' : 'لا توجد امتحانات متاحة حالياً'}
                </p>
              </div>
            </div>
          ) : (
            sortedGroupedExamKeys.map((groupNumber) => {
              const groupExams = groupedExams[groupNumber];
              return (
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
                    {getGroupName(groupNumber)}
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
                    
                    // Check if exam has review and review performance
                    const hasReviewExam = status === 'completed' && progress && progress.reviewExamId;
                    const reviewFullMark = hasReviewExam && progress.bestReviewScore >= 100;
                    const reviewPartialOrFailed = hasReviewExam && progress.bestReviewScore < 100;
                    
                    // Determine card color based on score and review performance
                    let cardClasses;
                    if (hasReviewExam) {
                      // If has review exam, color based on review performance
                      if (reviewFullMark) {
                        cardClasses = 'bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-green-300 dark:border-green-700 hover:shadow-md';
                      } else {
                        cardClasses = 'bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border-red-300 dark:border-red-700 hover:shadow-md';
                      }
                    } else if (status === 'completed' && progress) {
                      // No review exam, color based on original exam score
                      const isFullMark = progress.score === exam.totalQuestions;
                      const hasPartialScore = progress.score > 0 && progress.score < exam.totalQuestions;
                      const hasZeroScore = progress.score === 0;
                      
                      if (isFullMark) {
                        cardClasses = 'bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-green-300 dark:border-green-700 hover:shadow-md';
                      } else if (hasPartialScore) {
                        cardClasses = 'bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/30 border-yellow-300 dark:border-yellow-700 hover:shadow-md';
                      } else {
                        cardClasses = 'bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 border-gray-300 dark:border-gray-600 hover:shadow-md opacity-75';
                      }
                    } else if (status === 'unlocked') {
                      cardClasses = 'bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border-blue-200 dark:border-blue-700 hover:shadow-md';
                    } else if (status === 'in_progress') {
                      cardClasses = 'bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 border-orange-200 dark:border-orange-700 hover:shadow-md';
                    } else {
                      cardClasses = 'bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 border-gray-200 dark:border-gray-600 opacity-75';
                    }
                    
                    return (
                      <div
                        key={exam._id}
                        className={`p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer ${cardClasses}`}
                        onClick={() => handleStartExam(exam)}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2 rtl:space-x-reverse">
                            {getStatusIcon(status)}
                            <span className={`text-sm font-medium ${
                              status === 'completed' ? 'text-green-700 dark:text-green-400' :
                              status === 'unlocked' ? 'text-blue-700 dark:text-blue-400' :
                              status === 'in_progress' ? 'text-yellow-700 dark:text-yellow-400' :
                              'text-gray-500 dark:text-gray-400'
                            }`}>
                              {getStatusText(status)}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {exam.totalQuestions} أسئلة • {exam.timeLimit} دقيقة
                          </div>
                        </div>
                        
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-sm">
                          {exam.title}
                        </h4>
                        
                        {status === 'completed' && progress && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600 dark:text-gray-400">الدرجة:</span>
                              <span className="font-semibold text-green-600 dark:text-green-400">
                                {progress.score}/{exam.totalQuestions} ({progress.percentage.toFixed(2)}%)
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  progress.percentage >= 80 ? 'bg-green-500' :
                                  progress.percentage >= 60 ? 'bg-blue-500' :
                                  'bg-orange-500'
                                }`}
                                style={{ width: `${progress.percentage}%` }}
                              ></div>
                            </div>
                            {progress.reviewExamId && (
                              <div className="mt-3 space-y-2">
                                {/* Best Review Score Display */}
                                {progress.wrongQuestions && progress.wrongQuestions.length > 0 && (
                                  <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg p-2">
                                    <div className="flex items-center justify-between text-xs mb-1">
                                      <span className="text-purple-700 dark:text-purple-300 font-medium">أفضل درجة في المراجعة:</span>
                                      <span className={`font-bold ${
                                        progress.bestReviewScore >= 100
                                          ? 'text-green-600 dark:text-green-400'
                                          : 'text-red-600 dark:text-red-400'
                                      }`}>
                                        {Math.round((progress.bestReviewScore || 0) / 100 * progress.wrongQuestions.length)}/{progress.wrongQuestions.length} ({progress.bestReviewScore || 0}%)
                                      </span>
                                    </div>
                                    <div className="w-full bg-purple-200 dark:bg-purple-800 rounded-full h-1.5">
                                      <div 
                                        className={`h-1.5 rounded-full ${
                                          progress.bestReviewScore >= 100
                                            ? 'bg-green-500'
                                            : 'bg-red-500'
                                        }`}
                                        style={{ 
                                          width: `${progress.bestReviewScore || 0}%` 
                                        }}
                                      ></div>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Review Exam Button */}
                                <div className="flex items-center justify-center">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/student/review-exam/${progress.reviewExamId}`);
                                    }}
                                    className="flex items-center space-x-1 rtl:space-x-reverse px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium hover:bg-purple-200 transition-colors"
                                  >
                                    <RotateCcw className="h-3 w-3" />
                                    <span>امتحان المراجعة</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {status === 'unlocked' && (
                          <div className="flex items-center justify-center mt-2">
                            <button className="flex items-center space-x-1 rtl:space-x-reverse px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium hover:bg-blue-200 transition-colors">
                              <Play className="h-3 w-3" />
                              <span>بدء الامتحان</span>
                            </button>
                          </div>
                        )}
                        
                        {status === 'in_progress' && progress && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">التقدم:</span>
                              <span className="font-semibold text-yellow-600">
                                {progress.score || 0}/{exam.totalQuestions}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="h-2 rounded-full bg-yellow-500"
                                style={{ width: `${((progress.score || 0) / exam.totalQuestions) * 100}%` }}
                              ></div>
                            </div>
                            <div className="flex items-center justify-center mt-2">
                              <button className="flex items-center space-x-1 rtl:space-x-reverse px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium hover:bg-yellow-200 transition-colors">
                                <Play className="h-3 w-3" />
                                <span>متابعة الامتحان</span>
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {status === 'locked' && (
                          <div className="flex items-center justify-center mt-2">
                            <span className="flex items-center space-x-1 rtl:space-x-reverse px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-medium">
                              <Lock className="h-3 w-3" />
                              <span>مقفل</span>
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              );
            })
          )}
        </div>
      ) : (
        /* List View */
        <div className="space-y-6">
          {Object.keys(groupedExams).length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm border">
              <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد امتحانات</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm ? 'لم يتم العثور على امتحانات تطابق البحث' : 'لا توجد امتحانات متاحة حالياً'}
              </p>
            </div>
          ) : (
            sortedGroupedExamKeys.map((groupNumber) => {
              const groupExams = groupedExams[groupNumber];
              return (
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
                    {getGroupName(groupNumber)}
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
                          <tr key={exam._id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleStartExam(exam)}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                                {getStatusIcon(status)}
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{exam.title}</div>
                                  <div className="text-sm text-gray-500">{exam.totalQuestions} أسئلة • {exam.timeLimit} دقيقة</div>
                    </div>
                    </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {getGroupName(groupNumber)}
                    </div>
                              <div className="text-sm text-gray-500">ترتيب: {exam.order}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                status === 'completed' 
                                  ? 'bg-green-100 text-green-800' 
                                  : status === 'unlocked' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : status === 'in_progress'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {getStatusText(status)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {status === 'completed' && progress ? (
                                <div className="text-sm text-gray-900">
                                  <div className="font-medium">{progress.score}/{exam.totalQuestions}</div>
                                  <div className="text-xs text-gray-500">{progress.percentage.toFixed(2)}%</div>
                  </div>
                              ) : status === 'in_progress' && progress ? (
                                <div className="text-sm text-gray-900">
                                  <div className="font-medium">{progress.score || 0}/{exam.totalQuestions}</div>
                                  <div className="text-xs text-gray-500">قيد التنفيذ</div>
                    </div>
                              ) : (
                                <span className="text-sm text-gray-500">-</span>
                  )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              {status === 'completed' && progress?.reviewExamId ? (
                  <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/student/review-exam/${progress.reviewExamId}`);
                                  }}
                                  className="text-purple-600 hover:text-purple-900 flex items-center space-x-1 rtl:space-x-reverse"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                  <span>مراجعة</span>
                                </button>
                              ) : status === 'unlocked' || status === 'in_progress' ? (
                                <button className="text-blue-600 hover:text-blue-900 flex items-center space-x-1 rtl:space-x-reverse">
                                  <Play className="h-4 w-4" />
                                  <span>بدء</span>
                  </button>
                              ) : (
                                <span className="text-gray-400 flex items-center space-x-1 rtl:space-x-reverse">
                                  <Lock className="h-4 w-4" />
                                  <span>مقفل</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
            </div>
              );
            })
          )}
        </div>
      )}

      {/* Exam History Section with Toggle Lists */}
      <div id="exam-history-section" className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2 rtl:space-x-reverse">
                <History className="h-5 w-5 text-primary-600" />
                <span>سجل الامتحانات</span>
              </h3>
              <p className="text-sm text-gray-600 mt-1">عرض نتائج الامتحانات السابقة مع إمكانية الوصول السريع</p>
            </div>
            <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
              {studentProgress.filter(p => p.status === 'completed').length} امتحان مكتمل
            </div>
          </div>
        </div>
        <div className="card-body">
          {studentProgress.filter(p => p.status === 'completed').length > 0 ? (
            <div className="space-y-4">
              {/* Toggle List for Each Group */}
              {sortGroupKeys(Object.keys(examGroups)).map((groupKey) => {
                const groupNum = parseInt(groupKey);
                const groupExams = examGroups[groupKey] || [];
                const completedExams = groupExams.filter(exam => {
                  const progress = studentProgress.find(p => p.examId === exam._id && p.status === 'completed');
                  return progress;
                });
                
                if (completedExams.length === 0) return null;
                
                const isExpanded = expandedGroups[groupKey];
                
                // Calculate group statistics
                const groupProgress = completedExams.map(exam => 
                  studentProgress.find(p => p.examId === exam._id && p.status === 'completed')
                );
                
                const avgScore = groupProgress.length > 0 
                  ? Math.round(groupProgress.reduce((sum, p) => sum + (p.percentage || 0), 0) / groupProgress.length)
                  : 0;
                
                return (
                  <div key={groupKey} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Group Header - Clickable to Toggle */}
                    <button
                      onClick={() => toggleGroup(groupKey)}
                      className="w-full p-4 bg-gradient-to-r from-green-50 to-blue-50 hover:from-green-100 hover:to-blue-100 transition-all duration-200 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3 rtl:space-x-reverse">
                        <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {groupNum}
                        </div>
                        <div className="text-right">
                          <h4 className="font-bold text-gray-900 text-sm">
                            {getGroupName(groupNum)}
                          </h4>
                          <p className="text-xs text-gray-600">
                            {completedExams.length} امتحان مكتمل
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3 rtl:space-x-reverse">
                        {avgScore > 0 && (
                          <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                            avgScore >= 80 ? 'bg-green-100 text-green-700' :
                            avgScore >= 60 ? 'bg-blue-100 text-blue-700' :
                            'bg-orange-100 text-orange-700'
                          }`}>
                            {avgScore}%
                          </div>
                        )}
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-500" />
                        )}
                      </div>
                    </button>
                    
                    {/* Expandable Content */}
                    {isExpanded && (
                      <div className="p-4 bg-white border-t border-gray-200">
                        <div className="space-y-3">
                          {completedExams.map(exam => {
                            const progress = studentProgress.find(p => p.examId === exam._id && p.status === 'completed');
                            
                            // Determine card color based on score
                            const isFullMark = progress && progress.score === exam.totalQuestions;
                            const hasScore = progress && progress.score > 0;
                            
                            const cardClasses = isFullMark
                              ? "bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-300 hover:from-green-100 hover:to-green-200"
                              : hasScore
                              ? "bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-300 hover:from-yellow-100 hover:to-yellow-200"
                              : "bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-300 hover:from-gray-100 hover:to-gray-200";
                            
                            return (
                              <div
                                key={exam._id}
                                className={`${cardClasses} rounded-lg p-4 transition-all duration-200 cursor-pointer shadow-sm`}
                                onClick={() => navigate(`/student/exam-history/${exam._id}`)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-3 rtl:space-x-reverse mb-2">
                                      <div className={`p-2 rounded-lg ${
                                        isFullMark ? 'bg-green-200' :
                                        hasScore ? 'bg-yellow-200' :
                                        'bg-gray-200'
                                      }`}>
                                        <CheckCircle className={`h-4 w-4 ${
                                          isFullMark ? 'text-green-700' :
                                          hasScore ? 'text-yellow-700' :
                                          'text-gray-600'
                                        }`} />
                                      </div>
                                      <div>
                                        <h5 className="font-bold text-gray-900 text-base">
                                          {exam.title}
                                        </h5>
                                        <p className="text-xs text-gray-600">
                                          {exam.totalQuestions} أسئلة
                                        </p>
                                      </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                                      <div className="text-center">
                                        <div className="text-lg font-bold text-green-600">{progress.score}/{exam.totalQuestions}</div>
                                        <div className="text-xs text-gray-500">الدرجة</div>
                                      </div>
                                      <div className="text-center">
                                        <div className="text-lg font-bold text-blue-600">{progress.percentage.toFixed(2)}%</div>
                                        <div className="text-xs text-gray-500">النسبة</div>
                                      </div>
                                      {progress.timeSpent && (
                                        <div className="text-center md:col-span-1">
                                          <div className="text-lg font-bold text-purple-600">
                                            {Math.floor(progress.timeSpent / 60)}:{(progress.timeSpent % 60).toString().padStart(2, '0')}
                                          </div>
                                          <div className="text-xs text-gray-500">الوقت المستغرق</div>
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Date and Time of Submission - Centered */}
                                    {progress.submittedAt && (
                                      <div className="text-center mt-3 pt-3 border-t border-gray-200">
                                        <div className="text-sm font-bold text-orange-600">
                                          {new Date(progress.submittedAt).toLocaleDateString('en-GB')} - {new Date(progress.submittedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className="text-xs text-gray-500">تاريخ الحل وساعة الإرسال</div>
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="flex flex-col items-center space-y-2">
                                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                                      progress.percentage >= 80 ? 'bg-green-100 text-green-700' :
                                      progress.percentage >= 60 ? 'bg-blue-100 text-blue-700' :
                                      'bg-orange-100 text-orange-700'
                                    }`}>
                                      {progress.percentage >= 80 ? 'ممتاز' :
                                       progress.percentage >= 60 ? 'جيد' : 'مقبول'}
                                    </div>
                                    
                                    {progress.reviewExamId && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigate(`/student/review-exam/${progress.reviewExamId}`);
                                        }}
                                        className="flex items-center space-x-1 rtl:space-x-reverse px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium hover:bg-purple-200 transition-colors"
                                      >
                                        <RotateCcw className="h-3 w-3" />
                                        <span>امتحان المراجعة</span>
                                      </button>
                                    )}
                                    
                                    <button className="flex items-center space-x-1 rtl:space-x-reverse px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium hover:bg-gray-200 transition-colors">
                                      <Eye className="h-3 w-3" />
                                      <span>عرض التفاصيل</span>
                                    </button>
                                  </div>
              </div>
            </div>
                            );
                          })}
              </div>
            </div>
                    )}
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