import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { BookOpen, Lock, Unlock, CheckCircle, Clock, Play, RotateCcw, AlertCircle, History, Eye, TrendingUp } from 'lucide-react';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [examGroups, setExamGroups] = useState([]);
  const [studentProgress, setStudentProgress] = useState([]);
  const [reviewExams, setReviewExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExamGroups();
    fetchStudentProgress();
    fetchReviewExams();
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
    toast.error('لا يمكن الوصول لهذا الامتحان حالياً');
  };

  const handleStartReviewExam = (reviewExam) => {
    navigate(`/student/review-exam/${reviewExam._id}`);
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">لوحة تحكم الطالب</h1>
        <p className="text-gray-600">اختر المجموعة والامتحان الذي تريد حله</p>
      </div>

      {/* Exam Groups */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* اختبارات التأسيس Group */}
        <div key={0} className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">
              اختبارات التأسيس
            </h3>
          </div>
          <div className="card-body">
            {examGroups[0] ? (
              <div className="space-y-3">
                {examGroups[0].map((exam, index) => {
                  const status = getExamStatus(exam);
                  return (
                    <div
                      key={exam._id}
                      className={`p-3 rounded-lg border ${
                        status === 'locked'
                          ? 'bg-gray-50 border-gray-200'
                          : status === 'completed'
                          ? 'bg-green-50 border-green-200'
                          : status === 'unlocked'
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-yellow-50 border-yellow-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 rtl:space-x-reverse">
                          {getStatusIcon(status)}
                          <span className="text-sm font-medium text-gray-700">
                            امتحان {exam.order}
                          </span>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          status === 'locked'
                            ? 'bg-gray-200 text-gray-600'
                            : status === 'completed'
                            ? 'bg-green-200 text-green-700'
                            : status === 'unlocked'
                            ? 'bg-blue-200 text-blue-700'
                            : 'bg-yellow-200 text-yellow-700'
                        }`}>
                          {getStatusText(status)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {exam.totalQuestions} سؤال • {exam.timeLimit} دقيقة
                      </p>
                      {status !== 'locked' && (
                        <button
                          className="mt-2 w-full text-xs btn-primary py-1 flex items-center justify-center space-x-1 rtl:space-x-reverse"
                          onClick={() => handleStartExam(exam)}
                        >
                          {status === 'completed' ? (
                            <>
                              <CheckCircle className="h-3 w-3" />
                              <span>امتحان المراجعة ({getExamPercentage(exam)}%)</span>
                            </>
                          ) : status === 'in_progress' ? (
                            <>
                              <Clock className="h-3 w-3" />
                              <span>متابعة الامتحان</span>
                            </>
                          ) : (
                            <>
                              <Play className="h-3 w-3" />
                              <span>بدء الامتحان</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4">
                <BookOpen className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">لا توجد امتحانات متاحة</p>
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
              {examGroups[groupNumber] ? (
                <div className="space-y-3">
                  {examGroups[groupNumber].map((exam, index) => {
                    const status = getExamStatus(exam);
                    return (
                      <div
                        key={exam._id}
                        className={`p-3 rounded-lg border ${
                          status === 'locked'
                            ? 'bg-gray-50 border-gray-200'
                            : status === 'completed'
                            ? 'bg-green-50 border-green-200'
                            : status === 'unlocked'
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-yellow-50 border-yellow-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 rtl:space-x-reverse">
                            {getStatusIcon(status)}
                            <span className="text-sm font-medium text-gray-700">
                              امتحان {exam.order}
                            </span>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            status === 'locked'
                              ? 'bg-gray-200 text-gray-600'
                              : status === 'completed'
                              ? 'bg-green-200 text-green-700'
                              : status === 'unlocked'
                              ? 'bg-blue-200 text-blue-700'
                              : 'bg-yellow-200 text-yellow-700'
                          }`}>
                            {getStatusText(status)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {exam.totalQuestions} سؤال • {exam.timeLimit} دقيقة
                        </p>
                        {status !== 'locked' && (
                          <button
                            className="mt-2 w-full text-xs btn-primary py-1 flex items-center justify-center space-x-1 rtl:space-x-reverse"
                            onClick={() => handleStartExam(exam)}
                          >
                            {status === 'completed' ? (
                              <>
                                <CheckCircle className="h-3 w-3" />
                                <span>امتحان المراجعة ({getExamPercentage(exam)}%)</span>
                              </>
                            ) : status === 'in_progress' ? (
                              <>
                                <Clock className="h-3 w-3" />
                                <span>متابعة الامتحان</span>
                              </>
                            ) : (
                              <>
                                <Play className="h-3 w-3" />
                                <span>بدء الامتحان</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4">
                  <BookOpen className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">لا توجد امتحانات متاحة</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Review Exams Section - Categorized by Groups */}
      {Object.keys(reviewExams).length > 0 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2 rtl:space-x-reverse">
              <RotateCcw className="h-6 w-6 text-orange-600" />
              <span>امتحانات المراجعة</span>
            </h2>
            <p className="text-gray-600 mt-1">امتحانات للأسئلة الخاطئة - يمكن حلها عدة مرات</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* اختبارات التأسيس Review Exams */}
            {reviewExams[0] && reviewExams[0].length > 0 && (
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2 rtl:space-x-reverse">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                    <span>مراجعة اختبارات التأسيس</span>
                  </h3>
                  <p className="text-sm text-gray-600">{reviewExams[0].length} امتحان مراجعة</p>
                </div>
                <div className="card-body">
                  <div className="space-y-3">
                    {reviewExams[0].map((reviewExam) => (
                      <div
                        key={reviewExam._id}
                        className="p-3 bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900 text-sm">
                            {reviewExam.originalExamId?.title || 'امتحان مراجعة'}
                          </h4>
                          <div className="flex items-center space-x-1 rtl:space-x-reverse">
                            <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded-full">
                              امتحان {reviewExam.originalExamId?.order}
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
                          <div className="flex items-center space-x-1 rtl:space-x-reverse">
                            <BookOpen className="h-3 w-3" />
                            <span>{reviewExam.questions.length} سؤال</span>
                          </div>
                          <div className="flex items-center space-x-1 rtl:space-x-reverse">
                            <Clock className="h-3 w-3" />
                            <span>{reviewExam.timeLimit} دقيقة</span>
                          </div>
                          <div className="flex items-center space-x-1 rtl:space-x-reverse">
                            <RotateCcw className="h-3 w-3" />
                            <span>{reviewExam.totalAttempts} محاولة</span>
                          </div>
                          {reviewExam.bestPercentage > 0 && (
                            <div className="flex items-center space-x-1 rtl:space-x-reverse text-green-600">
                              <CheckCircle className="h-3 w-3" />
                              <span>{reviewExam.bestPercentage}%</span>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => handleStartReviewExam(reviewExam)}
                          className="w-full text-xs bg-orange-600 hover:bg-orange-700 text-white py-2 px-3 rounded-lg flex items-center justify-center space-x-1 rtl:space-x-reverse transition-colors"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>بدء المراجعة</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Regular Groups 1-8 Review Exams */}
            {Array.from({ length: 8 }, (_, i) => i + 1).map(groupNumber => (
              reviewExams[groupNumber] && reviewExams[groupNumber].length > 0 && (
                <div key={groupNumber} className="card">
                  <div className="card-header">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2 rtl:space-x-reverse">
                      <AlertCircle className="h-5 w-5 text-orange-600" />
                      <span>مراجعة المجموعة {groupNumber}</span>
                    </h3>
                    <p className="text-sm text-gray-600">{reviewExams[groupNumber].length} امتحان مراجعة</p>
                  </div>
                  <div className="card-body">
                    <div className="space-y-3">
                      {reviewExams[groupNumber].map((reviewExam) => (
                        <div
                          key={reviewExam._id}
                          className="p-3 bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900 text-sm">
                              {reviewExam.originalExamId?.title || 'امتحان مراجعة'}
                            </h4>
                            <div className="flex items-center space-x-1 rtl:space-x-reverse">
                              <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded-full">
                                امتحان {reviewExam.originalExamId?.order}
                              </span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
                            <div className="flex items-center space-x-1 rtl:space-x-reverse">
                              <BookOpen className="h-3 w-3" />
                              <span>{reviewExam.questions.length} سؤال</span>
                            </div>
                            <div className="flex items-center space-x-1 rtl:space-x-reverse">
                              <Clock className="h-3 w-3" />
                              <span>{reviewExam.timeLimit} دقيقة</span>
                            </div>
                            <div className="flex items-center space-x-1 rtl:space-x-reverse">
                              <RotateCcw className="h-3 w-3" />
                              <span>{reviewExam.totalAttempts} محاولة</span>
                            </div>
                            {reviewExam.bestPercentage > 0 && (
                              <div className="flex items-center space-x-1 rtl:space-x-reverse text-green-600">
                                <CheckCircle className="h-3 w-3" />
                                <span>{reviewExam.bestPercentage}%</span>
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => handleStartReviewExam(reviewExam)}
                            className="w-full text-xs bg-orange-600 hover:bg-orange-700 text-white py-2 px-3 rounded-lg flex items-center justify-center space-x-1 rtl:space-x-reverse transition-colors"
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span>بدء المراجعة</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      )}


      {/* Exam History Section */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2 rtl:space-x-reverse">
            <History className="h-5 w-5 text-blue-600" />
            <span>سجل الامتحانات</span>
          </h3>
          <p className="text-gray-600 mt-1">عرض نتائج الامتحانات السابقة وتفاصيل الإجابات</p>
        </div>
        <div className="card-body">
          {studentProgress.filter(p => p.status === 'completed').length > 0 ? (
            <div className="space-y-4">
              {studentProgress
                .filter(p => p.status === 'completed')
                .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
                .map((progress) => {
                  const exam = Object.values(examGroups).flat().find(e => e._id === progress.examId);
                  if (!exam) return null;
                  
                  return (
                    <div
                      key={progress._id}
                      className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3 rtl:space-x-reverse">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <BookOpen className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {exam.title}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {exam.examGroup === 0 ? 'اختبارات التأسيس' : `المجموعة ${exam.examGroup}`} • امتحان {exam.order}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${
                            progress.percentage >= 80 ? 'text-green-600' :
                            progress.percentage >= 60 ? 'text-blue-600' :
                            'text-orange-600'
                          }`}>
                            {progress.percentage}%
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(progress.completedAt).toLocaleDateString('ar-SA')}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center p-2 bg-white rounded-lg">
                          <div className="text-lg font-semibold text-gray-900">{progress.score}</div>
                          <div className="text-xs text-gray-600">الدرجة</div>
                        </div>
                        <div className="text-center p-2 bg-white rounded-lg">
                          <div className="text-lg font-semibold text-green-600">{progress.correctAnswers}</div>
                          <div className="text-xs text-gray-600">صحيح</div>
                        </div>
                        <div className="text-center p-2 bg-white rounded-lg">
                          <div className="text-lg font-semibold text-red-600">{progress.wrongAnswers}</div>
                          <div className="text-xs text-gray-600">خطأ</div>
                        </div>
                        <div className="text-center p-2 bg-white rounded-lg">
                          <div className="text-lg font-semibold text-gray-900">{progress.totalQuestions}</div>
                          <div className="text-xs text-gray-600">إجمالي</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 rtl:space-x-reverse">
                          {progress.timeSpent && (
                            <div className="flex items-center space-x-1 rtl:space-x-reverse text-sm text-gray-600">
                              <Clock className="h-4 w-4" />
                              <span>{Math.floor(progress.timeSpent / 60)}:{(progress.timeSpent % 60).toString().padStart(2, '0')}</span>
                            </div>
                          )}
                          {progress.submittedAt && (
                            <div className="flex items-center space-x-1 rtl:space-x-reverse text-sm text-gray-600">
                              <span>{new Date(progress.submittedAt).toLocaleTimeString('ar-SA', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2 rtl:space-x-reverse">
                          <button
                            onClick={() => navigate(`/student/exam-history/${exam._id}`)}
                            className="flex items-center space-x-1 rtl:space-x-reverse text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                            <span>عرض التفاصيل</span>
                          </button>
                          
                          {progress.reviewExamId && (
                            <button
                              onClick={() => navigate(`/student/review-exam/${progress.reviewExamId}`)}
                              className="flex items-center space-x-1 rtl:space-x-reverse text-sm bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg transition-colors"
                            >
                              <RotateCcw className="h-4 w-4" />
                              <span>امتحان المراجعة</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="text-center py-8">
              <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد امتحانات مكتملة</h3>
              <p className="text-gray-600">ابدأ بحل الامتحانات لترى سجل النتائج هنا</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
