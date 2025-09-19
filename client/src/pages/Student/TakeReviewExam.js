import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import ExamTimer from '../../components/Exam/ExamTimer';
import QuestionCard from '../../components/Exam/QuestionCard';
import { ArrowLeft, CheckCircle, RotateCcw } from 'lucide-react';

const TakeReviewExam = () => {
  const { reviewExamId } = useParams();
  const navigate = useNavigate();
  
  const [reviewExam, setReviewExam] = useState(null);
  const [shuffledQuestions, setShuffledQuestions] = useState([]);
  const [questionOrder, setQuestionOrder] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState(null);
  const [timeUp, setTimeUp] = useState(false);

  useEffect(() => {
    fetchReviewExam();
  }, [reviewExamId]);

  // Function to shuffle array using Fisher-Yates algorithm
  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const fetchReviewExam = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/exams/review/${reviewExamId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const reviewExamData = res.data.data;
      setReviewExam(reviewExamData);
      
      // Shuffle questions for this review exam session
      const shuffled = shuffleArray(reviewExamData.questions);
      setShuffledQuestions(shuffled);
      
      // Create question order mapping (original index -> shuffled index)
      const order = reviewExamData.questions.map((_, originalIndex) => {
        return shuffled.findIndex(q => q === reviewExamData.questions[originalIndex]);
      });
      setQuestionOrder(order);
      
      // Initialize answers object
      const initialAnswers = {};
      shuffled.forEach((_, index) => {
        initialAnswers[index] = null;
      });
      setAnswers(initialAnswers);
    } catch (error) {
      console.error('Error fetching review exam:', error);
      toast.error('حدث خطأ أثناء تحميل امتحان المراجعة');
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
    if (currentQuestion < shuffledQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handleSubmit = async () => {
    if (window.confirm('هل أنت متأكد من تسليم امتحان المراجعة؟')) {
      try {
        setSubmitting(true);
        
        // Map shuffled answers back to original question order
        const answersArray = reviewExam.questions.map((_, originalIndex) => {
          const shuffledIndex = questionOrder[originalIndex];
          return {
            selectedAnswer: answers[shuffledIndex] || null
          };
        });

        const res = await axios.post(`/api/exams/review/${reviewExamId}/submit`, {
          answers: answersArray
        }, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        setResults(res.data.data);
        setShowResults(true);
        toast.success('تم تسليم امتحان المراجعة بنجاح');
      } catch (error) {
        console.error('Error submitting review exam:', error);
        toast.error(error.response?.data?.message || 'حدث خطأ أثناء تسليم امتحان المراجعة');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleTimeUp = () => {
    setTimeUp(true);
    toast.error('انتهى الوقت المحدد لامتحان المراجعة');
    handleSubmit();
  };

  const handleTimeWarning = () => {
    toast.error('تبقى 5 دقائق فقط على انتهاء امتحان المراجعة!');
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

  if (!reviewExam) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">امتحان المراجعة غير موجود</h2>
        <button
          onClick={() => navigate('/student')}
          className="btn-primary"
        >
          العودة للوحة التحكم
        </button>
      </div>
    );
  }

  if (!reviewExam.questions || reviewExam.questions.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">لا توجد أسئلة في امتحان المراجعة</h2>
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
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Results Summary */}
        <div className="card">
          <div className="card-header text-center">
            <h2 className="text-2xl font-bold text-gray-900">نتائج امتحان المراجعة</h2>
            <p className="text-gray-600 mt-2">{reviewExam.title}</p>
            <div className="mt-4 flex items-center justify-center space-x-4 rtl:space-x-reverse">
              {results.isBestScore && (
                <span className="text-sm text-green-600 bg-green-100 px-2 py-1 rounded-full">
                  أفضل نتيجة!
                </span>
              )}
            </div>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">{results.score}</div>
                <div className="text-sm text-gray-600">الدرجة</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600">{results.correctAnswers}</div>
                <div className="text-sm text-gray-600">إجابات صحيحة</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-3xl font-bold text-red-600">{results.wrongAnswers}</div>
                <div className="text-sm text-gray-600">إجابات خاطئة</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-3xl font-bold text-purple-600">{results.totalQuestions}</div>
                <div className="text-sm text-gray-600">إجمالي الأسئلة</div>
              </div>
            </div>

            <div className="text-center">
              <div className={`inline-flex items-center px-6 py-3 rounded-lg ${
                results.percentage >= 80 ? 'text-green-600 bg-green-100' :
                results.percentage >= 60 ? 'text-blue-600 bg-blue-100' :
                'text-orange-600 bg-orange-100'
              }`}>
                <span className="text-2xl font-bold">{results.percentage.toFixed(2)}%</span>
                <span className="mr-3 text-lg font-medium">
                  {results.percentage >= 80 ? 'ممتاز' :
                   results.percentage >= 60 ? 'جيد' : 'يحتاج تحسين'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-center space-x-4 rtl:space-x-reverse">
          <button
            onClick={() => {
              setShowResults(false);
              setResults(null);
              setCurrentQuestion(0);
              setAnswers({});
              
              // Reshuffle questions for new attempt
              const shuffled = shuffleArray(reviewExam.questions);
              setShuffledQuestions(shuffled);
              
              // Create new question order mapping
              const order = reviewExam.questions.map((_, originalIndex) => {
                return shuffled.findIndex(q => q === reviewExam.questions[originalIndex]);
              });
              setQuestionOrder(order);
              
              // Reset answers
              const initialAnswers = {};
              shuffled.forEach((_, index) => {
                initialAnswers[index] = null;
              });
              setAnswers(initialAnswers);
            }}
            className="btn-primary flex items-center space-x-2 rtl:space-x-reverse"
          >
            <RotateCcw className="h-4 w-4" />
            <span>محاولة أخرى</span>
          </button>
          
          <button
            onClick={() => navigate('/student')}
            className="btn-secondary flex items-center space-x-2 rtl:space-x-reverse"
          >
            <span>العودة للوحة التحكم</span>
          </button>
        </div>
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
                <h1 className="text-xl font-bold text-gray-900 flex items-center space-x-2 rtl:space-x-reverse">
                  <RotateCcw className="h-5 w-5 text-orange-600" />
                  <span>{reviewExam.title}</span>
                </h1>
                <p className="text-gray-600">امتحان مراجعة - يمكن حله عدة مرات</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <ExamTimer
                timeLimit={reviewExam.questions.length}
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
                {shuffledQuestions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentQuestion(index)}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                      currentQuestion === index
                        ? 'bg-orange-600 text-white'
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
                    {getAnsweredCount()} / {shuffledQuestions.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">غير مجاب:</span>
                  <span className="font-medium text-red-600">
                    {shuffledQuestions.length - getAnsweredCount()}
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
          {shuffledQuestions[currentQuestion] ? (
            <QuestionCard
              question={shuffledQuestions[currentQuestion]}
              questionNumber={currentQuestion + 1}
              totalQuestions={shuffledQuestions.length}
              selectedAnswer={answers[currentQuestion]}
              onAnswerSelect={handleAnswerSelect}
              onPrevious={handlePrevious}
              onNext={handleNext}
              isAnswered={answers[currentQuestion] !== null}
            />
          ) : (
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">خطأ في تحميل السؤال</h2>
              <button
                onClick={() => navigate('/student')}
                className="btn-primary"
              >
                العودة للوحة التحكم
              </button>
            </div>
          )}

          {/* Submit Button - Only show on last question */}
          {currentQuestion === shuffledQuestions.length - 1 && (
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
                    <span>تسليم امتحان المراجعة</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TakeReviewExam;
