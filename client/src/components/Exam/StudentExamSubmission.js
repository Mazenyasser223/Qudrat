import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { X, Eye, EyeOff, CheckCircle, XCircle, AlertCircle, BookOpen, Clock, TrendingUp, User, Award, Target, Zap, Star, ChevronLeft, ChevronRight, List, ChevronDown } from 'lucide-react';

const StudentExamSubmission = ({ studentId, studentName, examId, examTitle, onClose, allExams = [] }) => {
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAnswers, setShowAnswers] = useState(false);
  const [currentExamIndex, setCurrentExamIndex] = useState(0);
  const [showExamSelector, setShowExamSelector] = useState(false);

  useEffect(() => {
    fetchSubmission();
  }, [studentId, examId]);

  useEffect(() => {
    // Find the current exam index when examId changes
    if (allExams.length > 0) {
      const index = allExams.findIndex(exam => exam._id === examId);
      if (index !== -1) {
        setCurrentExamIndex(index);
      }
    }
  }, [examId, allExams]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showExamSelector && !event.target.closest('.exam-selector')) {
        setShowExamSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExamSelector]);

  const fetchSubmission = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/exams/${examId}/student-submission/${studentId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setSubmission(response.data.data);
    } catch (error) {
      console.error('Error fetching submission:', error);
      toast.error('حدث خطأ أثناء تحميل إجابة الطالب');
      setSubmission(null);
    } finally {
      setLoading(false);
    }
  };

  const getAnswerStatus = (question, studentAnswer) => {
    if (!studentAnswer || studentAnswer.trim() === '') {
      return { status: 'unanswered', icon: AlertCircle, color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    } else if (studentAnswer === question.correctAnswer) {
      return { status: 'correct', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' };
    } else {
      return { status: 'wrong', icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' };
    }
  };

  const getAnswerLabel = (answer) => {
    const labels = { 'A': 'أ', 'B': 'ب', 'C': 'ج', 'D': 'د' };
    return labels[answer] || answer;
  };

  const getGroupName = (examGroup) => {
    return examGroup === 0 ? 'اختبارات التأسيس' : `المجموعة ${examGroup}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'unlocked': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return 'مكتمل';
      case 'in_progress': return 'قيد التنفيذ';
      case 'unlocked': return 'متاح';
      default: return 'مقفل';
    }
  };

  const navigateToExam = (direction) => {
    if (allExams.length === 0) return;
    
    let newIndex;
    if (direction === 'prev') {
      newIndex = currentExamIndex > 0 ? currentExamIndex - 1 : allExams.length - 1;
    } else {
      newIndex = currentExamIndex < allExams.length - 1 ? currentExamIndex + 1 : 0;
    }
    
    setCurrentExamIndex(newIndex);
    const newExam = allExams[newIndex];
    
    // Trigger a custom event to update the parent component
    window.dispatchEvent(new CustomEvent('examChanged', { 
      detail: { examId: newExam._id, examTitle: newExam.title } 
    }));
  };

  const getCurrentExam = () => {
    return allExams.length > 0 ? allExams[currentExamIndex] : null;
  };

  const selectExam = (examIndex) => {
    setCurrentExamIndex(examIndex);
    const exam = allExams[examIndex];
    setShowExamSelector(false);
    
    // Trigger a custom event to update the parent component
    window.dispatchEvent(new CustomEvent('examChanged', { 
      detail: { examId: exam._id, examTitle: exam.title } 
    }));
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-indigo-900/20 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-white/20">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200"></div>
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent absolute top-0 left-0"></div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">جاري التحميل</h3>
              <p className="text-sm text-gray-600">نحضر إجابة الطالب لك...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-indigo-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 max-w-md w-full">
          <div className="p-8 text-center">
            <div className="relative mb-6">
              <div className="mx-auto w-20 h-20 bg-gradient-to-r from-red-100 to-orange-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                <X className="w-4 h-4 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">لا توجد إجابة</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">الطالب لم يحاول هذا الامتحان بعد</p>
            <button
              onClick={onClose}
              className="px-8 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { exam, status, score, totalQuestions, percentage, answers, startTime, endTime } = submission;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-indigo-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 p-6 text-white">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center space-x-3 rtl:space-x-reverse mb-2">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">إجابة الطالب في الامتحان</h2>
                  <p className="text-blue-100 mt-1">{examTitle}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse mt-3">
                <User className="w-4 h-4 text-blue-200" />
                <span className="text-blue-100 font-medium">{studentName}</span>
              </div>
            </div>
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              {/* Navigation Controls */}
              {allExams.length > 1 && (
                <div className="flex items-center space-x-2 rtl:space-x-reverse bg-white/20 rounded-xl p-1 backdrop-blur-sm">
                  <button
                    onClick={() => navigateToExam('prev')}
                    className="p-2 hover:bg-white/30 rounded-lg transition-all duration-200"
                    title="الامتحان السابق"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  {/* Exam Selector Dropdown */}
                  <div className="relative exam-selector">
                    <button
                      onClick={() => setShowExamSelector(!showExamSelector)}
                      className="flex items-center space-x-2 rtl:space-x-reverse px-3 py-1 text-sm font-medium text-white hover:bg-white/30 rounded-lg transition-all duration-200"
                      title="اختيار امتحان"
                    >
                      <span>{currentExamIndex + 1} / {allExams.length}</span>
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    
                    {showExamSelector && (
                      <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-60 overflow-y-auto">
                        <div className="p-2">
                          <div className="text-xs font-semibold text-gray-500 px-3 py-2 border-b border-gray-100">
                            اختر الامتحان
                          </div>
                          {allExams.map((exam, index) => (
                            <button
                              key={exam._id}
                              onClick={() => selectExam(index)}
                              className={`w-full text-right px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                                index === currentExamIndex
                                  ? 'bg-blue-100 text-blue-800 font-semibold'
                                  : 'text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">#{index + 1}</span>
                                <span className="truncate">{exam.title}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => navigateToExam('next')}
                    className="p-2 hover:bg-white/30 rounded-lg transition-all duration-200"
                    title="الامتحان التالي"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              <button
                onClick={() => setShowAnswers(!showAnswers)}
                className={`flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 backdrop-blur-sm ${
                  showAnswers 
                    ? 'bg-green-500/80 text-white hover:bg-green-500 shadow-lg' 
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                {showAnswers ? <EyeOff className="w-4 h-4 ml-2" /> : <Eye className="w-4 h-4 ml-2" />}
                {showAnswers ? 'إخفاء الإجابات' : 'إظهار الإجابات'}
              </button>
              <button
                onClick={onClose}
                className="p-3 bg-white/20 hover:bg-white/30 rounded-xl transition-all duration-200 backdrop-blur-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Exam Info */}
        <div className="p-6 bg-gradient-to-r from-gray-50 to-blue-50/50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 shadow-lg border border-blue-100 hover:shadow-xl transition-all duration-200">
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-600 font-medium">المجموعة</div>
                  <div className="text-lg font-bold text-gray-900">{getGroupName(exam.examGroup)}</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-lg border border-green-100 hover:shadow-xl transition-all duration-200">
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <div className="p-3 bg-green-100 rounded-xl">
                  <Target className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-600 font-medium">الدرجة</div>
                  <div className="text-lg font-bold text-gray-900">{score}/{totalQuestions}</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-lg border border-purple-100 hover:shadow-xl transition-all duration-200">
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Award className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-600 font-medium">النسبة المئوية</div>
                  <div className="text-lg font-bold text-gray-900">{percentage.toFixed(2)}%</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-lg border border-orange-100 hover:shadow-xl transition-all duration-200">
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <div className="p-3 bg-orange-100 rounded-xl">
                  <Zap className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-600 font-medium">الحالة</div>
                  <div className="text-lg font-bold text-gray-900">{getStatusText(status)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center space-x-3 rtl:space-x-reverse mb-6">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl">
              <Star className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">الأسئلة والإجابات</h3>
          </div>
          
          <div className="space-y-8">
            {exam.questions.map((question, index) => {
              const answer = answers.find(a => a.questionId.toString() === question._id.toString());
              const studentAnswer = answer ? answer.selectedAnswer : null;
              const answerStatus = getAnswerStatus(question, studentAnswer);
              const StatusIcon = answerStatus.icon;

              return (
                <div key={question._id} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300">
                  {/* Question Header */}
                  <div className="bg-gradient-to-r from-gray-50 to-blue-50/50 p-6 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 rtl:space-x-reverse">
                        <div className={`p-3 rounded-xl ${answerStatus.bgColor}`}>
                          <StatusIcon className={`w-6 h-6 ${answerStatus.color}`} />
                        </div>
                        <span className="text-xl font-bold text-gray-900">
                          السؤال {index + 1}
                        </span>
                      </div>
                      <span className={`px-4 py-2 rounded-full text-sm font-bold ${answerStatus.bgColor} ${answerStatus.color}`}>
                        {answerStatus.status === 'correct' ? 'صحيح' : 
                         answerStatus.status === 'wrong' ? 'خطأ' : 'لم يُجِب'}
                      </span>
                    </div>
                  </div>

                  {/* Question Image - Full Width and Larger */}
                  <div className="p-6">
                    <div className="relative overflow-hidden rounded-xl border-2 border-gray-200 bg-gray-50">
                      <img
                        src={question.questionImage}
                        alt={`سؤال ${index + 1}`}
                        className="w-full h-auto max-h-[600px] object-contain hover:scale-[1.02] transition-transform duration-300"
                        style={{ minHeight: '300px' }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none"></div>
                    </div>
                  </div>

                  {/* Answers */}
                  <div className="p-6 space-y-6">
                    {/* Student Answer */}
                    <div className="bg-gradient-to-r from-gray-50 to-blue-50/30 rounded-xl p-6 border border-gray-200">
                      <div className="flex items-center space-x-3 rtl:space-x-reverse mb-4">
                        <User className="w-5 h-5 text-gray-600" />
                        <h4 className="text-lg font-bold text-gray-900">إجابة الطالب</h4>
                      </div>
                      <div className={`inline-flex items-center px-6 py-3 rounded-xl font-bold text-xl ${
                        answerStatus.status === 'correct' 
                          ? 'bg-green-100 text-green-800 border-2 border-green-200'
                          : answerStatus.status === 'wrong'
                          ? 'bg-red-100 text-red-800 border-2 border-red-200'
                          : 'bg-yellow-100 text-yellow-800 border-2 border-yellow-200'
                      }`}>
                        {studentAnswer ? getAnswerLabel(studentAnswer) : 'لم يُجِب'}
                      </div>
                    </div>

                    {/* Correct Answer (if showAnswers is true) */}
                    {showAnswers && (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50/30 rounded-xl p-6 border border-green-200">
                        <div className="flex items-center space-x-3 rtl:space-x-reverse mb-4">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <h4 className="text-lg font-bold text-green-900">الإجابة الصحيحة</h4>
                        </div>
                        <div className="inline-flex items-center px-6 py-3 rounded-xl font-bold text-xl bg-green-100 text-green-800 border-2 border-green-200">
                          {getAnswerLabel(question.correctAnswer)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Explanation */}
                  {question.explanation && showAnswers && (
                    <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50/30 border-t border-blue-100">
                      <div className="flex items-center space-x-3 rtl:space-x-reverse mb-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <BookOpen className="w-5 h-5 text-blue-600" />
                        </div>
                        <h4 className="text-lg font-bold text-blue-900">التفسير</h4>
                      </div>
                      <p className="text-blue-800 leading-relaxed text-lg">{question.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gradient-to-r from-gray-50 to-blue-50/50 p-6 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6 rtl:md:space-x-reverse">
              {startTime && (
                <div className="flex items-center space-x-2 rtl:space-x-reverse text-sm text-gray-600">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span>وقت البداية: {new Date(startTime).toLocaleString('ar-SA')}</span>
                </div>
              )}
              {endTime && (
                <div className="flex items-center space-x-2 rtl:space-x-reverse text-sm text-gray-600">
                  <Clock className="w-4 h-4 text-green-500" />
                  <span>وقت الانتهاء: {new Date(endTime).toLocaleString('ar-SA')}</span>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-8 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentExamSubmission;
