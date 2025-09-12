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
  Filter
} from 'lucide-react';

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

  useEffect(() => {
    fetchStudentData();
    fetchExams();
  }, [studentId]);

  // Update progress when student data changes
  useEffect(() => {
    fetchStudentProgress();
  }, [student]);

  const fetchStudentData = async () => {
    try {
      const response = await axios.get(`/api/users/students/${studentId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setStudent(response.data.data);
    } catch (error) {
      console.error('Error fetching student:', error);
      toast.error('حدث خطأ أثناء تحميل بيانات الطالب');
      navigate('/teacher/students');
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
    
    // Initialize all groups as locked
    for (let i = 1; i <= 8; i++) {
      status[i] = 'locked';
    }
    
    // Check each exam progress
    progress.forEach(progressItem => {
      const groupNum = progressItem.examGroup;
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
              <div className="grid grid-cols-4 gap-2">
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

            {/* Exam Status Summary */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
              <h4 className="text-md font-semibold text-green-900 mb-3 flex items-center space-x-2 rtl:space-x-reverse">
                <BookOpen className="h-5 w-5" />
                <span>إحصائيات الامتحانات</span>
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">إجمالي الامتحانات:</span>
                  <span className="font-semibold text-gray-900">{exams.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">المجموعات المفتوحة:</span>
                  <span className="font-semibold text-green-600">
                    {Object.values(groupStatus).filter(status => status === 'unlocked').length} / 8
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">المجموعات المقفلة:</span>
                  <span className="font-semibold text-red-600">
                    {Object.values(groupStatus).filter(status => status === 'locked').length} / 8
                  </span>
                </div>
              </div>
            </div>
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
              <div className="grid grid-cols-4 gap-2">
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
                  </h3>
                  <p className={`${lockUnlockAction === 'lock' ? 'text-red-100' : 'text-green-100'} text-sm`}>
                    اختر الامتحانات التي تريد {lockUnlockAction === 'lock' ? 'قفلها' : 'فتحها'} للطالب
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="max-h-96 overflow-y-auto space-y-3">
                {exams.length > 0 ? (
                  exams.map((exam) => (
                    <label key={exam._id} className="flex items-center space-x-3 rtl:space-x-reverse p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer">
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
                        <div className="text-sm font-medium text-gray-900">{exam.title}</div>
                        <div className="text-sm text-gray-500 mt-1">
                          المجموعة {exam.examGroup} • {exam.questions.length} أسئلة
                        </div>
                      </div>
                    </label>
                  ))
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

    </div>
  );
};

export default StudentProfile;
