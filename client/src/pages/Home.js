import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

// Review Submission Form Component
const ReviewSubmissionForm = () => {
  const [formData, setFormData] = useState({
    studentName: '',
    rating: 5,
    comment: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.studentName.trim() || !formData.comment.trim()) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    if (formData.comment.length > 500) {
      toast.error('التعليق يجب أن يكون أقل من 500 حرف');
      return;
    }

    setSubmitting(true);
    
    try {
      const response = await axios.post('/api/reviews/submit', formData);
      
      if (response.data.success) {
        toast.success(response.data.message);
        setFormData({
          studentName: '',
          rating: 5,
          comment: ''
        });
      } else {
        toast.error(response.data.message || 'حدث خطأ أثناء إرسال التقييم');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error(error.response?.data?.message || 'حدث خطأ أثناء إرسال التقييم');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-white/10 rounded-2xl p-6 backdrop-blur-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Student Name */}
        <div>
          <label htmlFor="studentName" className="block text-sm font-medium text-white mb-2">
            اسمك
          </label>
          <input
            type="text"
            id="studentName"
            name="studentName"
            value={formData.studentName}
            onChange={handleInputChange}
            className="w-full px-4 py-3 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
            placeholder="أدخل اسمك"
            required
          />
        </div>

        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            تقييمك
          </label>
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, rating: star }))}
                className={`text-2xl transition-colors ${
                  star <= formData.rating ? 'text-yellow-400' : 'text-white/30'
                } hover:text-yellow-400`}
              >
                ⭐
              </button>
            ))}
            <span className="text-white font-semibold mr-2">{formData.rating}/5</span>
          </div>
        </div>
      </div>

      {/* Comment */}
      <div className="mb-6">
        <label htmlFor="comment" className="block text-sm font-medium text-white mb-2">
          تعليقك
        </label>
        <textarea
          id="comment"
          name="comment"
          value={formData.comment}
          onChange={handleInputChange}
          rows={4}
          maxLength={500}
          className="w-full px-4 py-3 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent resize-none"
          placeholder="شاركنا تجربتك مع المنصة..."
          required
        />
        <div className="text-right text-white/70 text-sm mt-1">
          {formData.comment.length}/500
        </div>
      </div>

      {/* Submit Button */}
      <div className="text-center">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-white text-green-700 font-bold text-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {submitting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-700 ml-2"></div>
              جاري الإرسال...
            </>
          ) : (
            <>
              <span className="ml-2">📝</span>
              أرسل تقييمي
            </>
          )}
        </button>
        <p className="text-white/80 text-sm mt-3">
          سيتم مراجعة تقييمك من قبل الإدارة قبل النشر
        </p>
      </div>
    </form>
  );
};

const Home = () => {
  const [freeExams, setFreeExams] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [customGroups, setCustomGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    // Load critical data first
    fetchFreeExams();
    fetchCustomGroups();
    
    // Load reviews after a short delay to improve initial page load
    const reviewsTimer = setTimeout(() => {
      fetchReviews();
    }, 100);
    
    return () => clearTimeout(reviewsTimer);
  }, []);

  const fetchFreeExams = async () => {
    try {
      const res = await axios.get('/api/exams/free');
      setFreeExams(res.data.data || []);
    } catch (error) {
      console.error('Error fetching free exams:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomGroups = async () => {
    try {
      const res = await axios.get('/api/exam-groups');
      setCustomGroups(res.data.data || []);
    } catch (error) {
      console.error('Error fetching custom groups:', error);
    }
  };

  const fetchReviews = async () => {
    try {
      const res = await axios.get('/api/reviews');
      setReviews(res.data.data || []);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching reviews:', error);
      }
    } finally {
      setReviewsLoading(false);
    }
  };

  const getFreeExamTitle = (order) => {
    switch (order) {
      case 1:
        return 'الامتحان التأسيسي المجاني';
      case 2:
        return 'الامتحان المجاني الأول';
      case 3:
        return 'الامتحان المجاني الثاني';
      default:
        return 'امتحان مجاني';
    }
  };

  const getFreeExamDescription = (order) => {
    switch (order) {
      case 1:
        return 'اختبار تأسيسي شامل للمفاهيم الأساسية';
      case 2:
        return 'اختبار تجريبي للمستوى المتوسط';
      case 3:
        return 'اختبار متقدم للمستوى العالي';
      default:
        return 'امتحان مجاني للتدريب';
    }
  };

  const getFreeExamGradient = (order) => {
    switch (order) {
      case 1:
        return 'from-green-500 to-green-600';
      case 2:
        return 'from-green-600 to-green-700';
      case 3:
        return 'from-green-700 to-green-800';
      default:
        return 'from-green-500 to-green-600';
    }
  };

  const getFreeExamButtonColor = (order) => {
    switch (order) {
      case 1:
        return 'text-green-600';
      case 2:
        return 'text-green-700';
      case 3:
        return 'text-green-800';
      default:
        return 'text-green-600';
    }
  };

  const handleFreeExamClick = (examId) => {
    // Always go to public exam route for free exams
    navigate(`/public-exam/${examId}`);
  };

  // Always show the landing page first, regardless of authentication status
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100">
      <header className="bg-[#214C3A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <img src="/logo.png" alt="Qudrat Logo" className="h-10 w-auto" loading="lazy" />
            <span className="text-xl font-bold text-white">Qudrat</span>
          </div>
          <nav className="flex items-center space-x-3 rtl:space-x-reverse">
            <a href="#about" className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition">نبذة عني</a>
            <Link to="/login" className="px-4 py-1.5 rounded-lg bg-white text-[#214C3A] font-semibold hover:bg-gray-100 transition">تسجيل الدخول</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <section className="text-center mb-12">
          <div className="relative max-w-4xl mx-auto">
            <img 
              src="/alaaa.jpg" 
              alt="تدريب احترافي لاختبارات القدرات الكمي" 
              className="w-full h-auto rounded-2xl shadow-2xl border-4 border-green-200 hover:shadow-3xl transition-all duration-500 transform hover:scale-105"
              style={{
                maxHeight: '400px',
                objectFit: 'contain'
              }}
              loading="lazy"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <div 
              className="hidden w-full h-64 bg-gradient-to-r from-green-100 to-green-200 rounded-2xl border-4 border-green-200 flex items-center justify-center text-green-700 font-semibold text-center p-8"
            >
              <div>
                <h1 className="text-4xl sm:text-5xl font-extrabold text-green-900 mb-4">تدريب احترافي لاختبارات القدرات الكمي</h1>
                <p className="text-green-900/80 text-lg">منصة متخصصة في تدريب الطلاب على اختبارات القدرات الكمية</p>
              </div>
            </div>
          </div>
        </section>

        {/* PDFs Section - مذكرات و قوانين */}
        <section className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-green-900 mb-2">مذكرات و قوانين</h2>
            <p className="text-green-700 text-lg">مواد تعليمية مجانية لمساعدتك في التحضير</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card p-8 text-center bg-[#214C3A] text-white border-none shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <img src="/icons/basics.png" alt="تأسيس" className="mx-auto h-16 w-16 mb-4 opacity-90" loading="lazy" />
              <h3 className="text-2xl font-bold mb-2">تأسيس</h3>
              <p className="text-gray-200 mb-4">مذكرة تأسيس شاملة للمفاهيم الأساسية</p>
              <a href="/( تبسيط قدرات (مستر علاء وهبه.pdf" download="( تبسيط قدرات (مستر علاء وهبه.pdf" className="mt-4 inline-block px-6 py-3 rounded-lg bg-white text-[#214C3A] font-semibold hover:bg-gray-100 transition shadow-md">
                <span className="flex items-center justify-center">
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  تحميل المذكرة
                </span>
              </a>
            </div>
            <div className="card p-8 text-center bg-[#214C3A] text-white border-none shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <img src="/icons/rules.png" alt="قوانين" className="mx-auto h-16 w-16 mb-4 opacity-90" loading="lazy" />
              <h3 className="text-2xl font-bold mb-2">قوانين</h3>
              <p className="text-gray-200 mb-4">ملف شامل لقوانين القدرات الكمي</p>
              <a href="/ملف القوانين 2025.pdf" download="ملف القوانين 2025.pdf" className="mt-4 inline-block px-6 py-3 rounded-lg bg-white text-[#214C3A] font-semibold hover:bg-gray-100 transition shadow-md">
                <span className="flex items-center justify-center">
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  تحميل القوانين
                </span>
              </a>
            </div>
            <div className="card p-8 text-center bg-[#214C3A] text-white border-none shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <img src="/icons/rules.png" alt="تسميع قوانين" className="mx-auto h-16 w-16 mb-4 opacity-90" loading="lazy" />
              <h3 className="text-2xl font-bold mb-2">تسميع قوانين</h3>
              <p className="text-gray-200 mb-4">اختبار قوانين القدرات للتدريب</p>
              <a href="/___اختبار قوانين القدرات.pdf" download="___اختبار قوانين القدرات.pdf" className="mt-4 inline-block px-6 py-3 rounded-lg bg-white text-[#214C3A] font-semibold hover:bg-gray-100 transition shadow-md">
                <span className="flex items-center justify-center">
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  تحميل الاختبار
                </span>
              </a>
            </div>
          </div>
        </section>

        {/* Free Section - القسم المجاني */}
        <section className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-green-900 mb-2">القسم المجاني</h2>
            <p className="text-green-700 text-lg">جرب هذه الامتحانات المجانية قبل الاشتراك</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {loading ? (
              // Loading state
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="card p-8 text-center bg-gray-200 border-none shadow-lg animate-pulse">
                  <div className="bg-gray-300 rounded-full p-4 w-20 h-20 mx-auto mb-4"></div>
                  <div className="h-6 bg-gray-300 rounded mb-2"></div>
                  <div className="h-4 bg-gray-300 rounded mb-4"></div>
                  <div className="h-10 bg-gray-300 rounded"></div>
                </div>
              ))
            ) : freeExams.length > 0 ? (
              // Dynamic free exams
              freeExams.map((exam) => (
                <div key={exam._id} className={`card p-8 text-center bg-gradient-to-br ${getFreeExamGradient(exam.freeExamOrder)} text-white border-none shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer`} onClick={() => handleFreeExamClick(exam._id)}>
                  <div className="bg-white/20 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{getFreeExamTitle(exam.freeExamOrder)}</h3>
                  <p className="text-green-100 mb-4">{getFreeExamDescription(exam.freeExamOrder)}</p>
                  <div className="text-green-100 text-sm mb-4">
                    {exam.totalQuestions} سؤال • {exam.timeLimit} دقيقة
                  </div>
                </div>
              ))
            ) : (
              // Fallback static content if no free exams are set
              <>
                <div className="card p-8 text-center bg-gradient-to-br from-green-500 to-green-600 text-white border-none shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer" onClick={() => handleFreeExamClick('fallback-1')}>
                  <div className="bg-white/20 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold mb-2">الامتحان التأسيسي المجاني</h3>
                  <p className="text-green-100 mb-4">اختبار تأسيسي شامل للمفاهيم الأساسية</p>
                </div>
                
                <div className="card p-8 text-center bg-gradient-to-br from-green-600 to-green-700 text-white border-none shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer" onClick={() => handleFreeExamClick('fallback-2')}>
                  <div className="bg-white/20 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold mb-2">الامتحان المجاني الأول</h3>
                  <p className="text-green-100 mb-4">اختبار تجريبي للمستوى المتوسط</p>
                </div>
                
                <div className="card p-8 text-center bg-gradient-to-br from-green-700 to-green-800 text-white border-none shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer" onClick={() => handleFreeExamClick('fallback-3')}>
                  <div className="bg-white/20 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold mb-2">الامتحان المجاني الثاني</h3>
                  <p className="text-green-100 mb-4">اختبار متقدم للمستوى العالي</p>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Premium Groups Section - المجموعات المميزة */}
        <section className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-green-900 mb-2">المجموعات المميزة</h2>
            <p className="text-green-700 text-lg">اختبارات التأسيس + 8 مجموعات تدريبية متدرجة المستوى</p>
            <div className="mt-4 inline-flex items-center px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full text-sm font-semibold">
              🔒 محتوى مميز - يتطلب اشتراك
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Foundation Exams Card */}
            <div className="relative group">
              <div className="card p-6 text-center bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-gray-300 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 opacity-75">
                {/* Lock overlay */}
                <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center">
                  <div className="bg-white/90 rounded-full p-3 shadow-lg">
                    <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </div>
                
                {/* Foundation content */}
                <div className="relative z-10">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center opacity-50">
                    <span className="text-2xl font-bold text-white">ت</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-700 mb-2">اختبارات التأسيس</h3>
                  <p className="text-gray-600 text-sm mb-3">اختبارات تأسيسية شاملة</p>
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>✓ تصحيح تلقائي</div>
                    <div>✓ تحليل الأخطاء</div>
                    <div>✓ متابعة التقدم</div>
                  </div>
                </div>
              </div>
            </div>

            {Array.from({ length: 8 }, (_, i) => i + 1).map((groupNum) => (
              <div key={groupNum} className="relative group">
                <div className="card p-6 text-center bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-gray-300 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 opacity-75">
                  {/* Lock overlay */}
                  <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center">
                    <div className="bg-white/90 rounded-full p-3 shadow-lg">
                      <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                  </div>
                  
                  {/* Group content */}
                  <div className="relative z-10">
                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center opacity-50">
                      <span className="text-2xl font-bold text-white">{groupNum}</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-700 mb-2">المجموعة {groupNum}</h3>
                    <p className="text-gray-600 text-sm mb-3">25 اختبار إلكتروني متدرج</p>
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>✓ تصحيح تلقائي</div>
                      <div>✓ تحليل الأخطاء</div>
                      <div>✓ متابعة التقدم</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Custom Groups */}
            {customGroups.map((group) => (
              <div key={group._id} className="relative group">
                <div className="card p-6 text-center bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-gray-300 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 opacity-75">
                  {/* Lock overlay */}
                  <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center">
                    <div className="bg-white/90 rounded-full p-3 shadow-lg">
                      <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                  </div>
                  
                  {/* Custom Group content */}
                  <div className="relative z-10">
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center opacity-50">
                      <span className="text-2xl font-bold text-white">م</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-700 mb-2">{group.name}</h3>
                    <p className="text-gray-600 text-sm mb-3">{group.examCount} اختبار إلكتروني</p>
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>✓ تصحيح تلقائي</div>
                      <div>✓ تحليل الأخطاء</div>
                      <div>✓ متابعة التقدم</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Subscription CTA */}
          <div className="bg-gradient-to-r from-green-600 via-green-700 to-green-800 rounded-2xl p-8 text-white text-center shadow-2xl">
            <div className="max-w-4xl mx-auto">
              <h3 className="text-3xl font-bold mb-4">🚀 انضم إلى المنصة المميزة</h3>
              <p className="text-green-100 text-lg mb-6">
                احصل على وصول كامل لجميع المجموعات التدريبية والامتحانات المتقدمة
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="text-2xl mb-2">📚</div>
                  <h4 className="font-semibold mb-2">200+ اختبار</h4>
                  <p className="text-sm text-green-100">8 مجموعات × 25 اختبار</p>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="text-2xl mb-2">🎯</div>
                  <h4 className="font-semibold mb-2">تحليل الأخطاء</h4>
                  <p className="text-sm text-green-100">اختبارات مخصصة لأخطائك</p>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="text-2xl mb-2">📊</div>
                  <h4 className="font-semibold mb-2">متابعة التقدم</h4>
                  <p className="text-sm text-green-100">إحصائيات مفصلة لتحسينك</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a 
                  href="https://wa.me/966546894479?text=مرحباً، أريد الاشتراك في المنصة المميزة لاختبارات القدرات" 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-white text-green-700 font-bold text-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  <img src="/icons/whatsapp.svg" alt="WhatsApp" className="h-6 w-6 mr-3" loading="lazy" />
                  اشترك الآن عبر واتساب
                </a>
                <div className="text-green-100 text-sm">
                  💬 تواصل معنا للحصول على تفاصيل الاشتراك
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="card p-8 mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">نبذة عني</h2>
          <div className="max-w-4xl mx-auto">
            <div className="text-green-900/80 space-y-4 text-center">
              <div className="text-lg font-semibold text-green-800">
                🎯 منصتي التعليمية لتدريب الطلاب على اختبارات القدرات (القسم الكمي)
              </div>
              
              <div className="text-green-700">
                🔹 المنصة مصممة لتكون أقرب ما يكون إلى تجربة اختبار قياس الفعلي، من حيث الشكل والتنظيم والتدرج في مستوى الأسئلة.
              </div>

              <div>
                <div className="font-semibold text-green-800 mb-2">✅ محتوى المنصة:</div>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>8 مجموعات تدريبية، كل مجموعة تحتوي على 25 اختبار إلكتروني متدرج المستوى.</li>
                  <li>تصحيح تلقائي لكل اختبار مع رصد دقيق لتقدم الطالب.</li>
                  <li>خاصية تحليل الأخطاء: حيث تُسحب أخطاء الطالب من كل اختبار ويُنشأ منها اختبار جديد لمساعدته على تصحيح نقاط ضعفه.</li>
                  <li>إمكانية إعادة فتح اختبارات الأخطاء أكثر من مرة مع متابعة مستوى التقدم بشكل مستمر حتى يصل الطالب لأعلى درجة.</li>
                </ul>
              </div>

              <div>
                <div className="font-semibold text-green-800 mb-2">📘 القسم المجاني:</div>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>مذكرة تأسيس شاملة لأهم القوانين والمفاهيم الأساسية في الكمي.</li>
                  <li>اختبار تأسيسي مجاني .</li>
                  <li> اختبارين  مجانين.</li>
            </ul>
              </div>

              <div className="text-green-700 font-medium">
                💡 الهدف: أن يعيش الطالب تجربة حقيقية مشابهة لاختبار القدرات، ويستمتع برحلة الارتقاء بمستواه خطوة بخطوة حتى يصل لتحقيق نسبة 100% بإذن الله تعالى
              </div>
            </div>
          </div>
        </section>

        {/* Student Reviews Section - تقييمات الطلاب */}
        <section className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-green-900 mb-2">تقييمات الطلاب</h2>
            <p className="text-green-700 text-lg">آراء الطلاب في المنصة وتجربتهم التعليمية</p>
            <div className="mt-4 inline-flex items-center px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full text-sm font-semibold">
              ⭐ تقييمات حقيقية من طلابنا
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {reviewsLoading ? (
              // Loading state
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="card p-6 bg-gray-200 border-none shadow-lg animate-pulse">
                  <div className="h-4 bg-gray-300 rounded mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded mb-4 w-1/2"></div>
                  <div className="h-20 bg-gray-300 rounded mb-4"></div>
                  <div className="h-3 bg-gray-300 rounded w-2/3"></div>
                </div>
              ))
            ) : reviews.length > 0 ? (
              // Dynamic text reviews
              reviews.map((review) => (
                <div key={review._id} className="card p-6 bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  {/* Rating stars */}
                  <div className="flex items-center justify-center mb-4">
                    <div className="flex text-yellow-400 text-lg">
                      {Array.from({ length: review.rating }).map((_, i) => (
                        <span key={i}>⭐</span>
                      ))}
                    </div>
                    <span className="mr-2 text-sm text-gray-600 font-semibold">{review.rating}.0</span>
                  </div>
                  
                  {/* Review comment */}
                  <div className="text-gray-700 text-center mb-4 leading-relaxed">
                    "{review.comment}"
                  </div>
                  
                  {/* Student name */}
                  <div className="text-center border-t border-gray-100 pt-4">
                    <div className="font-semibold text-gray-900">{review.studentName}</div>
                    <div className="text-sm text-gray-500">طالب</div>
                  </div>
                </div>
              ))
            ) : (
              // Fallback message when no reviews
              <div className="col-span-full text-center py-12">
                <div className="text-6xl mb-4">⭐</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">لا توجد تقييمات بعد</h3>
                <p className="text-gray-500">كن أول من يشارك تجربته مع المنصة</p>
              </div>
            )}
          </div>

          {/* Review Submission Form */}
          <div className="bg-gradient-to-r from-green-600 via-green-700 to-green-800 rounded-2xl p-8 text-white shadow-2xl">
            <div className="max-w-4xl mx-auto">
              <h3 className="text-3xl font-bold mb-4 text-center">💬 شاركنا رأيك</h3>
              <p className="text-green-100 text-lg mb-8 text-center">
                هل استفدت من المنصة؟ شاركنا تجربتك لنساعد المزيد من الطلاب
              </p>
              
              <ReviewSubmissionForm />
            </div>
          </div>
        </section>

      </main>
    </div>
  );
};

export default Home;
