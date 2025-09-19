import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Hash, 
  BookOpen,
  Lock,
  Unlock,
  Settings,
  Filter,
  AlertTriangle,
  Eye,
  RefreshCw,
  List
} from 'lucide-react';
import StudentMistakes from '../../components/Exam/StudentMistakes';
import StudentAnswersViewer from '../../components/Exam/StudentAnswersViewer';
import StudentExamSubmission from '../../components/Exam/StudentExamSubmission';

const StudentProfile = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
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

  useEffect(() => {
    console.log('=== STUDENT PROFILE MOUNTED ===');
    console.log('Student ID from URL:', studentId);
    console.log('Student ID type:', typeof studentId);
    console.log('Student ID length:', studentId?.length);
    console.log('Current URL:', window.location.href);
    
    // Validate student ID format
    if (!studentId || studentId.length < 10) {
      console.error('Invalid student ID format:', studentId);
      toast.error('معرف الطالب غير صحيح');
      navigate('/teacher/students');
      return;
    }
    
    const loadData = async () => {
      try {
        setLoading(true);
        console.log('Starting to load data for student:', studentId);
        await Promise.all([
          fetchStudentData(),
          fetchExams()
        ]);
        console.log('Data loading completed successfully');
      } catch (error) {
        console.error('Error loading initial data:', error);
        toast.error('حدث خطأ أثناء تحميل البيانات');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [studentId]);

  // Update progress when student data changes
  useEffect(() => {
    fetchStudentProgress();
  }, [student]);

  // Update attempted exams when student progress changes
  useEffect(() => {
    if (student && student.examProgress) {
      const attempted = student.examProgress
        .filter(progress => progress.status === 'completed' || progress.status === 'in_progress')
        .map(progress => {
          const exam = exams.find(e => e._id === progress.examId);
          return exam;
        })
        .filter(exam => exam); // Remove undefined exams
      
      setAttemptedExams(attempted);
    }
  }, [student, exams]);

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
      if (isRefresh) {
        setRefreshing(true);
      }
      
      console.log('=== FETCHING STUDENT DATA ===');
      console.log('Student ID:', studentId);
      console.log('API URL:', `/api/users/students/${studentId}`);
      console.log('Token present:', !!localStorage.getItem('token'));
      
      const response = await axios.get(`/api/users/students/${studentId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      
      if (response.data && response.data.data) {
        setStudent(response.data.data);
        console.log('Student set successfully:', response.data.data);
        
        // Validate student data
        if (!response.data.data._id || !response.data.data.name) {
          console.error('Invalid student data structure');
          toast.error('بيانات الطالب غير صحيحة');
          navigate('/teacher/students');
          return;
        }
      } else {
        console.error('No student data in response');
        console.error('Response structure:', response.data);
        toast.error('لم يتم العثور على بيانات الطالب');
        navigate('/teacher/students');
        return;
      }
      
      if (isRefresh) {
        toast.success('تم تحديث بيانات الطالب بنجاح');
      }
    } catch (error) {
      console.error('=== STUDENT DATA ERROR ===');
      console.error('Error object:', error);
      console.error('Error message:', error.message);
      console.error('Error response:', error.response);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers
      });
      
      if (error.response?.status === 404) {
        toast.error('الطالب غير موجود');
      } else if (error.response?.status === 401) {
        toast.error('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى');
        localStorage.removeItem('token');
        navigate('/login');
      } else if (error.response?.status === 403) {
        toast.error('ليس لديك صلاحية للوصول إلى بيانات هذا الطالب');
      } else if (error.response?.status >= 500) {
        toast.error('خطأ في الخادم، يرجى المحاولة لاحقاً');
      } else if (!error.response) {
        toast.error('لا يمكن الاتصال بالخادم، تحقق من اتصال الإنترنت');
      } else {
        toast.error(`حدث خطأ أثناء تحميل بيانات الطالب: ${error.response?.data?.message || error.message}`);
      }
      
      navigate('/teacher/students');
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      }
    }
  };

  const fetchExams = async () => {
    try {
      console.log('=== FETCHING EXAMS ===');
      console.log('API URL:', '/api/exams');
      
      const response = await axios.get('/api/exams', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log('=== EXAMS RESPONSE ===');
      console.log('Status:', response.status);
      console.log('Data:', response.data);
      console.log('Exams data:', response.data.data);
      
      if (response.data && response.data.data) {
        setExams(response.data.data);
        console.log('Exams set successfully:', response.data.data.length, 'exams');
        
        // Validate exams data
        if (!Array.isArray(response.data.data)) {
          console.error('Invalid exams data structure - not an array');
          toast.error('بيانات الاختبارات غير صحيحة');
          setExams([]);
          return;
        }
      } else {
        console.error('No exams data in response');
        console.error('Response structure:', response.data);
        toast.error('لم يتم العثور على اختبارات');
        setExams([]);
      }
    } catch (error) {
      console.error('=== EXAMS ERROR ===');
      console.error('Error object:', error);
      console.error('Error message:', error.message);
      console.error('Error response:', error.response);
      
      if (error.response?.status === 401) {
        toast.error('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى');
        localStorage.removeItem('token');
        navigate('/login');
      } else if (error.response?.status === 403) {
        toast.error('ليس لديك صلاحية للوصول إلى الاختبارات');
      } else if (error.response?.status >= 500) {
        toast.error('خطأ في الخادم، يرجى المحاولة لاحقاً');
      } else if (!error.response) {
        toast.error('لا يمكن الاتصال بالخادم، تحقق من اتصال الإنترنت');
      } else {
        toast.error(`حدث خطأ أثناء تحميل الاختبارات: ${error.response?.data?.message || error.message}`);
      }
      setExams([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentProgress = () => {
    console.log('=== FETCHING STUDENT PROGRESS ===');
    console.log('Student:', !!student);
    console.log('Student exam progress:', student?.examProgress);
    
    // Student progress is already available in the student data
    if (student && student.examProgress) {
      console.log('Setting student progress:', student.examProgress.length, 'progress entries');
      setStudentProgress(student.examProgress);
      calculateGroupStatus(student.examProgress);
    } else {
      console.log('No student or exam progress available');
      setStudentProgress([]);
    }
  };

  const calculateGroupStatus = (progress) => {
    console.log('=== CALCULATING GROUP STATUS ===');
    console.log('Progress data:', progress);
    
    const status = {};
    
    // Initialize groups 0-8 as locked
    for (let i = 0; i <= 8; i++) {
      status[i] = 'locked';
    }
    
    if (!progress || !Array.isArray(progress)) {
      console.log('No valid progress data, all groups locked');
      setGroupStatus(status);
      return;
    }
    
    // Check each exam progress
    progress.forEach(progressItem => {
      try {
        const groupNum = progressItem.examId ? progressItem.examId.examGroup : progressItem.examGroup;
        if (groupNum !== undefined && groupNum !== null) {
          if (progressItem.status === 'unlocked' || progressItem.status === 'in_progress' || progressItem.status === 'completed') {
            status[groupNum] = 'unlocked';
          }
        }
      } catch (error) {
        console.error('Error processing progress item:', error, progressItem);
      }
    });
    
    console.log('Final group status:', status);
    setGroupStatus(status);
  };



  const handleLockUnlockExam = async (examId, action) => {
    try {
      console.log('=== HANDLING LOCK/UNLOCK EXAM ===');
      console.log('Exam ID:', examId);
      console.log('Action:', action);
      console.log('Student ID:', studentId);
      
      const endpoint = action === 'lock' ? 'lock-exam' : 'unlock-exam';
      const url = `/api/users/students/${studentId}/${endpoint}`;
      
      console.log('API URL:', url);
      
      const response = await axios.put(url, {
        examId
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log('Lock/Unlock response:', response.data);
      
      toast.success(`تم ${action === 'lock' ? 'قفل' : 'فتح'} الاختبار بنجاح`);
      await fetchStudentData();
    } catch (error) {
      console.error('=== LOCK/UNLOCK EXAM ERROR ===');
      console.error('Error object:', error);
      console.error('Error message:', error.message);
      console.error('Error response:', error.response);
      
      if (error.response?.status === 404) {
        toast.error('الاختبار أو الطالب غير موجود');
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
        toast.error(`حدث خطأ أثناء ${action === 'lock' ? 'قفل' : 'فتح'} الاختبار: ${error.response?.data?.message || error.message}`);
      }
    }
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
      console.error('=== TOGGLE MULTIPLE EXAMS ERROR ===');
      console.error('Error object:', error);
      console.error('Error message:', error.message);
      console.error('Error response:', error.response);
      
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
      console.log('=== TOGGLING GROUP ===');
      console.log('Group number:', groupNumber);
      console.log('Action:', action);
      console.log('Student ID:', studentId);
      
      const response = await axios.put(`/api/users/students/${studentId}/toggle-group`, {
        groupNumber: parseInt(groupNumber),
        action
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log('Toggle group response:', response.data);
      
      toast.success(`تم ${action === 'lock' ? 'قفل' : 'فتح'} المجموعة ${groupNumber} بنجاح`);
      await fetchStudentData();
    } catch (error) {
      console.error('=== TOGGLE GROUP ERROR ===');
      console.error('Error object:', error);
      console.error('Error message:', error.message);
      console.error('Error response:', error.response);
      
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
    console.log('=== VIEWING MISTAKES ===');
    console.log('Exam:', exam);
    console.log('Student:', student);
    
    if (!exam) {
      console.error('No exam provided');
      toast.error('لم يتم العثور على الاختبار');
      return;
    }
    
    if (!student) {
      console.error('No student data available');
      toast.error('لم يتم العثور على بيانات الطالب');
      return;
    }
    
    setSelectedExamForMistakes(exam);
    setShowMistakes(true);
  };

  const handleCloseMistakes = () => {
    console.log('=== CLOSING MISTAKES ===');
    setShowMistakes(false);
    setSelectedExamForMistakes(null);
  };

  const handleViewAllAnswers = () => {
    console.log('=== VIEWING ALL ANSWERS ===');
    console.log('Student:', student);
    
    if (!student) {
      console.error('No student data available');
      toast.error('لم يتم العثور على بيانات الطالب');
      return;
    }
    
    setShowAllAnswers(true);
  };

  const handleCloseAllAnswers = () => {
    console.log('=== CLOSING ALL ANSWERS ===');
    setShowAllAnswers(false);
  };

  const handleViewSubmission = (exam) => {
    console.log('=== VIEWING SUBMISSION ===');
    console.log('Exam:', exam);
    console.log('Student:', student);
    
    if (!exam) {
      console.error('No exam provided');
      toast.error('لم يتم العثور على الاختبار');
      return;
    }
    
    if (!student) {
      console.error('No student data available');
      toast.error('لم يتم العثور على بيانات الطالب');
      return;
    }
    
    setSelectedExamForSubmission(exam);
    setShowSubmission(true);
  };

  const handleCloseSubmission = () => {
    console.log('=== CLOSING SUBMISSION ===');
    setShowSubmission(false);
    setSelectedExamForSubmission(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">الطالب غير موجود</h2>
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
                {/* Group 0 - اختبارات التأسيس */}
                <div className="text-center">
                  <div className={`w-8 h-8 rounded-full mx-auto mb-1 flex items-center justify-center text-white text-xs font-bold ${
                    groupStatus[0] === 'unlocked' ? 'bg-blue-500' : 'bg-gray-500'
                  }`}>
                    ت
                  </div>
                  <div className="text-xs text-gray-600">
                    {groupStatus[0] === 'unlocked' ? 'مفتوحة' : 'مقفلة'}
                  </div>
                </div>
                {/* Groups 1-8 */}
                {Array.from({ length: 8 }, (_, i) => i + 1).map((groupNum) => {
                  const isUnlocked = groupStatus[groupNum] === 'unlocked';
                  return (
                    <div key={groupNum} className="text-center">
                      <div className={`w-8 h-8 rounded-full mx-auto mb-1 flex items-center justify-center text-white text-xs font-bold ${
                        isUnlocked ? 'bg-green-500' : 'bg-red-500'
                      }`}>
                        {groupNum}
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
                {exams.length} اختبار متاح
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 9 }, (_, i) => i).map(groupNum => {
                const groupExams = exams.filter(exam => exam.examGroup === groupNum);
                
                if (groupExams.length === 0) return null;
                
                // Calculate group statistics
                const groupProgress = groupExams.map(exam => 
                  student?.examProgress?.find(p => p.examId === exam._id)
                ).filter(Boolean);
                
                const completedExams = groupProgress.filter(p => p.status === 'completed').length;
                const avgScore = groupProgress.length > 0 
                  ? Math.round(groupProgress.reduce((sum, p) => sum + (p.percentage || 0), 0) / groupProgress.length)
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
                            {groupNum === 0 ? 'اختبارات التأسيس' : `المجموعة ${groupNum}`}
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
                        const progress = student?.examProgress?.find(p => p.examId === exam._id);
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
              })}
            </div>
          </div>
          
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200" style={{ 
              tableLayout: 'fixed',
              width: '1710px',
              minWidth: '1710px'
            }}>
              <thead className="bg-gray-50 sticky top-0 z-20">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200" style={{ 
                    width: '180px',
                    minWidth: '180px',
                    maxWidth: '180px'
                  }}>
                    اسم المجموعة
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200" style={{ 
                    width: '300px',
                    minWidth: '300px',
                    maxWidth: '300px'
                  }}>
                    اسم الاختبار
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200" style={{ 
                    width: '120px',
                    minWidth: '120px',
                    maxWidth: '120px'
                  }}>
                    النقاط
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200" style={{ 
                    width: '120px',
                    minWidth: '120px',
                    maxWidth: '120px'
                  }}>
                    النسبة المئوية
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200" style={{ 
                    width: '180px',
                    minWidth: '180px',
                    maxWidth: '180px'
                  }}>
                    النسبة التراكمية
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200" style={{ 
                    width: '120px',
                    minWidth: '120px',
                    maxWidth: '120px'
                  }}>
                    الحالة
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200" style={{ 
                    width: '120px',
                    minWidth: '120px',
                    maxWidth: '120px'
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
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider" style={{ 
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
                  
                  // Initialize groups (0-8, group 0 is foundation tests)
                  for (let i = 0; i <= 8; i++) {
                    groupedExams[i] = [];
                    groupCumulative[i] = { totalScore: 0, totalQuestions: 0, completedExams: 0 };
                  }
                  
                  // Group exams and calculate cumulative data
                  exams.forEach(exam => {
                    const groupNum = exam.examGroup;
                    const progress = studentProgress.find(p => p.examId && p.examId._id === exam._id);
                    
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
                  
                  // Render group 0 first (اختبارات التأسيس)
                  if (groupedExams[0] && groupedExams[0].length > 0) {
                    groupedExams[0].forEach((item, index) => {
                      const { exam, progress } = item;
                      const isFirstInGroup = index === 0;
                      const cumulativeData = groupCumulative[0];
                      
                      rows.push(
                        <tr key={exam._id} data-exam-id={exam._id} className={`${progress?.status === 'completed' ? 'bg-green-50' : progress?.status === 'in_progress' ? 'bg-yellow-50' : 'bg-gray-50'} hover:bg-gray-100 transition-colors`}>
                          <td className="px-4 py-4 text-sm font-medium text-gray-900 border-r border-gray-200" style={{ width: '180px', minWidth: '180px', maxWidth: '180px' }}>
                            {isFirstInGroup && (
                              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                <span className="font-semibold text-blue-700">اختبارات التأسيس</span>
                                {cumulativeData.completedExams > 0 && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {cumulativeData.cumulativePercentage.toFixed(2)}%
                  </span>
                                )}
                </div>
                            )}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900 border-r border-gray-200" style={{ width: '300px', minWidth: '300px', maxWidth: '300px' }}>
                            <div className="truncate" title={exam.title}>
                              {exam.title}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900 text-right border-r border-gray-200" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>
                            {progress ? `${progress.score || 0}/${progress.totalQuestions || exam.totalQuestions || 0}` : '-'}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900 text-right border-r border-gray-200" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>
                            {progress ? `${(progress.percentage || 0).toFixed(2)}%` : '-'}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900 text-right border-r border-gray-200" style={{ width: '180px', minWidth: '180px', maxWidth: '180px' }}>
                            {isFirstInGroup && cumulativeData.completedExams > 0 ? `${cumulativeData.cumulativePercentage}%` : '-'}
                          </td>
                          <td className="px-4 py-4 text-right border-r border-gray-200" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>
                            {progress ? (
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                progress.status === 'completed' 
                                  ? 'bg-green-100 text-green-800'
                                  : progress.status === 'in_progress'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : progress.status === 'unlocked'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {progress.status === 'completed' ? 'مكتمل' : 
                                 progress.status === 'in_progress' ? 'قيد التنفيذ' :
                                 progress.status === 'unlocked' ? 'متاح' : 'مقفل'}
                  </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                غير محدد
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900 text-center border-r border-gray-200" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>
                            {progress && progress.timeSpent ? (
                              <span className="font-medium text-blue-600">
                                {Math.floor(progress.timeSpent / 60)}:{(progress.timeSpent % 60).toString().padStart(2, '0')}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900 text-center border-r border-gray-200" style={{ width: '150px', minWidth: '150px', maxWidth: '150px' }}>
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
                          <td className="px-4 py-4 text-sm text-gray-900 text-center border-r border-gray-200" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>
                            {progress && progress.bestReviewScore ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                {progress.bestReviewScore.toFixed(2)}%
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-center" style={{ width: '180px', minWidth: '180px', maxWidth: '180px' }}>
                            {progress && (progress.status === 'completed' || progress.status === 'in_progress') ? (
                              <div className="flex flex-col space-y-2">
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
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    });
                  }
                  
                  // Render groups 1-8
                  for (let groupNum = 1; groupNum <= 8; groupNum++) {
                    if (groupedExams[groupNum] && groupedExams[groupNum].length > 0) {
                      groupedExams[groupNum].forEach((item, index) => {
                        const { exam, progress } = item;
                        const isFirstInGroup = index === 0;
                        const cumulativeData = groupCumulative[groupNum];
                        
                        rows.push(
                          <tr key={exam._id} data-exam-id={exam._id} className={`${progress?.status === 'completed' ? 'bg-green-50' : progress?.status === 'in_progress' ? 'bg-yellow-50' : 'bg-gray-50'} hover:bg-gray-100 transition-colors`}>
                            <td className="px-4 py-4 text-sm font-medium text-gray-900 border-r border-gray-200" style={{ width: '180px', minWidth: '180px', maxWidth: '180px' }}>
                              {isFirstInGroup && (
                                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                  <span className="font-semibold">المجموعة {groupNum}</span>
                                  {cumulativeData.completedExams > 0 && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                      {cumulativeData.cumulativePercentage.toFixed(2)}%
                                    </span>
                                  )}
        </div>
                              )}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900 border-r border-gray-200" style={{ width: '300px', minWidth: '300px', maxWidth: '300px' }}>
                              <div className="truncate" title={exam.title}>
                                {exam.title}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900 text-center border-r border-gray-200" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>
                              {progress ? `${progress.score || 0}/${progress.totalQuestions || exam.totalQuestions || 0}` : '-'}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900 text-center border-r border-gray-200" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>
                              {progress ? `${(progress.percentage || 0).toFixed(2)}%` : '-'}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900 text-center border-r border-gray-200" style={{ width: '180px', minWidth: '180px', maxWidth: '180px' }}>
                              {isFirstInGroup && cumulativeData.completedExams > 0 ? `${cumulativeData.cumulativePercentage}%` : '-'}
                            </td>
                            <td className="px-4 py-4 text-center border-r border-gray-200" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>
                              {progress ? (
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  progress.status === 'completed' 
                                    ? 'bg-green-100 text-green-800'
                                    : progress.status === 'in_progress'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : progress.status === 'unlocked'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {progress.status === 'completed' ? 'مكتمل' : 
                                   progress.status === 'in_progress' ? 'قيد التنفيذ' :
                                   progress.status === 'unlocked' ? 'متاح' : 'مقفل'}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  غير محدد
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900 text-center border-r border-gray-200" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>
                              {progress && progress.timeSpent ? (
                                <span className="font-medium text-blue-600">
                                  {Math.floor(progress.timeSpent / 60)}:{(progress.timeSpent % 60).toString().padStart(2, '0')}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900 text-center border-r border-gray-200" style={{ width: '150px', minWidth: '150px', maxWidth: '150px' }}>
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
                            <td className="px-4 py-4 text-sm text-gray-900 text-center border-r border-gray-200" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>
                              {progress && progress.bestReviewScore ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                  {progress.bestReviewScore.toFixed(2)}%
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-center" style={{ width: '180px', minWidth: '180px', maxWidth: '180px' }}>
                              {progress && (progress.status === 'completed' || progress.status === 'in_progress') ? (
                                <div className="flex flex-col space-y-2">
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
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      });
                    }
                  }
                  
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

      {/* Lock/Unlock Controls */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">إدارة قفل وفتح الاختبارات</h3>
          <p className="text-sm text-gray-600 mt-1">قفل أو فتح اختبارات محددة أو مجموعات كاملة للطالب</p>
        </div>
        <div className="card-body">
          <div className="flex justify-center">
            {/* Lock/Unlock Specific Exams */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-3 rtl:space-x-reverse mb-4">
                <div className="h-12 w-12 rounded-full bg-orange-500 flex items-center justify-center">
                  <Settings className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-orange-900">قفل/فتح اختبارات محددة</h4>
                  <p className="text-sm text-orange-700">اختر اختبارات معينة لقفلها أو فتحها للطالب</p>
                </div>
              </div>
              <div className="flex space-x-2 rtl:space-x-reverse">
                <button
                  onClick={async () => {
                    setLockUnlockAction('lock');
                    // Refresh data before opening modal
                    await fetchStudentData();
                    setShowLockUnlockModal(true);
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 rtl:space-x-reverse"
                >
                  <Lock className="h-4 w-4" />
                  <span>قفل اختبارات</span>
                </button>
                <button
                  onClick={async () => {
                    setLockUnlockAction('unlock');
                    // Refresh data before opening modal
                    await fetchStudentData();
                    setShowLockUnlockModal(true);
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 rtl:space-x-reverse"
                >
                  <Unlock className="h-4 w-4" />
                  <span>فتح اختبارات</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>



      {/* Lock/Unlock Modal */}
      {showLockUnlockModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className={`${lockUnlockAction === 'lock' ? 'bg-red-600' : 'bg-green-600'} text-white px-6 py-4`}>
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                {lockUnlockAction === 'lock' ? <Lock className="h-6 w-6" /> : <Unlock className="h-6 w-6" />}
                <div>
                  <h3 className="text-lg font-semibold">
                    {lockUnlockAction === 'lock' ? 'قفل الاختبارات المحددة' : 'فتح الاختبارات المحددة'}
                    {selectedExams.length > 0 && (
                      <span className="mr-2 text-sm font-normal">
                        ({selectedExams.length} محدد)
                      </span>
                    )}
                  </h3>
                  <p className={`${lockUnlockAction === 'lock' ? 'text-red-100' : 'text-green-100'} text-sm`}>
                    اختر الاختبارات التي تريد {lockUnlockAction === 'lock' ? 'قفلها' : 'فتحها'} للطالب
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              {/* Bulk Selection Controls */}
              <div className="mb-6 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <button
                        onClick={() => {
                          const examsWithStatus = exams.map(exam => {
                            const progress = studentProgress.find(p => p.examId === exam._id);
                            return {
                              ...exam,
                              status: progress ? progress.status : 'locked'
                            };
                          });
                          
                          const filteredExams = examsWithStatus.filter(exam => {
                            if (lockUnlockAction === 'unlock') {
                              return exam.status === 'locked';
                            } else if (lockUnlockAction === 'lock') {
                              return exam.status === 'unlocked';
                            }
                            return false;
                          });
                          
                          if (selectedExams.length === filteredExams.length) {
                            setSelectedExams([]);
                          } else {
                            setSelectedExams(filteredExams.map(exam => exam._id));
                          }
                        }}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      (() => {
                        const examsWithStatus = exams.map(exam => {
                          const progress = studentProgress.find(p => p.examId === exam._id);
                          return {
                            ...exam,
                            status: progress ? progress.status : 'locked'
                          };
                        });
                        
                        const filteredExams = examsWithStatus.filter(exam => {
                          if (lockUnlockAction === 'unlock') {
                            return exam.status === 'locked';
                          } else if (lockUnlockAction === 'lock') {
                            return exam.status === 'unlocked';
                          }
                          return false;
                        });
                        
                        return selectedExams.length === filteredExams.length;
                      })()
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    {(() => {
                      const examsWithStatus = exams.map(exam => {
                        const progress = studentProgress.find(p => p.examId === exam._id);
                        return {
                          ...exam,
                          status: progress ? progress.status : 'locked'
                        };
                      });
                      
                      const filteredExams = examsWithStatus.filter(exam => {
                        if (lockUnlockAction === 'unlock') {
                          return exam.status === 'locked';
                        } else if (lockUnlockAction === 'lock') {
                          return exam.status === 'unlocked';
                        }
                        return false;
                      });
                      
                      return selectedExams.length === filteredExams.length ? 'إلغاء الكل' : 'تحديد الكل';
                    })()}
                  </button>
                  
                  {/* Select by Group */}
                  {Array.from({ length: 9 }, (_, i) => i).map(groupNum => {
                    const groupExams = exams.filter(exam => {
                      // First filter by group
                      if (exam.examGroup !== groupNum) return false;
                      
                      // Then filter by status based on modal action
                      const progress = studentProgress.find(p => p.examId === exam._id);
                      const examStatus = progress ? progress.status : 'locked';
                      
                      if (lockUnlockAction === 'unlock') {
                        return examStatus === 'locked';
                      } else if (lockUnlockAction === 'lock') {
                        return examStatus === 'unlocked';
                      }
                      return false;
                    });
                    
                    const groupSelected = groupExams.filter(exam => selectedExams.includes(exam._id));
                    const isAllSelected = groupExams.length > 0 && groupSelected.length === groupExams.length;
                    const isPartiallySelected = groupSelected.length > 0 && groupSelected.length < groupExams.length;
                    
                    if (groupExams.length === 0) return null;
                    
                    return (
                      <button
                        key={groupNum}
                        onClick={() => {
                          if (isAllSelected) {
                            // Deselect all exams in this group
                            setSelectedExams(selectedExams.filter(id => 
                              !groupExams.some(exam => exam._id === id)
                            ));
                          } else {
                            // Select all exams in this group
                            const groupExamIds = groupExams.map(exam => exam._id);
                            setSelectedExams([...new Set([...selectedExams, ...groupExamIds])]);
                          }
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isAllSelected
                            ? 'bg-green-200 text-green-700 hover:bg-green-300'
                            : isPartiallySelected
                            ? 'bg-yellow-200 text-yellow-700 hover:bg-yellow-300'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {groupNum === 0 ? 'اختبارات التأسيس' : `المجموعة ${groupNum}`}
                        {isPartiallySelected && ` (${groupSelected.length}/${groupExams.length})`}
                      </button>
                    );
                  })}
                </div>
                
                
                {/* Selection Summary */}
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span>تم تحديد: {selectedExams.length} من {(() => {
                      const examsWithStatus = exams.map(exam => {
                        const progress = studentProgress.find(p => p.examId === exam._id);
                        return {
                          ...exam,
                          status: progress ? progress.status : 'locked'
                        };
                      });
                      
                      const filteredExams = examsWithStatus.filter(exam => {
                        if (lockUnlockAction === 'unlock') {
                          return exam.status === 'locked';
                        } else if (lockUnlockAction === 'lock') {
                          return exam.status === 'unlocked';
                        }
                        return false;
                      });
                      
                      return filteredExams.length;
                    })()} اختبار</span>
                    {selectedExams.length > 0 && (
                      <button
                        onClick={() => setSelectedExams([])}
                        className="text-red-600 hover:text-red-800 font-medium"
                      >
                        مسح التحديد
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="max-h-96 overflow-y-auto space-y-3">
                {(() => {
                  // Get all exams with their status
                  const examsWithStatus = exams.map(exam => {
                    const progress = studentProgress.find(p => p.examId === exam._id);
                    return {
                      ...exam,
                      status: progress ? progress.status : 'locked'
                    };
                  });
                  
                  // Filter based on modal action
                  const filteredExams = examsWithStatus.filter(exam => {
                    if (lockUnlockAction === 'unlock') {
                      return exam.status === 'locked';
                    } else if (lockUnlockAction === 'lock') {
                      return exam.status === 'unlocked';
                    }
                    return false;
                  });
                  
                  
                  // Show empty state if no exams match
                  if (filteredExams.length === 0) {
                    return (
                      <div className="text-center py-8">
                        <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="text-gray-500 mt-2">
                          {lockUnlockAction === 'unlock' 
                            ? 'لا توجد اختبارات مقفلة لفتحها' 
                            : 'لا توجد اختبارات مفتوحة لقفلها'
                          }
                        </p>
                      </div>
                    );
                  }
                  
                  // Render filtered exams
                  return filteredExams.map((exam) => {
                    const progress = studentProgress.find(p => p.examId === exam._id);
                    const examStatus = progress ? progress.status : 'locked';
                    
                    
                    return (
                      <label key={exam._id} className={`flex items-center space-x-3 rtl:space-x-reverse p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer ${
                        selectedExams.includes(exam._id) 
                          ? 'border-blue-300 bg-blue-50' 
                          : examStatus === 'completed'
                          ? 'border-green-200 bg-green-50'
                          : examStatus === 'in_progress'
                          ? 'border-yellow-200 bg-yellow-50'
                          : examStatus === 'unlocked'
                          ? 'border-blue-200 bg-blue-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}>
                      <input
                        type="checkbox"
                        checked={selectedExams.includes(exam._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedExams([...selectedExams, exam._id]);
                          } else {
                            setSelectedExams(selectedExams.filter(id => id !== exam._id));
                          }
                        }}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1">
                          <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-gray-900">{exam.title.replace(/ - /g, ' ')}</div>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              examStatus === 'completed' 
                                ? 'bg-green-100 text-green-800'
                                : examStatus === 'in_progress'
                                ? 'bg-yellow-100 text-yellow-800'
                                : examStatus === 'unlocked'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {examStatus === 'completed' ? 'مكتمل' : 
                               examStatus === 'in_progress' ? 'قيد التنفيذ' :
                               examStatus === 'unlocked' ? 'متاح' : ''}
                            </span>
                          </div>
                        <div className="text-sm text-gray-500 mt-1">
                            {exam.examGroup === 0 ? 'اختبارات التأسيس' : `المجموعة ${exam.examGroup}`} • {exam.totalQuestions || 0} أسئلة
                            {progress && progress.percentage > 0 && (
                              <span className="mr-2">• {progress.percentage.toFixed(2)}%</span>
                            )}
                        </div>
                      </div>
                    </label>
                    );
                  });
                })()}
              </div>
            </div>
            {/* Fixed Footer with Buttons */}
            <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-600">
                {selectedExams.length > 0 && `تم اختيار ${selectedExams.length} اختبار`}
              </div>
              <div className="flex space-x-3 rtl:space-x-reverse">
                <button
                  onClick={async () => {
                    setShowLockUnlockModal(false);
                    setSelectedExams([]);
                    // Refresh data when modal is closed
                    await fetchStudentData();
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleToggleMultipleExams}
                  disabled={selectedExams.length === 0}
                  className={`px-4 py-2 ${lockUnlockAction === 'lock' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors`}
                >
                  {lockUnlockAction === 'lock' ? 'قفل الاختبارات المحددة' : 'فتح الاختبارات المحددة'} ({selectedExams.length})
                </button>
              </div>
            </div>
          </div>
        </div>
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
    </div>
  );
};

export default StudentProfile;
