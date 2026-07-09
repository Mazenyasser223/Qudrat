import React, { useState, useEffect, useCallback } from 'react';

import { useParams, useNavigate } from 'react-router-dom';

import axios from 'axios';

import toast from 'react-hot-toast';

import ExamTimer from '../../components/Exam/ExamTimer';

import QuestionCard from '../../components/Exam/QuestionCard';

import ExamResults from '../../components/Exam/ExamResults';

import { ArrowLeft, CheckCircle } from 'lucide-react';

import { alignAnswersToQuestions } from '../../utils/examAnswerMatching';

import { useAutoSubmitOnLeave } from '../../hooks/useAutoSubmitOnLeave';

import { useExamGroupSettings } from '../../context/ExamGroupSettingsContext';

import {

  loadExamSession,

  saveExamSession,

  clearExamSession,

  restoreShuffledQuestions,

  buildQuestionOrder

} from '../../utils/examSessionStorage';



const TakeExam = () => {

  const { examId } = useParams();

  const navigate = useNavigate();

  const { getGroupName } = useExamGroupSettings();

  

  const [exam, setExam] = useState(null);

  const [shuffledQuestions, setShuffledQuestions] = useState([]);

  const [questionOrder, setQuestionOrder] = useState([]);

  const [currentQuestion, setCurrentQuestion] = useState(0);

  const [answers, setAnswers] = useState({});

  const [loading, setLoading] = useState(true);

  const [submitting, setSubmitting] = useState(false);

  const [showResults, setShowResults] = useState(false);

  const [results, setResults] = useState(null);

  const [resultsAnswers, setResultsAnswers] = useState(null);

  const [resultsExam, setResultsExam] = useState(null);

  const [timeUp, setTimeUp] = useState(false);

  const [timeSpent, setTimeSpent] = useState(0);

  const [markedForReview, setMarkedForReview] = useState(new Set());



  const shuffleArray = (array) => {

    const shuffled = [...array];

    for (let i = shuffled.length - 1; i > 0; i--) {

      const j = Math.floor(Math.random() * (i + 1));

      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];

    }

    return shuffled;

  };



  const persistSession = useCallback((

    shuffled,

    order,

    answersState,

    current,

    marked,

    spent

  ) => {

    if (!examId || !shuffled.length) return;

    saveExamSession(examId, {

      shuffledQuestionIds: shuffled.map((q) => q._id),

      answers: answersState,

      currentQuestion: current,

      markedForReview: [...marked],

      timeSpent: spent

    });

  }, [examId]);



  useEffect(() => {

    fetchExam();

    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, [examId]);



  const fetchExam = async () => {

    try {

      setLoading(true);

      const res = await axios.post(`/api/exams/${examId}/start`, {}, {

        headers: {

          'Authorization': `Bearer ${localStorage.getItem('token')}`

        }

      });

      const examData = res.data.data;

      setExam(examData);



      const saved = loadExamSession(examId);

      const restored = saved

        ? restoreShuffledQuestions(examData.questions, saved.shuffledQuestionIds)

        : null;



      const shuffled = restored || shuffleArray(examData.questions);

      const order = buildQuestionOrder(examData.questions, shuffled);



      setShuffledQuestions(shuffled);

      setQuestionOrder(order);



      const initialAnswers = {};

      shuffled.forEach((_, index) => {

        initialAnswers[index] = saved?.answers?.[index] ?? null;

      });

      setAnswers(initialAnswers);

      setCurrentQuestion(saved?.currentQuestion ?? 0);

      setMarkedForReview(new Set(saved?.markedForReview ?? []));

      setTimeSpent(saved?.timeSpent ?? 0);



      if (!restored) {

        persistSession(shuffled, order, initialAnswers, 0, new Set(), 0);

      }

    } catch (error) {

      console.error('Error fetching exam:', error);

      const message = error.response?.data?.message;

      toast.error(message || 'حدث خطأ أثناء تحميل الامتحان');

      navigate('/student');

    } finally {

      setLoading(false);

    }

  };



  const handleAnswerSelect = (answer) => {

    setAnswers((prev) => {

      const next = { ...prev, [currentQuestion]: answer };

      persistSession(shuffledQuestions, questionOrder, next, currentQuestion, markedForReview, timeSpent);

      return next;

    });

  };



  const handlePrevious = () => {

    if (currentQuestion > 0) {

      const next = currentQuestion - 1;

      setCurrentQuestion(next);

      persistSession(shuffledQuestions, questionOrder, answers, next, markedForReview, timeSpent);

    }

  };



  const handleNext = () => {

    if (currentQuestion < shuffledQuestions.length - 1) {

      const next = currentQuestion + 1;

      setCurrentQuestion(next);

      persistSession(shuffledQuestions, questionOrder, answers, next, markedForReview, timeSpent);

    }

  };



  const handleToggleReview = () => {

    setMarkedForReview((prev) => {

      const newSet = new Set(prev);

      if (newSet.has(currentQuestion)) {

        newSet.delete(currentQuestion);

      } else {

        newSet.add(currentQuestion);

      }

      persistSession(shuffledQuestions, questionOrder, answers, currentQuestion, newSet, timeSpent);

      return newSet;

    });

  };



  const buildAnswersPayload = useCallback(() => {

    if (!exam?.questions?.length) {

      return [];

    }

    return exam.questions.map((question, originalIndex) => {

      const shuffledIndex = questionOrder[originalIndex];

      return {

        questionId: question._id,

        selectedAnswer: answers[shuffledIndex] ?? null

      };

    });

  }, [exam, questionOrder, answers]);



  const applySubmissionResults = (submission, examForDisplay) => {

    setResults({

      score: submission.score,

      percentage: submission.percentage,

      correctAnswers: submission.correctAnswers,

      totalQuestions: submission.totalQuestions,

      wrongAnswers: submission.wrongAnswers

    });

    const examQuestions = examForDisplay?.questions || exam?.questions;

    setResultsExam(examForDisplay || exam);

    setResultsAnswers(alignAnswersToQuestions(examQuestions, submission.answers));

    setShowResults(true);

  };



  const fetchAndShowResults = async () => {

    try {

      const res = await axios.get(`/api/exams/${examId}/student-submission`, {

        headers: {

          'Authorization': `Bearer ${localStorage.getItem('token')}`

        }

      });

      applySubmissionResults(res.data.data, res.data.data.exam);

      clearExamSession(examId);

    } catch (fetchError) {

      console.error('Error fetching submission:', fetchError);

      toast.error('تم تسليم الامتحان لكن تعذر تحميل النتائج. يمكنك مراجعتها من لوحة التحكم.');

      navigate('/student');

    } finally {

      setSubmitting(false);

    }

  };



  const handleSubmit = async ({ skipConfirm = false, reason = null } = {}) => {

    if (submitting || showResults) {

      return;

    }



    if (!skipConfirm) {

      const confirmSubmit = window.confirm('هل أنت متأكد من تسليم الامتحان؟');

      if (!confirmSubmit) {

        return;

      }

    }



    try {

      setSubmitting(true);



      const answersArray = buildAnswersPayload();



      const res = await axios.post(`/api/exams/${examId}/submit`, {

        answers: answersArray,

        timeSpent: timeSpent,

        submittedAt: new Date().toISOString()

      }, {

        headers: {

          'Authorization': `Bearer ${localStorage.getItem('token')}`

        },

        timeout: 60000

      });



      clearExamSession(examId);



      const data = res.data?.data;
      if (data && typeof data.score === 'number') {
        if (data.exam) {
          setResultsExam(data.exam);
        }
        setResults({
          score: data.score,
          percentage: data.percentage,
          correctAnswers: data.correctAnswers,
          totalQuestions: data.totalQuestions,
          wrongAnswers: data.wrongAnswers
        });
        if (data.answers) {
          const examQuestions = data.exam?.questions || exam.questions;
          setResultsAnswers(alignAnswersToQuestions(examQuestions, data.answers));
          setShowResults(true);
        } else {
          await fetchAndShowResults();
          return;
        }
        toast.success(
          reason === 'leave'
            ? 'تم تسليم الامتحان تلقائيًا عند مغادرة الصفحة'
            : skipConfirm
              ? 'تم تسليم الامتحان تلقائيًا لانتهاء الوقت'
              : 'تم تسليم الامتحان بنجاح'
        );
      } else {
        await fetchAndShowResults();
      }

    } catch (error) {

      const isAlreadyCompleted = error.response?.status === 400 &&

        (error.response?.data?.message?.includes('already completed') ||

         error.response?.data?.message?.includes('مكتمل'));

      if (isAlreadyCompleted) {

        toast.success('تم تسليم هذا الامتحان مسبقًا. عرض النتائج...');

        await fetchAndShowResults();

        return;

      }

      console.error('Error submitting exam:', error);

      toast.error(error.response?.data?.message || 'حدث خطأ أثناء تسليم الامتحان');

    } finally {

      setSubmitting(false);

    }

  };



  const getSubmitRequest = useCallback(() => ({

    url: `/api/exams/${examId}/submit`,

    token: localStorage.getItem('token'),

    body: {

      answers: buildAnswersPayload(),

      timeSpent: timeSpent,

      submittedAt: new Date().toISOString()

    }

  }), [examId, buildAnswersPayload, timeSpent]);



  const examInProgress = !loading && !!exam && !showResults && !submitting;



  useAutoSubmitOnLeave({

    enabled: examInProgress,

    getSubmitRequest

  });



  const handleTimeUp = () => {

    setTimeUp(true);

    toast.error('انتهى الوقت المحدد للامتحان، سيتم تسليم إجاباتك تلقائيًا');

    handleSubmit({ skipConfirm: true });

  };



  const handleTimeWarning = () => {

    toast.error('تبقى 5 دقائق فقط على انتهاء الامتحان!');

  };



  const handleTimeUpdate = (spent) => {

    setTimeSpent(spent);

    persistSession(shuffledQuestions, questionOrder, answers, currentQuestion, markedForReview, spent);

  };



  const handleBack = () => {

    const hasAnswers = Object.values(answers).some((a) => a !== null);

    if (hasAnswers) {

      const leave = window.confirm(

        'إجاباتك محفوظة مؤقتًا. يمكنك العودة لاحقًا لإكمال الامتحان. هل تريد المغادرة؟'

      );

      if (!leave) return;

    }

    navigate('/student');

  };



  const getAnsweredCount = () => {

    return Object.values(answers).filter((answer) => answer !== null).length;

  };



  const getUnansweredQuestions = () => {

    return Object.entries(answers)

      .filter(([_, answer]) => answer === null)

      .map(([index]) => parseInt(index, 10) + 1);

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

    const displayExam = resultsExam || exam;

    const answersForResults =

      resultsAnswers != null

        ? resultsAnswers

        : displayExam.questions.map((question, originalIndex) => {

            const shuffledIndex = questionOrder[originalIndex];

            const selectedAnswer = answers[shuffledIndex];

            return {

              selectedAnswer,

              isCorrect: selectedAnswer === question.correctAnswer

            };

          });

    return (

      <ExamResults

        exam={displayExam}

        results={results}

        answers={answersForResults}

        onBackToDashboard={() => navigate('/student')}

      />

    );

  }



  return (

    <div className="max-w-6xl mx-auto space-y-6">

      <div className="card">

        <div className="card-body">

          <div className="flex items-center justify-between">

            <div className="flex items-center space-x-4 rtl:space-x-reverse">

              <button

                onClick={handleBack}

                className="flex items-center space-x-2 rtl:space-x-reverse text-gray-600 hover:text-gray-800 transition-colors"

              >

                <ArrowLeft className="h-4 w-4" />

                <span>العودة</span>

              </button>

              <div>

                <h1 className="text-xl font-bold text-gray-900">{exam.title}</h1>

                <p className="text-gray-600">{getGroupName(exam.examGroup)} - امتحان {exam.order}</p>

              </div>

            </div>

          </div>

        </div>

      </div>



      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        <div className="lg:col-span-3">

          <QuestionCard

            question={shuffledQuestions[currentQuestion]}

            questionNumber={currentQuestion + 1}

            totalQuestions={shuffledQuestions.length}

            selectedAnswer={answers[currentQuestion]}

            onAnswerSelect={handleAnswerSelect}

            onPrevious={handlePrevious}

            onNext={handleNext}

            isAnswered={answers[currentQuestion] !== null}

            isMarkedForReview={markedForReview.has(currentQuestion)}

            onToggleReview={handleToggleReview}

          />



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

                    <span>تسليم الامتحان</span>

                  </>

                )}

              </button>

            </div>

          )}

        </div>



        <div className="lg:col-span-1">

          <div className="card sticky top-6">

            <div className="card-header">

              <div className="flex items-center justify-between">

                <h3 className="text-lg font-semibold text-gray-900">الأسئلة</h3>

                <ExamTimer

                  timeLimit={exam.timeLimit}

                  initialTimeSpent={timeSpent}

                  onTimeUp={handleTimeUp}

                  onWarning={handleTimeWarning}

                  onTimeUpdate={handleTimeUpdate}

                />

              </div>

            </div>

            <div className="card-body">

              <div className="grid grid-cols-4 gap-2 mb-4">

                {shuffledQuestions.map((_, index) => {

                  const isMarked = markedForReview.has(index);

                  const isAnswered = answers[index] !== null;

                  

                  let buttonClass = 'bg-gray-100 text-gray-600 hover:bg-gray-200';

                  

                  if (currentQuestion === index) {

                    buttonClass = 'bg-primary-600 text-white';

                  } else if (isMarked) {

                    buttonClass = 'bg-yellow-400 text-yellow-900 hover:bg-yellow-500';

                  } else if (isAnswered) {

                    buttonClass = 'bg-green-100 text-green-700 hover:bg-green-200';

                  }

                  

                  return (

                    <button

                      key={index}

                      onClick={() => {

                        setCurrentQuestion(index);

                        persistSession(shuffledQuestions, questionOrder, answers, index, markedForReview, timeSpent);

                      }}

                      className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${buttonClass}`}

                    >

                      {index + 1}

                    </button>

                  );

                })}

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



              <div className="mt-4">

                <button

                  onClick={handleToggleReview}

                  type="button"

                  className={`w-full px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 shadow-md hover:shadow-lg ${

                    markedForReview.has(currentQuestion)

                      ? 'bg-yellow-500 text-white hover:bg-yellow-600 border-2 border-yellow-600'

                      : 'bg-blue-600 text-white hover:bg-blue-700 border-2 border-blue-700'

                  }`}

                >

                  {markedForReview.has(currentQuestion) ? '✓ تم وضع علامة للمراجعة' : '📌 وضع علامة للمراجعة'}

                </button>

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

      </div>

    </div>

  );

};



export default TakeExam;


