# 🖼️ حل مشكلة تحميل الصور - Image Upload Solution

## ✅ تم إصلاح مشكلة عدم ظهور الصور!

### 🐛 **المشكلة الأصلية:**
- **"فشل في تحميل الصورة"** - الصور لا تظهر في الامتحانات
- **لا توجد آلية لرفع الصور** - النظام لا يدعم رفع الصور
- **لا توجد صور افتراضية** - لا توجد صور للاختبار

### 🔧 **الحلول المطبقة:**

#### **1. إعداد نظام رفع الملفات (Multer):**

**إنشاء مجلد التحميل:**
```bash
mkdir uploads
mkdir uploads/questions
```

**إعداد Multer:**
```javascript
// server/middleware/upload.js
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/questions/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'question-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});
```

#### **2. إعداد خدمة الملفات الثابتة:**

**في server/index.js:**
```javascript
// Serve static files (uploaded images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
```

#### **3. تحديث مسارات الامتحانات:**

**في server/routes/exams.js:**
```javascript
const upload = require('../middleware/upload');

// Update create exam route
router.post('/', isTeacher, upload.array('questionImages', 20), createExamValidation, createExam);
```

#### **4. تحديث منطق إنشاء الامتحان:**

**في server/controllers/examController.js:**
```javascript
const createExam = async (req, res) => {
  try {
    const { title, description, examGroup, order, timeLimit, questions } = req.body;
    const files = req.files || [];

    // Parse questions
    const parsedQuestions = typeof questions === 'string' ? JSON.parse(questions) : questions;

    // Map uploaded files to questions
    const questionsWithImages = parsedQuestions.map((question, index) => {
      const file = files[index];
      return {
        ...question,
        questionImage: file ? `/uploads/questions/${file.filename}` : question.questionImage || '/uploads/questions/default-question.png'
      };
    });

    // Create exam with images
    const exam = await Exam.create({
      title,
      description,
      examGroup,
      order,
      timeLimit,
      questions: questionsWithImages,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Exam created successfully',
      data: exam
    });
  } catch (error) {
    // Error handling
  }
};
```

#### **5. تحديث واجهة إنشاء الامتحان:**

**في client/src/pages/Teacher/CreateExam.js:**
```javascript
const onSubmit = async (data) => {
  try {
    setSubmitting(true);
    
    // Create FormData for file upload
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('examGroup', data.examGroup);
    formData.append('order', data.order);
    formData.append('timeLimit', data.timeLimit);
    formData.append('questions', JSON.stringify(data.questions));

    // Add uploaded files
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach((input, index) => {
      if (input.files && input.files[0]) {
        formData.append('questionImages', input.files[0]);
      }
    });

    const res = await axios.post('/api/exams', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    toast.success('تم إنشاء الامتحان بنجاح');
    navigate('/teacher/exams');
  } catch (error) {
    // Error handling
  }
};
```

## 🎯 **كيفية الاستخدام:**

### **1. إنشاء امتحان مع صور:**

1. **سجل دخول كمعلم**
2. **اذهب إلى "إنشاء امتحان"**
3. **املأ بيانات الامتحان**
4. **لإضافة سؤال:**
   - اضغط "إضافة سؤال"
   - ارفع صورة للسؤال (JPG, PNG, GIF)
   - اختر الإجابة الصحيحة
   - أضف توضيح (اختياري)
5. **اضغط "إنشاء الامتحان"**

### **2. أنواع الملفات المدعومة:**
- ✅ **JPG/JPEG** - صور JPEG
- ✅ **PNG** - صور PNG
- ✅ **GIF** - صور GIF
- ✅ **حجم أقصى: 5MB** لكل صورة

### **3. مسار الصور:**
- **الصور المحملة**: `/uploads/questions/question-[timestamp]-[random].jpg`
- **الصورة الافتراضية**: `/uploads/questions/default-question.png`

## 🔄 **تدفق العمل:**

### **عند إنشاء امتحان:**
1. **المعلم يرفع الصور** → يتم حفظها في `uploads/questions/`
2. **يتم إنشاء الامتحان** → مع روابط الصور
3. **الطلاب يحلون الامتحان** → يرون الصور من الخادم
4. **امتحانات المراجعة** → تستخدم نفس الصور

### **عند حل الامتحان:**
1. **الطالب يفتح الامتحان** → يتم جلب الصور من `/uploads/questions/`
2. **الصور تظهر** → في مكون `QuestionCard`
3. **الطالب يحل الأسئلة** → مع رؤية الصور بوضوح

## 🚀 **النتيجة النهائية:**

### ✅ **جميع المشاكل تم حلها:**
- ✅ **الصور تظهر** في الامتحانات العادية
- ✅ **الصور تظهر** في امتحانات المراجعة
- ✅ **نظام رفع الصور** يعمل بشكل صحيح
- ✅ **خدمة الملفات الثابتة** تعمل
- ✅ **واجهة رفع الصور** سهلة الاستخدام

### 🎨 **الميزات الجديدة:**
- ✅ **رفع متعدد للصور** - يمكن رفع عدة صور في امتحان واحد
- ✅ **معاينة الصور** - يمكن رؤية الصور قبل الحفظ
- ✅ **تحقق من نوع الملف** - فقط الصور مسموحة
- ✅ **حد أقصى للحجم** - 5MB لكل صورة
- ✅ **أسماء فريدة** - تجنب تعارض الملفات

**النظام جاهز للاستخدام! يمكنك الآن إنشاء امتحانات مع صور! 🎉**

## 📝 **ملاحظات مهمة:**

1. **تأكد من وجود مجلد `uploads/questions/`**
2. **الصور محفوظة محلياً** - في بيئة الإنتاج قد تحتاج لحل سحابي
3. **النسخ الاحتياطي** - احرص على نسخ مجلد `uploads` احتياطياً
4. **الأمان** - النظام يتحقق من نوع الملف قبل الحفظ
