import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Plus, Edit, Eye, BarChart3, Users, BookOpen, Search, Filter, Trash2, Save, X } from 'lucide-react';
import ConfirmationDialog from '../../components/ConfirmationDialog';
import PageHeader from '../../components/PageHeader';

const ExamGroups = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: ''
  });
  const [editingGroup, setEditingGroup] = useState(null);
  const [editName, setEditName] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, groupId: null, groupName: '' });
  const [curriculumExamCounts, setCurriculumExamCounts] = useState(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/exam-groups', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setGroups(response.data.data);
      setCurriculumExamCounts(response.data.curriculumExamCounts || null);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('حدث خطأ أثناء تحميل المجموعات');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('اسم المجموعة مطلوب');
      return;
    }

    try {
      setSubmitting(true);
      const response = await axios.post('/api/exam-groups', formData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      toast.success('تم إنشاء المجموعة بنجاح');
      setShowCreateForm(false);
      setFormData({ name: '' });
      fetchGroups();
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error(error.response?.data?.message || 'حدث خطأ أثناء إنشاء المجموعة');
    } finally {
      setSubmitting(false);
    }
  };


  const handleEditGroup = (group) => {
    setEditingGroup(group._id);
    setEditName(group.name);
  };

  const handleSaveEdit = async (groupId) => {
    if (!editName.trim()) {
      toast.error('اسم المجموعة مطلوب');
      return;
    }

    try {
      await axios.put(`/api/exam-groups/${groupId}`, { name: editName }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      toast.success('تم تحديث اسم المجموعة بنجاح');
      setEditingGroup(null);
      setEditName('');
      fetchGroups();
    } catch (error) {
      console.error('Error updating group:', error);
      toast.error(error.response?.data?.message || 'حدث خطأ أثناء تحديث المجموعة');
    }
  };

  const handleCancelEdit = () => {
    setEditingGroup(null);
    setEditName('');
  };

  const handleDeleteGroup = (groupId, groupName) => {
    setDeleteDialog({
      isOpen: true,
      groupId,
      groupName
    });
  };

  const confirmDeleteGroup = async () => {
    if (!deleteDialog.groupId) return;

    try {
      await axios.delete(`/api/exam-groups/${deleteDialog.groupId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      toast.success('تم حذف المجموعة بنجاح');
      setDeleteDialog({ isOpen: false, groupId: null, groupName: '' });
      fetchGroups();
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error(error.response?.data?.message || 'حدث خطأ أثناء حذف المجموعة');
    }
  };

  const cancelDeleteGroup = () => {
    setDeleteDialog({ isOpen: false, groupId: null, groupName: '' });
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="spinner"></div>
        <p className="text-gray-600">جاري تحميل المجموعات...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <PageHeader
        title="إدارة المجموعات"
        description="المجموعات المخصصة (رقم ٩ فما فوق)؛ العدد يعكس فقط الامتحانات المسجلة تحت رقم المجموعة المخصص، وليس المجموعات القياسية ٠–٨"
        action={(
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-white text-primary-600 hover:bg-primary-50 px-6 py-3 rounded-lg font-semibold flex items-center space-x-2 rtl:space-x-reverse transition-colors shadow-lg"
          >
            <Plus className="h-5 w-5" />
            <span>إضافة مجموعة جديدة</span>
          </button>
        )}
      />

      {curriculumExamCounts && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-900">
          <p className="font-semibold mb-2">عدد الامتحانات في المجموعات القياسية (عند إنشاء امتحان تختار «المجموعة ١» … أو التأسيس)</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            <div className="bg-white rounded-lg px-2 py-1.5 border border-blue-100 text-center">
              <span className="text-blue-700">التأسيس</span>
              <div className="font-bold text-lg">{curriculumExamCounts['0'] ?? 0}</div>
            </div>
            {Array.from({ length: 8 }, (_, i) => i + 1).map((num) => (
              <div key={num} className="bg-white rounded-lg px-2 py-1.5 border border-blue-100 text-center">
                <span className="text-blue-700">المجموعة {num}</span>
                <div className="font-bold text-lg">{curriculumExamCounts[String(num)] ?? 0}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search and Filter Section */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="البحث في المجموعات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGroups.map((group) => (
          <div key={group._id} className="bg-white rounded-xl shadow-sm border hover:shadow-lg transition-all duration-300">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  {editingGroup === group._id ? (
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg font-bold"
                        placeholder="اسم المجموعة"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveEdit(group._id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="حفظ التعديل"
                      >
                        <Save className="h-4 w-4" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                        title="إلغاء التعديل"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{group.name}</h3>
                      <button
                        onClick={() => handleEditGroup(group)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="تعديل اسم المجموعة"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  {group.isPremium && (
                    <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-1 rounded-full">
                      مميز
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-600">{group.examCount}</div>
                  <div className="text-sm text-gray-600">امتحان</div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="text-sm text-gray-500">
                  المجموعة #{group.groupNumber}
                </div>
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <button
                    onClick={() => navigate(`/teacher/exams?group=${group.groupNumber}`)}
                    className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    title="عرض الامتحانات"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => navigate(`/teacher/exams/create?group=${group.groupNumber}`)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="إضافة امتحان"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  {group.examCount === 0 && (
                    <button
                      onClick={() => handleDeleteGroup(group._id, group.name)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="حذف المجموعة (فقط إذا كانت فارغة)"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredGroups.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchTerm ? 'لا توجد مجموعات تطابق البحث' : 'لا توجد مجموعات بعد'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm ? 'جرب البحث بكلمات مختلفة' : 'ابدأ بإنشاء مجموعة جديدة لإضافة امتحانات مخصصة'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn-primary flex items-center space-x-2 rtl:space-x-reverse mx-auto"
            >
              <Plus className="h-5 w-5" />
              <span>إنشاء مجموعة جديدة</span>
            </button>
          )}
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="bg-primary-600 text-white px-6 py-4">
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <Plus className="h-6 w-6" />
                <div>
                  <h3 className="text-lg font-semibold">إنشاء مجموعة جديدة</h3>
                  <p className="text-primary-100 text-sm">أضف مجموعة مخصصة للامتحانات</p>
                </div>
              </div>
            </div>
            <form onSubmit={handleCreateGroup} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    اسم المجموعة *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="مثال: المجموعة المتقدمة"
                    required
                  />
                </div>

              </div>

              <div className="flex justify-end space-x-3 rtl:space-x-reverse mt-6 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
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
                      <span>جاري الإنشاء...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      <span>إنشاء المجموعة</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={cancelDeleteGroup}
        onConfirm={confirmDeleteGroup}
        title="حذف المجموعة"
        message={`هل أنت متأكد من حذف المجموعة "${deleteDialog.groupName}"؟ سيتم حذف المجموعة نهائياً.`}
        confirmText="حذف المجموعة"
        cancelText="إلغاء"
        type="danger"
      />
    </div>
  );
};

export default ExamGroups;
