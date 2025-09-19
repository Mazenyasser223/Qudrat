import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { Plus, Upload, Edit, Trash2, Star, Eye, EyeOff } from 'lucide-react';
import ValidationErrors from '../../components/ValidationErrors';
import ConfirmationDialog from '../../components/ConfirmationDialog';

const ManageReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, reviewId: null, studentName: '' });
  const [editingReview, setEditingReview] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm({
    defaultValues: {
      studentName: '',
      rating: 5,
      order: 0,
      isActive: true
    }
  });

  const watchedImage = watch('image');

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/reviews/admin');
      setReviews(res.data.data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('حدث خطأ أثناء تحميل التقييمات');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      setUploading(true);
      setValidationErrors([]);
      
      const formData = new FormData();
      formData.append('studentName', data.studentName);
      formData.append('rating', data.rating);
      formData.append('order', data.order);
      formData.append('isActive', data.isActive);
      
      if (data.image && data.image[0]) {
        formData.append('image', data.image[0]);
      }

      let response;
      if (editingReview) {
        // Update existing review
        response = await axios.put(`/api/reviews/${editingReview._id}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        toast.success('تم تحديث التقييم بنجاح');
      } else {
        // Create new review
        response = await axios.post('/api/reviews', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        toast.success('تم إضافة التقييم بنجاح');
      }
      
      setShowAddForm(false);
      setEditingReview(null);
      reset();
      fetchReviews();
    } catch (error) {
      console.error('Error saving review:', error);
      
      if (error.response?.data?.errors) {
        setValidationErrors(error.response.data.errors);
      } else {
        toast.error(error.response?.data?.message || 'حدث خطأ أثناء حفظ التقييم');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (review) => {
    setEditingReview(review);
    setValue('studentName', review.studentName);
    setValue('rating', review.rating);
    setValue('order', review.order);
    setValue('isActive', review.isActive);
    setShowAddForm(true);
  };

  const handleDelete = (reviewId, studentName) => {
    setDeleteDialog({
      isOpen: true,
      reviewId: reviewId,
      studentName: studentName
    });
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`/api/reviews/${deleteDialog.reviewId}`);
      toast.success('تم حذف التقييم بنجاح');
      fetchReviews();
      setDeleteDialog({ isOpen: false, reviewId: null, studentName: '' });
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error('حدث خطأ أثناء حذف التقييم');
      setDeleteDialog({ isOpen: false, reviewId: null, studentName: '' });
    }
  };

  const cancelDelete = () => {
    setDeleteDialog({ isOpen: false, reviewId: null, studentName: '' });
  };

  const cancelForm = () => {
    setShowAddForm(false);
    setEditingReview(null);
    reset();
    setValidationErrors([]);
  };

  const toggleActive = async (reviewId, currentStatus) => {
    try {
      await axios.put(`/api/reviews/${reviewId}`, {
        isActive: !currentStatus
      });
      toast.success('تم تحديث حالة التقييم');
      fetchReviews();
    } catch (error) {
      console.error('Error toggling review status:', error);
      toast.error('حدث خطأ أثناء تحديث حالة التقييم');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إدارة تقييمات الطلاب</h1>
          <p className="text-gray-600">إضافة وإدارة صور تقييمات الطلاب</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-primary flex items-center space-x-2 rtl:space-x-reverse"
        >
          <Plus className="h-4 w-4" />
          <span>إضافة تقييم</span>
        </button>
      </div>

      {/* Add/Edit Review Form */}
      {showAddForm && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">
              {editingReview ? 'تعديل التقييم' : 'إضافة تقييم جديد'}
            </h3>
          </div>
          <div className="card-body">
            <ValidationErrors 
              errors={validationErrors} 
              onClose={() => setValidationErrors([])} 
            />
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">اسم الطالب</label>
                  <input
                    type="text"
                    className={`input-field ${errors.studentName ? 'border-red-500' : ''}`}
                    placeholder="أدخل اسم الطالب"
                    {...register('studentName', {
                      required: 'اسم الطالب مطلوب'
                    })}
                  />
                  {errors.studentName && (
                    <p className="error-message">{errors.studentName.message}</p>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">التقييم (عدد النجوم)</label>
                  <select
                    className={`input-field ${errors.rating ? 'border-red-500' : ''}`}
                    {...register('rating', {
                      required: 'التقييم مطلوب'
                    })}
                  >
                    <option value={1}>⭐ (1)</option>
                    <option value={2}>⭐⭐ (2)</option>
                    <option value={3}>⭐⭐⭐ (3)</option>
                    <option value={4}>⭐⭐⭐⭐ (4)</option>
                    <option value={5}>⭐⭐⭐⭐⭐ (5)</option>
                  </select>
                  {errors.rating && (
                    <p className="error-message">{errors.rating.message}</p>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">ترتيب العرض</label>
                  <input
                    type="number"
                    className={`input-field ${errors.order ? 'border-red-500' : ''}`}
                    placeholder="0"
                    {...register('order')}
                  />
                  <p className="text-sm text-gray-500 mt-1">الرقم الأقل يظهر أولاً</p>
                </div>

                <div className="form-group">
                  <label className="form-label">الحالة</label>
                  <select
                    className={`input-field ${errors.isActive ? 'border-red-500' : ''}`}
                    {...register('isActive')}
                  >
                    <option value={true}>نشط (يظهر في الصفحة الرئيسية)</option>
                    <option value={false}>غير نشط (مخفي)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">صورة التقييم</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="image-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                      >
                        <span>اختر صورة</span>
                        <input
                          id="image-upload"
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          {...register('image', {
                            required: !editingReview ? 'صورة التقييم مطلوبة' : false
                          })}
                        />
                      </label>
                      <p className="pr-1">أو اسحب الصورة هنا</p>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF حتى 10MB</p>
                    {watchedImage && watchedImage[0] && (
                      <p className="text-sm text-green-600 mt-2">
                        تم اختيار: {watchedImage[0].name}
                      </p>
                    )}
                  </div>
                </div>
                {errors.image && (
                  <p className="error-message">{errors.image.message}</p>
                )}
              </div>

              <div className="flex justify-end space-x-3 rtl:space-x-reverse">
                <button
                  type="button"
                  onClick={cancelForm}
                  className="btn-secondary"
                >
                  إلغاء
                </button>
                <button 
                  type="submit" 
                  className="btn-primary flex items-center space-x-2 rtl:space-x-reverse"
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <div className="spinner"></div>
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      <span>{editingReview ? 'تحديث التقييم' : 'إضافة التقييم'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">
            قائمة التقييمات ({reviews.length})
          </h3>
        </div>
        <div className="card-body p-0">
          {reviews.length === 0 ? (
            <div className="text-center py-8">
              <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">لا توجد تقييمات</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-green-50 to-green-100">
                  <tr>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-green-800 uppercase tracking-wider">
                      الصورة
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-green-800 uppercase tracking-wider">
                      الطالب
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-green-800 uppercase tracking-wider">
                      التقييم
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-green-800 uppercase tracking-wider">
                      الترتيب
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-green-800 uppercase tracking-wider">
                      الحالة
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-green-800 uppercase tracking-wider">
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reviews.map((review) => (
                    <tr key={review._id} className="hover:bg-green-50 transition-colors duration-200">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-16 w-16 flex-shrink-0">
                          <img
                            className="h-16 w-16 rounded-lg object-cover shadow-sm"
                            src={review.imageUrl}
                            alt={`تقييم ${review.studentName}`}
                            onError={(e) => {
                              e.target.src = '/placeholder-image.png';
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          {review.studentName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(review.createdAt).toLocaleDateString('en-GB')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center">
                          <div className="flex text-yellow-400 text-sm">
                            {Array.from({ length: review.rating }).map((_, i) => (
                              <Star key={i} className="h-4 w-4 fill-current" />
                            ))}
                          </div>
                          <span className="mr-2 text-sm text-gray-600">{review.rating}.0</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm text-gray-900">{review.order}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => toggleActive(review._id, review.isActive)}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            review.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {review.isActive ? (
                            <>
                              <Eye className="h-3 w-3 mr-1" />
                              نشط
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3 w-3 mr-1" />
                              مخفي
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse">
                          <button
                            onClick={() => handleEdit(review)}
                            className="flex items-center space-x-1 rtl:space-x-reverse px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all duration-200 text-sm font-medium"
                            title="تعديل التقييم"
                          >
                            <Edit className="h-3 w-3" />
                            <span>تعديل</span>
                          </button>
                          <button
                            onClick={() => handleDelete(review._id, review.studentName)}
                            className="flex items-center space-x-1 rtl:space-x-reverse px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all duration-200 text-sm font-medium"
                            title="حذف التقييم"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>حذف</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="حذف التقييم"
        message={`هل أنت متأكد من حذف تقييم "${deleteDialog.studentName}"؟`}
        confirmText="حذف التقييم"
        cancelText="إلغاء"
        type="danger"
      />
    </div>
  );
};

export default ManageReviews;
