import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { Plus, Search, Trash2, User, Mail, Phone, Eye } from 'lucide-react';
import ValidationErrors from '../../components/ValidationErrors';
import { useSocket } from '../../contexts/SocketContext';
import ConfirmationDialog from '../../components/ConfirmationDialog';

const Students = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, studentId: null, studentName: '' });
  const { socket } = useSocket();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      phoneNumber: ''
    }
  });


  useEffect(() => {
    fetchStudents();
  }, []);

  // Real-time event listeners
  useEffect(() => {
    if (socket) {
      // Listen for new students
      socket.on('student-added', (data) => {
        console.log('👨‍🎓 Student added:', data);
        // Refresh students list
        fetchStudents();
      });

      // Listen for deleted students
      socket.on('student-deleted', (data) => {
        console.log('🗑️ Student deleted:', data);
        // Refresh students list
        fetchStudents();
      });

      // Cleanup listeners on unmount
      return () => {
        socket.off('student-added');
        socket.off('student-deleted');
      };
    }
  }, [socket]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      console.log('Fetching students...');
      const startTime = Date.now();
      
      const res = await axios.get('/api/users/students', {
        timeout: 10000 // 10 second timeout
      });
      
      const endTime = Date.now();
      console.log(`Students fetched in ${endTime - startTime}ms`);
      
      setStudents(res.data.data);
    } catch (error) {
      console.error('Error fetching students:', error);
      if (error.code === 'ECONNABORTED') {
        toast.error('انتهت مهلة الاتصال، يرجى المحاولة مرة أخرى');
      } else {
        toast.error('حدث خطأ أثناء تحميل الطلاب');
      }
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      console.log('=== CREATING STUDENT ===');
      console.log('Student data:', data);
      setValidationErrors([]);
      
      const response = await axios.post('/api/users/students', data);
      console.log('Student creation response:', response);
      console.log('Response status:', response.status);
      console.log('Response data:', response.data);
      
      toast.success('تم إنشاء الطالب بنجاح');
      setShowAddForm(false);
      reset();
      fetchStudents();
    } catch (error) {
      console.error('=== ERROR CREATING STUDENT ===');
      console.error('Error object:', error);
      console.error('Error response:', error.response);
      console.error('Error message:', error.message);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      
      // Handle validation errors
      if (error.response?.data?.errors) {
        setValidationErrors(error.response.data.errors);
      } else if (error.response?.data?.message && error.response.data.message.includes('يوجد طالب مسجل بالفعل')) {
        // Handle duplicate user error specifically
        const errorMessage = error.response.data.message;
        toast.error(errorMessage);
        
        // Set validation error on the appropriate field
        const duplicateField = error.response.data.duplicateField;
        if (duplicateField === 'البريد الإلكتروني') {
          setValidationErrors([{
            field: 'email',
            message: errorMessage
          }]);
        } else if (duplicateField === 'رقم الجوال') {
          setValidationErrors([{
            field: 'phoneNumber',
            message: errorMessage
          }]);
        } else {
          setValidationErrors([{
            field: 'email',
            message: errorMessage
          }]);
        }
        
        // Clear the form fields that have duplicates and show helpful message
        if (duplicateField === 'البريد الإلكتروني') {
          reset({ email: '' });
          toast('يرجى استخدام بريد إلكتروني مختلف', { icon: 'ℹ️' });
        } else if (duplicateField === 'رقم الجوال') {
          reset({ phoneNumber: '' });
          toast('يرجى استخدام رقم جوال مختلف', { icon: 'ℹ️' });
        }
      } else {
        toast.error(error.response?.data?.message || 'حدث خطأ أثناء إنشاء الطالب');
      }
    }
  };

  const handleDelete = (studentId, studentName) => {
    setDeleteDialog({
      isOpen: true,
      studentId: studentId,
      studentName: studentName
    });
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`/api/users/students/${deleteDialog.studentId}`);
      toast.success('تم حذف الطالب بنجاح');
      fetchStudents();
      setDeleteDialog({ isOpen: false, studentId: null, studentName: '' });
    } catch (error) {
      console.error('Error deleting student:', error);
      toast.error('حدث خطأ أثناء حذف الطالب');
      setDeleteDialog({ isOpen: false, studentId: null, studentName: '' });
    }
  };

  const cancelDelete = () => {
    setDeleteDialog({ isOpen: false, studentId: null, studentName: '' });
  };

  const handleViewProfile = (studentId) => {
    navigate(`/teacher/students/${studentId}`);
  };


  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student.phoneNumber && student.phoneNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
          <h1 className="text-2xl font-bold text-gray-900">إدارة الطلاب</h1>
          <p className="text-gray-600">إضافة وإدارة حسابات الطلاب</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-primary flex items-center space-x-2 rtl:space-x-reverse"
        >
          <Plus className="h-4 w-4" />
          <span>إضافة طالب</span>
        </button>
      </div>

      {/* Search */}
      <div className="card">
        <div className="card-body">
          <div className="relative">
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="البحث في الطلاب..."
              className="input-field pr-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Add Student Form */}
      {showAddForm && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">إضافة طالب جديد</h3>
          </div>
          <div className="card-body">
            <ValidationErrors 
              errors={validationErrors} 
              onClose={() => setValidationErrors([])} 
            />
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">الاسم الكامل</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      className={`input-field pr-10 ${errors.name ? 'border-red-500' : ''}`}
                      placeholder="أدخل اسم الطالب"
                      {...register('name', {
                        required: 'الاسم مطلوب',
                        minLength: {
                          value: 2,
                          message: 'الاسم يجب أن يكون حرفين على الأقل'
                        }
                      })}
                    />
                  </div>
                  {errors.name && (
                    <p className="error-message">{errors.name.message}</p>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">البريد الإلكتروني</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      className={`input-field pr-10 ${errors.email ? 'border-red-500' : ''}`}
                      placeholder="أدخل البريد الإلكتروني"
                      {...register('email', {
                        required: 'البريد الإلكتروني مطلوب',
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'البريد الإلكتروني غير صحيح'
                        }
                      })}
                    />
                  </div>
                  {errors.email && (
                    <p className="error-message">{errors.email.message}</p>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">كلمة المرور</label>
                  <input
                    type="text"
                    className={`input-field ${errors.password ? 'border-red-500' : ''}`}
                    placeholder="أدخل كلمة المرور"
                    {...register('password', {
                      required: 'كلمة المرور مطلوبة',
                      minLength: {
                        value: 6,
                        message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
                      }
                    })}
                  />
                  {errors.password && (
                    <p className="error-message">{errors.password.message}</p>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">رقم الجوال</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="tel"
                      className={`input-field pr-10 ${errors.phoneNumber ? 'border-red-500' : ''}`}
                      placeholder="أدخل رقم الجوال"
                      {...register('phoneNumber', {
                        required: 'رقم الجوال مطلوب',
                        pattern: {
                          value: /^[0-9]{10,15}$/,
                          message: 'رقم الجوال يجب أن يحتوي على 10-15 رقم فقط'
                        }
                      })}
                    />
                  </div>
                  {errors.phoneNumber && (
                    <p className="error-message">{errors.phoneNumber.message}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 rtl:space-x-reverse">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    reset();
                  }}
                  className="btn-secondary"
                >
                  إلغاء
                </button>
                <button type="submit" className="btn-primary">
                  إضافة الطالب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Students List */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">
            قائمة الطلاب ({filteredStudents.length})
          </h3>
        </div>
        <div className="card-body p-0">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">لا توجد طلاب مسجلين</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-green-50 to-green-100">
                  <tr>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-green-800 uppercase tracking-wider">
                      الطالب
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-green-800 uppercase tracking-wider">
                      البريد الإلكتروني
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-green-800 uppercase tracking-wider">
                      رقم الجوال
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-green-800 uppercase tracking-wider">
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStudents.map((student) => (
                    <tr key={student._id} className="hover:bg-green-50 transition-colors duration-200">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-end">
                          <div className="mr-4 text-right">
                            <div className="text-sm font-semibold text-gray-900">
                              {student.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(student.createdAt).toLocaleDateString('en-GB')}
                            </div>
                          </div>
                          <div className="h-10 w-10 flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-green-100 to-green-200 flex items-center justify-center shadow-sm">
                              <User className="h-5 w-5 text-green-600" />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-900 font-medium">
                          {student.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-900 font-medium">
                          {student.phoneNumber || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse">
                          <button
                            onClick={() => handleViewProfile(student._id)}
                            className="flex items-center space-x-1 rtl:space-x-reverse px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                            title="عرض الملف الشخصي"
                          >
                            <Eye className="h-4 w-4" />
                            <span>عرض</span>
                          </button>
                          <button
                            onClick={() => handleDelete(student._id, student.name)}
                            className="flex items-center space-x-1 rtl:space-x-reverse px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                            title="حذف الطالب"
                          >
                            <Trash2 className="h-4 w-4" />
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
        title="حذف الطالب"
        message={`هل أنت متأكد من حذف الطالب "${deleteDialog.studentName}"؟`}
        confirmText="حذف الطالب"
        cancelText="إلغاء"
        type="danger"
      />
    </div>
  );
};

export default Students;
