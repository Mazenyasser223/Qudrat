# منصة قدرات التعليمية (Qudrat Educational Platform)

منصة تعليمية متكاملة لإدارة الامتحانات والطلاب، مصممة خصيصاً للمدرسين والطلاب مع نظام صلاحيات متقدم وتتبع تقدم تسلسلي.

## المميزات الرئيسية

### لوحة تحكم المدرس
- ✅ تسجيل الدخول وإنشاء حساب للمدرس
- ✅ إدارة الطلاب (إضافة، تعديل، حذف، بحث)
- ✅ إدارة الامتحانات (إنشاء، تعديل، حذف)
- ✅ إنشاء امتحانات جديدة مع رفع الأسئلة كصور
- ✅ تحديد الإجابات الصحيحة وتوضيحاتها
- ✅ التحليلات والتقارير التفصيلية
- ✅ منح صلاحيات خاصة للطلاب
- ✅ لوحة تحكم شاملة مع إحصائيات فورية

### واجهة الطلاب
- ✅ تسجيل الدخول (الحساب يُنشأ بواسطة المدرس)
- ✅ عرض 8 مجموعات من الامتحانات
- ✅ نظام تقدم تسلسلي صارم
- ✅ صفحة الامتحان مع مؤقت زمني متقدم
- ✅ واجهة أسئلة تفاعلية مع صور
- ✅ عرض النتائج والمراجعة التفصيلية
- ✅ تحميل ملف PDF بالأخطاء والتوضيحات
- ✅ تتبع التقدم الفردي والإحصائيات

## التقنيات المستخدمة

### الواجهة الأمامية (Frontend)
- **React 18** - مكتبة واجهة المستخدم
- **React Router** - التنقل بين الصفحات
- **Tailwind CSS** - تصميم الواجهة
- **React Hook Form** - إدارة النماذج
- **Axios** - طلبات HTTP
- **React Hot Toast** - الإشعارات
- **jsPDF** - توليد ملفات PDF
- **Lucide React** - الأيقونات

### الواجهة الخلفية (Backend)
- **Node.js** - بيئة تشغيل JavaScript
- **Express.js** - إطار عمل الويب
- **MongoDB** - قاعدة البيانات
- **Mongoose** - ODM لـ MongoDB
- **JWT** - المصادقة والتفويض
- **bcryptjs** - تشفير كلمات المرور
- **Multer** - رفع الملفات
- **Express Validator** - التحقق من البيانات

## التثبيت والتشغيل

### المتطلبات
- Node.js (الإصدار 16 أو أحدث)
- MongoDB (الإصدار 4.4 أو أحدث)
- npm أو yarn

### خطوات التثبيت

1. **استنساخ المشروع**
```bash
git clone <repository-url>
cd qudrat-educational-platform
```

2. **تثبيت التبعيات**
```bash
# تثبيت تبعيات المشروع الرئيسي
npm install

# تثبيت تبعيات الخادم
cd server
npm install

# تثبيت تبعيات العميل
cd ../client
npm install
```

3. **إعداد متغيرات البيئة**
```bash
# في مجلد server، أنشئ ملف .env
cd server
cp .env.example .env
```

قم بتعديل ملف `.env`:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/qudrat-platform
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=7d
```

4. **تشغيل قاعدة البيانات**
تأكد من تشغيل MongoDB على جهازك:
```bash
# على Windows
mongod

# على macOS (مع Homebrew)
brew services start mongodb-community

# على Linux
sudo systemctl start mongod
```

5. **تشغيل التطبيق**
```bash
# من المجلد الرئيسي
npm run dev
```

هذا الأمر سيشغل:
- الخادم على المنفذ 5000
- العميل على المنفذ 3000

أو يمكنك تشغيلهما منفصلين:

```bash
# تشغيل الخادم
npm run server

# تشغيل العميل (في terminal منفصل)
npm run client
```

## هيكل المشروع

```
qudrat-educational-platform/
├── client/                 # تطبيق React
│   ├── public/
│   ├── src/
│   │   ├── components/     # المكونات
│   │   ├── context/        # إدارة الحالة
│   │   ├── pages/          # الصفحات
│   │   └── utils/          # الأدوات المساعدة
│   └── package.json
├── server/                 # خادم Node.js
│   ├── config/            # إعدادات قاعدة البيانات
│   ├── controllers/       # المتحكمات
│   ├── middleware/        # البرمجيات الوسيطة
│   ├── models/           # نماذج البيانات
│   ├── routes/           # المسارات
│   └── index.js          # نقطة البداية
└── package.json          # إعدادات المشروع الرئيسي
```

## API Endpoints

### المصادقة
- `POST /api/auth/register` - تسجيل مدرس جديد
- `POST /api/auth/login` - تسجيل الدخول
- `GET /api/auth/me` - الحصول على بيانات المستخدم الحالي
- `POST /api/auth/logout` - تسجيل الخروج

### إدارة المستخدمين
- `GET /api/users/students` - الحصول على جميع الطلاب
- `POST /api/users/students` - إنشاء طالب جديد
- `GET /api/users/students/:id` - الحصول على طالب محدد
- `PUT /api/users/students/:id` - تحديث بيانات الطالب
- `DELETE /api/users/students/:id` - حذف الطالب
- `GET /api/users/students/search` - البحث في الطلاب

### إدارة الامتحانات
- `GET /api/exams` - الحصول على جميع الامتحانات
- `POST /api/exams` - إنشاء امتحان جديد
- `GET /api/exams/:id` - الحصول على امتحان محدد
- `PUT /api/exams/:id` - تحديث الامتحان
- `DELETE /api/exams/:id` - حذف الامتحان
- `GET /api/exams/group/:groupNumber` - الحصول على امتحانات مجموعة محددة
- `POST /api/exams/:id/submit` - تسليم إجابات الامتحان

## المساهمة

نرحب بالمساهمات! يرجى اتباع الخطوات التالية:

1. Fork المشروع
2. إنشاء فرع للميزة الجديدة (`git checkout -b feature/AmazingFeature`)
3. Commit التغييرات (`git commit -m 'Add some AmazingFeature'`)
4. Push إلى الفرع (`git push origin feature/AmazingFeature`)
5. فتح Pull Request

## الترخيص

هذا المشروع مرخص تحت رخصة MIT - راجع ملف [LICENSE](LICENSE) للتفاصيل.

## الدعم

إذا واجهت أي مشاكل أو لديك أسئلة، يرجى فتح issue في GitHub أو التواصل معنا.

---

**ملاحظة**: هذا المشروع في مرحلة التطوير. بعض الميزات قد تكون قيد التطوير أو غير مكتملة.
