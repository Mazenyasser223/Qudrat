import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Hash, 
  BookOpen,
  Settings,
  Filter,
  AlertTriangle,
  Eye,
  RefreshCw,
  List,
  Lock,
  Unlock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import StudentMistakes from '../../components/Exam/StudentMistakes';
import StudentAnswersViewer from '../../components/Exam/StudentAnswersViewer';
import ConfirmationDialog from '../../components/ConfirmationDialog';
import StudentExamSubmission from '../../components/Exam/StudentExamSubmission';
import {
  sortExamGroupNumbers
} from '../../utils/examGroupOrder';
import { useExamGroupSettings } from '../../context/ExamGroupSettingsContext';

const StudentProfile = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { customGroups, curriculumGroupOrder, getGroupName } = useExamGroupSettings();
  const [student, setStudent] = useState(null);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLockUnlockModal, setShowLockUnlockModal] = useState(false);
  const [selectedExams, setSelectedExams] = useState([]);
  const [lockUnlockAction, setLockUnlockAction] = useState('lock');
  const [expandedGroups, setExpandedGroups] = useState({}); // 'lock' or 'unlock'
  const [studentProgress, setStudentProgress] = useState([]);
  const [groupStatus, setGroupStatus] = useState({});
  const [showMistakes, setShowMistakes] = useState(false);
  const [selectedExamForMistakes, setSelectedExamForMistakes] = useState(null);
  const [showAllAnswers, setShowAllAnswers] = useState(false);
  const [showSubmission, setShowSubmission] = useState(false);
  const [selectedExamForSubmission, setSelectedExamForSubmission] = useState(null);
  const [attemptedExams, setAttemptedExams] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [examsLoading, setExamsLoading] = useState(false);
  // Individual exam control states
  const [togglingExam, setTogglingExam] = useState(null);
  const [togglingGroup, setTogglingGroup] = useState(null);
  const [reopeningExam, setReopeningExam] = useState(null);
  // Confirmation dialogs
  const [lockDialog, setLockDialog] = useState({ isOpen: false, examId: null, examTitle: '', action: '' });
  const [reopenDialog, setReopenDialog] = useState({ isOpen: false, examId: null, examTitle: '' });
  const [reviewMistakes, setReviewMistakes] = useState({}); // Track which exams have review mistakes enabled

  useEffect(() => {
    setLoading(true);
    setExamsLoading(true);
    setStudent(null);

    if (!studentId || studentId.length < 10) {
      toast.error('معرف الطالب غير صحيح');
      navigate('/teacher/students');
      setLoading(false);
      setExamsLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        setExamsLoading(true);
        const studentData = await fetchStudentData();
        if (!studentData) {
          setLoading(false);
          setExamsLoading(false);
          return;
        }
        setLoading(false);
        fetchExams().finally(() => setExamsLoading(false));
      } catch (error) {
        if (process.env.NODE_ENV === 'development') console.error('Error loading initial data:', error);
        toast.error('حدث خطأ أثناء تحميل البيانات');
        setLoading(false);
        setExamsLoading(false);
      }
    };

    loadData();
  }, [studentId]);

  // Update progress when student data changes
  useEffect(() => {
    fetchStudentProgress();
  }, [student]);

  const getExamIdString = (value) => {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (value.$oid) return value.$oid;
    if (value._id) return getExamIdString(value._id);
    if (value.id) return getExamIdString(value.id);
    if (typeof value.toString === 'function') {
      const str = value.toString();
      if (str && str !== '[object Object]') {
        return str;
      }
    }
    return null;
  };

  const progressByExamId = useMemo(() => {
    const map = new Map();
    if (student?.examProgress) {
      student.examProgress.forEach(progress => {
        const id = getExamIdString(progress?.examId);
        if (id) {
          map.set(id, progress);
        }
      });
    }
    return map;
  }, [student]);

  const findProgressByExamId = useCallback((examId, fallbackProgressList = []) => {
    const targetId = getExamIdString(examId);
    if (!targetId) return null;
    if (progressByExamId.has(targetId)) {
      return progressByExamId.get(targetId);
    }
    return fallbackProgressList.find(progress => getExamIdString(progress?.examId) === targetId) || null;
  }, [progressByExamId]);

  const getProgressForExam = useCallback((exam, fallbackProgressList = []) => {
    if (!exam) return null;
    const existingProgress = findProgressByExamId(exam._id, fallbackProgressList);
    if (existingProgress) {
      return existingProgress;
    }
    return {
      examId: exam._id,
      examGroup: exam.examGroup,
      status: 'locked',
      score: null,
      percentage: null,
      totalQuestions: exam.totalQuestions || 0,
      correctAnswers: null,
      wrongAnswers: null,
      attemptNumber: 1,
      isPlaceholder: true
    };
  }, [findProgressByExamId]);

  // Update group status when exams or student progress changes
  useEffect(() => {
    if (student && student.examProgress) {
      calculateGroupStatus(student.examProgress);
    }
  }, [exams, student]);

  // Update attempted exams when student progress changes
  useEffect(() => {
    if (student && student.examProgress) {
      const attempted = student.examProgress
        .filter(progress => progress.status === 'completed' || progress.status === 'in_progress')
        .map(progress => {
          const progressExamId = getExamIdString(progress.examId);
          const exam = exams.find(e => e._id === progressExamId);
          return exam;
        })
        .filter(exam => exam); // Remove undefined exams
      
      setAttemptedExams(attempted);
    }
  }, [student, exams]);

  // Load review mistakes enabled status from backend when student data is loaded
  useEffect(() => {
    if (student && student.examProgress && exams.length > 0) {
      const reviewMistakesState = {};
      student.examProgress.forEach(progress => {
        const examId = getExamIdString(progress.examId);
        if (examId && progress.reviewMistakesEnabled) {
          reviewMistakesState[examId] = true;
        }
      });
      setReviewMistakes(reviewMistakesState);
    }
  }, [student, exams]);

  // Helper function to handle checkbox changes
  const handleReviewMistakesChange = async (examId, checked) => {
    if (!studentId) return;

    try {
      // Optimistically update UI
      setReviewMistakes(prev => ({
        ...prev,
        [examId]: checked
      }));

      // Save to backend
      await axios.put(
        `/api/users/students/${studentId}/review-mistakes/${examId}`,
        { enabled: checked },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      toast.success(checked ? 'تم تفعيل مراجعة الأخطاء' : 'تم إلغاء تفعيل مراجعة الأخطاء');
    } catch (error) {
      // Revert on error
      setReviewMistakes(prev => ({
        ...prev,
        [examId]: !checked
      }));
      toast.error(error.response?.data?.message || 'حدث خطأ أثناء تحديث حالة مراجعة الأخطاء');
    }
  };

  // Listen for exam changes from the submission modal
  useEffect(() => {
    const handleExamChange = (event) => {
      const { examId, examTitle } = event.detail;
      const exam = attemptedExams.find(e => e._id === examId);
      if (exam) {
        setSelectedExamForSubmission(exam);
      }
    };

    window.addEventListener('examChanged', handleExamChange);
    return () => window.removeEventListener('examChanged', handleExamChange);
  }, [attemptedExams]);

  const fetchStudentData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);

      const response = await axios.get(`/api/users/students/${studentId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        timeout: 15000
      });

      if (response.data && response.data.data) {
        const data = response.data.data;
        if (!data._id || !data.name) {
          toast.error('بيانات الطالب غير صحيحة');
          setStudent(null);
          return null;
        }
        setStudent(data);
        if (isRefresh) toast.success('تم تحديث بيانات الطالب بنجاح');
        return data;
      }
      toast.error('لم يتم العثور على بيانات الطالب');
      setStudent(null);
      return null;
    } catch (error) {
      if (error.response?.status === 404) {
        setStudent(null);
      } else if (error.response?.status === 401) {
        toast.error('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى');
        localStorage.removeItem('token');
        navigate('/login');
      } else if (error.response?.status === 403) {
        toast.error('ليس لديك صلاحية الوصول إلى بيانات هذا الطالب');
        setStudent(null);
      } else if (error.response?.status >= 500) {
        toast.error('خطأ في الخادم، يرجى المحاولة لاحقاً');
        setStudent(null);
      } else if (!error.response) {
        toast.error('لا يمكن الاتصال بالخادم، تحقق من اتصال الإنترنت');
        setStudent(null);
      } else {
        toast.error(`حدث خطأ أثناء تحميل بيانات الطالب: ${error.response?.data?.message || error.message}`);
        setStudent(null);
      }
      return null;
    } finally {
      if (isRefresh) setRefreshing(false);
    }
  };

  const fetchExams = async () => {
    try {
      const response = await axios.get('/api/exams', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data && response.data.data) {
        if (!Array.isArray(response.data.data)) {
          toast.error('بيانات الاختبارات غير صحيحة');
          setExams([]);
          return;
        }
        setExams(response.data.data);
      } else {
        toast.error('لم يتم العثور على اختبارات');
        setExams([]);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى');
        localStorage.removeItem('token');
        navigate('/login');
      } else if (error.response?.status === 403) {
        toast.error('ليس لديك صلاحية الوصول إلى الاختبارات');
      } else if (error.response?.status >= 500) {
        toast.error('خطأ في الخادم، يرجى المحاولة لاحقاً');
      } else if (!error.response) {
        toast.error('لا يمكن الاتصال بالخادم، تحقق من اتصال الإنترنت');
      } else {
        toast.error(`حدث خطأ أثناء تحميل الاختبارات: ${error.response?.data?.message || error.message}`);
      }
      setExams([]);
    }
  };

  const sortGroupNumbers = useCallback(
    (groupNums) => sortExamGroupNumbers(groupNums, curriculumGroupOrder, customGroups),
    [curriculumGroupOrder, customGroups]
  );

  const fetchStudentProgress = () => {
    if (student && student.examProgress) {
      setStudentProgress(student.examProgress);
      calculateGroupStatus(student.examProgress);
    } else {
      setStudentProgress([]);
    }
  };

  const calculateGroupStatus = (progress) => {
    const status = {};
    for (let i = 0; i <= 8; i++) status[i] = 'locked';
    if (exams && Array.isArray(exams)) {
      const customGroupNums = [...new Set(exams.map(exam => exam.examGroup).filter(g => g > 8))];
      customGroupNums.forEach(num => { status[num] = 'locked'; });
    }
    if (!progress || !Array.isArray(progress)) {
      setGroupStatus(status);
      return;
    }
    progress.forEach(progressItem => {
      try {
        const groupNum = progressItem.examId ? progressItem.examId.examGroup : progressItem.examGroup;
        if (groupNum != null && ['unlocked', 'in_progress', 'completed'].includes(progressItem.status)) {
          status[groupNum] = 'unlocked';
        }
      } catch {
        // skip invalid item
      }
    });
    setGroupStatus(status);
  };




  const handleToggleMultipleExams = async () => {
    try {
      
      const response = await axios.put(`/api/users/students/${studentId}/toggle-exams`, {
        examIds: selectedExams,
        action: lockUnlockAction
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      
      toast.success(`تم ${lockUnlockAction === 'lock' ? 'قفل' : 'فتح'} الاختبارات المحددة بنجاح`);
      setShowLockUnlockModal(false);
      setSelectedExams([]);
      
      // Refresh student data to show updated status
      await fetchStudentData();
      
      // Also refresh the exams list to show updated status
      await fetchExams();
      
      // Force a re-render by updating state
      setStudentProgress(prev => [...prev]);
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error('الطالب غير موجود');
      } else if (error.response?.status === 401) {
        toast.error('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى');
        localStorage.removeItem('token');
        navigate('/login');
      } else if (error.response?.status === 403) {
        toast.error('ليس لديك صلاحية لإجراء هذا الإجراء');
      } else if (error.response?.status >= 500) {
        toast.error('خطأ في الخادم، يرجى المحاولة لاحقاً');
      } else if (!error.response) {
        toast.error('لا يمكن الاتصال بالخادم، تحقق من اتصال الإنترنت');
      } else {
        toast.error(`حدث خطأ أثناء ${lockUnlockAction === 'lock' ? 'قفل' : 'فتح'} الاختبارات: ${error.response?.data?.message || error.message}`);
      }
    }
  };

  const toggleGroupExpansion = (groupNum) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupNum]: !prev[groupNum]
    }));
  };

  const handleToggleGroup = async (groupNumber, action) => {
    try {
      await axios.put(`/api/users/students/${studentId}/toggle-group`, {
        groupNumber: parseInt(groupNumber),
        action
      }, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success(`تم ${action === 'lock' ? 'قفل' : 'فتح'} المجموعة ${groupNumber} بنجاح`);
      await fetchStudentData();
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error('الطالب غير موجود');
      } else if (error.response?.status === 401) {
        toast.error('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى');
        localStorage.removeItem('token');
        navigate('/login');
      } else if (error.response?.status === 403) {
        toast.error('ليس لديك صلاحية لإجراء هذا الإجراء');
      } else if (error.response?.status >= 500) {
        toast.error('خطأ في الخادم، يرجى المحاولة لاحقاً');
      } else if (!error.response) {
        toast.error('لا يمكن الاتصال بالخادم، تحقق من اتصال الإنترنت');
      } else {
        toast.error(`حدث خطأ أثناء ${action === 'lock' ? 'قفل' : 'فتح'} المجموعة: ${error.response?.data?.message || error.message}`);
      }
    }
  };

  const handleViewMistakes = (exam) => {
    if (!exam) {
      toast.error('لم يتم العثور على الاختبار');
      return;
    }
    if (!student) {
      toast.error('لم يتم العثور على بيانات الطالب');
      return;
    }
    setSelectedExamForMistakes(exam);
    setShowMistakes(true);
  };

  const handleCloseMistakes = () => {
    setShowMistakes(false);
    setSelectedExamForMistakes(null);
  };

  const handleViewAllAnswers = () => {
    if (!student) {
      toast.error('لم يتم العثور على بيانات الطالب');
      return;
    }
    setShowAllAnswers(true);
  };

  const handleCloseAllAnswers = () => {
    setShowAllAnswers(false);
  };

  const handleViewSubmission = (exam) => {
    if (!exam) {
      toast.error('لم يتم العثور على الاختبار');
      return;
    }
    if (!student) {
      toast.error('لم يتم العثور على بيانات الطالب');
      return;
    }
    setSelectedExamForSubmission(exam);
    setShowSubmission(true);
  };

  const handleCloseSubmission = () => {
    setShowSubmission(false);
    setSelectedExamForSubmission(null);
  };

  // Individual Exam Control Functions
  const requestToggleExamAccess = (examId, examTitle, action) => {
    setLockDialog({
      isOpen: true,
      examId,
      examTitle,
      action
    });
  };

  const confirmToggleExam = async () => {
    const { examId, action } = lockDialog;
    try {
      setTogglingExam(examId);
      setLockDialog({ isOpen: false, examId: null, examTitle: '', action: '' });
      const response = await axios.put(`/api/users/students/${studentId}/toggle-exam/${examId}`, {
        action
      }, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        timeout: 60000
      });
      toast.success(response.data.message);
      await fetchStudentData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'حدث خطأ أثناء تغيير حالة الاختبار');
    } finally {
      setTogglingExam(null);
    }
  };

  // Group Control Functions
  const handleToggleGroupAccess = async (groupId, action) => {
    try {
      setTogglingGroup(groupId);
      toast.loading(`جاري ${action === 'open' ? 'فتح' : 'قفل'} جميع الاختبارات في المجموعة...`, { duration: 60000 });
      const response = await axios.put(`/api/users/students/${studentId}/toggle-group/${groupId}`, {
        action
      }, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        timeout: 60000
      });
      toast.success(response.data.message);
      await fetchStudentData();
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        toast.error('انتهت مهلة الطلب. يرجى المحاولة مرة أخرى');
      } else {
        toast.error(error.response?.data?.message || 'حدث خطأ أثناء تغيير حالة المجموعة');
      }
    } finally {
      setTogglingGroup(null);
    }
  };

  // Reopen Exam Function
  const cancelToggleExam = () => {
    setLockDialog({ isOpen: false, examId: null, examTitle: '', action: '' });
  };

  const requestReopenExam = (examId, examTitle) => {
    setReopenDialog({
      isOpen: true,
      examId,
      examTitle
    });
  };

  const cancelReopenExam = () => {
    setReopenDialog({ isOpen: false, examId: null, examTitle: '' });
  };

  const confirmReopenExam = async () => {
    const { examId } = reopenDialog;
    try {
      setReopeningExam(examId);
      setReopenDialog({ isOpen: false, examId: null, examTitle: '' });
      toast.loading('جاري إعادة فتح الامتحان...', { duration: 30000 });
      const response = await axios.put(`/api/users/students/${studentId}/reopen-exam/${examId}`, {}, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        timeout: 30000
      });
      toast.success(response.data.message);
      await fetchStudentData();
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        toast.error('انتهت مهلة الطلب. يرجى المحاولة مرة أخرى');
      } else {
        toast.error(error.response?.data?.message || 'حدث خطأ أثناء إعادة فتح الامتحان');
      }
    } finally {
      setReopeningExam(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  // Show loading if we don't have student data yet or if we're still loading
  if (!student || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p className="text-gray-600">جاري تحميل بيانات الطالب...</p>
        </div>
      </div>
    );
  }

  // Only show error if we have a studentId but no student data after loading is complete
  if (!student && studentId) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">👤</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">الطالب غير موجود</h2>
        <p className="text-gray-600 mb-6">لم يتم العثور على الطالب المطلوب</p>
        <button
          onClick={() => navigate('/teacher/students')}
          className="btn-primary"
        >
          العودة لقائمة الطلاب
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
                onClick={() => navigate('/teacher/students')}
                className="flex items-center space-x-2 rtl:space-x-reverse text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>العودة</span>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">ملف الطالب</h1>
                <p className="text-gray-600">تتبع تقدم الطالب وإدارة اختباراته</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Student Info */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">معلومات الطالب</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
                <User className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">الاسم</p>
                <p className="text-lg font-semibold text-gray-900">{student.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">البريد الإلكتروني</p>
                <p className="text-lg font-semibold text-gray-900">{student.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <Hash className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">رقم الجوال</p>
                <p className="text-lg font-semibold text-gray-900">{student.phoneNumber || 'غير محدد'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Status Summary */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">حالة الاختبارات الحالية</h3>
          <p className="text-sm text-gray-600 mt-1">نظرة عامة على حالة المجموعات والاختبارات للطالب</p>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Group Status Summary */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
              <h4 className="text-md font-semibold text-blue-900 mb-3 flex items-center space-x-2 rtl:space-x-reverse">
                <Filter className="h-5 w-5" />
                <span>حالة المجموعات</span>
              </h4>
              <div className="grid grid-cols-5 gap-2">
                {sortGroupNumbers(Object.keys(groupStatus).map(Number)).map((groupNum) => {
                    const isUnlocked = groupStatus[groupNum] === 'unlocked';
                    const isFoundation = groupNum === 0;
                    const isCustomGroup = groupNum > 8;
                    const groupName = getGroupName(groupNum);
                    
                    return (
                      <div key={groupNum} className="text-center">
                        <div className={`w-8 h-8 rounded-full mx-auto mb-1 flex items-center justify-center text-white text-xs font-bold ${
                          isFoundation
                            ? (isUnlocked ? 'bg-blue-500' : 'bg-gray-500')
                            : (isUnlocked ? 'bg-green-500' : 'bg-red-500')
                        }`} title={groupName}>
                          {isFoundation ? 'ت' : groupNum}
                        </div>
                        <div className="text-xs text-gray-600">
                          {isUnlocked ? 'مفتوحة' : 'مقفلة'}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

                </div>
        </div>
      </div>

        {/* Detailed Progress Table */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">جدول التقدم التفصيلي</h3>
            <p className="text-sm text-gray-600 mt-1">تفاصيل كاملة عن أداء الطالب في جميع الاختبارات</p>
          </div>
          
          {/* Enhanced Quick Access Section */}
          <div className="px-6 py-6 bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 border-b border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-lg font-bold text-gray-900 flex items-center space-x-3 rtl:space-x-reverse">
                <div className="p-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg">
                  <List className="h-5 w-5 text-white" />
                </div>
                <span>الوصول السريع للمجموعات والاختبارات</span>
              </h4>
              <div className="text-sm text-gray-600 bg-white px-3 py-1 rounded-full border">
                {examsLoading ? '...' : `${exams.length} اختبار متاح`}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {examsLoading ? (
                <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-500">
                  <div className="spinner mb-3" />
                  <p>جاري تحميل الاختبارات...</p>
                </div>
              ) : (() => {
                const allGroupNumbers = sortGroupNumbers([...new Set(exams.map(exam => exam.examGroup))]);
                return allGroupNumbers.map(groupNum => {
                  const groupExams = exams.filter(exam => exam.examGroup === groupNum);
                
                if (groupExams.length === 0) return null;
                
                // Calculate group statistics
                const groupProgress = groupExams.map(exam => 
                  getProgressForExam(exam, student?.examProgress || [])
                );
                
                const actualProgress = groupProgress.filter(p => p && !p.isPlaceholder);
                const completedExams = actualProgress.filter(p => p.status === 'completed').length;
                const avgScore = actualProgress.length > 0 
                  ? Math.round(actualProgress.reduce((sum, p) => sum + (p.percentage || 0), 0) / actualProgress.length)
                  : 0;
                
                return (
                  <div key={groupNum} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg hover:border-green-300 transition-all duration-300 group">
                    {/* Group Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3 rtl:space-x-reverse">
                        <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {groupNum}
                        </div>
                        <div>
                          <h5 className="font-bold text-gray-900 text-sm">
                            {getGroupName(groupNum)}
                          </h5>
                          <p className="text-xs text-gray-500">
                            {completedExams}/{groupExams.length} مكتمل
                          </p>
                        </div>
                      </div>
                      {avgScore > 0 && (
                        <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                          avgScore >= 80 ? 'bg-green-100 text-green-700' :
                          avgScore >= 60 ? 'bg-blue-100 text-blue-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {avgScore.toFixed(2)}%
                        </div>
                      )}
                    </div>
                    
                    {/* Exams List */}
              <div className="space-y-2">
                      {(expandedGroups[groupNum] ? groupExams : groupExams.slice(0, 3)).map(exam => {
                        const progress = findProgressByExamId(exam._id, student?.examProgress || []);
                        const hasTimeData = progress && (progress.timeSpent || progress.submittedAt);
                        
                        return (
                          <button
                            key={exam._id}
                            onClick={() => {
                              // Scroll to the exam in the table
                              const examRow = document.querySelector(`[data-exam-id="${exam._id}"]`);
                              if (examRow) {
                                examRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                examRow.classList.add('bg-yellow-50', 'ring-2', 'ring-yellow-300');
                                setTimeout(() => {
                                  examRow.classList.remove('bg-yellow-50', 'ring-2', 'ring-yellow-300');
                                }, 3000);
                              }
                            }}
                            className="w-full text-right p-3 bg-gray-50 hover:bg-gradient-to-r hover:from-green-50 hover:to-blue-50 rounded-lg border border-gray-200 hover:border-green-300 transition-all duration-200 group/exam"
                          >
                            <div className="space-y-2">
                              {/* Exam Title and Score */}
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="font-semibold text-gray-900 group-hover/exam:text-green-700 text-sm">
                                    اختبار {exam.order}
                </div>
                                  <div className="text-xs text-gray-600">
                                    {progress ? `${progress.score || 0}/${exam.totalQuestions || 0}` : '-'}
                                  </div>
                                </div>
                                <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                                  progress?.percentage >= 80 ? 'bg-green-100 text-green-700' :
                                  progress?.percentage >= 60 ? 'bg-blue-100 text-blue-700' :
                                  progress?.percentage > 0 ? 'bg-orange-100 text-orange-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {progress?.percentage >= 80 ? 'ممتاز' :
                                   progress?.percentage >= 60 ? 'جيد' :
                                   progress?.percentage > 0 ? 'مقبول' : '-'}
                                </div>
                              </div>
                              
                              {/* Time and Date Information */}
                              {hasTimeData && (
                                <div className="space-y-1 pt-2 border-t border-gray-200">
                                  {progress.timeSpent && (
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-gray-500">الوقت المستغرق:</span>
                                      <span className="font-medium text-blue-600">
                                        {Math.floor(progress.timeSpent / 60)}:{(progress.timeSpent % 60).toString().padStart(2, '0')}
                  </span>
                </div>
                                  )}
                                  {progress.submittedAt && (
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-gray-500">تاريخ الإرسال:</span>
                                      <span className="font-medium text-green-600">
                                        {new Date(progress.submittedAt).toLocaleDateString('en-GB')}
                  </span>
                </div>
                                  )}
                                  {progress.submittedAt && (
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-gray-500">وقت الإرسال:</span>
                                      <span className="font-medium text-purple-600">
                                        {new Date(progress.submittedAt).toLocaleTimeString('en-US', { 
                                          hour: '2-digit', 
                                          minute: '2-digit',
                                          hour12: true
                                        })}
                                      </span>
              </div>
                                  )}
            </div>
                              )}
          </div>
                          </button>
                        );
                      })}
                      
                      {groupExams.length > 3 && (
                        <div className="text-center pt-2">
                          <button
                            onClick={() => toggleGroupExpansion(groupNum)}
                            className="text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full px-3 py-1 inline-block transition-colors duration-200 flex items-center space-x-1 rtl:space-x-reverse mx-auto"
                          >
                            <span>
                              {expandedGroups[groupNum] 
                                ? 'إخفاء الاختبارات' 
                                : `+${groupExams.length - 3} اختبارات أخرى`
                              }
                            </span>
                            <svg 
                              className={`w-3 h-3 transition-transform duration-200 ${expandedGroups[groupNum] ? 'rotate-180' : ''}`} 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
                });
              })()}
            </div>
          </div>

        <div className="card-body p-0">
          <div className="overflow-x-auto" style={{ position: 'relative' }}>
            <table className="w-full divide-y divide-gray-200" style={{ 
              tableLayout: 'fixed',
              width: '100%',
              minWidth: '100%'
            }}>
              <thead className="bg-gray-50 sticky top-0 z-20">
                <tr>
                  <th className="px-2 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200" style={{ 
                    width: '15%',
                    minWidth: '120px',
                    maxWidth: '150px'
                  }}>
                    اسم المجموعة
                  </th>
                  <th className="px-2 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200" style={{ 
                    width: '25%',
                    minWidth: '200px',
                    maxWidth: '250px'
                  }}>
                    اسم الاختبار
                  </th>
                  <th className="px-2 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200" style={{ 
                    width: '12%',
                    minWidth: '80px',
                    maxWidth: '100px'
                  }}>
                    النقاط
                  </th>
                  <th className="px-2 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200" style={{ 
                    width: '12%',
                    minWidth: '80px',
                    maxWidth: '100px'
                  }}>
                    النسبة المئوية
                  </th>
                  <th className="px-2 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200" style={{ 
                    width: '15%',
                    minWidth: '120px',
                    maxWidth: '150px'
                  }}>
                    النسبة التراكمية
                  </th>
                  <th className="px-2 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200" style={{ 
                    width: '12%',
                    minWidth: '80px',
                    maxWidth: '100px'
                  }}>
                    الحالة
                  </th>
                  <th className="px-2 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200" style={{ 
                    width: '9%',
                    minWidth: '80px',
                    maxWidth: '100px'
                  }}>
                    الوقت المستغرق
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200" style={{ 
                    width: '150px',
                    minWidth: '150px',
                    maxWidth: '150px'
                  }}>
                    تاريخ الإرسال
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200" style={{ 
                    width: '120px',
                    minWidth: '120px',
                    maxWidth: '120px'
                  }}>
                    أفضل درجة مراجعة
                  </th>
                  <th className="px-2 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200" style={{ 
                    width: '10%',
                    minWidth: '100px',
                    maxWidth: '120px'
                  }}>
                    مراجعة الأخطاء
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider sticky right-0 bg-gray-50 z-20" style={{ 
                    width: '180px',
                    minWidth: '180px',
                    maxWidth: '180px'
                  }}>
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(() => {
                  // Group exams by examGroup and calculate cumulative percentages
                  const groupedExams = {};
                  const groupCumulative = {};
                  
                  // Initialize groups dynamically based on actual exam groups
                  const uniqueGroups = [...new Set(exams.map(exam => exam.examGroup))];
                  uniqueGroups.forEach(groupNum => {
                    groupedExams[groupNum] = [];
                    groupCumulative[groupNum] = { totalScore: 0, totalQuestions: 0, completedExams: 0 };
                  });
                  exams.forEach(exam => {
                    const groupNum = exam.examGroup;
                    const progress = findProgressByExamId(exam._id, studentProgress);
                    if (!groupedExams[groupNum]) {
                      groupedExams[groupNum] = [];
                      groupCumulative[groupNum] = { totalScore: 0, totalQuestions: 0, completedExams: 0 };
                    }
                    if (progress) {
                      groupedExams[groupNum].push({ exam, progress });
                      
                      if (progress.status === 'completed') {
                        groupCumulative[groupNum].totalScore += progress.score || 0;
                        groupCumulative[groupNum].totalQuestions += progress.totalQuestions || exam.totalQuestions || 0;
                        groupCumulative[groupNum].completedExams += 1;
                      }
                    } else {
                      groupedExams[groupNum].push({ exam, progress: null });
                    }
                  });
                  
                  // Sort exams within each group by order
                  Object.keys(groupedExams).forEach(group => {
                    groupedExams[group].sort((a, b) => a.exam.order - b.exam.order);
                  });
                  
                  // Calculate cumulative percentages
                  Object.keys(groupCumulative).forEach(group => {
                    const data = groupCumulative[group];
                    if (data.totalQuestions > 0) {
                      data.cumulativePercentage = Math.round((data.totalScore / data.totalQuestions) * 100);
                    } else {
                      data.cumulativePercentage = 0;
                    }
                  });
                  
                  // Render table rows
                  const rows = [];
                  
                  // Render group 0 first (اختبارات التأسيس) - COMMENTED OUT TO PREVENT DUPLICATION
                  // Group 0 will be handled by the dynamic rendering below
                  if (false && groupedExams[0] && groupedExams[0].length > 0) {
                    groupedExams[0].forEach((item, index) => {
                      const { exam, progress } = item;
                      const isFirstInGroup = index === 0;
                      const cumulativeData = groupCumulative[0];
                      
                      rows.push(
                        <tr key={exam._id} data-exam-id={exam._id} className={`${
                          progress?.status === 'completed' 
                            ? progress?.attemptNumber > 1 ? 'bg-purple-50' : 'bg-green-50'
                            : progress?.status === 'in_progress' 
                            ? 'bg-yellow-50' 
                            : 'bg-gray-50'
                        } hover:bg-gray-100 transition-colors`}>
                          <td className="px-2 py-4 text-sm font-medium text-gray-900 border-r border-gray-200" style={{ width: '15%', minWidth: '120px', maxWidth: '150px' }}>
                            {isFirstInGroup && (
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                  <span className="font-semibold text-blue-700">{getGroupName(0)}</span>
                                  {cumulativeData.completedExams > 0 && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                      {cumulativeData.cumulativePercentage.toFixed(2)}%
                                    </span>
                                  )}
                                </div>
                                {/* Group Controls */}
                                <div className="flex flex-col space-y-1">
                                  <button
                                    onClick={() => handleToggleGroupAccess(0, 'open')}
                                    disabled={togglingGroup === 0}
                                    className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-500 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {togglingGroup === 0 ? (
                                      <div className="spinner w-3 h-3"></div>
                                    ) : (
                                      <Unlock className="w-3 h-3 ml-1" />
                                    )}
                                    فتح المجموعة
                                  </button>
                                  <button
                                    onClick={() => handleToggleGroupAccess(0, 'close')}
                                    disabled={togglingGroup === 0}
                                    className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {togglingGroup === 0 ? (
                                      <div className="spinner w-3 h-3"></div>
                                    ) : (
                                      <Lock className="w-3 h-3 ml-1" />
                                    )}
                                    قفل المجموعة
                                  </button>
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-4 text-sm text-gray-900 border-r border-gray-200" style={{ width: '25%', minWidth: '200px', maxWidth: '250px' }}>
                            <div className="truncate" title={exam.title}>
                              {exam.title}
                </div>
                          </td>
                          <td className="px-2 py-4 text-sm text-gray-900 text-right border-r border-gray-200" style={{ width: '12%', minWidth: '80px', maxWidth: '100px' }}>
                            {progress ? (
                              <div className="space-y-1">
                                <div className="font-medium">
                                  {progress.score || 0}/{progress.totalQuestions || exam.totalQuestions || 0}
                                </div>
                                {progress.attemptNumber > 1 && (
                                  <div className="text-xs text-blue-600">
                                    المحاولة {progress.attemptNumber}
                                  </div>
                                )}
                                {progress.previousAttempts && progress.previousAttempts.length > 0 && (
                                  <div className="text-xs text-gray-500">
                                    {progress.previousAttempts.length} محاولة سابقة
                                  </div>
                                )}
                              </div>
                            ) : '-'}
                          </td>
                          <td className="px-2 py-4 text-sm text-gray-900 text-right border-r border-gray-200" style={{ width: '12%', minWidth: '80px', maxWidth: '100px' }}>
                            {progress ? (
                              <div className="space-y-1">
                                <div className={`font-medium ${
                                  progress.percentage >= 80 ? 'text-green-600' :
                                  progress.percentage >= 60 ? 'text-blue-600' :
                                  progress.percentage > 0 ? 'text-orange-600' : 'text-gray-600'
                                }`}>
                                  {(progress.percentage || 0).toFixed(2)}%
                                </div>
                                {progress.previousAttempts && progress.previousAttempts.length > 0 && (
                                  <div className="text-xs text-gray-500">
                                    أفضل: {Math.max(...progress.previousAttempts.map(p => p.percentage || 0), progress.percentage || 0).toFixed(1)}%
                                  </div>
                                )}
                              </div>
                            ) : '-'}
                          </td>
                          <td className="px-2 py-4 text-sm text-gray-900 text-right border-r border-gray-200" style={{ width: '15%', minWidth: '120px', maxWidth: '150px' }}>
                            {isFirstInGroup && cumulativeData.completedExams > 0 ? `${cumulativeData.cumulativePercentage}%` : '-'}
                          </td>
                          <td className="px-2 py-4 text-right border-r border-gray-200" style={{ width: '12%', minWidth: '80px', maxWidth: '100px' }}>
                            {progress ? (
                              <div className="space-y-1">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  progress.status === 'completed' 
                                    ? progress.attemptNumber > 1 ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                                    : progress.status === 'in_progress'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : progress.status === 'unlocked'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {progress.status === 'completed' ? 
                                    (progress.attemptNumber > 1 ? `مكتمل (${progress.attemptNumber})` : 'مكتمل') : 
                                   progress.status === 'in_progress' ? 'قيد التنفيذ' :
                                   progress.status === 'unlocked' ? 'متاح' : 'مقفل'}
                                </span>
                                {progress.attemptNumber > 1 && (
                                  <div className="text-xs text-purple-600">
                                    إعادة محاولة
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                غير محدد
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-4 text-sm text-gray-900 text-center border-r border-gray-200" style={{ width: '9%', minWidth: '80px', maxWidth: '100px' }}>
                            {progress && progress.timeSpent ? (
                              <span className="font-medium text-blue-600">
                                {Math.floor(progress.timeSpent / 60)}:{(progress.timeSpent % 60).toString().padStart(2, '0')}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-2 py-4 text-sm text-gray-900 text-center border-r border-gray-200" style={{ width: '12%', minWidth: '100px', maxWidth: '120px' }}>
                            {progress && progress.submittedAt ? (
                              <div className="text-xs">
                                <div className="font-medium text-gray-900">
                                  {new Date(progress.submittedAt).toLocaleDateString('en-GB')}
                </div>
                                <div className="text-gray-500">
                                  {new Date(progress.submittedAt).toLocaleTimeString('en-US', { 
                                    hour: '2-digit', 
                                    minute: '2-digit',
                                    hour12: true
                                  })}
              </div>
            </div>
                            ) : '-'}
                          </td>
                          <td className="px-2 py-4 text-sm text-gray-900 text-center border-r border-gray-200" style={{ width: '9%', minWidth: '80px', maxWidth: '100px' }}>
                            {progress && progress.bestReviewScore ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                {progress.bestReviewScore.toFixed(2)}%
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-2 py-4 text-center border-r border-gray-200" style={{ width: '10%', minWidth: '100px', maxWidth: '120px' }}>
                            <div className="flex justify-center">
                              <input
                                type="checkbox"
                                checked={reviewMistakes[exam._id] || false}
                                onChange={(e) => handleReviewMistakesChange(exam._id, e.target.checked)}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                              />
                            </div>
                          </td>
                          <td className="px-2 py-4 text-center sticky right-0 bg-white group-hover:bg-green-50 z-10 shadow-[2px_0_4px_rgba(0,0,0,0.05)] transition-colors duration-200" style={{ width: '180px', minWidth: '180px', maxWidth: '180px', position: 'sticky', right: 0 }}>
                            <div className="flex flex-col space-y-2">
                              {/* Lock/Unlock Controls - Hide for completed exams */}
                              {progress && progress.status !== 'completed' && (
                                <div className="flex flex-col space-y-1">
                                  {progress.status === 'unlocked' ? (
                                    <button
                                      onClick={() => requestToggleExamAccess(exam._id, exam.title, 'close')}
                                      disabled={togglingExam === exam._id}
                                      className="inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full"
                                    >
                                      {togglingExam === exam._id ? (
                                        <div className="spinner w-3 h-3"></div>
                                      ) : (
                                        <>
                                          <Lock className="w-3 h-3 ml-1" />
                                          <span>قفل</span>
                                        </>
                                      )}
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => requestToggleExamAccess(exam._id, exam.title, 'open')}
                                      disabled={togglingExam === exam._id}
                                      className="inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-500 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full"
                                    >
                                      {togglingExam === exam._id ? (
                                        <div className="spinner w-3 h-3"></div>
                                      ) : (
                                        <>
                                          <Unlock className="w-3 h-3 ml-1" />
                                          <span>فتح</span>
                                        </>
                                      )}
                                    </button>
                                  )}
                                </div>
                              )}
                              
                              {/* View Answer Button */}
                              {progress && (progress.status === 'completed' || progress.status === 'in_progress') && (
                                <div className="flex flex-col space-y-1">
                                  <button
                                    onClick={() => handleViewSubmission(exam)}
                                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                                  >
                                    <Eye className="w-3 h-3 ml-1" />
                                    عرض الإجابة
                                  </button>
                                  <button
                                    onClick={() => handleViewMistakes(exam)}
                                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                                  >
                                    <AlertTriangle className="w-3 h-3 ml-1" />
                                    عرض الأخطاء
                                  </button>
                                </div>
                              )}
                              
                              {/* Reopen Exam Button - Only for completed exams */}
                              {progress && progress.status === 'completed' && (
                                <div className="flex flex-col space-y-1">
                                  <button
                                    onClick={() => requestReopenExam(exam._id, exam.title)}
                                    disabled={reopeningExam === exam._id}
                                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {reopeningExam === exam._id ? (
                                      <div className="spinner w-3 h-3 ml-1"></div>
                                    ) : (
                                      <RefreshCw className="w-3 h-3 ml-1" />
                                    )}
                                    اعادة فتح
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  }
                  
                  // Render ALL groups dynamically (including group 0 and all custom groups)
                  const allGroupNumbers = sortGroupNumbers(Object.keys(groupedExams).map(Number));
                  allGroupNumbers.forEach(groupNum => {
                    if (groupedExams[groupNum] && groupedExams[groupNum].length > 0) {
                      groupedExams[groupNum].forEach((item, index) => {
                        const { exam, progress } = item;
                        const isFirstInGroup = index === 0;
                        const cumulativeData = groupCumulative[groupNum];
                        
                        rows.push(
                          <tr key={exam._id} data-exam-id={exam._id} className={`${
                            progress?.status === 'completed' 
                              ? progress?.attemptNumber > 1 ? 'bg-purple-50' : 'bg-green-50'
                              : progress?.status === 'in_progress' 
                              ? 'bg-yellow-50' 
                              : 'bg-gray-50'
                          } hover:bg-gray-100 transition-colors`}>
                            <td className="px-2 py-4 text-sm font-medium text-gray-900 border-r border-gray-200" style={{ width: '15%', minWidth: '120px', maxWidth: '150px' }}>
                              {isFirstInGroup && (
                                <div className="space-y-2">
                                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                    <span className="font-semibold">{getGroupName(groupNum)}</span>
                                    {cumulativeData.completedExams > 0 && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        {cumulativeData.cumulativePercentage.toFixed(2)}%
                                      </span>
                                    )}
                                  </div>
                                  {/* Group Controls */}
                                  <div className="flex flex-col space-y-1">
                                    <button
                                      onClick={() => handleToggleGroupAccess(groupNum, 'open')}
                                      disabled={togglingGroup === groupNum}
                                      className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-500 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {togglingGroup === groupNum ? (
                                        <div className="spinner w-3 h-3"></div>
                                      ) : (
                                        <Unlock className="w-3 h-3 ml-1" />
                                      )}
                                      فتح المجموعة
                                    </button>
                                    <button
                                      onClick={() => handleToggleGroupAccess(groupNum, 'close')}
                                      disabled={togglingGroup === groupNum}
                                      className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {togglingGroup === groupNum ? (
                                        <div className="spinner w-3 h-3"></div>
                                      ) : (
                                        <Lock className="w-3 h-3 ml-1" />
                                      )}
                                      قفل المجموعة
                                    </button>
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="px-2 py-4 text-sm text-gray-900 border-r border-gray-200" style={{ width: '25%', minWidth: '200px', maxWidth: '250px' }}>
                              <div className="truncate" title={exam.title}>
                                {exam.title}
                </div>
                            </td>
                            <td className="px-2 py-4 text-sm text-gray-900 text-center border-r border-gray-200" style={{ width: '9%', minWidth: '80px', maxWidth: '100px' }}>
                              {progress ? (
                                <div className="space-y-1">
                                  <div className="font-medium">
                                    {progress.score || 0}/{progress.totalQuestions || exam.totalQuestions || 0}
                                  </div>
                                  {progress.attemptNumber > 1 && (
                                    <div className="text-xs text-blue-600">
                                      المحاولة {progress.attemptNumber}
                                    </div>
                                  )}
                                  {progress.previousAttempts && progress.previousAttempts.length > 0 && (
                                    <div className="text-xs text-gray-500">
                                      {progress.previousAttempts.length} محاولة سابقة
                                    </div>
                                  )}
                                </div>
                              ) : '-'}
                            </td>
                            <td className="px-2 py-4 text-sm text-gray-900 text-center border-r border-gray-200" style={{ width: '9%', minWidth: '80px', maxWidth: '100px' }}>
                              {progress ? (
                                <div className="space-y-1">
                                  <div className={`font-medium ${
                                    progress.percentage >= 80 ? 'text-green-600' :
                                    progress.percentage >= 60 ? 'text-blue-600' :
                                    progress.percentage > 0 ? 'text-orange-600' : 'text-gray-600'
                                  }`}>
                                    {(progress.percentage || 0).toFixed(2)}%
                                  </div>
                                  {progress.previousAttempts && progress.previousAttempts.length > 0 && (
                                    <div className="text-xs text-gray-500">
                                      أفضل: {Math.max(...progress.previousAttempts.map(p => p.percentage || 0), progress.percentage || 0).toFixed(1)}%
                                    </div>
                                  )}
                                </div>
                              ) : '-'}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900 text-center border-r border-gray-200" style={{ width: '180px', minWidth: '180px', maxWidth: '180px' }}>
                              {isFirstInGroup && cumulativeData.completedExams > 0 ? `${cumulativeData.cumulativePercentage}%` : '-'}
                            </td>
                            <td className="px-4 py-4 text-center border-r border-gray-200" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>
                              {progress ? (
                                <div className="space-y-1">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    progress.status === 'completed' 
                                      ? progress.attemptNumber > 1 ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                                      : progress.status === 'in_progress'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : progress.status === 'unlocked'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {progress.status === 'completed' ? 
                                      (progress.attemptNumber > 1 ? `مكتمل (${progress.attemptNumber})` : 'مكتمل') : 
                                     progress.status === 'in_progress' ? 'قيد التنفيذ' :
                                     progress.status === 'unlocked' ? 'متاح' : 'مقفل'}
                                  </span>
                                  {progress.attemptNumber > 1 && (
                                    <div className="text-xs text-purple-600">
                                      إعادة محاولة
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  غير محدد
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-4 text-sm text-gray-900 text-center border-r border-gray-200" style={{ width: '9%', minWidth: '80px', maxWidth: '100px' }}>
                              {progress && progress.timeSpent ? (
                                <span className="font-medium text-blue-600">
                                  {Math.floor(progress.timeSpent / 60)}:{(progress.timeSpent % 60).toString().padStart(2, '0')}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="px-2 py-4 text-sm text-gray-900 text-center border-r border-gray-200" style={{ width: '12%', minWidth: '100px', maxWidth: '120px' }}>
                              {progress && progress.submittedAt ? (
                                <div className="text-xs">
                                  <div className="font-medium text-gray-900">
                                    {new Date(progress.submittedAt).toLocaleDateString('en-GB')}
                      </div>
                                  <div className="text-gray-500">
                                    {new Date(progress.submittedAt).toLocaleTimeString('en-US', { 
                                      hour: '2-digit', 
                                      minute: '2-digit',
                                      hour12: true
                                    })}
                                  </div>
                                </div>
                              ) : '-'}
                            </td>
                            <td className="px-2 py-4 text-sm text-gray-900 text-center border-r border-gray-200" style={{ width: '9%', minWidth: '80px', maxWidth: '100px' }}>
                              {progress && progress.bestReviewScore ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                  {progress.bestReviewScore.toFixed(2)}%
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
                            <td className="px-2 py-4 text-center border-r border-gray-200" style={{ width: '10%', minWidth: '100px', maxWidth: '120px' }}>
                              <div className="flex justify-center">
                                <input
                                  type="checkbox"
                                  checked={reviewMistakes[exam._id] || false}
                                  onChange={(e) => handleReviewMistakesChange(exam._id, e.target.checked)}
                                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                />
                              </div>
                            </td>
                            <td className="px-2 py-4 text-center sticky right-0 bg-white group-hover:bg-green-50 z-10 shadow-[2px_0_4px_rgba(0,0,0,0.05)] transition-colors duration-200" style={{ width: '180px', minWidth: '180px', maxWidth: '180px', position: 'sticky', right: 0 }}>
                              <div className="flex flex-col space-y-2">
                                {/* Lock/Unlock Controls - Hide for completed exams */}
                                {progress && progress.status !== 'completed' && (
                                  <div className="flex flex-col space-y-1">
                                    {progress.status === 'unlocked' ? (
                                      <button
                                        onClick={() => requestToggleExamAccess(exam._id, exam.title, 'close')}
                                        disabled={togglingExam === exam._id}
                                        className="inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full"
                                      >
                                        {togglingExam === exam._id ? (
                                          <div className="spinner w-3 h-3"></div>
                                        ) : (
                                          <>
                                            <Lock className="w-3 h-3 ml-1" />
                                            <span>قفل</span>
                                          </>
                                        )}
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => requestToggleExamAccess(exam._id, exam.title, 'open')}
                                        disabled={togglingExam === exam._id}
                                        className="inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-500 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full"
                                      >
                                        {togglingExam === exam._id ? (
                                          <div className="spinner w-3 h-3"></div>
                                        ) : (
                                          <>
                                            <Unlock className="w-3 h-3 ml-1" />
                                            <span>فتح</span>
                                          </>
                                        )}
                                      </button>
                                    )}
                                  </div>
                                )}
                                
                                {/* View Answer Button */}
                                {progress && (progress.status === 'completed' || progress.status === 'in_progress') && (
                                  <div className="flex flex-col space-y-1">
                                    <button
                                      onClick={() => handleViewSubmission(exam)}
                                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                                    >
                                      <Eye className="w-3 h-3 ml-1" />
                                      عرض الإجابة
                                    </button>
                                    <button
                                      onClick={() => handleViewMistakes(exam)}
                                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                                    >
                                      <AlertTriangle className="w-3 h-3 ml-1" />
                                      عرض الأخطاء
                                    </button>
                                  </div>
                                )}
                                
                                {/* Reopen Exam Button - Only for completed exams */}
                                {progress && progress.status === 'completed' && (
                                  <div className="flex flex-col space-y-1">
                                    <button
                                      onClick={() => requestReopenExam(exam._id, exam.title)}
                                      disabled={reopeningExam === exam._id}
                                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {reopeningExam === exam._id ? (
                                        <div className="spinner w-3 h-3 ml-1"></div>
                                      ) : (
                                        <RefreshCw className="w-3 h-3 ml-1" />
                                      )}
                                      اعادة فتح
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    }
                  });
                  
                  return rows.length > 0 ? rows : (
                    <tr>
                      <td colSpan="7" className="px-4 py-8 text-center text-sm text-gray-500 bg-gray-50">
                        <div className="flex flex-col items-center">
                          <BookOpen className="w-8 h-8 text-gray-400 mb-2" />
                          <span>لا توجد اختبارات متاحة</span>
                          <span className="text-xs text-gray-400 mt-1">
                            {exams.length === 0 ? 'لم يتم إنشاء أي اختبارات بعد' : 'لا توجد اختبارات في قاعدة البيانات'}
                          </span>
                    </div>
                      </td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
              </div>
            </div>
          </div>


      {/* Lock/Unlock Modal - Temporarily Disabled for Build Fix */}
      {false && showLockUnlockModal && (
        <div>Modal temporarily disabled</div>
      )}

      {/* Student Mistakes Modal */}
      {showMistakes && selectedExamForMistakes && (
        <StudentMistakes
          studentId={studentId}
          examId={selectedExamForMistakes._id}
          examTitle={selectedExamForMistakes.title}
          onClose={handleCloseMistakes}
        />
      )}

      {/* Student Answers Viewer Modal */}
      {showAllAnswers && student && (
        <StudentAnswersViewer
          studentId={studentId}
          studentName={student.name}
          onClose={handleCloseAllAnswers}
        />
      )}

      {/* Student Exam Submission Modal */}
      {showSubmission && selectedExamForSubmission && student && (
        <StudentExamSubmission
          studentId={studentId}
          studentName={student.name}
          examId={selectedExamForSubmission._id}
          examTitle={selectedExamForSubmission.title}
          onClose={handleCloseSubmission}
          allExams={attemptedExams}
        />
      )}

      {/* Lock/Unlock Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={lockDialog.isOpen}
        onClose={cancelToggleExam}
        onConfirm={confirmToggleExam}
        title={lockDialog.action === 'close' ? 'قفل الامتحان' : 'فتح الامتحان'}
        message={`هل أنت متأكد من ${lockDialog.action === 'close' ? 'قفل' : 'فتح'} الامتحان "${lockDialog.examTitle}" للطالب ${student?.name}؟`}
        confirmText={lockDialog.action === 'close' ? 'قفل الامتحان' : 'فتح الامتحان'}
        cancelText="إلغاء"
        type={lockDialog.action === 'close' ? 'danger' : 'primary'}
      />

      {/* Reopen Exam Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={reopenDialog.isOpen}
        onClose={cancelReopenExam}
        onConfirm={confirmReopenExam}
        title="إعادة فتح الامتحان"
        message={`هل أنت متأكد من إعادة فتح الامتحان "${reopenDialog.examTitle}" للطالب ${student?.name}؟ سيتم حذف النتيجة السابقة وإعادة تعيين الامتحان.`}
        confirmText="إعادة فتح الامتحان"
        cancelText="إلغاء"
        type="warning"
      />
    </div>
  );
};

export default StudentProfile;
