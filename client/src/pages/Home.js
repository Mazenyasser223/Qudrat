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
              <img 
                src="/mazen.jpg" 
                alt="مستر علاء وهبة" 
                className="h-56 w-56 object-cover rounded-lg shadow-lg border-4 border-green-200"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <div 
                className="h-56 w-56 bg-gradient-to-br from-green-100 to-green-200 rounded-lg shadow-lg border-4 border-green-200 flex items-center justify-center text-green-700 font-semibold text-center p-4"
                style={{display: 'none'}}
              >
                صورة مستر علاء وهبة
              </div>
            </div>
            <ul className="list-disc text-green-900/80 space-y-2 pr-6">
              <li>مدرس متخصص في تدريب الطلاب على اختبارات القدرات الكمي بخبرة عملية تمتد ل10 سنوات.</li>
              <li>تبسيط أساليب الكمي، وشرح سريع وتطبيق استراتيجيات فعّالة.</li>
              <li>توفير اختبارات إلكترونية بمستويات متنوعة ومراجعات شاملة.</li>
              <li>خطة دراسة منظمة وخطوة بخطوة لتحقيق أفضل نتيجة.</li>
            </ul>
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
