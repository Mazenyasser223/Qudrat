import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Plus, Trash2, Save, ArrowLeft } from 'lucide-react';

const EditExam = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [exam, setExam] = useState(null);
  const [cancelRequest, setCancelRequest] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm({
    defaultValues: {
      title: '',
      description: '',
      examGroup: 1,
      order: 1,
      timeLimit: 60,
      questions: []
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'questions'
  });

  const fetchExam = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/exams/${examId}`);
      const examData = res.data.data;
      setExam(examData);
      
      // Reset form with exam data
      reset({
        title: examData.title,
        description: examData.description || '',
        examGroup: examData.examGroup,
        order: examData.order,
        timeLimit: examData.timeLimit,
        questions: examData.questions.map(q => ({
          questionImage: q.questionImage || '',
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || ''
        }))
      });
    } catch (error) {
      console.error('Error fetching exam:', error);
      toast.error('حدث خطأ أثناء تحميل الامتحان');
      navigate('/teacher/exams');
    } finally {
      setLoading(false);
    }
  }, [examId, navigate, reset]);

  useEffect(() => {
    fetchExam();
  }, [fetchExam]);

  // Cleanup function
  useEffect(() => {
    return () => {
      setCancelRequest(false);
    };
  }, []);

  const onSubmit = async (data) => {
    try {
      setSubmitting(true);
      console.log('=== UPDATING EXAM ===');
      console.log('Exam ID:', examId);
      console.log('Exam data:', data);
      
      // Validate that all questions have correct answers
      const invalidQuestions = data.questions.filter(q => !q.correctAnswer || !['A', 'B', 'C', 'D'].includes(q.correctAnswer));
      if (invalidQuestions.length > 0) {
        toast.error('يرجى تحديد الإجابة الصحيحة لجميع الأسئلة');
        setSubmitting(false);
        return;
      }
      
      // Send exam data as JSON (images are already Base64 in data.questions)
      const examData = {
        title: data.title,
        description: data.description || '',
        examGroup: parseInt(data.examGroup),
        order: parseInt(data.order),
        timeLimit: parseInt(data.timeLimit),
        questions: data.questions
      };

      // Check backend health first
      console.log('Checking backend health...');
      try {
        const healthResponse = await axios.get('/api/health', { timeout: 10000 });
        console.log('Backend health check:', healthResponse.data);
      } catch (healthError) {
        console.error('Backend health check failed:', healthError.message);
        toast.error('الخادم غير متاح حالياً، يرجى المحاولة لاحقاً');
        setSubmitting(false);
        return;
      }
      
      console.log('Sending exam data to backend...');
      
      // Try the request with retry mechanism
      let response;
      let retryCount = 0;
      const maxRetries = 2; // Allow 2 retries for better reliability
      
      while (retryCount <= maxRetries) {
        // Check if user wants to cancel
        if (cancelRequest) {
          console.log('Operation cancelled by user');
          setSubmitting(false);
          setCancelRequest(false);
          return;
        }
        
        try {
          // Show progress for large exams
          if (examData.questions && examData.questions.length > 20) {
            toast.loading(`جاري حفظ الامتحان (${examData.questions.length} سؤال)...`, { duration: 5000 });
          }
          
          response = await axios.put(`/api/exams/${examId}`, examData, {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 45000, // 45 seconds for large exams
          });
          break; // Success, exit retry loop
        } catch (error) {
          retryCount++;
          console.log(`Attempt ${retryCount} failed:`, error.message);
          
          if (retryCount > maxRetries) {
            throw error; // Re-throw if all retries failed
          }
          
          // Show retry message
          toast.loading(`محاولة أخرى... (${retryCount}/${maxRetries})`, { duration: 2000 });
          
          // Wait before retrying (shorter wait)
          await new Promise(resolve => setTimeout(resolve, 2000));
          console.log(`Retrying... (${retryCount}/${maxRetries})`);
        }
      }
      
      console.log('Exam update response:', response.data);
      toast.success('تم تحديث الامتحان بنجاح');
      
      // Small delay to ensure the success message is seen
      setTimeout(() => {
        navigate('/teacher/exams');
      }, 1000);
      
    } catch (error) {
      console.error('=== EXAM UPDATE ERROR ===');
      console.error('Error object:', error);
      console.error('Error message:', error.message);
      console.error('Error response:', error.response);
      
      // Handle timeout errors
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        toast.error('انتهت مهلة التحميل، يرجى المحاولة مرة أخرى');
      } else if (error.response?.status === 404) {
        toast.error('الامتحان غير موجود');
      } else if (error.response?.status === 401) {
        toast.error('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى');
        localStorage.removeItem('token');
        navigate('/login');
      } else if (error.response?.status === 403) {
        toast.error('ليس لديك صلاحية لتعديل هذا الامتحان');
      } else if (error.response?.status >= 500) {
        toast.error('خطأ في الخادم، يرجى المحاولة لاحقاً');
      } else if (!error.response) {
        toast.error('لا يمكن الاتصال بالخادم، تحقق من اتصال الإنترنت');
      } else if (error.response?.data?.errors) {
        // Handle validation errors
        const validationErrors = error.response.data.errors;
        const errorMessages = validationErrors.map(err => err.msg).join(', ');
        toast.error(`خطأ في التحقق: ${errorMessages}`);
      } else {
        toast.error(error.response?.data?.message || 'حدث خطأ أثناء تحديث الامتحان');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageUpload = async (event, questionIndex) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة صحيح');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
      return;
    }

    try {
      // Convert file to Base64
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target.result;
        setValue(`questions.${questionIndex}.questionImage`, imageData);
        toast.success('تم رفع الصورة بنجاح');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error reading file:', error);
      toast.error('حدث خطأ أثناء قراءة الملف');
    }
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
    <div className="max-w-4xl mx-auto space-y-6">
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
                <h1 className="text-2xl font-bold text-gray-900">تعديل الامتحان</h1>
                <p className="text-gray-600">تعديل بيانات الامتحان والأسئلة</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">معلومات الامتحان</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">عنوان الامتحان</label>
                <input
                  type="text"
                  className={`input-field ${errors.title ? 'border-red-500' : ''}`}
                  {...register('title', { required: 'عنوان الامتحان مطلوب' })}
                />
                {errors.title && (
                  <p className="error-message">{errors.title.message}</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">وصف الامتحان (اختياري)</label>
                <input
                  type="text"
                  className="input-field"
                  {...register('description')}
                />
              </div>

              <div className="form-group">
                <label className="form-label">المجموعة</label>
                <select
                  className={`input-field ${errors.examGroup ? 'border-red-500' : ''}`}
                  {...register('examGroup', { 
                    required: 'المجموعة مطلوبة',
                    valueAsNumber: true 
                  })}
                >
                  <option value={0}>اختبارات التأسيس</option>
                  {Array.from({ length: 8 }, (_, i) => i + 1).map(num => (
                    <option key={num} value={num}>المجموعة {num}</option>
                  ))}
                </select>
                {errors.examGroup && (
                  <p className="error-message">{errors.examGroup.message}</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">الترتيب</label>
                <input
                  type="number"
                  min="1"
                  className={`input-field ${errors.order ? 'border-red-500' : ''}`}
                  {...register('order', { 
                    required: 'الترتيب مطلوب',
                    valueAsNumber: true,
                    min: { value: 1, message: 'الترتيب يجب أن يكون 1 أو أكثر' }
                  })}
                />
                {errors.order && (
                  <p className="error-message">{errors.order.message}</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">الوقت المحدد (بالدقائق)</label>
                <input
                  type="number"
                  min="1"
                  className={`input-field ${errors.timeLimit ? 'border-red-500' : ''}`}
                  {...register('timeLimit', { 
                    required: 'الوقت المحدد مطلوب',
                    valueAsNumber: true,
                    min: { value: 1, message: 'الوقت المحدد يجب أن يكون دقيقة واحدة على الأقل' }
                  })}
                />
                {errors.timeLimit && (
                  <p className="error-message">{errors.timeLimit.message}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">أسئلة الامتحان</h3>
              <button
                type="button"
                onClick={() => append({
                  questionImage: '',
                  correctAnswer: 'A',
                  explanation: ''
                })}
                className="btn-primary flex items-center space-x-2 rtl:space-x-reverse"
              >
                <Plus className="h-4 w-4" />
                <span>إضافة سؤال</span>
              </button>
            </div>
          </div>
          <div className="card-body">
            <div className="space-y-6">
              {fields.map((field, index) => (
                <div key={field.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-medium text-gray-900">
                      السؤال {index + 1}
                    </h4>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Question Image - Full Width */}
                  <div className="form-group">
                    <label className="form-label">صورة السؤال</label>
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, index)}
                        className="input-field"
                      />
                      {watch(`questions.${index}.questionImage`) && (
                        <div className="mt-2 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                          <img
                            src={watch(`questions.${index}.questionImage`)}
                            alt={`Question ${index + 1}`}
                            className="w-full h-auto rounded-lg border bg-white shadow-sm"
                            style={{
                              maxHeight: '800px',
                              maxWidth: '100%',
                              objectFit: 'contain',
                              minHeight: '400px',
                              width: '100%'
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Answer Choices - Below Photo */}
                  <div className="form-group">
                    <label className="form-label">الإجابة الصحيحة</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                      {['A', 'B', 'C', 'D'].map((choice) => (
                        <label
                          key={choice}
                          className={`flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                            watch(`questions.${index}.correctAnswer`) === choice
                              ? 'border-green-500 bg-green-50 text-green-700'
                              : 'border-gray-300 bg-white hover:border-gray-400'
                          }`}
                        >
                          <input
                            type="radio"
                            value={choice}
                            {...register(`questions.${index}.correctAnswer`, {
                              required: 'الإجابة الصحيحة مطلوبة'
                            })}
                            className="sr-only"
                          />
                          <span className="text-lg font-semibold">الخيار {choice}</span>
                        </label>
                      ))}
                    </div>
                    {errors.questions?.[index]?.correctAnswer && (
                      <p className="error-message mt-2">
                        {errors.questions[index].correctAnswer.message}
                      </p>
                    )}
                  </div>

                  {/* Explanation */}
                  <div className="form-group">
                    <label className="form-label">توضيح الإجابة (اختياري)</label>
                    <textarea
                      className="input-field"
                      rows="2"
                      {...register(`questions.${index}.explanation`)}
                      placeholder="شرح الإجابة الصحيحة..."
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4 rtl:space-x-reverse">
          {submitting ? (
            <>
              <button
                type="button"
                onClick={() => setCancelRequest(true)}
                className="btn-secondary bg-red-500 hover:bg-red-600 text-white"
              >
                إلغاء العملية
              </button>
              <button
                type="button"
                disabled
                className="btn-primary flex items-center space-x-2 rtl:space-x-reverse opacity-50"
              >
                <div className="spinner"></div>
                <span>جاري الحفظ...</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => navigate('/teacher/exams')}
                className="btn-secondary"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="btn-primary flex items-center space-x-2 rtl:space-x-reverse"
              >
                <Save className="h-4 w-4" />
                <span>حفظ التغييرات</span>
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
};

export default EditExam;
