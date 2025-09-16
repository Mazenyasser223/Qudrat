import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  // Always show the landing page first, regardless of authentication status
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100">
      <header className="bg-[#214C3A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <img src="/logo.png" alt="Qudrat Logo" className="h-10 w-auto" />
            <span className="text-xl font-bold text-white">Qudrat</span>
          </div>
          <nav className="flex items-center space-x-3 rtl:space-x-reverse">
            <a href="#contact" className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition">Contact me</a>
            <a href="#about" className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition">About me</a>
            <Link to="/login" className="px-4 py-1.5 rounded-lg bg-white text-[#214C3A] font-semibold hover:bg-gray-100 transition">Login</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <section className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-green-900 mb-4">مستر علاء وهبة</h1>
          <p className="text-green-900/80 text-lg">تدريب احترافي لاختبارات القدرات الكمي</p>
        </section>

        {/* Free Section - القسم المجاني */}
        <section className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-green-900 mb-2">القسم المجاني</h2>
            <p className="text-green-700 text-lg">جرب هذه الامتحانات المجانية قبل الاشتراك</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card p-8 text-center bg-gradient-to-br from-green-500 to-green-600 text-white border-none shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="bg-white/20 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-2">الامتحان التأسيسي المجاني</h3>
              <p className="text-green-100 mb-4">اختبار تأسيسي شامل للمفاهيم الأساسية</p>
              <Link to="/student/exams" className="mt-4 inline-block px-6 py-3 rounded-lg bg-white text-green-600 font-semibold hover:bg-gray-100 transition shadow-md">
                ابدأ الامتحان
              </Link>
            </div>
            
            <div className="card p-8 text-center bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="bg-white/20 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-2">الامتحان المجاني الأول</h3>
              <p className="text-blue-100 mb-4">اختبار تجريبي للمستوى المتوسط</p>
              <Link to="/student/exams" className="mt-4 inline-block px-6 py-3 rounded-lg bg-white text-blue-600 font-semibold hover:bg-gray-100 transition shadow-md">
                ابدأ الامتحان
              </Link>
            </div>
            
            <div className="card p-8 text-center bg-gradient-to-br from-purple-500 to-purple-600 text-white border-none shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="bg-white/20 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-2">الامتحان المجاني الثاني</h3>
              <p className="text-purple-100 mb-4">اختبار متقدم للمستوى العالي</p>
              <Link to="/student/exams" className="mt-4 inline-block px-6 py-3 rounded-lg bg-white text-purple-600 font-semibold hover:bg-gray-100 transition shadow-md">
                ابدأ الامتحان
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="card p-8 text-center bg-[#214C3A] text-white border-none">
            <img src="/icons/basics.png" alt="تأسيس" className="mx-auto h-16 w-16 mb-4 opacity-90" />
            <h3 className="text-2xl font-bold mb-2">تأسيس</h3>
            <a href="/( تبسيط قدرات (مستر علاء وهبه.pdf" target="_blank" rel="noopener noreferrer" className="mt-4 inline-block px-4 py-2 rounded-lg bg-white text-[#214C3A] font-semibold hover:bg-gray-100 transition">تأسيس</a>
          </div>
          <div className="card p-8 text-center bg-[#214C3A] text-white border-none">
            <img src="/icons/rules.png" alt="قوانين" className="mx-auto h-16 w-16 mb-4 opacity-90" />
            <h3 className="text-2xl font-bold mb-2">قوانين</h3>
            <a href="/ملف القوانين 2025.pdf" target="_blank" rel="noopener noreferrer" className="mt-4 inline-block px-4 py-2 rounded-lg bg-white text-[#214C3A] font-semibold hover:bg-gray-100 transition">قوانين</a>
          </div>
          <div className="card p-8 text-center bg-[#214C3A] text-white border-none">
            <img src="/icons/rules.png" alt="تسميع قوانين" className="mx-auto h-16 w-16 mb-4 opacity-90" />
            <h3 className="text-2xl font-bold mb-2">تسميع قوانين</h3>
            <a href="/___اختبار قوانين القدرات.pdf" target="_blank" rel="noopener noreferrer" className="mt-4 inline-block px-4 py-2 rounded-lg bg-white text-[#214C3A] font-semibold hover:bg-gray-100 transition">تسميع قوانين</a>
          </div>
        </section>

        <section id="about" className="card p-8 mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">About me</h2>
          <div className="grid grid-cols-1 md:grid-cols-[220px,1fr] gap-8 items-start">
            <div className="flex flex-col items-center">
              <div className="h-56 w-56 rounded-lg shadow-lg border-4 border-green-200 overflow-hidden">
                <img 
                  src="/mazen.jpg" 
                  alt="مستر علاء وهبة" 
                  className="w-full h-full object-cover"
                  style={{
                    objectFit: 'cover',
                    objectPosition: 'center 10%'
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.nextSibling.style.display = 'block';
                  }}
                />
              </div>
              <div 
                className="h-56 w-56 bg-gradient-to-br from-green-100 to-green-200 rounded-lg shadow-lg border-4 border-green-200 flex items-center justify-center text-green-700 font-semibold text-center p-4"
                style={{display: 'none'}}
              >
                صورة مستر علاء وهبة
              </div>
            </div>
            <div className="text-green-900/80 space-y-4 pr-6">
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

        <section id="contact" className="card p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Contact me</h2>
          <a href="https://wa.me/966546894479" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-green-600 text-white hover:bg-green-700 transition">
            <img src="/icons/whatsapp.svg" alt="WhatsApp" className="h-6 w-6 mr-2 rtl:ml-2 rtl:mr-0" />
            +966546894479
          </a>
        </section>
      </main>
    </div>
  );
};

export default Home;
