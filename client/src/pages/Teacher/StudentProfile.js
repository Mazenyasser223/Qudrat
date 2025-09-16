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
  RefreshCw
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
  const [lockUnlockAction, setLockUnlockAction] = useState('lock'); // 'lock' or 'unlock'
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
    fetchStudentData();
    fetchExams();
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
      
      const response = await axios.get(`/api/users/students/${studentId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setStudent(response.data.data);
      
      if (isRefresh) {
        toast.success('تم تحديث بيانات الطالب بنجاح');
      }
    } catch (error) {
      console.error('Error fetching student:', error);
      toast.error('حدث خطأ أثناء تحميل بيانات الطالب');
      navigate('/teacher/students');
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      }
    }
  };

  const fetchExams = async () => {
    try {
      const response = await axios.get('/api/exams', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setExams(response.data.data);
    } catch (error) {
      console.error('Error fetching exams:', error);
      toast.error('حدث خطأ أثناء تحميل الامتحانات');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentProgress = () => {
    // Student progress is already available in the student data
    if (student && student.examProgress) {
      setStudentProgress(student.examProgress);
      calculateGroupStatus(student.examProgress);
    }
  };

  const calculateGroupStatus = (progress) => {
    const status = {};
    
    // Initialize groups 0-8 as locked
    for (let i = 0; i <= 8; i++) {
      status[i] = 'locked';
    }
    
    // Check each exam progress
    progress.forEach(progressItem => {
      const groupNum = progressItem.examId ? progressItem.examId.examGroup : progressItem.examGroup;
      if (progressItem.status === 'unlocked' || progressItem.status === 'in_progress' || progressItem.status === 'completed') {
        status[groupNum] = 'unlocked';
      }
    });
    
    setGroupStatus(status);
  };



  const handleLockUnlockExam = async (examId, action) => {
    try {
      const endpoint = action === 'lock' ? 'lock-exam' : 'unlock-exam';
      await axios.put(`/api/users/students/${studentId}/${endpoint}`, {
        examId
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      toast.success(`تم ${action === 'lock' ? 'قفل' : 'فتح'} الامتحان بنجاح`);
      fetchStudentData();
    } catch (error) {
      console.error(`Error ${action}ing exam:`, error);
      toast.error(`حدث خطأ أثناء ${action === 'lock' ? 'قفل' : 'فتح'} الامتحان`);
    }
  };

  const handleToggleMultipleExams = async () => {
    try {
      await axios.put(`/api/users/students/${studentId}/toggle-exams`, {
        examIds: selectedExams,
        action: lockUnlockAction
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      toast.success(`تم ${lockUnlockAction === 'lock' ? 'قفل' : 'فتح'} الامتحانات المحددة بنجاح`);
      setShowLockUnlockModal(false);
      setSelectedExams([]);
      fetchStudentData();
    } catch (error) {
      console.error('Error toggling exams:', error);
      toast.error(`حدث خطأ أثناء ${lockUnlockAction === 'lock' ? 'قفل' : 'فتح'} الامتحانات`);
    }
  };

  const handleToggleGroup = async (groupNumber, action) => {
    try {
      await axios.put(`/api/users/students/${studentId}/toggle-group`, {
        groupNumber: parseInt(groupNumber),
        action
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      toast.success(`تم ${action === 'lock' ? 'قفل' : 'فتح'} المجموعة ${groupNumber} بنجاح`);
      fetchStudentData();
    } catch (error) {
      console.error('Error toggling group:', error);
      toast.error(`حدث خطأ أثناء ${action === 'lock' ? 'قفل' : 'فتح'} المجموعة`);
    }
  };

  const handleViewMistakes = (exam) => {
    setSelectedExamForMistakes(exam);
    setShowMistakes(true);
  };

  const handleCloseMistakes = () => {
    setShowMistakes(false);
    setSelectedExamForMistakes(null);
  };

  const handleViewAllAnswers = () => {
    setShowAllAnswers(true);
  };

  const handleCloseAllAnswers = () => {
    setShowAllAnswers(false);
  };

  const handleViewSubmission = (exam) => {
    setSelectedExamForSubmission(exam);
    setShowSubmission(true);
  };

  const handleCloseSubmission = () => {
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
                <p className="text-gray-600">تتبع تقدم الطالب وإدارة امتحاناته</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <button
                onClick={() => {
                  fetchStudentData(true);
                  fetchExams();
                }}
                disabled={refreshing}
                className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="تحديث بيانات الطالب"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>تحديث</span>
              </button>
              <button
                onClick={handleViewAllAnswers}
                className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                title="عرض جميع إجابات الطالب"
              >
                <Eye className="h-4 w-4" />
                <span>عرض جميع الإجابات</span>
              </button>
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
          <h3 className="text-lg font-semibold text-gray-900">حالة الامتحانات الحالية</h3>
          <p className="text-sm text-gray-600 mt-1">نظرة عامة على حالة المجموعات والامتحانات للطالب</p>
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
            <p className="text-sm text-gray-600 mt-1">تفاصيل كاملة عن أداء الطالب في جميع الامتحانات</p>
          </div>
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200" style={{ 
              tableLayout: 'fixed',
              width: '1590px',
              minWidth: '1590px'
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
                    اسم الامتحان
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
                        groupCumulative[groupNum].totalQuestions += progress.totalQuestions || exam.questions.length;
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
                        <tr key={exam._id} className={`${progress?.status === 'completed' ? 'bg-green-50' : progress?.status === 'in_progress' ? 'bg-yellow-50' : 'bg-gray-50'} hover:bg-gray-100 transition-colors`}>
                          <td className="px-4 py-4 text-sm font-medium text-gray-900 border-r border-gray-200" style={{ width: '180px', minWidth: '180px', maxWidth: '180px' }}>
                            {isFirstInGroup && (
                              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                <span className="font-semibold text-blue-700">اختبارات التأسيس</span>
                                {cumulativeData.completedExams > 0 && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {cumulativeData.cumulativePercentage}%
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
                            {progress ? `${progress.score || 0}/${progress.totalQuestions || exam.questions.length}` : '-'}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900 text-center border-r border-gray-200" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>
                            {progress ? `${progress.percentage || 0}%` : '-'}
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
                                  {new Date(progress.submittedAt).toLocaleDateString('ar-SA')}
                </div>
                                <div className="text-gray-500">
                                  {new Date(progress.submittedAt).toLocaleTimeString('ar-SA', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
              </div>
            </div>
                            ) : '-'}
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
                              <span className="text-gray-400 text-xs">غير متاح</span>
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
                          <tr key={exam._id} className={`${progress?.status === 'completed' ? 'bg-green-50' : progress?.status === 'in_progress' ? 'bg-yellow-50' : 'bg-gray-50'} hover:bg-gray-100 transition-colors`}>
                            <td className="px-4 py-4 text-sm font-medium text-gray-900 border-r border-gray-200" style={{ width: '180px', minWidth: '180px', maxWidth: '180px' }}>
                              {isFirstInGroup && (
                                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                  <span className="font-semibold">المجموعة {groupNum}</span>
                                  {cumulativeData.completedExams > 0 && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                      {cumulativeData.cumulativePercentage}%
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
                              {progress ? `${progress.score || 0}/${progress.totalQuestions || exam.questions.length}` : '-'}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900 text-center border-r border-gray-200" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>
                              {progress ? `${progress.percentage || 0}%` : '-'}
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
                                    {new Date(progress.submittedAt).toLocaleDateString('ar-SA')}
                                  </div>
                                  <div className="text-gray-500">
                                    {new Date(progress.submittedAt).toLocaleTimeString('ar-SA', { 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    })}
                                  </div>
                                </div>
                              ) : '-'}
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
                                <span className="text-gray-400 text-xs">غير متاح</span>
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
                          <span>لا توجد امتحانات متاحة</span>
                          <span className="text-xs text-gray-400 mt-1">
                            {exams.length === 0 ? 'لم يتم إنشاء أي امتحانات بعد' : 'لا توجد امتحانات في قاعدة البيانات'}
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
          <h3 className="text-lg font-semibold text-gray-900">إدارة قفل وفتح الامتحانات</h3>
          <p className="text-sm text-gray-600 mt-1">قفل أو فتح امتحانات محددة أو مجموعات كاملة للطالب</p>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Lock/Unlock Specific Exams */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-3 rtl:space-x-reverse mb-4">
                <div className="h-12 w-12 rounded-full bg-orange-500 flex items-center justify-center">
                  <Settings className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-orange-900">قفل/فتح امتحانات محددة</h4>
                  <p className="text-sm text-orange-700">اختر امتحانات معينة لقفلها أو فتحها للطالب</p>
                </div>
              </div>
              <div className="flex space-x-2 rtl:space-x-reverse">
                <button
                  onClick={() => {
                    setLockUnlockAction('lock');
                    setShowLockUnlockModal(true);
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 rtl:space-x-reverse"
                >
                  <Lock className="h-4 w-4" />
                  <span>قفل امتحانات</span>
                </button>
                <button
                  onClick={() => {
                    setLockUnlockAction('unlock');
                    setShowLockUnlockModal(true);
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 rtl:space-x-reverse"
                >
                  <Unlock className="h-4 w-4" />
                  <span>فتح امتحانات</span>
                </button>
              </div>
            </div>

            {/* Lock/Unlock Groups */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-3 rtl:space-x-reverse mb-4">
                <div className="h-12 w-12 rounded-full bg-purple-500 flex items-center justify-center">
                  <Filter className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-purple-900">قفل/فتح مجموعات كاملة</h4>
                  <p className="text-sm text-purple-700">قفل أو فتح جميع امتحانات مجموعة معينة</p>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {/* Group 0 - اختبارات التأسيس */}
                <div className="flex flex-col space-y-1">
                  <div className="text-center text-sm font-medium text-gray-700 flex items-center justify-center space-x-1 rtl:space-x-reverse">
                    <span>اختبارات التأسيس</span>
                    {groupStatus[0] === 'unlocked' ? (
                      <div className="w-2 h-2 bg-blue-500 rounded-full" title="مفتوحة"></div>
                    ) : (
                      <div className="w-2 h-2 bg-gray-500 rounded-full" title="مقفلة"></div>
                    )}
                  </div>
                  <div className="flex space-x-1 rtl:space-x-reverse">
                    <button
                      onClick={() => handleToggleGroup(0, 'lock')}
                      className={`flex-1 px-2 py-1 rounded text-xs transition-colors ${
                        groupStatus[0] === 'unlocked' 
                          ? 'bg-red-500 hover:bg-red-600 text-white' 
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                      title="قفل اختبارات التأسيس"
                      disabled={groupStatus[0] !== 'unlocked'}
                    >
                      <Lock className="h-3 w-3 mx-auto" />
                    </button>
                    <button
                      onClick={() => handleToggleGroup(0, 'unlock')}
                      className={`flex-1 px-2 py-1 rounded text-xs transition-colors ${
                        groupStatus[0] !== 'unlocked' 
                          ? 'bg-green-500 hover:bg-green-600 text-white' 
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                      title="فتح اختبارات التأسيس"
                      disabled={groupStatus[0] === 'unlocked'}
                    >
                      <Unlock className="h-3 w-3 mx-auto" />
                    </button>
                  </div>
                </div>
                {/* Groups 1-8 */}
                {Array.from({ length: 8 }, (_, i) => i + 1).map((groupNum) => {
                  const isUnlocked = groupStatus[groupNum] === 'unlocked';
                  return (
                    <div key={groupNum} className="flex flex-col space-y-1">
                      <div className="text-center text-sm font-medium text-gray-700 flex items-center justify-center space-x-1 rtl:space-x-reverse">
                        <span>المجموعة {groupNum}</span>
                        {isUnlocked ? (
                          <div className="w-2 h-2 bg-green-500 rounded-full" title="مفتوحة"></div>
                        ) : (
                          <div className="w-2 h-2 bg-red-500 rounded-full" title="مقفلة"></div>
                        )}
                      </div>
                      <div className="flex space-x-1 rtl:space-x-reverse">
                        <button
                          onClick={() => handleToggleGroup(groupNum, 'lock')}
                          className={`flex-1 px-2 py-1 rounded text-xs transition-colors ${
                            isUnlocked 
                              ? 'bg-red-500 hover:bg-red-600 text-white' 
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                          title={`قفل المجموعة ${groupNum}`}
                          disabled={!isUnlocked}
                        >
                          <Lock className="h-3 w-3 mx-auto" />
                        </button>
                        <button
                          onClick={() => handleToggleGroup(groupNum, 'unlock')}
                          className={`flex-1 px-2 py-1 rounded text-xs transition-colors ${
                            !isUnlocked 
                              ? 'bg-green-500 hover:bg-green-600 text-white' 
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                          title={`فتح المجموعة ${groupNum}`}
                          disabled={isUnlocked}
                        >
                          <Unlock className="h-3 w-3 mx-auto" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* Lock/Unlock Modal */}
      {showLockUnlockModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className={`${lockUnlockAction === 'lock' ? 'bg-red-600' : 'bg-green-600'} text-white px-6 py-4`}>
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                {lockUnlockAction === 'lock' ? <Lock className="h-6 w-6" /> : <Unlock className="h-6 w-6" />}
                <div>
                  <h3 className="text-lg font-semibold">
                    {lockUnlockAction === 'lock' ? 'قفل الامتحانات المحددة' : 'فتح الامتحانات المحددة'}
                    {selectedExams.length > 0 && (
                      <span className="mr-2 text-sm font-normal">
                        ({selectedExams.length} محدد)
                      </span>
                    )}
                  </h3>
                  <p className={`${lockUnlockAction === 'lock' ? 'text-red-100' : 'text-green-100'} text-sm`}>
                    اختر الامتحانات التي تريد {lockUnlockAction === 'lock' ? 'قفلها' : 'فتحها'} للطالب
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {/* Bulk Selection Controls */}
              <div className="mb-6 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      if (selectedExams.length === exams.length) {
                        setSelectedExams([]);
                      } else {
                        setSelectedExams(exams.map(exam => exam._id));
                      }
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedExams.length === exams.length
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    {selectedExams.length === exams.length ? 'إلغاء الكل' : 'تحديد الكل'}
                  </button>
                  
                  {/* Select by Group */}
                  {Array.from({ length: 9 }, (_, i) => i).map(groupNum => {
                    const groupExams = exams.filter(exam => exam.examGroup === groupNum);
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
                
                {/* Select by Status */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      const lockedExams = exams.filter(exam => {
                        const progress = studentProgress.find(p => p.examId === exam._id);
                        return !progress || progress.status === 'locked';
                      });
                      const lockedIds = lockedExams.map(exam => exam._id);
                      setSelectedExams([...new Set([...selectedExams, ...lockedIds])]);
                    }}
                    className="px-3 py-2 rounded-lg text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                  >
                    تحديد المقفلة
                  </button>
                  
                  <button
                    onClick={() => {
                      const unlockedExams = exams.filter(exam => {
                        const progress = studentProgress.find(p => p.examId === exam._id);
                        return progress && progress.status === 'unlocked';
                      });
                      const unlockedIds = unlockedExams.map(exam => exam._id);
                      setSelectedExams([...new Set([...selectedExams, ...unlockedIds])]);
                    }}
                    className="px-3 py-2 rounded-lg text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                  >
                    تحديد المفتوحة
                  </button>
                  
                  <button
                    onClick={() => {
                      const completedExams = exams.filter(exam => {
                        const progress = studentProgress.find(p => p.examId === exam._id);
                        return progress && progress.status === 'completed';
                      });
                      const completedIds = completedExams.map(exam => exam._id);
                      setSelectedExams([...new Set([...selectedExams, ...completedIds])]);
                    }}
                    className="px-3 py-2 rounded-lg text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                  >
                    تحديد المكتملة
                  </button>
                  
                  <button
                    onClick={() => {
                      const inProgressExams = exams.filter(exam => {
                        const progress = studentProgress.find(p => p.examId === exam._id);
                        return progress && progress.status === 'in_progress';
                      });
                      const inProgressIds = inProgressExams.map(exam => exam._id);
                      setSelectedExams([...new Set([...selectedExams, ...inProgressIds])]);
                    }}
                    className="px-3 py-2 rounded-lg text-sm font-medium bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition-colors"
                  >
                    تحديد قيد التنفيذ
                  </button>
                </div>
                
                {/* Quick Selection Patterns */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      // Select first exam of each group (usually the starting exams)
                      const firstExams = [];
                      for (let groupNum = 0; groupNum <= 8; groupNum++) {
                        const groupExams = exams.filter(exam => exam.examGroup === groupNum);
                        if (groupExams.length > 0) {
                          const firstExam = groupExams.sort((a, b) => a.order - b.order)[0];
                          firstExams.push(firstExam._id);
                        }
                      }
                      setSelectedExams([...new Set([...selectedExams, ...firstExams])]);
                    }}
                    className="px-3 py-2 rounded-lg text-sm font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
                  >
                    تحديد أول امتحان في كل مجموعة
                  </button>
                  
                  <button
                    onClick={() => {
                      // Select exams with low scores (for review)
                      const lowScoreExams = exams.filter(exam => {
                        const progress = studentProgress.find(p => p.examId === exam._id);
                        return progress && progress.status === 'completed' && progress.percentage < 60;
                      });
                      const lowScoreIds = lowScoreExams.map(exam => exam._id);
                      setSelectedExams([...new Set([...selectedExams, ...lowScoreIds])]);
                    }}
                    className="px-3 py-2 rounded-lg text-sm font-medium bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors"
                  >
                    تحديد الامتحانات منخفضة الدرجات
                  </button>
                  
                  <button
                    onClick={() => {
                      // Select exams with high scores (for advanced students)
                      const highScoreExams = exams.filter(exam => {
                        const progress = studentProgress.find(p => p.examId === exam._id);
                        return progress && progress.status === 'completed' && progress.percentage >= 80;
                      });
                      const highScoreIds = highScoreExams.map(exam => exam._id);
                      setSelectedExams([...new Set([...selectedExams, ...highScoreIds])]);
                    }}
                    className="px-3 py-2 rounded-lg text-sm font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                  >
                    تحديد الامتحانات عالية الدرجات
                  </button>
                </div>
                
                {/* Selection Summary */}
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span>تم تحديد: {selectedExams.length} من {exams.length} امتحان</span>
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
                {exams.length > 0 ? (
                  exams.map((exam) => {
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
                        <div className="text-sm font-medium text-gray-900">{exam.title}</div>
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
                               examStatus === 'unlocked' ? 'متاح' : 'مقفل'}
                            </span>
                          </div>
                        <div className="text-sm text-gray-500 mt-1">
                            {exam.examGroup === 0 ? 'اختبارات التأسيس' : `المجموعة ${exam.examGroup}`} • {exam.questions.length} أسئلة
                            {progress && progress.percentage > 0 && (
                              <span className="mr-2">• {progress.percentage}%</span>
                            )}
                        </div>
                      </div>
                    </label>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="text-gray-500 mt-2">لا توجد امتحانات متاحة</p>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  {selectedExams.length > 0 && `تم اختيار ${selectedExams.length} امتحان`}
                </div>
                <div className="flex space-x-3 rtl:space-x-reverse">
                  <button
                    onClick={() => {
                      setShowLockUnlockModal(false);
                      setSelectedExams([]);
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
                    {lockUnlockAction === 'lock' ? 'قفل الامتحانات المحددة' : 'فتح الامتحانات المحددة'} ({selectedExams.length})
                  </button>
                </div>
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
