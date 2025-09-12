# 🗄️ مزامنة قاعدة البيانات - Database Synchronization

## ✅ **نعم، جميع العمليات تحدث في قاعدة البيانات تلقائياً!**

### 🔄 **العمليات التي تتم مزامنتها تلقائياً:**

#### **1. إضافة امتحان جديد:**
```javascript
// عند إنشاء امتحان جديد كمعلم
POST /api/exams
```
**ما يحدث في قاعدة البيانات:**
- ✅ **حفظ الامتحان** في مجموعة `exams`
- ✅ **تحديث تقدم جميع الطلاب** - إضافة الامتحان الجديد لجميع الطلاب
- ✅ **تعيين حالة "مقفل"** للامتحان الجديد
- ✅ **تطبيق قواعد التسلسل** - فتح الامتحان التالي إذا لزم الأمر

#### **2. حذف امتحان:**
```javascript
// عند حذف امتحان كمعلم
DELETE /api/exams/:id
```
**ما يحدث في قاعدة البيانات:**
- ✅ **حذف الامتحان** من مجموعة `exams`
- ✅ **تحديث تقدم جميع الطلاب** - إزالة الامتحان من تقدم الطلاب
- ✅ **حذف امتحانات المراجعة المرتبطة** - إذا كان هناك امتحانات مراجعة
- ✅ **إعادة ترتيب الامتحانات** - تحديث حالة الامتحانات الأخرى

#### **3. حل الطالب للامتحان:**
```javascript
// عند تسليم الطالب للامتحان
POST /api/exams/:id/submit
```
**ما يحدث في قاعدة البيانات:**
- ✅ **حفظ إجابات الطالب** في `examProgress.answers`
- ✅ **حساب النتيجة والنسبة المئوية**
- ✅ **تحديث حالة الامتحان** إلى "مكتمل"
- ✅ **جمع الأسئلة الخاطئة** في `wrongQuestions`
- ✅ **إنشاء امتحان مراجعة** إذا كان هناك أسئلة خاطئة
- ✅ **فتح الامتحان التالي** تلقائياً
- ✅ **تحديث الإحصائيات العامة** للطالب

#### **4. حل امتحان المراجعة:**
```javascript
// عند تسليم امتحان المراجعة
POST /api/exams/review/:reviewExamId/submit
```
**ما يحدث في قاعدة البيانات:**
- ✅ **حفظ المحاولة الجديدة** في `attempts` array
- ✅ **تحديث عدد المحاولات** `totalAttempts`
- ✅ **تحديث أفضل نتيجة** إذا كانت أفضل من السابقة
- ✅ **حفظ جميع الإجابات** مع التوقيت

## 🏗️ **هيكل قاعدة البيانات:**

### **مجموعة Users (الطلاب):**
```javascript
{
  _id: ObjectId,
  name: "اسم الطالب",
  email: "email@example.com",
  role: "student",
  examProgress: [
    {
      examId: ObjectId,
      status: "completed", // locked, unlocked, completed
      score: 8,
      percentage: 80,
      completedAt: Date,
      answers: [...],
      wrongQuestions: [ObjectId, ObjectId], // الأسئلة الخاطئة
      reviewExamId: ObjectId // رابط لامتحان المراجعة
    }
  ],
  totalScore: 25,
  overallPercentage: 75
}
```

### **مجموعة Exams (الامتحانات):**
```javascript
{
  _id: ObjectId,
  title: "امتحان الرياضيات",
  examGroup: 1,
  order: 1,
  timeLimit: 120,
  questions: [
    {
      _id: ObjectId,
      questionImage: "image.jpg",
      options: ["A", "B", "C", "D"],
      correctAnswer: "A",
      explanation: "شرح الإجابة"
    }
  ],
  statistics: {
    totalAttempts: 15,
    passRate: 12,
    averageScore: 75.5
  }
}
```

### **مجموعة ReviewExams (امتحانات المراجعة):**
```javascript
{
  _id: ObjectId,
  studentId: ObjectId,
  originalExamId: ObjectId,
  title: "امتحان مراجعة - امتحان الرياضيات",
  questions: [
    {
      questionId: ObjectId,
      originalQuestionIndex: 2
    }
  ],
  timeLimit: 30,
  attempts: [
    {
      attemptNumber: 1,
      answers: [...],
      score: 3,
      percentage: 75,
      completedAt: Date
    }
  ],
  bestScore: 3,
  bestPercentage: 75,
  totalAttempts: 1
}
```

## 🔄 **مثال على التدفق الكامل:**

### **السيناريو: معلم يضيف امتحان جديد**

1. **المعلم ينشئ امتحان:**
   ```javascript
   POST /api/exams
   {
     title: "امتحان الجبر",
     examGroup: 2,
     order: 1,
     questions: [...]
   }
   ```

2. **ما يحدث في قاعدة البيانات:**
   ```javascript
   // 1. حفظ الامتحان
   exams.insertOne({
     title: "امتحان الجبر",
     examGroup: 2,
     order: 1,
     questions: [...],
     statistics: { totalAttempts: 0, passRate: 0, averageScore: 0 }
   })

   // 2. تحديث جميع الطلاب
   students.updateMany(
     { role: "student" },
     { $push: { 
       examProgress: {
         examId: newExamId,
         status: "locked",
         score: 0,
         percentage: 0
       }
     }}
   )
   ```

### **السيناريو: طالب يحل الامتحان**

1. **الطالب يسلم الامتحان:**
   ```javascript
   POST /api/exams/examId/submit
   {
     answers: [
       { selectedAnswer: "A" },
       { selectedAnswer: "B" },
       { selectedAnswer: "C" }
     ]
   }
   ```

2. **ما يحدث في قاعدة البيانات:**
   ```javascript
   // 1. تحديث تقدم الطالب
   students.updateOne(
     { _id: studentId, "examProgress.examId": examId },
     { $set: {
       "examProgress.$.status": "completed",
       "examProgress.$.score": 2,
       "examProgress.$.percentage": 66.7,
       "examProgress.$.completedAt": new Date(),
       "examProgress.$.answers": [...],
       "examProgress.$.wrongQuestions": [questionId3]
     }}
   )

   // 2. إنشاء امتحان مراجعة (إذا كان هناك أسئلة خاطئة)
   reviewExams.insertOne({
     studentId: studentId,
     originalExamId: examId,
     title: "امتحان مراجعة - امتحان الجبر",
     questions: [{ questionId: questionId3, originalQuestionIndex: 2 }],
     timeLimit: 15,
     attempts: [],
     bestScore: 0,
     bestPercentage: 0,
     totalAttempts: 0
   })

   // 3. ربط امتحان المراجعة بالطالب
   students.updateOne(
     { _id: studentId, "examProgress.examId": examId },
     { $set: { "examProgress.$.reviewExamId": reviewExamId } }
   )

   // 4. فتح الامتحان التالي
   students.updateOne(
     { _id: studentId, "examProgress.examId": nextExamId },
     { $set: { "examProgress.$.status": "unlocked" } }
   )
   ```

## 🎯 **الخلاصة:**

### ✅ **جميع العمليات تتم تلقائياً:**
- **إضافة امتحان** → تحديث جميع الطلاب
- **حذف امتحان** → إزالة من جميع الطلاب
- **حل امتحان** → حفظ النتائج + إنشاء مراجعة + فتح التالي
- **حل مراجعة** → حفظ المحاولة + تحديث أفضل نتيجة

### 🔒 **ضمانات الأمان:**
- **معاملات قاعدة البيانات** - إما تنجح كلها أو تفشل كلها
- **التحقق من الصلاحيات** - كل طالب يرى فقط بياناته
- **التحقق من صحة البيانات** - قبل الحفظ في قاعدة البيانات

### 📊 **التتبع الشامل:**
- **تاريخ كامل** لجميع العمليات
- **إحصائيات مفصلة** لكل امتحان
- **تقدم فردي** لكل طالب
- **محاولات متعددة** لامتحانات المراجعة

**النظام مصمم لضمان مزامنة كاملة وموثوقة لجميع البيانات! 🚀**
