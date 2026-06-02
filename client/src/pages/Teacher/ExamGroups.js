import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Plus,
  Edit,
  Eye,
  Search,
  Trash2,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Settings2
} from 'lucide-react';
import ConfirmationDialog from '../../components/ConfirmationDialog';
import PageHeader from '../../components/PageHeader';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`
});

const curriculumSlots = [
  { filter: 0, title: 'التأسيس' },
  ...Array.from({ length: 8 }, (_, i) => ({
    filter: i + 1,
    title: `المجموعة ${i + 1}`
  }))
];

const getStandardGroupLabel = (groupNum) => {
  if (groupNum === 0) return 'التأسيس';
  if (groupNum >= 1 && groupNum <= 8) return `المجموعة ${groupNum}`;
  return `مجلد #${groupNum}`;
};

const ExamGroups = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    linkedCurriculumGroup: ''
  });
  const [editingGroup, setEditingGroup] = useState(null);
  const [editName, setEditName] = useState('');
  const [editLinked, setEditLinked] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, groupId: null, groupName: '' });
  const [examDeleteDialog, setExamDeleteDialog] = useState({ isOpen: false, examId: null, examTitle: '' });
  const [curriculumExamCounts, setCurriculumExamCounts] = useState(null);
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [busyKey, setBusyKey] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [groupsRes, examsRes] = await Promise.all([
        axios.get('/api/exam-groups', { headers: authHeaders() }),
        axios.get('/api/exams', { headers: authHeaders() })
      ]);
      setGroups(groupsRes.data.data);
      setCurriculumExamCounts(groupsRes.data.curriculumExamCounts || null);
      setExams(examsRes.data.data || []);
    } catch (error) {
      console.error('Error fetching groups/exams:', error);
      toast.error('حدث خطأ أثناء تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const examsByGroup = useMemo(() => {
    const map = {};
    exams.forEach((exam) => {
      const key = String(exam.examGroup);
      if (!map[key]) map[key] = [];
      map[key].push(exam);
    });
    Object.keys(map).forEach((key) => {
      map[key].sort((a, b) => a.order - b.order);
    });
    return map;
  }, [exams]);

  const transferTargets = useMemo(() => {
    const targets = curriculumSlots.map(({ filter, title }) => ({
      value: filter,
      label: title
    }));
    groups
      .filter((g) => g.groupNumber >= 9)
      .forEach((g) => {
        targets.push({ value: g.groupNumber, label: g.name });
      });
    return targets;
  }, [groups]);

  const getGroupLabel = (groupNum) => {
    const custom = groups.find((g) => g.groupNumber === groupNum);
    if (custom) return custom.name;
    return getStandardGroupLabel(groupNum);
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('اسم المجموعة مطلوب');
      return;
    }

    try {
      setSubmitting(true);
      const payload = { name: formData.name.trim() };
      if (formData.linkedCurriculumGroup !== '' && formData.linkedCurriculumGroup !== undefined) {
        payload.linkedCurriculumGroup = parseInt(formData.linkedCurriculumGroup, 10);
      }
      await axios.post('/api/exam-groups', payload, { headers: authHeaders() });

      toast.success('تم إنشاء المجموعة بنجاح');
      setShowCreateForm(false);
      setFormData({ name: '', linkedCurriculumGroup: '' });
      fetchData();
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
    setEditLinked(
      group.linkedCurriculumGroup !== undefined && group.linkedCurriculumGroup !== null
        ? String(group.linkedCurriculumGroup)
        : group.resolvedCurriculumSlot !== undefined && group.resolvedCurriculumSlot !== null
          ? String(group.resolvedCurriculumSlot)
          : ''
    );
  };

  const handleSaveEdit = async (groupId) => {
    if (!editName.trim()) {
      toast.error('اسم المجموعة مطلوب');
      return;
    }

    try {
      await axios.put(
        `/api/exam-groups/${groupId}`,
        {
          name: editName.trim(),
          linkedCurriculumGroup: editLinked === '' ? null : parseInt(editLinked, 10)
        },
        { headers: authHeaders() }
      );

      toast.success('تم تحديث المجموعة بنجاح');
      setEditingGroup(null);
      setEditName('');
      setEditLinked('');
      fetchData();
    } catch (error) {
      console.error('Error updating group:', error);
      toast.error(error.response?.data?.message || 'حدث خطأ أثناء تحديث المجموعة');
    }
  };

  const handleCancelEdit = () => {
    setEditingGroup(null);
    setEditName('');
    setEditLinked('');
  };

  const handleDeleteGroup = (groupId, groupName) => {
    setDeleteDialog({ isOpen: true, groupId, groupName });
  };

  const confirmDeleteGroup = async () => {
    if (!deleteDialog.groupId) return;

    try {
      await axios.delete(`/api/exam-groups/${deleteDialog.groupId}`, { headers: authHeaders() });
      toast.success('تم حذف المجموعة بنجاح');
      setDeleteDialog({ isOpen: false, groupId: null, groupName: '' });
      fetchData();
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error(error.response?.data?.message || 'حدث خطأ أثناء حذف المجموعة');
    }
  };

  const cancelDeleteGroup = () => {
    setDeleteDialog({ isOpen: false, groupId: null, groupName: '' });
  };

  const handleDeleteExam = (examId, examTitle) => {
    setExamDeleteDialog({ isOpen: true, examId, examTitle });
  };

  const confirmDeleteExam = async () => {
    if (!examDeleteDialog.examId) return;

    try {
      await axios.delete(`/api/exams/${examDeleteDialog.examId}`, { headers: authHeaders() });
      toast.success('تم حذف الامتحان بنجاح');
      setExamDeleteDialog({ isOpen: false, examId: null, examTitle: '' });
      fetchData();
    } catch (error) {
      console.error('Error deleting exam:', error);
      toast.error('حدث خطأ أثناء حذف الامتحان');
      setExamDeleteDialog({ isOpen: false, examId: null, examTitle: '' });
    }
  };

  const cancelDeleteExam = () => {
    setExamDeleteDialog({ isOpen: false, examId: null, examTitle: '' });
  };

  const reorderExams = async (groupNumber, orderedExamIds) => {
    const key = `reorder-${groupNumber}`;
    try {
      setBusyKey(key);
      await axios.put(
        `/api/exams/group/${groupNumber}/reorder`,
        { orderedExamIds },
        { headers: authHeaders() }
      );
      await fetchData();
    } catch (error) {
      console.error('Error reordering exams:', error);
      toast.error(error.response?.data?.message || 'حدث خطأ أثناء إعادة ترتيب الامتحانات');
    } finally {
      setBusyKey(null);
    }
  };

  const moveExam = async (groupNumber, examId, direction) => {
    const groupExams = examsByGroup[String(groupNumber)] || [];
    const index = groupExams.findIndex((e) => e._id === examId);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= groupExams.length) return;

    const newOrder = [...groupExams];
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    await reorderExams(groupNumber, newOrder.map((e) => e._id));
  };

  const transferExam = async (examId, targetGroup) => {
    const key = `transfer-${examId}`;
    try {
      setBusyKey(key);
      await axios.put(
        `/api/exams/${examId}/transfer`,
        { targetGroup: parseInt(targetGroup, 10) },
        { headers: authHeaders() }
      );
      toast.success('تم نقل الامتحان بنجاح');
      await fetchData();
    } catch (error) {
      console.error('Error transferring exam:', error);
      toast.error(error.response?.data?.message || 'حدث خطأ أثناء نقل الامتحان');
    } finally {
      setBusyKey(null);
    }
  };

  const reorderFolders = async (orderedGroupIds) => {
    try {
      setBusyKey('reorder-folders');
      await axios.put(
        '/api/exam-groups/reorder-folders',
        { orderedGroupIds },
        { headers: authHeaders() }
      );
      await fetchData();
    } catch (error) {
      console.error('Error reordering folders:', error);
      toast.error(error.response?.data?.message || 'حدث خطأ أثناء إعادة ترتيب المجلدات');
    } finally {
      setBusyKey(null);
    }
  };

  const moveFolder = async (groupId, direction) => {
    const customFolders = groups.filter((g) => g.groupNumber >= 9);
    const index = customFolders.findIndex((g) => g._id === groupId);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= customFolders.length) return;

    const newOrder = [...customFolders];
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    await reorderFolders(newOrder.map((g) => g._id));
  };

  const toggleExpanded = (key) => {
    setExpandedGroup((prev) => (prev === key ? null : key));
  };

  const matchesSearch = (group) =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase());

  const folderCards = groups.filter(matchesSearch);

  const renderExamList = (groupNumber) => {
    const groupExams = examsByGroup[String(groupNumber)] || [];
    const isBusy = busyKey?.startsWith('reorder-') || busyKey?.startsWith('transfer-');

    if (groupExams.length === 0) {
      return (
        <p className="text-sm text-gray-500 text-center py-4">
          لا توجد امتحانات في هذه المجموعة
        </p>
      );
    }

    return (
      <ul className="divide-y divide-gray-100">
        {groupExams.map((exam, index) => (
          <li
            key={exam._id}
            className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 px-2 hover:bg-gray-50 rounded-lg"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-xs font-medium text-gray-400 w-6 shrink-0">{exam.order}</span>
              <span className="text-sm font-medium text-gray-900 truncate">{exam.title}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={index === 0 || isBusy}
                  onClick={() => moveExam(groupNumber, exam._id, 'up')}
                  className="p-1.5 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                  title="تحريك لأعلى"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={index === groupExams.length - 1 || isBusy}
                  onClick={() => moveExam(groupNumber, exam._id, 'down')}
                  className="p-1.5 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                  title="تحريك لأسفل"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
              </div>
              <select
                defaultValue=""
                disabled={busyKey === `transfer-${exam._id}`}
                onChange={(e) => {
                  if (e.target.value) {
                    transferExam(exam._id, e.target.value);
                    e.target.value = '';
                  }
                }}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white max-w-[140px]"
                title="نقل إلى مجموعة أخرى"
              >
                <option value="">نقل إلى...</option>
                {transferTargets
                  .filter((t) => t.value !== groupNumber)
                  .map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={() => navigate(`/teacher/exams/edit/${exam._id}`)}
                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                title="تعديل"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleDeleteExam(exam._id, exam.title)}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                title="حذف"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  const renderManagePanel = (groupKey, groupNumber, title) => {
    const isExpanded = expandedGroup === groupKey;
    const examCount = examsByGroup[String(groupNumber)]?.length ?? 0;

    return (
      <div className="mt-3 w-full">
        <button
          type="button"
          onClick={() => toggleExpanded(groupKey)}
          className="w-full flex items-center justify-center gap-2 text-sm font-medium text-primary-700 hover:bg-primary-50 py-2 rounded-lg border border-primary-100 transition-colors"
        >
          <Settings2 className="h-4 w-4" />
          <span>{isExpanded ? 'إخفاء الامتحانات' : 'إدارة الامتحانات'}</span>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {!isExpanded && examCount > 0 && (
            <span className="text-xs text-gray-500">({examCount})</span>
          )}
        </button>
        {isExpanded && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              امتحانات {title}
            </h4>
            {renderExamList(groupNumber)}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="spinner"></div>
        <p className="text-gray-600">جاري تحميل المجموعات...</p>
      </div>
    );
  }

  const customFolderIndex = (groupId) =>
    groups.filter((g) => g.groupNumber >= 9).findIndex((g) => g._id === groupId);

  const customFolderCount = groups.filter((g) => g.groupNumber >= 9).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="إدارة المجموعات"
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
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900">مجموعات الموقع (٠–٨)</h2>
          <p className="text-sm text-gray-500">
            يمكنك إعادة ترتيب الامتحانات، نقلها بين المجموعات، أو حذفها من كل مجموعة.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {curriculumSlots.map(({ filter, title }) => (
              <div
                key={filter}
                className="bg-white rounded-xl border border-primary-100 shadow-sm p-4 flex flex-col hover:shadow-md transition-shadow"
              >
                <h3 className="text-base font-bold text-gray-900 mb-1 text-center">{title}</h3>
                <div className="text-3xl font-bold text-primary-600 my-2 text-center">
                  {curriculumExamCounts[String(filter)] ?? 0}
                </div>
                <p className="text-xs text-gray-500 mb-3 text-center">امتحان</p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/teacher/exams?group=${filter}`)}
                    className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg border border-primary-100"
                    title="عرض الامتحانات"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/teacher/exams/create?group=${filter}`)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg border border-green-100"
                    title="إضافة امتحان"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {renderManagePanel(`curriculum-${filter}`, filter, title)}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="max-w-md">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 pointer-events-none" />
          <input
            type="text"
            placeholder="البحث في المجلدات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-gray-900">المجلدات</h2>
        <p className="text-sm text-gray-500 mt-1">
          أعد ترتيب المجلدات المخصصة، وانقل أو احذف الامتحانات داخل كل مجلد.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {folderCards.map((group) => {
          const folderIdx = customFolderIndex(group._id);
          const isCustom = group.groupNumber >= 9;
          const manageGroupNum = group.examFilterGroup ?? group.groupNumber;

          return (
            <div key={group._id} className="bg-white rounded-xl shadow-sm border hover:shadow-lg transition-all duration-300">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    {editingGroup === group._id ? (
                      <div className="space-y-3 w-full">
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
                            type="button"
                            onClick={() => handleSaveEdit(group._id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="حفظ التعديل"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                            title="إلغاء التعديل"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            ربط بعدد الامتحانات (مجموعة قياسية في النظام)
                          </label>
                          <select
                            value={editLinked}
                            onChange={(e) => setEditLinked(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="">بدون ربط (العدد حسب رقم المجلد المخصص فقط)</option>
                            <option value="0">التأسيس (٠)</option>
                            {Array.from({ length: 8 }, (_, i) => i + 1).map((num) => (
                              <option key={num} value={String(num)}>
                                المجموعة القياسية {num}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{group.name}</h3>
                        <div className="flex items-center gap-1">
                          {isCustom && customFolderCount > 1 && (
                            <>
                              <button
                                type="button"
                                disabled={folderIdx === 0 || busyKey === 'reorder-folders'}
                                onClick={() => moveFolder(group._id, 'up')}
                                className="p-1.5 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30"
                                title="تحريك المجلد لأعلى"
                              >
                                <ArrowUp className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                disabled={folderIdx === customFolderCount - 1 || busyKey === 'reorder-folders'}
                                onClick={() => moveFolder(group._id, 'down')}
                                className="p-1.5 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30"
                                title="تحريك المجلد لأسفل"
                              >
                                <ArrowDown className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleEditGroup(group)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="تعديل اسم المجموعة"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        </div>
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
                  <div className="text-center col-span-2">
                    <div className="text-2xl font-bold text-primary-600">{group.examCount}</div>
                    <div className="text-sm text-gray-600">امتحان</div>
                    {group.resolvedCurriculumSlot !== undefined && group.resolvedCurriculumSlot !== null ? (
                      <p className="text-xs text-gray-500 mt-1">
                        {group.curriculumLinkSource === 'name'
                          ? 'مرتبط تلقائياً بالمجموعة القياسية '
                          : 'مرتبط بالمجموعة القياسية '}
                        {group.resolvedCurriculumSlot === 0 ? 'التأسيس' : group.resolvedCurriculumSlot}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="text-sm text-gray-500 space-y-0.5">
                    <div>المجلد #{group.groupNumber}</div>
                    <div className="text-xs text-gray-400">
                      فلتر العرض: {getGroupLabel(manageGroupNum)}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <button
                      type="button"
                      onClick={() => navigate(`/teacher/exams?group=${manageGroupNum}`)}
                      className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="عرض الامتحانات"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/teacher/exams/create?group=${manageGroupNum}`)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="إضافة امتحان"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    {(group.customSlotExamCount ?? 0) === 0 && isCustom && (
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

                {renderManagePanel(`folder-${group._id}`, manageGroupNum, group.name)}
              </div>
            </div>
          );
        })}
      </div>

      {folderCards.length === 0 && !searchTerm && (
        <p className="text-sm text-gray-500">لا توجد مجلدات بعد.</p>
      )}

      {searchTerm && folderCards.length === 0 && (
        <div className="text-center py-8 text-gray-600">
          لا توجد نتائج للبحث «{searchTerm}»
        </div>
      )}

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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ربط بعدد الامتحانات (اختياري)
                  </label>
                  <select
                    value={formData.linkedCurriculumGroup}
                    onChange={(e) =>
                      setFormData({ ...formData, linkedCurriculumGroup: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">بدون ربط</option>
                    <option value="0">التأسيس (٠)</option>
                    {Array.from({ length: 8 }, (_, i) => i + 1).map((num) => (
                      <option key={num} value={String(num)}>
                        المجموعة القياسية {num}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    عند الربط، يظهر على البطاقة عدد الامتحانات في تلك المجموعة القياسية، وتفتح صفحة الامتحانات بنفس الفلتر.
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 rtl:space-x-reverse mt-6 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setFormData({ name: '', linkedCurriculumGroup: '' });
                  }}
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

      <ConfirmationDialog
        isOpen={examDeleteDialog.isOpen}
        onClose={cancelDeleteExam}
        onConfirm={confirmDeleteExam}
        title="حذف الامتحان"
        message={`هل أنت متأكد من حذف الامتحان "${examDeleteDialog.examTitle}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmText="حذف الامتحان"
        cancelText="إلغاء"
        type="danger"
      />
    </div>
  );
};

export default ExamGroups;
