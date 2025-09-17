import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Eye, EyeOff, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const StudentMistakes = ({ studentId, examId, examTitle, onClose }) => {
  const [mistakes, setMistakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAnswers, setShowAnswers] = useState(false);

  useEffect(() => {
    fetchMistakes();
  }, [studentId, examId]);

  const fetchMistakes = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/exams/${examId}/student-mistakes/${studentId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setMistakes(response.data.data || []);
    } catch (error) {
      console.error('Error fetching mistakes:', error);
      toast.error('حدث خطأ أثناء تحميل الأخطاء');
      setMistakes([]);
    } finally {
      setLoading(false);
    }
  };

  const getAnswerStatus = (question, studentAnswer) => {
    if (!studentAnswer || studentAnswer.trim() === '') {
      return { status: 'unanswered', icon: AlertCircle, color: 'text-yellow-600' };
    } else if (studentAnswer === question.correctAnswer) {
      return { status: 'correct', icon: CheckCircle, color: 'text-green-600' };
    } else {
      return { status: 'wrong', icon: XCircle, color: 'text-red-600' };
    }
  };

  const getAnswerLabel = (answer) => {
    const labels = { 'A': 'أ', 'B': 'ب', 'C': 'ج', 'D': 'د' };
    return labels[answer] || answer;
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
      <div className="bg-white rounded-lg p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">أخطاء الطالب في الامتحان</h2>
            <p className="text-gray-600 mt-1">{examTitle}</p>
          </div>
          <div className="flex items-center space-x-4 space-x-reverse">
            <button
              onClick={() => setShowAnswers(!showAnswers)}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                showAnswers 
                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {showAnswers ? <EyeOff className="w-4 h-4 ml-2" /> : <Eye className="w-4 h-4 ml-2" />}
              {showAnswers ? 'إخفاء الإجابات' : 'إظهار الإجابات'}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Mistakes List */}
        {mistakes.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">لا توجد أخطاء</h3>
            <p className="text-gray-600">الطالب لم يرتكب أي أخطاء في هذا الامتحان</p>
          </div>
        ) : (
          <div className="space-y-6">

            {mistakes.map((mistake, index) => {
              const answerStatus = getAnswerStatus(mistake.question, mistake.studentAnswer);
              const StatusIcon = answerStatus.icon;

              return (
                <div key={index} className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <StatusIcon className={`w-6 h-6 ${answerStatus.color} ml-3`} />
                      <span className="text-lg font-semibold text-gray-900">
                        السؤال {index + 1}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        answerStatus.status === 'correct' 
                          ? 'bg-green-100 text-green-800'
                          : answerStatus.status === 'wrong'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {answerStatus.status === 'correct' ? 'صحيح' : 
                         answerStatus.status === 'wrong' ? 'خطأ' : 'لم يُجِب'}
                      </span>
                    </div>
                  </div>

                  {/* Question Image */}
                  <div className="mb-4">
                    <img
                      src={mistake.question.questionImage}
                      alt={`سؤال ${index + 1}`}
                      className="max-w-full h-auto rounded-lg border border-gray-200"
                      style={{ maxHeight: '400px' }}
                    />
                  </div>

                  {/* Answers */}
                  {showAnswers && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                          <span className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-sm font-bold ml-2">
                            {getAnswerLabel(mistake.studentAnswer || 'لم يُجِب')}
                          </span>
                          إجابة الطالب
                        </h4>
                        <p className="text-gray-600">
                          {mistake.studentAnswer ? `الخيار ${getAnswerLabel(mistake.studentAnswer)}` : 'لم يُجِب على السؤال'}
                        </p>
                      </div>

                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                          <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-bold ml-2">
                            {getAnswerLabel(mistake.question.correctAnswer)}
                          </span>
                          الإجابة الصحيحة
                        </h4>
                        <p className="text-gray-600">
                          الخيار {getAnswerLabel(mistake.question.correctAnswer)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Explanation */}
                  {mistake.question.explanation && showAnswers && (
                    <div className="mt-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h4 className="font-semibold text-blue-900 mb-2">التفسير:</h4>
                      <p className="text-blue-800">{mistake.question.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })}
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

export default StudentMistakes;
