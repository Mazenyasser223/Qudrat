import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { X, Eye, EyeOff, CheckCircle, XCircle, AlertCircle, BookOpen, Clock, TrendingUp, ChevronLeft, ChevronRight, List, ChevronDown, RefreshCw } from 'lucide-react';

const StudentAnswersViewer = ({ studentId, studentName, onClose }) => {
  const [studentAnswers, setStudentAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAnswers, setShowAnswers] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [currentExamIndex, setCurrentExamIndex] = useState(0);
  const [showExamSelector, setShowExamSelector] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [filteredExams, setFilteredExams] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStudentAnswers();
  }, [studentId]);

  // Filter exams by group
  useEffect(() => {
    if (selectedGroup === 'all') {
      setFilteredExams(studentAnswers);
    } else {
      const groupNum = parseInt(selectedGroup);
      setFilteredExams(studentAnswers.filter(exam => exam.exam.examGroup === groupNum));
    }
    setCurrentExamIndex(0); // Reset to first exam when filter changes
  }, [studentAnswers, selectedGroup]);

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

  const fetchStudentAnswers = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const response = await axios.get(`/api/users/students/${studentId}/all-answers`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      // Filter out any answers where the exam data is missing (deleted exams)
      const validAnswers = (response.data.data || []).filter(answerData => 
        answerData.exam && answerData.exam._id && answerData.exam.title
      );
      
      setStudentAnswers(validAnswers);
      
      if (isRefresh) {
        toast.success('تم تحديث البيانات بنجاح');
      }
    } catch (error) {
      console.error('Error fetching student answers:', error);
      toast.error('حدث خطأ أثناء تحميل إجابات الطالب');
      setStudentAnswers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
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
    if (filteredExams.length === 0) return;
    let newIndex;
    if (direction === 'prev') {
      newIndex = currentExamIndex > 0 ? currentExamIndex - 1 : filteredExams.length - 1;
    } else {
      newIndex = currentExamIndex < filteredExams.length - 1 ? currentExamIndex + 1 : 0;
    }
    setCurrentExamIndex(newIndex);
  };

  const selectExam = (examIndex) => {
    setCurrentExamIndex(examIndex);
    setShowExamSelector(false);
  };

  const getAvailableGroups = () => {
    const groups = new Set();
    studentAnswers.forEach(exam => {
      groups.add(exam.exam.examGroup);
    });
    return Array.from(groups).sort((a, b) => a - b);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <span className="mr-3 text-gray-600">جاري التحميل...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-7xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">إجابات الطالب في جميع الامتحانات</h2>
            <p className="text-gray-600 mt-1">{studentName}</p>
          </div>
          <div className="flex items-center space-x-4 space-x-reverse">
            {/* Group Filter */}
            {studentAnswers.length > 0 && (
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <label className="text-sm font-medium text-gray-700">المجموعة:</label>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">جميع المجموعات</option>
                  {getAvailableGroups().map(groupNum => (
                    <option key={groupNum} value={groupNum}>
                      {groupNum === 0 ? 'اختبارات التأسيس' : `المجموعة ${groupNum}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Exam Navigation */}
            {filteredExams.length > 1 && (
              <div className="flex items-center space-x-2 rtl:space-x-reverse bg-white/20 rounded-xl p-1 backdrop-blur-sm border border-gray-200">
                <button 
                  onClick={() => navigateToExam('prev')} 
                  className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200" 
                  title="الامتحان السابق"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="relative exam-selector">
                  <button 
                    onClick={() => setShowExamSelector(!showExamSelector)} 
                    className="flex items-center space-x-2 rtl:space-x-reverse px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200" 
                    title="اختيار امتحان"
                  >
                    <span>{currentExamIndex + 1} / {filteredExams.length}</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {showExamSelector && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-60 overflow-y-auto">
                      <div className="p-2">
                        <div className="text-xs font-semibold text-gray-500 px-3 py-2 border-b border-gray-100">
                          اختر الامتحان {selectedGroup !== 'all' && `(${getGroupName(parseInt(selectedGroup))})`}
                        </div>
                        {filteredExams.map((examData, index) => (
                          <button 
                            key={examData.exam._id} 
                            onClick={() => selectExam(index)} 
                            className={`w-full text-right px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                              index === currentExamIndex 
                                ? 'bg-blue-100 text-blue-800 font-semibold' 
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">#{index + 1}</span>
                              <span className="truncate">{examData.exam.title}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => navigateToExam('next')} 
                  className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200" 
                  title="الامتحان التالي"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
            <button
              onClick={() => fetchStudentAnswers(true)}
              disabled={refreshing}
              className="flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-4 h-4 ml-2 ${refreshing ? 'animate-spin' : ''}`} />
              تحديث
            </button>
            <button
              onClick={() => setShowAnswers(!showAnswers)}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                showAnswers 
                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {showAnswers ? <EyeOff className="w-4 h-4 ml-2" /> : <Eye className="w-4 h-4 ml-2" />}
              {showAnswers ? 'إخفاء الإجابات الصحيحة' : 'إظهار الإجابات الصحيحة'}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <BookOpen className="w-5 h-5 text-blue-600 ml-2" />
              <span className="text-blue-800 font-medium">
                {selectedGroup === 'all' ? 'إجمالي الامتحانات' : 'امتحانات المجموعة'}
              </span>
            </div>
            <div className="text-2xl font-bold text-blue-900 mt-1">{filteredExams.length}</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 ml-2" />
              <span className="text-green-800 font-medium">امتحانات مكتملة</span>
            </div>
            <div className="text-2xl font-bold text-green-900 mt-1">
              {filteredExams.filter(exam => exam.status === 'completed').length}
            </div>
          </div>
        </div>

        {/* Current Exam Display */}
        {studentAnswers.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">لا توجد إجابات</h3>
            <p className="text-gray-600">الطالب لم يحاول أي امتحان بعد</p>
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">لا توجد امتحانات في هذه المجموعة</h3>
            <p className="text-gray-600">اختر مجموعة أخرى أو جميع المجموعات</p>
          </div>
        ) : (
          <div className="space-y-6">
            {(() => {
              const examData = filteredExams[currentExamIndex];
              if (!examData) return null;
              
              return (
                <div key={examData.exam._id} className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                {/* Exam Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4 space-x-reverse">
                    <div className="flex items-center">
                      <BookOpen className="w-5 h-5 text-gray-600 ml-2" />
                      <span className="text-lg font-semibold text-gray-900">
                        {examData.exam.title}
                      </span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(examData.status)}`}>
                      {getStatusText(examData.status)}
                    </span>
                    <span className="text-sm text-gray-600">
                      {getGroupName(examData.exam.examGroup)}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">الدرجة</div>
                    <div className="text-lg font-bold text-gray-900">
                      {examData.score || 0}/{examData.totalQuestions || examData.exam.questions.length}
                    </div>
                    <div className="text-sm text-gray-600">
                      {(examData.percentage || 0).toFixed(2)}%
                    </div>
                  </div>
                </div>

                {/* Questions */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {examData.answers.map((answer, questionIndex) => {
                    const question = examData.exam.questions.find(q => q._id.toString() === answer.questionId.toString());
                    if (!question) return null;

                    const answerStatus = getAnswerStatus(question, answer.selectedAnswer);
                    const StatusIcon = answerStatus.icon;

                    return (
                      <div key={answer.questionId} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <StatusIcon className={`w-4 h-4 ${answerStatus.color} ml-2`} />
                            <span className="text-sm font-medium text-gray-900">
                              سؤال {questionIndex + 1}
                            </span>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${answerStatus.bgColor} ${answerStatus.color}`}>
                            {answerStatus.status === 'correct' ? 'صحيح' : 
                             answerStatus.status === 'wrong' ? 'خطأ' : 'لم يُجِب'}
                          </span>
                        </div>

                        {/* Question Image */}
                        <div className="mb-3">
                          <img
                            src={question.questionImage}
                            alt={`سؤال ${questionIndex + 1}`}
                            className="w-full h-32 object-cover rounded border border-gray-200"
                          />
                        </div>

                        {/* Student Answer */}
                        <div className="mb-2">
                          <div className="text-xs text-gray-600 mb-1">إجابة الطالب:</div>
                          <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            answerStatus.status === 'correct' 
                              ? 'bg-green-100 text-green-800'
                              : answerStatus.status === 'wrong'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {answer.selectedAnswer ? getAnswerLabel(answer.selectedAnswer) : 'لم يُجِب'}
                          </div>
                        </div>

                        {/* Correct Answer (if showAnswers is true) */}
                        {showAnswers && (
                          <div>
                            <div className="text-xs text-gray-600 mb-1">الإجابة الصحيحة:</div>
                            <div className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                              {getAnswerLabel(question.correctAnswer)}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentAnswersViewer;
