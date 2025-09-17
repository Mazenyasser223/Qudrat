import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import ExamTimer from '../components/Exam/ExamTimer';
import QuestionCard from '../components/Exam/QuestionCard';
import ExamResults from '../components/Exam/ExamResults';
import { ArrowLeft, CheckCircle, Home } from 'lucide-react';

const PublicExam = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  
  const [exam, setExam] = useState(null);
  const [shuffledQuestions, setShuffledQuestions] = useState([]);
  const [questionOrder, setQuestionOrder] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState(null);
  const [examForResults, setExamForResults] = useState(null);
  const [timeUp, setTimeUp] = useState(false);
  const [startTime, setStartTime] = useState(null);

  useEffect(() => {
    fetchExam();
  }, [examId]);

  // Function to shuffle array using Fisher-Yates algorithm
  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const fetchExam = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/exams/public/${examId}`);
      const examData = res.data.data;

      setExam(examData);
      
      // Shuffle questions for free exams
      const shuffled = shuffleArray(examData.questions);
      setShuffledQuestions(shuffled);
      setQuestionOrder(shuffled.map((_, index) => index));
      
      // Set start time
      setStartTime(Date.now());
    } catch (error) {
      console.error('Error fetching exam:', error);
      toast.error('حدث خطأ أثناء تحميل الامتحان');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionIndex, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  const handleNext = () => {
    if (currentQuestion < shuffledQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = async () => {
    if (window.confirm('هل أنت متأكد من إرسال الإجابات؟')) {
      try {
        setSubmitting(true);
        
        // Calculate time spent
        const timeSpent = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
        
        // Calculate results
        let correctAnswers = 0;
        let wrongAnswers = 0;
        let unanswered = 0;
        
        const detailedAnswers = shuffledQuestions.map((question, index) => {
          const userAnswer = answers[index];
          const isCorrect = userAnswer === question.correctAnswer;
          
          if (!userAnswer) {
            unanswered++;
          } else if (isCorrect) {
            correctAnswers++;
          } else {
            wrongAnswers++;
          }
          
          return {
            questionId: question._id,
            selectedAnswer: userAnswer,
            correctAnswer: question.correctAnswer,
            isCorrect: isCorrect
          };
        });
        
        const totalQuestions = shuffledQuestions.length;
        const score = correctAnswers;
        const percentage = Math.round((correctAnswers / totalQuestions) * 100);
        
        const examResults = {
          examId: exam._id,
          examTitle: exam.title,
          score: score,
          totalQuestions: totalQuestions,
          correctAnswers: correctAnswers,
          wrongAnswers: wrongAnswers,
          unanswered: unanswered,
          percentage: percentage,
          timeSpent: timeSpent,
          answers: detailedAnswers,
          submittedAt: new Date().toISOString(),
          isPublicExam: true
        };

        // Create exam object with shuffled questions for results display
        const examForResults = {
          ...exam,
          questions: shuffledQuestions
        };
        
        setResults(examResults);
        setExamForResults(examForResults);
        setShowResults(true);
        
        toast.success('تم إرسال الإجابات بنجاح!');
      } catch (error) {
        console.error('Error submitting exam:', error);
        toast.error('حدث خطأ أثناء إرسال الإجابات');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleTimeUp = () => {
    setTimeUp(true);
    handleSubmit();
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p className="text-gray-600">جاري تحميل الامتحان...</p>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">امتحان غير موجود</h2>
          <button
            onClick={handleBackToHome}
            className="btn-primary"
          >
            العودة للصفحة الرئيسية
          </button>
        </div>
      </div>
    );
  }

  if (showResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100">
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-6">
            <button
              onClick={handleBackToHome}
              className="flex items-center space-x-2 rtl:space-x-reverse text-gray-600 hover:text-gray-800 transition-colors mb-4"
            >
              <Home className="h-4 w-4" />
              <span>العودة للصفحة الرئيسية</span>
            </button>
          </div>
          
          <ExamResults
            results={results}
            exam={examForResults}
            answers={results.answers}
            onBackToHome={handleBackToHome}
            isPublicExam={true}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <button
                onClick={handleBackToHome}
                className="flex items-center space-x-2 rtl:space-x-reverse text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>العودة</span>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{exam.title}</h1>
                <p className="text-gray-600">
                  {exam.examGroup === 0 ? 'اختبار تأسيسي مجاني' : `امتحان مجاني - المجموعة ${exam.examGroup}`}
                </p>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-1">الوقت المتبقي</div>
              <ExamTimer
                timeLimit={exam.timeLimit}
                onTimeUp={handleTimeUp}
                isActive={!timeUp && !showResults}
              />
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              السؤال {currentQuestion + 1} من {shuffledQuestions.length}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(((currentQuestion + 1) / shuffledQuestions.length) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestion + 1) / shuffledQuestions.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Question Card */}
        {shuffledQuestions.length > 0 && (
          <QuestionCard
            question={shuffledQuestions[currentQuestion]}
            questionNumber={currentQuestion + 1}
            totalQuestions={shuffledQuestions.length}
            selectedAnswer={answers[currentQuestion]}
            onAnswerSelect={(answer) => handleAnswerSelect(currentQuestion, answer)}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onSubmit={handleSubmit}
            isLastQuestion={currentQuestion === shuffledQuestions.length - 1}
            isFirstQuestion={currentQuestion === 0}
            submitting={submitting}
          />
        )}

      </div>
    </div>
  );
};

export default PublicExam;
