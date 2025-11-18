require('dotenv').config();
const mongoose = require('mongoose');
const Exam = require('./models/Exam');
const fs = require('fs');
const path = require('path');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('Database connection error:', error.message);
    process.exit(1);
  }
};

const generateDuplicateReport = async () => {
  try {
    console.log('🔍 Starting duplicate questions analysis...\n');
    
    // Get all active exams
    const exams = await Exam.find({ isActive: true })
      .select('_id title examGroup order questions')
      .lean()
      .sort({ examGroup: 1, order: 1 });

    console.log(`📊 Found ${exams.length} active exams\n`);

    // Group exams by examGroup
    const examsByGroup = new Map();
    exams.forEach(exam => {
      const group = exam.examGroup;
      if (!examsByGroup.has(group)) {
        examsByGroup.set(group, []);
      }
      examsByGroup.get(group).push(exam);
    });

    // Build report
    let report = '';
    report += '========================================\n';
    report += '📋 تقرير الأسئلة المكررة حسب المجموعات\n';
    report += '========================================\n\n';
    report += `تاريخ الإنشاء: ${new Date().toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })}\n`;
    report += `عدد المجموعات: ${examsByGroup.size}\n`;
    report += `إجمالي الامتحانات: ${exams.length}\n\n`;

    let totalDuplicates = 0;
    const groups = Array.from(examsByGroup.keys()).sort((a, b) => a - b);

    // Process each group
    for (const groupNum of groups) {
      const groupExams = examsByGroup.get(groupNum);
      report += '========================================\n';
      report += `📚 المجموعة ${groupNum}\n`;
      report += '========================================\n\n';
      report += `عدد الامتحانات في هذه المجموعة: ${groupExams.length}\n\n`;

      // Map to track question images and their occurrences
      const questionImageMap = new Map(); // imageUrl -> [{ examId, examTitle, examOrder, questionIndex }]

      // Collect all questions from all exams in this group
      groupExams.forEach(exam => {
        if (!Array.isArray(exam.questions)) return;
        
        exam.questions.forEach((question, index) => {
          if (!question?.questionImage) return;
          
          const imageUrl = question.questionImage;
          if (!questionImageMap.has(imageUrl)) {
            questionImageMap.set(imageUrl, []);
          }
          
          questionImageMap.get(imageUrl).push({
            examId: exam._id.toString(),
            examTitle: exam.title,
            examOrder: exam.order,
            questionIndex: index + 1, // 1-indexed for display
            correctAnswer: question.correctAnswer || ''
          });
        });
      });

      // Find duplicates (questions that appear in multiple exams)
      const duplicates = [];
      questionImageMap.forEach((occurrences, imageUrl) => {
        if (occurrences.length > 1) {
          // Check if it appears in different exams
          const uniqueExams = new Set(occurrences.map(o => o.examId));
          if (uniqueExams.size > 1) {
            duplicates.push({
              imageUrl,
              occurrences,
              count: occurrences.length,
              examCount: uniqueExams.size
            });
          }
        }
      });

      if (duplicates.length === 0) {
        report += '✅ لا توجد أسئلة مكررة في هذه المجموعة\n\n';
      } else {
        totalDuplicates += duplicates.length;
        report += `⚠️  عدد مجموعات الأسئلة المكررة: ${duplicates.length}\n\n`;

        // Group duplicates by which exams they appear in
        duplicates.forEach((dup, idx) => {
          report += `\n${idx + 1}. السؤال المكرر (يظهر في ${dup.examCount} امتحان):\n`;
          
          // Group occurrences by exam
          const byExam = new Map();
          dup.occurrences.forEach(occ => {
            const key = `${occ.examTitle} (ترتيب ${occ.examOrder})`;
            if (!byExam.has(key)) {
              byExam.set(key, []);
            }
            byExam.get(key).push(occ);
          });

          // Display for each exam
          byExam.forEach((questions, examTitle) => {
            const questionNumbers = questions.map(q => q.questionIndex).sort((a, b) => a - b);
            report += `   📝 في "${examTitle}":\n`;
            report += `      أرقام الأسئلة: ${questionNumbers.join(', ')}\n`;
            if (questions[0].correctAnswer) {
              report += `      الإجابة الصحيحة: ${questions[0].correctAnswer}\n`;
            }
          });
        });
        report += '\n';
      }
    }

    report += '\n========================================\n';
    report += '📊 ملخص التقرير\n';
    report += '========================================\n';
    report += `إجمالي مجموعات الأسئلة المكررة: ${totalDuplicates}\n`;
    report += `عدد المجموعات التي تحتوي على تكرارات: ${groups.filter(g => {
      const groupExams = examsByGroup.get(g);
      const questionImageMap = new Map();
      groupExams.forEach(exam => {
        if (!Array.isArray(exam.questions)) return;
        exam.questions.forEach((question, index) => {
          if (!question?.questionImage) return;
          const imageUrl = question.questionImage;
          if (!questionImageMap.has(imageUrl)) {
            questionImageMap.set(imageUrl, []);
          }
          questionImageMap.get(imageUrl).push({ examId: exam._id.toString() });
        });
      });
      return Array.from(questionImageMap.values()).some(arr => {
        const uniqueExams = new Set(arr.map(o => o.examId));
        return uniqueExams.size > 1;
      });
    }).length}\n`;

    // Save report to file
    const outputPath = path.join(__dirname, 'duplicate-questions-by-group.txt');
    fs.writeFileSync(outputPath, report, 'utf8');
    
    console.log('\n✅ Report generated successfully!');
    console.log(`📄 File saved to: ${outputPath}`);
    console.log(`\n📊 Summary:`);
    console.log(`   - Total groups: ${examsByGroup.size}`);
    console.log(`   - Total duplicate question groups: ${totalDuplicates}`);
    console.log(`\n${report}`);

    return outputPath;
  } catch (error) {
    console.error('❌ Error generating report:', error);
    throw error;
  }
};

// Main execution
const main = async () => {
  try {
    await connectDB();
    await generateDuplicateReport();
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
};

main();

