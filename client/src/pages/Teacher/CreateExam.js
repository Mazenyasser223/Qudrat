import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Plus, Trash2, Upload, Save, ArrowLeft } from 'lucide-react';

const CreateExam = () => {
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showMultipleUpload, setShowMultipleUpload] = useState(false);
  const [existingExams, setExistingExams] = useState([]);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm({
    defaultValues: {
      title: '',
      description: '',
      examGroup: 1,
      order: 1,
      timeLimit: 60,
      questions: [
        {
          questionImage: '',
          correctAnswer: 'A',
          explanation: ''
        }
      ]
    }
  });

  // Watch for examGroup changes to update order
  const watchedGroup = watch('examGroup');
  
  useEffect(() => {
    if (existingExams.length > 0) {
      const nextOrder = getNextAvailableOrder(watchedGroup);
      setValue('order', nextOrder);
    }
  }, [watchedGroup, existingExams, setValue]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'questions'
  });

  // Fetch existing exams to suggest next available order
  useEffect(() => {
    const fetchExistingExams = async () => {
      try {
        const response = await axios.get('/api/exams', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        setExistingExams(response.data.data);
      } catch (error) {
        console.error('Error fetching existing exams:', error);
      }
    };
    fetchExistingExams();
  }, []);

  // Function to get next available order for a group
  const getNextAvailableOrder = (group) => {
    const groupExams = existingExams.filter(exam => exam.examGroup === group);
    if (groupExams.length === 0) return 1;
    const maxOrder = Math.max(...groupExams.map(exam => exam.order));
    return maxOrder + 1;
  };

  const onSubmit = async (data) => {
    try {
      setSubmitting(true);
      
      // Send exam data as JSON (images are already Base64 in data.questions)
      const examData = {
        title: data.title,
        description: data.description,
        examGroup: parseInt(data.examGroup),
        order: parseInt(data.order),
        timeLimit: parseInt(data.timeLimit),
        questions: data.questions
      };

      await axios.post('/api/exams', examData, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 45000, // 45 seconds for large exams
      });
      
      toast.success('تم إنشاء الامتحان بنجاح');
      navigate('/teacher/exams');
    } catch (error) {
      console.error('Error creating exam:', error);
      if (error.response?.data?.errors) {
        // Display validation errors
        error.response.data.errors.forEach(err => {
          toast.error(err.msg);
        });
      } else {
        toast.error(error.response?.data?.message || 'حدث خطأ أثناء إنشاء الامتحان');
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
      setUploading(true);
      
      // Convert file to Base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const imageData = e.target.result;
          
          // Upload the image as Base64
          const response = await axios.post('/api/exams/upload-image', 
            { imageData }, 
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
              },
            }
          );
          
          // Set the uploaded image URL (Base64 data)
          const imageUrl = response.data.imageUrl;
          console.log('Uploaded image URL:', imageUrl);
          setValue(`questions.${questionIndex}.questionImage`, imageUrl);
          
          toast.success('تم رفع الصورة بنجاح');
        } catch (error) {
          console.error('Error uploading image:', error);
          if (error.response) {
            toast.error(`حدث خطأ أثناء رفع الصورة: ${error.response.data.message || 'خطأ غير معروف'}`);
          } else {
            toast.error('حدث خطأ أثناء رفع الصورة');
          }
        } finally {
          setUploading(false);
        }
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error reading file:', error);
      toast.error('حدث خطأ أثناء قراءة الملف');
      setUploading(false);
    }
  };

  const handleMultipleImageUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    // Validate all files
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast.error(`الملف ${file.name} ليس صورة صحيحة`);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`حجم الملف ${file.name} يجب أن يكون أقل من 5 ميجابايت`);
        return;
      }
    }

    try {
      setUploading(true);
      toast.loading(`جاري رفع ${files.length} صورة...`);

      // Upload all images as Base64
      const uploadPromises = files.map(async (file) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async (e) => {
            try {
              const imageData = e.target.result;
              
              const response = await axios.post('/api/exams/upload-image', 
                { imageData }, 
                {
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                  },
                }
              );
              
              const imageUrl = response.data.imageUrl;
              console.log('Multiple upload image URL:', imageUrl);
              resolve(imageUrl);
            } catch (error) {
              reject(error);
            }
          };
          reader.readAsDataURL(file);
        });
      });

      const uploadedUrls = await Promise.all(uploadPromises);

      // Create questions for each uploaded image
      const newQuestions = uploadedUrls.map((imageUrl, index) => ({
        questionImage: imageUrl,
        correctAnswer: 'A',
        explanation: ''
      }));

      // Check if there's an existing empty question (the default one)
      const currentQuestions = watch('questions');
      const hasEmptyQuestion = currentQuestions.length === 1 && !currentQuestions[0].questionImage;

      if (hasEmptyQuestion) {
        // Replace the empty question with the first uploaded image
        setValue('questions.0.questionImage', uploadedUrls[0]);
        setValue('questions.0.correctAnswer', 'A');
        setValue('questions.0.explanation', '');
        
        // Add the remaining questions
        for (let i = 1; i < newQuestions.length; i++) {
          append(newQuestions[i]);
        }
      } else {
        // Add all new questions
        newQuestions.forEach(question => {
          append(question);
        });
      }

      toast.success(`تم رفع ${files.length} صورة بنجاح وتم إنشاء ${files.length} سؤال`);
      setShowMultipleUpload(false);
      
      // Clear the file input
      event.target.value = '';
    } catch (error) {
      console.error('Error uploading multiple images:', error);
      toast.error('حدث خطأ أثناء رفع الصور');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
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
            <h1 className="text-2xl font-bold text-gray-900">إنشاء امتحان جديد</h1>
            <p className="text-gray-600">أضف الأسئلة والإعدادات للامتحان</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Exam Basic Info */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">معلومات الامتحان الأساسية</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">عنوان الامتحان</label>
                <input
                  type="text"
                  className={`input-field ${errors.title ? 'border-red-500' : ''}`}
                  placeholder="أدخل عنوان الامتحان"
                  {...register('title', {
                    required: 'عنوان الامتحان مطلوب',
                    minLength: {
                      value: 3,
                      message: 'العنوان يجب أن يكون 3 أحرف على الأقل'
                    }
                  })}
                />
                {errors.title && (
                  <p className="error-message">{errors.title.message}</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">المجموعة</label>
                <select
                  className={`input-field ${errors.examGroup ? 'border-red-500' : ''}`}
                  {...register('examGroup', {
                    required: 'المجموعة مطلوبة',
                    min: { value: 0, message: 'المجموعة يجب أن تكون 0 أو أكثر' },
                    max: { value: 8, message: 'المجموعة يجب أن تكون 8 أو أقل' }
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
                <label className="form-label">ترتيب الامتحان في المجموعة</label>
                <input
                  type="number"
                  min="1"
                  className={`input-field ${errors.order ? 'border-red-500' : ''}`}
                  placeholder="1"
                  {...register('order', {
                    required: 'ترتيب الامتحان مطلوب',
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
                  placeholder="60"
                  {...register('timeLimit', {
                    required: 'الوقت المحدد مطلوب',
                    min: { value: 1, message: 'الوقت يجب أن يكون دقيقة واحدة على الأقل' }
                  })}
                />
                {errors.timeLimit && (
                  <p className="error-message">{errors.timeLimit.message}</p>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">وصف الامتحان (اختياري)</label>
              <textarea
                className={`input-field ${errors.description ? 'border-red-500' : ''}`}
                rows="3"
                placeholder="أدخل وصفاً للامتحان"
                {...register('description')}
              />
              {errors.description && (
                <p className="error-message">{errors.description.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">أسئلة الامتحان</h3>
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <button
                  type="button"
                  onClick={() => setShowMultipleUpload(true)}
                  className="btn-secondary flex items-center space-x-2 rtl:space-x-reverse"
                >
                  <Upload className="h-4 w-4" />
                  <span>رفع صور متعددة</span>
                </button>
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
          </div>
          <div className="card-body">
            <div className="space-y-6">
              {fields.map((field, index) => (
                <div key={field.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-medium text-gray-900">
                      السؤال {index + 1}
                    </h4>
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="text-red-600 hover:text-red-800 transition-colors p-1 rounded hover:bg-red-50"
                      title="حذف السؤال"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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
                        disabled={uploading}
                      />
                      {uploading && (
                        <div className="mt-2 text-center">
                          <div className="spinner mx-auto"></div>
                          <p className="text-sm text-gray-600 mt-2">جاري رفع الصورة...</p>
                        </div>
                      )}
                      {watch(`questions.${index}.questionImage`) && !uploading && (
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
                            onError={(e) => {
                              console.error('Image load error:', e.target.src);
                              console.error('Available image URL:', watch(`questions.${index}.questionImage`));
                              // Don't set fallback image, let it show broken image icon
                            }}
                          />
                          <p className="text-xs text-green-600 mt-2 text-center">✓ تم رفع الصورة بنجاح</p>
                        </div>
                      )}
                    </div>
                    {errors.questions?.[index]?.questionImage && (
                      <p className="error-message">
                        {errors.questions[index].questionImage.message}
                      </p>
                    )}
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
                      placeholder="أدخل توضيحاً للإجابة الصحيحة"
                      {...register(`questions.${index}.explanation`)}
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
                <span>إنشاء الامتحان</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Multiple Upload Modal */}
      {showMultipleUpload && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="bg-blue-600 text-white px-6 py-4">
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <Upload className="h-6 w-6" />
                <div>
                  <h3 className="text-lg font-semibold">رفع صور متعددة</h3>
                  <p className="text-blue-100 text-sm">اختر عدة صور لإنشاء أسئلة متعددة</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleMultipleImageUpload}
                    className="hidden"
                    id="multiple-upload"
                    disabled={uploading}
                  />
                  <label htmlFor="multiple-upload" className="cursor-pointer">
                    <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-lg font-medium text-gray-900 mb-2">
                      {uploading ? 'جاري الرفع...' : 'اختر صور متعددة'}
                    </p>
                    <p className="text-sm text-gray-500">
                      يمكنك اختيار عدة صور في نفس الوقت
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      الحد الأقصى: 5 ميجابايت لكل صورة
                    </p>
                  </label>
                </div>
                
                {uploading && (
                  <div className="text-center">
                    <div className="spinner mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">جاري رفع الصور...</p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-3 rtl:space-x-reverse mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowMultipleUpload(false);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                  disabled={uploading}
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateExam;
