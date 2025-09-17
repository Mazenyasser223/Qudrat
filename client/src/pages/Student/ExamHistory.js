import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ArrowLeft, CheckCircle, XCircle, Clock, Calendar, TrendingUp, BookOpen, AlertCircle } from 'lucide-react';

const ExamHistory = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  
  const [exam, setExam] = useState(null);
  const [studentSubmission, setStudentSubmission] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExamHistory();
  }, [examId]);

  const fetchExamHistory = async () => {
    try {
      setLoading(true);
      
      // Fetch exam details
      const examRes = await axios.get(`/api/exams/${examId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setExam(examRes.data.data);

      // Fetch student submission
      const submissionRes = await axios.get(`/api/exams/${examId}/student-submission`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setStudentSubmission(submissionRes.data.data);
      
    } catch (error) {
      console.error('Error fetching exam history:', error);
      toast.error('حدث خطأ أثناء تحميل تفاصيل الامتحان');
      navigate('/student');
    } finally {
      setLoading(false);
    }
  };

  const getAnswerStatus = (questionIndex) => {
    if (!studentSubmission || !studentSubmission.answers) return 'unanswered';
    
    const answer = studentSubmission.answers[questionIndex];
    if (!answer) return 'unanswered';
    
    const question = exam.questions[questionIndex];
    if (answer.selectedAnswer === question.correctAnswer) {
      return 'correct';
    } else {
      return 'wrong';
    }
  };

  const getAnswerIcon = (status) => {
    switch (status) {
      case 'correct':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'wrong':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getAnswerColor = (status) => {
    switch (status) {
      case 'correct':
        return 'bg-green-50 border-green-200';
      case 'wrong':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!exam || !studentSubmission) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">لم يتم العثور على تفاصيل الامتحان</h2>
        <button
          onClick={() => navigate('/student')}
          className="btn-primary"
        >
          العودة للوحة التحكم
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <button
                onClick={() => navigate('/student')}
                className="flex items-center space-x-2 rtl:space-x-reverse text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>العودة</span>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2 rtl:space-x-reverse">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                  <span>{exam.title}</span>
                </h1>
                <p className="text-gray-600">
                  {exam.examGroup === 0 ? 'اختبارات التأسيس' : `المجموعة ${exam.examGroup}`} • امتحان {exam.order}
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <div className={`text-3xl font-bold ${
                studentSubmission.percentage >= 80 ? 'text-green-600' :
                studentSubmission.percentage >= 60 ? 'text-blue-600' :
                'text-orange-600'
              }`}>
                {studentSubmission.percentage}%
              </div>
              <div className="text-sm text-gray-600">النتيجة النهائية</div>
            </div>
          </div>
        </div>
      </div>


      {/* Exam Details */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">تفاصيل الامتحان</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-3">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">تاريخ الإكمال:</span>
                <span className="text-sm font-medium">
                  {studentSubmission.completedAt ? 
                    new Date(studentSubmission.completedAt).toLocaleDateString('en-GB') : 
                    'غير محدد'
                  }
                </span>
              </div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">وقت الإرسال:</span>
                <span className="text-sm font-medium">
                  {studentSubmission.submittedAt && !isNaN(new Date(studentSubmission.submittedAt).getTime()) ? 
                    new Date(studentSubmission.submittedAt).toLocaleTimeString('ar-SA', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    }) : 
                    'غير محدد'
                  }
                </span>
              </div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">الوقت المستغرق:</span>
                <span className="text-sm font-medium">
                  {studentSubmission.timeSpent ? 
                    `${Math.floor(studentSubmission.timeSpent / 60)}:${(studentSubmission.timeSpent % 60).toString().padStart(2, '0')}` :
                    'غير محدد'
                  }
                </span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <BookOpen className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">إجمالي الأسئلة:</span>
                <span className="text-sm font-medium">{exam.totalQuestions}</span>
              </div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <TrendingUp className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">الدرجة:</span>
                <span className="text-sm font-medium">{studentSubmission.score}/{exam.totalQuestions}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Questions and Answers */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">الأسئلة والإجابات</h3>
        </div>
        <div className="card-body">
          <div className="space-y-6">
            {exam.questions.map((question, index) => {
              const answerStatus = getAnswerStatus(index);
              const studentAnswer = studentSubmission.answers[index]?.selectedAnswer;
              
              return (
                <div
                  key={index}
                  className={`p-6 rounded-lg border-2 ${getAnswerColor(answerStatus)}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                      <div className="flex items-center justify-center w-8 h-8 bg-white rounded-full border-2 border-gray-300">
                        <span className="text-sm font-semibold text-gray-700">{index + 1}</span>
                      </div>
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        {getAnswerIcon(answerStatus)}
                        <span className="text-sm font-medium text-gray-700">
                          {answerStatus === 'correct' ? 'إجابة صحيحة' :
                           answerStatus === 'wrong' ? 'إجابة خاطئة' : 'غير مجاب'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Question Image */}
                  {question.questionImage && (
                    <div className="mb-4">
                      <img
                        src={question.questionImage}
                        alt={`Question ${index + 1}`}
                        className="max-w-full h-auto rounded-lg border bg-gray-50"
                        style={{
                          maxHeight: '400px',
                          objectFit: 'contain'
                        }}
                      />
                    </div>
                  )}

                  {/* Answer Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {['A', 'B', 'C', 'D'].map((option) => {
                      const isCorrect = option === question.correctAnswer;
                      const isSelected = studentAnswer === option;
                      const isWrong = isSelected && !isCorrect;
                      
                      return (
                        <div
                          key={option}
                          className={`p-3 rounded-lg border-2 transition-colors ${
                            isCorrect
                              ? 'bg-green-100 border-green-300 text-green-800'
                              : isWrong
                              ? 'bg-red-100 border-red-300 text-red-800'
                              : isSelected
                              ? 'bg-blue-100 border-blue-300 text-blue-800'
                              : 'bg-gray-50 border-gray-200 text-gray-700'
                          }`}
                        >
                          <div className="flex items-center space-x-2 rtl:space-x-reverse">
                            <span className="font-semibold">{option})</span>
                            <span>{question[`option${option}`]}</span>
                            {isCorrect && <CheckCircle className="h-4 w-4 text-green-600 mr-auto" />}
                            {isWrong && <XCircle className="h-4 w-4 text-red-600 mr-auto" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  {question.explanation && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="text-sm font-semibold text-blue-800 mb-2">التفسير:</h4>
                      <p className="text-sm text-blue-700">{question.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamHistory;
