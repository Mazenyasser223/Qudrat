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

  const onSubmit = async (data) => {
    try {
      setSubmitting(true);
      
      // Validate that all questions have correct answers
      const invalidQuestions = data.questions.filter(q => !q.correctAnswer || !['A', 'B', 'C', 'D'].includes(q.correctAnswer));
      if (invalidQuestions.length > 0) {
        toast.error('يرجى تحديد الإجابة الصحيحة لجميع الأسئلة');
        return;
      }
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('description', data.description || '');
      formData.append('examGroup', data.examGroup);
      formData.append('order', data.order);
      formData.append('timeLimit', data.timeLimit);
      formData.append('questions', JSON.stringify(data.questions));

      // Add uploaded files
      const fileInputs = document.querySelectorAll('input[type="file"]');
      fileInputs.forEach((input, index) => {
        if (input.files && input.files[0]) {
          formData.append('questionImages', input.files[0]);
        }
      });

      await axios.put(`/api/exams/${examId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      toast.success('تم تحديث الامتحان بنجاح');
      navigate('/teacher/exams');
    } catch (error) {
      console.error('Error updating exam:', error);
      
      // Handle validation errors
      if (error.response?.data?.errors) {
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

    // Update the form value
    setValue(`questions.${questionIndex}.questionImage`, URL.createObjectURL(file));
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Question Image */}
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
                          <div className="mt-2">
                            <img
                              src={watch(`questions.${index}.questionImage`)}
                              alt={`Question ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg border"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Correct Answer */}
                    <div className="form-group">
                      <label className="form-label">الإجابة الصحيحة</label>
                      <select
                        className={`input-field ${errors.questions?.[index]?.correctAnswer ? 'border-red-500' : ''}`}
                        {...register(`questions.${index}.correctAnswer`, {
                          required: 'الإجابة الصحيحة مطلوبة'
                        })}
                      >
                        <option value="A">الخيار A</option>
                        <option value="B">الخيار B</option>
                        <option value="C">الخيار C</option>
                        <option value="D">الخيار D</option>
                      </select>
                      {errors.questions?.[index]?.correctAnswer && (
                        <p className="error-message">
                          {errors.questions[index].correctAnswer.message}
                        </p>
                      )}
                    </div>
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
          <button
            type="button"
            onClick={() => navigate('/teacher/exams')}
            className="btn-secondary"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary flex items-center space-x-2 rtl:space-x-reverse"
          >
            {submitting ? (
              <>
                <div className="spinner"></div>
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>حفظ التغييرات</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditExam;
