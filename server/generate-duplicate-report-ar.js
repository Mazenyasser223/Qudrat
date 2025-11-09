const fs = require('fs');
const path = require('path');

const SOURCE_FILE = 'duplicate-questions-advanced-report.json';
const OUTPUT_FILE = 'duplicate-questions-detailed-report-ar.txt';

const sourcePath = path.join(__dirname, SOURCE_FILE);
if (!fs.existsSync(sourcePath)) {
  console.error('❌ لم يتم العثور على ملف التقرير الأصلي. شغّل أولاً check-duplicate-questions-advanced.js');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

const examDuplicates = new Map();

report.exactDuplicates.forEach((dupGroup) => {
  dupGroup.occurrences.forEach((occurrence) => {
    const examId = occurrence.examId;
    if (!examDuplicates.has(examId)) {
      examDuplicates.set(examId, {
        examTitle: occurrence.examTitle,
        examGroup: occurrence.examGroup,
        examOrder: occurrence.examOrder,
        isActive: occurrence.isActive,
        duplicates: []
      });
    }

    const examData = examDuplicates.get(examId);
    const exists = examData.duplicates.find((d) => d.md5Hash === dupGroup.md5Hash);
    if (exists) {
      return;
    }

    const otherOccurrences = dupGroup.occurrences
      .filter((item) => item.examId !== examId)
      .map((item) => ({
        examTitle: item.examTitle,
        examGroup: item.examGroup,
        examOrder: item.examOrder,
        questionIndex: item.questionIndex,
        correctAnswer: item.correctAnswer,
        isActive: item.isActive
      }));

    examData.duplicates.push({
      md5Hash: dupGroup.md5Hash,
      questionIndex: occurrence.questionIndex,
      correctAnswer: occurrence.correctAnswer,
      duplicateCount: dupGroup.count,
      otherOccurrences
    });
  });
});

const sortedGroups = Array.from(examDuplicates.entries())
  .map(([id, data]) => ({ examId: id, ...data }))
  .sort((a, b) => {
    if (a.examGroup === b.examGroup) {
      return a.examOrder - b.examOrder;
    }
    return a.examGroup - b.examGroup;
  })
  .reduce((acc, exam) => {
    if (!acc[exam.examGroup]) {
      acc[exam.examGroup] = [];
    }
    acc[exam.examGroup].push(exam);
    return acc;
  }, {});

const formatStatus = (isActive) => (isActive ? 'نشط' : 'متوقف');

const totalDuplicateGroups = report.exactDuplicates?.length ?? 0;
const totalDuplicateQuestions = report.summary?.totalExactDuplicates ?? totalDuplicateGroups;

let text = '';
text += '====================================\n';
text += '📋 تقرير مكررّات الأسئلة (نسخة مبسّطة باللغة العربية)\n';
text += '====================================\n\n';
text += `تاريخ الإنشاء: ${new Date(report.timestamp).toLocaleString('ar-EG')}\n`;
text += `عدد الامتحانات التي تحتوي على تكرار: ${examDuplicates.size}\n`;
text += `مجموع مجموعات الأسئلة المكررة: ${totalDuplicateGroups}\n`;
text += `إجمالي الأسئلة المكررة: ${totalDuplicateQuestions}\n\n`;

Object.keys(sortedGroups)
  .map(Number)
  .sort((a, b) => a - b)
  .forEach((groupNumber) => {
    const examsInGroup = sortedGroups[groupNumber];
    text += '------------------------------------\n';
    text += `📚 المجموعة ${groupNumber} - (${examsInGroup.length} امتحان)\n`;
    text += '------------------------------------\n\n';

    examsInGroup.forEach((exam, index) => {
      text += `${index + 1}. ${exam.examTitle}\n`;
      text += `   رقم الامتحان: ${exam.examId}\n`;
      text += `   الترتيب داخل المجموعة: ${exam.examOrder}\n`;
      text += `   حالة الامتحان: ${formatStatus(exam.isActive)}\n`;
      text += `   عدد الأسئلة المكررة في هذا الامتحان: ${exam.duplicates.length}\n`;

      exam.duplicates.forEach((dup, dupIndex) => {
        text += `   - تكرار ${dupIndex + 1}:\n`;
        text += `     • رقم السؤال داخل الامتحان: ${dup.questionIndex + 1}\n`;
        text += `     • الإجابة الصحيحة المسجّلة: ${dup.correctAnswer}\n`;
        text += `     • يظهر هذا السؤال في ${dup.duplicateCount} امتحان/امتحانات\n`;
        if (dup.otherOccurrences.length > 0) {
          text += '     • موجود أيضاً في الامتحانات التالية:\n';
          dup.otherOccurrences.forEach((other) => {
            text += `       ▸ "${other.examTitle}" (المجموعة ${other.examGroup}، الترتيب ${other.examOrder}، السؤال ${other.questionIndex + 1}، الحالة: ${formatStatus(other.isActive)})\n`;
          });
        } else {
          text += '     • لا توجد نسخ أخرى لهذا السؤال.\n';
        }
      });

      text += '\n';
    });
  });

text += '====================================\n';
text += '📈 أكثر الامتحانات احتواءً على التكرار\n';
text += '====================================\n\n';

const topExams = Array.from(examDuplicates.values())
  .map((exam) => ({
    title: exam.examTitle,
    group: exam.examGroup,
    order: exam.examOrder,
    duplicateCount: exam.duplicates.length
  }))
  .sort((a, b) => b.duplicateCount - a.duplicateCount)
  .slice(0, 15);

topExams.forEach((exam, idx) => {
  text += `${idx + 1}. "${exam.title}" - المجموعة ${exam.group} (ترتيب ${exam.order}) يحتوي على ${exam.duplicateCount} سؤال مكرر.\n`;
});

fs.writeFileSync(path.join(__dirname, OUTPUT_FILE), text, 'utf8');

console.log('✅ تم إنشاء التقرير العربي المبسط بنجاح.');
console.log(`📄 الملف: ${path.join(__dirname, OUTPUT_FILE)}`);

