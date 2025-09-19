import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ArrowLeft, Edit, BookOpen, Clock, Eye } from 'lucide-react';

const ViewExam = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState(null);

  useEffect(() => {
    fetchExam();
  }, [examId]);

  const fetchExam = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/exams/${examId}`);
      setExam(res.data.data);
    } catch (error) {
      console.error('Error fetching exam:', error);
      toast.error('حدث خطأ أثناء تحميل الامتحان');
      navigate('/teacher/exams');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigate(`/teacher/exams/edit/${examId}`);
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
          onClick={() => navigate('/teacher/exams')}
          className="btn-primary"
        >
          العودة لإدارة الامتحانات
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
                onClick={() => navigate('/teacher/exams')}
                className="flex items-center space-x-2 rtl:space-x-reverse text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>العودة</span>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{exam.title}</h1>
                <p className="text-gray-600">عرض تفاصيل الامتحان والأسئلة</p>
              </div>
            </div>
            <button
              onClick={handleEdit}
              className="btn-primary flex items-center space-x-2 rtl:space-x-reverse"
            >
              <Edit className="h-4 w-4" />
              <span>تعديل الامتحان</span>
            </button>
          </div>
        </div>
      </div>

      {/* Exam Info */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="card-body text-center">
            <div className="flex items-center justify-center mb-2">
              <BookOpen className="h-8 w-8 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-600">{exam.totalQuestions}</div>
            <div className="text-sm text-gray-600">عدد الأسئلة</div>
          </div>
        </div>

        <div className="card">
          <div className="card-body text-center">
            <div className="flex items-center justify-center mb-2">
              <Clock className="h-8 w-8 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-600">{exam.timeLimit}</div>
            <div className="text-sm text-gray-600">الوقت المحدد (دقيقة)</div>
          </div>
        </div>

      </div>

      {/* Exam Details */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">تفاصيل الامتحان</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">معلومات أساسية</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">المجموعة:</span>
                  <span className="font-medium">المجموعة {exam.examGroup}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">الترتيب:</span>
                  <span className="font-medium">{exam.order}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">الحالة:</span>
                  <span className={`font-medium ${exam.isActive ? 'text-green-600' : 'text-red-600'}`}>
                    {exam.isActive ? 'نشط' : 'غير نشط'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">تاريخ الإنشاء:</span>
                  <span className="font-medium">
                    {new Date(exam.createdAt).toLocaleDateString('en-GB')}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {exam.description && (
            <div className="mt-6">
              <h4 className="font-medium text-gray-900 mb-2">وصف الامتحان</h4>
              <p className="text-gray-600 text-sm">{exam.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Questions */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">أسئلة الامتحان</h3>
          <p className="text-sm text-gray-600 mt-1">
            إجمالي الأسئلة: {exam.questions.filter(q => q && q.correctAnswer).length}
          </p>
        </div>
        <div className="card-body">
          <div className="space-y-6">
            {exam.questions.filter(question => question && question.correctAnswer).map((question, index) => (
              <div key={`question-${index}`} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium text-gray-900">
                    السؤال {index + 1}
                  </h4>
                  <span className="text-sm text-gray-500">
                    الإجابة الصحيحة: {question.correctAnswer}
                  </span>
                </div>

                {/* Question Image */}
                {question.questionImage && (
                  <div className="mb-6">
                    <div className="relative">
                      <img
                        src={question.questionImage}
                        alt={`السؤال ${index + 1}`}
                        className="w-full h-auto rounded-lg border shadow-lg"
                        style={{
                          maxHeight: '80vh',
                          minHeight: '400px',
                          objectFit: 'contain'
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'block';
                        }}
                      />
                      <div 
                        className="hidden w-full h-64 bg-gray-100 rounded-lg border flex items-center justify-center text-gray-500"
                      >
                        <div className="text-center">
                          <Eye className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm">فشل في تحميل الصورة</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Options */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {['A', 'B', 'C', 'D'].map(option => (
                    <div
                      key={option}
                      className={`p-3 rounded-lg border text-center ${
                        option === question.correctAnswer
                          ? 'bg-green-50 border-green-200 text-green-800'
                          : 'bg-gray-50 border-gray-200 text-gray-600'
                      }`}
                    >
                      <span className="font-medium">الخيار {option}</span>
                      {option === question.correctAnswer && (
                        <span className="block text-xs mt-1">✓ الإجابة الصحيحة</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Explanation */}
                {question.explanation && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <h5 className="font-medium text-blue-900 mb-1">توضيح الإجابة:</h5>
                    <p className="text-blue-800 text-sm">{question.explanation}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewExam;
