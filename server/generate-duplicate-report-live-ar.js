const fs = require('fs');
const path = require('path');

const SOURCE_PRIMARY = 'duplicate-questions-live.json';
const SOURCE_FALLBACK = 'duplicate-questions-advanced-report.json';
const OUTPUT = 'duplicate-questions-live-ar.txt';

let sourcePath = path.join(__dirname, SOURCE_PRIMARY);
if (!fs.existsSync(sourcePath)) {
  const fb = path.join(__dirname, SOURCE_FALLBACK);
  if (!fs.existsSync(fb)) {
    console.error('❌ لم يتم العثور على ملفات البيانات. شغّل أحد الاسكربتين: check-duplicate-questions-live.js أو check-duplicate-questions-advanced.js');
    process.exit(1);
  }
  sourcePath = fb;
  console.log('ℹ️ استخدام التقرير الشامل كبديل، مع تصفية الامتحانات النشطة فقط.');
}

const data = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

// إذا كان المصدر الشامل، قلّص البيانات إلى الامتحانات النشطة فقط
let exactDuplicates = data.exactDuplicates || [];
if (sourcePath.endsWith(SOURCE_FALLBACK)) {
  exactDuplicates = exactDuplicates
    .map(group => {
      const activeOcc = group.occurrences.filter(o => o.isActive === true);
      return { ...group, count: activeOcc.length, occurrences: activeOcc };
    })
    .filter(group => group.occurrences.length > 1);
}

// نبني خريطة الامتحانات -> قائمة التكرارات
const examMap = new Map();
exactDuplicates.forEach((grp) => {
  grp.occurrences.forEach((occ) => {
    const id = occ.examId;
    if (!examMap.has(id)) {
      examMap.set(id, {
        examId: id,
        title: occ.examTitle,
        group: occ.examGroup,
        order: occ.examOrder,
        duplicates: []
      });
    }
    // أضف هذا التكرار للامتحان الحالي مع ذكر أماكن ظهوره الأخرى
    const others = grp.occurrences
      .filter(o => o.examId !== id)
      .map(o => ({
        title: o.examTitle,
        group: o.examGroup,
        order: o.examOrder,
        questionIndex: o.questionIndex + 1
      }));

    // تجنب تكرار نفس md5 داخل نفس الامتحان
    const examEntry = examMap.get(id);
    if (!examEntry.duplicates.find(d => d.md5Hash === grp.md5Hash)) {
      examEntry.duplicates.push({
        md5Hash: grp.md5Hash,
        questionIndex: occ.questionIndex + 1,
        correctAnswer: occ.correctAnswer || '',
        duplicateCount: grp.count,
        alsoIn: others
      });
    }
  });
});

// رتب حسب المجموعة ثم الترتيب
const sorted = Array.from(examMap.values()).sort((a, b) => {
  if (a.group === b.group) return a.order - b.order;
  return a.group - b.group;
});

let out = '';
out += '====================================\n';
out += '📋 تقرير الأسئلة المكررة (النطاق: الامتحانات النشطة على الموقع فقط)\n';
out += '====================================\n\n';
out += `تاريخ الإنشاء: ${new Date(data.timestamp || Date.now()).toLocaleString('ar-EG')}\n`;
out += `عدد الامتحانات التي تحتوي على تكرار: ${sorted.length}\n`;
out += `عدد مجموعات التكرار (تطابق تام للصورة): ${exactDuplicates.length}\n\n`;

let currentGroup = null;
sorted.forEach((exam) => {
  if (currentGroup !== exam.group) {
    currentGroup = exam.group;
    out += '------------------------------------\n';
    out += `📚 المجموعة ${exam.group}\n`;
    out += '------------------------------------\n\n';
  }
  out += `- الامتحان: "${exam.title}" (ترتيب ${exam.order})\n`;
  out += `  عدد الأسئلة المكررة: ${exam.duplicates.length}\n`;
  exam.duplicates.forEach((dup, idx) => {
    out += `  ${idx + 1}) السؤال رقم: ${dup.questionIndex}\n`;
    out += `     الإجابة الصحيحة المسجّلة: ${dup.correctAnswer}\n`;
    if (dup.alsoIn.length > 0) {
      out += `     يظهر أيضاً في (${dup.duplicateCount - 1}) امتحان:\n`;
      dup.alsoIn.forEach((o) => {
        out += `       ▸ "${o.title}" (مجموعة ${o.group}، ترتيب ${o.order}، سؤال ${o.questionIndex})\n`;
      });
    } else {
      out += '     لا توجد نسخ أخرى داخل الامتحانات النشطة.\n';
    }
  });
  out += '\n';
});

// قسم مختصر لأكثر الامتحانات احتواءً على تكرارات
const top = sorted
  .map(e => ({ title: e.title, group: e.group, order: e.order, count: e.duplicates.length }))
  .sort((a, b) => b.count - a.count)
  .slice(0, 15);

out += '====================================\n';
out += '📈 أكثر الامتحانات احتواءً على التكرار\n';
out += '====================================\n\n';
top.forEach((t, i) => {
  out += `${i + 1}. "${t.title}" - المجموعة ${t.group} (ترتيب ${t.order}) يحتوي على ${t.count} سؤال مكرر.\n`;
});

fs.writeFileSync(path.join(__dirname, OUTPUT), out, 'utf8');
console.log('✅ تم إنشاء التقرير العربي للامتحانات النشطة فقط.');
console.log(`📄 الملف: ${path.join(__dirname, OUTPUT)}`);


