import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import ExamTimer from '../../components/Exam/ExamTimer';
import QuestionCard from '../../components/Exam/QuestionCard';
import ExamResults from '../../components/Exam/ExamResults';
import { ArrowLeft, CheckCircle } from 'lucide-react';

const TakeExam = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  
  const [exam, setExam] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState(null);
  const [timeUp, setTimeUp] = useState(false);

  useEffect(() => {
    fetchExam();
  }, [examId]);

  const fetchExam = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/exams/${examId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setExam(res.data.data);
      
      // Initialize answers object
      const initialAnswers = {};
      res.data.data.questions.forEach((_, index) => {
        initialAnswers[index] = null;
      });
      setAnswers(initialAnswers);
    } catch (error) {
      console.error('Error fetching exam:', error);
      toast.error('حدث خطأ أثناء تحميل الامتحان');
      navigate('/student');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (answer) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion]: answer
    }));
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleNext = () => {
    if (currentQuestion < exam.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handleSubmit = async () => {
    if (window.confirm('هل أنت متأكد من تسليم الامتحان؟')) {
      try {
        setSubmitting(true);
        
        // Prepare answers array
        const answersArray = exam.questions.map((_, index) => ({
          selectedAnswer: answers[index] || null
        }));

        const res = await axios.post(`/api/exams/${examId}/submit`, {
          answers: answersArray
        }, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        setResults(res.data.data);
        setShowResults(true);
        toast.success('تم تسليم الامتحان بنجاح');
      } catch (error) {
        console.error('Error submitting exam:', error);
        toast.error(error.response?.data?.message || 'حدث خطأ أثناء تسليم الامتحان');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleTimeUp = () => {
    setTimeUp(true);
    toast.error('انتهى الوقت المحدد للامتحان');
    handleSubmit();
  };

  const handleTimeWarning = () => {
    toast.error('تبقى 5 دقائق فقط على انتهاء الامتحان!');
  };

  const getAnsweredCount = () => {
    return Object.values(answers).filter(answer => answer !== null).length;
  };

  const getUnansweredQuestions = () => {
    return Object.entries(answers)
      .filter(([_, answer]) => answer === null)
      .map(([index, _]) => parseInt(index) + 1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">الامتحان غير موجود</h2>
        <button
          onClick={() => navigate('/student')}
          className="btn-primary"
        >
          العودة للوحة التحكم
        </button>
      </div>
    );
  }

  if (showResults && results) {
    return (
      <ExamResults
        exam={exam}
        results={results}
        answers={exam.questions.map((_, index) => ({
          selectedAnswer: answers[index],
          isCorrect: answers[index] === exam.questions[index].correctAnswer
        }))}
        onBackToDashboard={() => navigate('/student')}
      />
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
                <h1 className="text-xl font-bold text-gray-900">{exam.title}</h1>
                <p className="text-gray-600">المجموعة {exam.examGroup} - امتحان {exam.order}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <ExamTimer
                timeLimit={exam.timeLimit}
                onTimeUp={handleTimeUp}
                onWarning={handleTimeWarning}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Question Navigation */}
        <div className="lg:col-span-1">
          <div className="card sticky top-6">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">الأسئلة</h3>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-4 gap-2 mb-4">
                {exam.questions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentQuestion(index)}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                      currentQuestion === index
                        ? 'bg-primary-600 text-white'
                        : answers[index]
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">تم الإجابة:</span>
                  <span className="font-medium text-green-600">
                    {getAnsweredCount()} / {exam.questions.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">غير مجاب:</span>
                  <span className="font-medium text-red-600">
                    {exam.questions.length - getAnsweredCount()}
                  </span>
                </div>
              </div>

              {getUnansweredQuestions().length > 0 && (
                <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-800 mb-2">أسئلة غير مجابة:</p>
                  <p className="text-xs text-yellow-700">
                    {getUnansweredQuestions().join(', ')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Question Content */}
        <div className="lg:col-span-3">
          <QuestionCard
            question={exam.questions[currentQuestion]}
            questionNumber={currentQuestion + 1}
            totalQuestions={exam.questions.length}
            selectedAnswer={answers[currentQuestion]}
            onAnswerSelect={handleAnswerSelect}
            onPrevious={handlePrevious}
            onNext={handleNext}
            isAnswered={answers[currentQuestion] !== null}
          />

          {/* Submit Button */}
          <div className="mt-6 flex justify-center">
            <button
              onClick={handleSubmit}
              disabled={submitting || timeUp}
              className="btn-primary flex items-center space-x-2 rtl:space-x-reverse px-8 py-3 text-lg"
            >
              {submitting ? (
                <>
                  <div className="spinner"></div>
                  <span>جاري التسليم...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  <span>تسليم الامتحان</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TakeExam;
