import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

const ExamResults = ({ 
  exam, 
  results, 
  answers, 
  onRetake, 
  onBackToDashboard,
  isPublicExam = false,
  onBackToHome
}) => {
  const { score, percentage, correctAnswers, totalQuestions, wrongAnswers } = results;


  const getGradeColor = (percentage) => {
    if (percentage >= 90) return 'text-green-600 bg-green-100';
    if (percentage >= 80) return 'text-blue-600 bg-blue-100';
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-100';
    if (percentage >= 60) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getGradeText = (percentage) => {
    if (percentage >= 90) return 'ممتاز';
    if (percentage >= 80) return 'جيد جداً';
    if (percentage >= 70) return 'جيد';
    if (percentage >= 60) return 'مقبول';
    return 'ضعيف';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Results Summary */}
      <div className="card">
        <div className="card-header text-center">
          <h2 className="text-2xl font-bold text-gray-900">نتائج الامتحان</h2>
          <p className="text-gray-600 mt-2">{exam.title}</p>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">{score}</div>
              <div className="text-sm text-gray-600">الدرجة</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">{correctAnswers}</div>
              <div className="text-sm text-gray-600">إجابات صحيحة</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-3xl font-bold text-red-600">{wrongAnswers}</div>
              <div className="text-sm text-gray-600">إجابات خاطئة</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-3xl font-bold text-purple-600">{totalQuestions}</div>
              <div className="text-sm text-gray-600">إجمالي الأسئلة</div>
            </div>
          </div>

          <div className="text-center">
            <div className={`inline-flex items-center px-6 py-3 rounded-lg ${getGradeColor(percentage)}`}>
              <span className="text-2xl font-bold">{percentage.toFixed(1)}%</span>
              <span className="mr-3 text-lg font-medium">{getGradeText(percentage)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Results */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">تفاصيل الإجابات</h3>
        </div>
        <div className="card-body">
          <div className="space-y-4">
            {exam.questions.map((question, index) => {
              const answer = answers && answers[index] ? answers[index] : null;
              const isCorrect = answer ? answer.isCorrect : false;
              const isAnswered = answer && answer.selectedAnswer && answer.selectedAnswer.trim() !== '';
              const isNotAnswered = !isAnswered;
              
              return (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-2 ${
                    isCorrect 
                      ? 'bg-green-50 border-green-200' 
                      : isNotAnswered
                      ? 'bg-gray-50 border-gray-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">
                      السؤال {index + 1}
                    </h4>
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      {isCorrect ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : isNotAnswered ? (
                        <XCircle className="h-5 w-5 text-gray-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <span className={`text-sm font-medium ${
                        isCorrect ? 'text-green-700' : isNotAnswered ? 'text-gray-700' : 'text-red-700'
                      }`}>
                        {isCorrect ? 'صحيح' : isNotAnswered ? 'لم تجب عليها' : 'خاطئ'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Question Image */}
                  {question.questionImage && (
                    <div className="mb-4">
                      <div className="relative bg-gray-50 rounded-lg p-4 min-h-[200px] flex items-center justify-center">
                        <img
                          src={question.questionImage}
                          alt={`السؤال ${index + 1}`}
                          className="max-w-full max-h-96 rounded-lg shadow-sm"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                          }}
                        />
                        <div 
                          className="hidden w-full max-w-md mx-auto h-32 bg-gray-100 rounded-lg border flex items-center justify-center text-gray-500"
                        >
                          <div className="text-center">
                            <XCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm">فشل في تحميل الصورة</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">إجابتك:</span>
                      <span className={`mr-2 px-2 py-1 rounded ${
                        isCorrect 
                          ? 'bg-green-200 text-green-800' 
                          : isNotAnswered
                          ? 'bg-gray-200 text-gray-800'
                          : 'bg-red-200 text-red-800'
                      }`}>
                        {isNotAnswered ? 'لم تجب' : (answer ? answer.selectedAnswer : 'لم تجب')}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">الإجابة الصحيحة:</span>
                      <span className="mr-2 px-2 py-1 rounded bg-green-200 text-green-800">
                        {question.correctAnswer}
                      </span>
                    </div>
                    {question.explanation && (
                      <div className="md:col-span-3">
                        <span className="font-medium text-gray-600">التوضيح:</span>
                        <p className="mt-1 text-gray-700">{question.explanation}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center">
        {isPublicExam ? (
          <button
            onClick={onBackToHome}
            className="btn-primary flex items-center space-x-2 rtl:space-x-reverse"
          >
            <span>العودة للصفحة الرئيسية</span>
          </button>
        ) : (
          <button
            onClick={onBackToDashboard}
            className="btn-secondary flex items-center space-x-2 rtl:space-x-reverse"
          >
            <span>العودة للوحة التحكم</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default ExamResults;
