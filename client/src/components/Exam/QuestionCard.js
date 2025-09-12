import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle } from 'lucide-react';

const QuestionCard = ({ 
  question, 
  questionNumber, 
  totalQuestions, 
  selectedAnswer, 
  onAnswerSelect, 
  onPrevious, 
  onNext,
  isAnswered,
  showCorrectAnswer = false 
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const options = ['A', 'B', 'C', 'D'];

  const getOptionColor = (option) => {
    if (!showCorrectAnswer) {
      return selectedAnswer === option 
        ? 'bg-primary-100 border-primary-500 text-primary-700' 
        : 'bg-white border-gray-300 hover:border-primary-300';
    }

    // Show correct/incorrect answers
    if (option === question.correctAnswer) {
      return 'bg-green-100 border-green-500 text-green-700';
    }
    if (selectedAnswer === option && option !== question.correctAnswer) {
      return 'bg-red-100 border-red-500 text-red-700';
    }
    return 'bg-gray-50 border-gray-300 text-gray-500';
  };

  const getOptionIcon = (option) => {
    if (!showCorrectAnswer) return null;

    if (option === question.correctAnswer) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    if (selectedAnswer === option && option !== question.correctAnswer) {
      return <XCircle className="h-4 w-4 text-red-600" />;
    }
    return null;
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            السؤال {questionNumber} من {totalQuestions}
          </h3>
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            {isAnswered && (
              <span className="text-sm text-green-600 bg-green-100 px-2 py-1 rounded-full">
                تم الإجابة
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="card-body">
        {/* Question Image */}
        <div className="mb-6">
          <div className="relative bg-gray-50 rounded-lg p-4 min-h-[200px] flex items-center justify-center">
            {!imageLoaded && !imageError && (
              <div className="text-center">
                <div className="spinner mx-auto mb-2"></div>
                <p className="text-gray-500">جاري تحميل الصورة...</p>
              </div>
            )}
            
            {imageError ? (
              <div className="text-center text-gray-500">
                <XCircle className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>فشل في تحميل الصورة</p>
              </div>
            ) : (
              <img
                src={question.questionImage}
                alt={`سؤال ${questionNumber}`}
                className={`max-w-full max-h-96 rounded-lg shadow-sm ${
                  imageLoaded ? 'block' : 'hidden'
                }`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
            )}
          </div>
        </div>

        {/* Answer Options */}
        <div className="space-y-3">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => onAnswerSelect(option)}
              disabled={showCorrectAnswer}
              className={`w-full p-4 text-right border-2 rounded-lg transition-all duration-200 flex items-center justify-between ${
                getOptionColor(option)
              } ${showCorrectAnswer ? 'cursor-default' : 'cursor-pointer hover:shadow-md'}`}
            >
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                {getOptionIcon(option)}
                <span className="font-medium">الخيار {option}</span>
              </div>
              <div className="w-6 h-6 border-2 border-current rounded-full flex items-center justify-center">
                {selectedAnswer === option && (
                  <div className="w-3 h-3 bg-current rounded-full"></div>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={onPrevious}
            disabled={questionNumber === 1}
            className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
            <span>السابق</span>
          </button>

          <div className="text-sm text-gray-500">
            {questionNumber} / {totalQuestions}
          </div>

          <button
            onClick={onNext}
            disabled={questionNumber === totalQuestions}
            className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span>التالي</span>
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuestionCard;
