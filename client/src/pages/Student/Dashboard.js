import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { BookOpen, Lock, Unlock, CheckCircle, Clock, Play, RotateCcw, AlertCircle } from 'lucide-react';

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
      setReviewExams(res.data.data || []);
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

      {/* Review Exams Section */}
      {reviewExams.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2 rtl:space-x-reverse">
              <RotateCcw className="h-5 w-5 text-orange-600" />
              <span>امتحانات المراجعة</span>
            </h3>
            <p className="text-gray-600 mt-1">امتحانات للأسئلة الخاطئة - يمكن حلها عدة مرات</p>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reviewExams.map((reviewExam) => (
                <div
                  key={reviewExam._id}
                  className="p-4 bg-orange-50 border border-orange-200 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 text-sm">
                      {reviewExam.title}
                    </h4>
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                  </div>
                  
                  <div className="text-xs text-gray-600 mb-3">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse mb-1">
                      <BookOpen className="h-3 w-3" />
                      <span>{reviewExam.questions.length} سؤال</span>
                    </div>
                    <div className="flex items-center space-x-2 rtl:space-x-reverse mb-1">
                      <Clock className="h-3 w-3" />
                      <span>{reviewExam.timeLimit} دقيقة</span>
                    </div>
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <RotateCcw className="h-3 w-3" />
                      <span>{reviewExam.totalAttempts} محاولة</span>
                    </div>
                  </div>

                  {reviewExam.bestPercentage > 0 && (
                    <div className="text-xs text-green-600 mb-3">
                      أفضل نتيجة: {reviewExam.bestPercentage}%
                    </div>
                  )}

                  <button
                    onClick={() => handleStartReviewExam(reviewExam)}
                    className="w-full text-xs btn-primary py-2 flex items-center justify-center space-x-1 rtl:space-x-reverse"
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

      {/* Progress Summary */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">ملخص التقدم</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {studentProgress.filter(p => p.status === 'completed').length}
              </div>
              <div className="text-sm text-gray-600">امتحانات مكتملة</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {studentProgress.length > 0 
                  ? Math.round(studentProgress.reduce((sum, p) => sum + p.percentage, 0) / studentProgress.length)
                  : 0}%
              </div>
              <div className="text-sm text-gray-600">متوسط الدرجات</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {studentProgress.reduce((sum, p) => sum + p.score, 0)}
              </div>
              <div className="text-sm text-gray-600">إجمالي النقاط</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {reviewExams.length}
              </div>
              <div className="text-sm text-gray-600">امتحانات مراجعة</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
