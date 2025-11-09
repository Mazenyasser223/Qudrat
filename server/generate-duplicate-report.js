const fs = require('fs');
const path = require('path');

// Read the JSON report
const reportPath = path.join(__dirname, 'duplicate-questions-advanced-report.json');

if (!fs.existsSync(reportPath)) {
  console.error('❌ Report file not found. Please run check-duplicate-questions-advanced.js first.');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

// Group duplicates by exam
const examDuplicates = new Map(); // key: examId, value: array of duplicate info

report.exactDuplicates.forEach((dupGroup, groupIndex) => {
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
    
    // Find if this duplicate group is already recorded for this exam
    const existingGroup = examData.duplicates.find(d => d.md5Hash === dupGroup.md5Hash);
    
    if (!existingGroup) {
      // Get all other occurrences of this question (from other exams)
      const otherOccurrences = dupGroup.occurrences.filter(
        occ => occ.examId !== examId
      );
      
      examData.duplicates.push({
        md5Hash: dupGroup.md5Hash,
        questionIndex: occurrence.questionIndex,
        correctAnswer: occurrence.correctAnswer,
        duplicateCount: dupGroup.count,
        appearsInOtherExams: otherOccurrences.map(occ => ({
          examTitle: occ.examTitle,
          examGroup: occ.examGroup,
          examOrder: occ.examOrder,
          questionIndex: occ.questionIndex,
          correctAnswer: occ.correctAnswer,
          examId: occ.examId,
          isActive: occ.isActive
        }))
      });
    }
  });
});

// Sort exams by group and order
const sortedExams = Array.from(examDuplicates.entries())
  .sort((a, b) => {
    if (a[1].examGroup !== b[1].examGroup) {
      return a[1].examGroup - b[1].examGroup;
    }
    return a[1].examOrder - b[1].examOrder;
  });

// Generate text report
let textReport = '';
textReport += '='.repeat(100) + '\n';
textReport += '📋 DETAILED DUPLICATE QUESTIONS REPORT BY EXAM\n';
textReport += '='.repeat(100) + '\n';
textReport += `Generated: ${new Date(report.timestamp).toLocaleString()}\n`;
textReport += `Total Exams with Duplicates: ${examDuplicates.size}\n`;
textReport += `Total Duplicate Groups: ${report.exactDuplicates.length}\n`;
textReport += `Total Duplicate Questions: ${report.summary.totalExactDuplicates}\n`;
textReport += '='.repeat(100) + '\n\n';

// Group by exam group for better organization
const byGroup = new Map();
sortedExams.forEach(([examId, examData]) => {
  if (!byGroup.has(examData.examGroup)) {
    byGroup.set(examData.examGroup, []);
  }
  byGroup.get(examData.examGroup).push({ examId, ...examData });
});

// Sort groups
const sortedGroups = Array.from(byGroup.entries()).sort((a, b) => a[0] - b[0]);

sortedGroups.forEach(([groupNum, exams]) => {
  textReport += '\n' + '='.repeat(100) + '\n';
  textReport += `📚 GROUP ${groupNum} - ${exams.length} exam(s) with duplicates\n`;
  textReport += '='.repeat(100) + '\n\n';
  
  exams.forEach((exam, examIndex) => {
    textReport += `\n${examIndex + 1}. Exam: "${exam.examTitle}"\n`;
    textReport += `   Exam ID: ${exam.examId}\n`;
    textReport += `   Group: ${exam.examGroup}, Order: ${exam.examOrder}\n`;
    textReport += `   Status: ${exam.isActive ? '✅ Active' : '❌ Inactive'}\n`;
    textReport += `   Total Duplicate Questions: ${exam.duplicates.length}\n`;
    textReport += `   ─${'─'.repeat(97)}\n`;
    
    exam.duplicates.forEach((dup, dupIndex) => {
      textReport += `\n   Duplicate ${dupIndex + 1}:\n`;
      textReport += `   ├─ Question Index: ${dup.questionIndex}\n`;
      textReport += `   ├─ Correct Answer: ${dup.correctAnswer}\n`;
      textReport += `   ├─ MD5 Hash: ${dup.md5Hash}\n`;
      textReport += `   ├─ Appears ${dup.duplicateCount} time(s) total\n`;
      textReport += `   └─ Also appears in ${dup.appearsInOtherExams.length} other exam(s):\n`;
      
      dup.appearsInOtherExams.forEach((other, otherIndex) => {
        const isLast = otherIndex === dup.appearsInOtherExams.length - 1;
        const prefix = isLast ? '       └─' : '       ├─';
        textReport += `${prefix} "${other.examTitle}" (Group ${other.examGroup}, Order ${other.examOrder}, Q${other.questionIndex}, Answer: ${other.correctAnswer}) ${other.isActive ? '✅' : '❌'}\n`;
      });
    });
    
    textReport += '\n';
  });
});

// Summary statistics
textReport += '\n' + '='.repeat(100) + '\n';
textReport += '📊 SUMMARY STATISTICS BY GROUP\n';
textReport += '='.repeat(100) + '\n\n';

sortedGroups.forEach(([groupNum, exams]) => {
  const totalDuplicates = exams.reduce((sum, exam) => sum + exam.duplicates.length, 0);
  const activeExams = exams.filter(e => e.isActive).length;
  const inactiveExams = exams.filter(e => !e.isActive).length;
  
  textReport += `Group ${groupNum}:\n`;
  textReport += `  - Exams with duplicates: ${exams.length} (${activeExams} active, ${inactiveExams} inactive)\n`;
  textReport += `  - Total duplicate questions: ${totalDuplicates}\n\n`;
});

// Exams with most duplicates
textReport += '\n' + '='.repeat(100) + '\n';
textReport += '🏆 TOP 20 EXAMS WITH MOST DUPLICATES\n';
textReport += '='.repeat(100) + '\n\n';

const topExams = sortedExams
  .map(([examId, examData]) => ({
    examId,
    ...examData,
    duplicateCount: examData.duplicates.length
  }))
  .sort((a, b) => b.duplicateCount - a.duplicateCount)
  .slice(0, 20);

topExams.forEach((exam, index) => {
  textReport += `${index + 1}. "${exam.examTitle}" (Group ${exam.examGroup}, Order ${exam.examOrder})\n`;
  textReport += `   Exam ID: ${exam.examId}\n`;
  textReport += `   Duplicates: ${exam.duplicateCount} questions\n`;
  textReport += `   Status: ${exam.isActive ? '✅ Active' : '❌ Inactive'}\n\n`;
});

// Save text report
const textReportPath = path.join(__dirname, 'duplicate-questions-detailed-report.txt');
fs.writeFileSync(textReportPath, textReport, 'utf8');

// Generate HTML report
let htmlReport = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Duplicate Questions Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
            padding: 20px;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        h2 {
            color: #34495e;
            margin-top: 30px;
            margin-bottom: 15px;
            padding: 10px;
            background: #ecf0f1;
            border-left: 4px solid #3498db;
        }
        h3 {
            color: #555;
            margin-top: 20px;
            margin-bottom: 10px;
        }
        .exam-card {
            background: #fff;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            margin: 15px 0;
            box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        }
        .exam-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #eee;
        }
        .exam-title {
            font-size: 1.3em;
            font-weight: bold;
            color: #2c3e50;
        }
        .exam-meta {
            color: #7f8c8d;
            font-size: 0.9em;
        }
        .status-badge {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: bold;
        }
        .status-active {
            background: #d4edda;
            color: #155724;
        }
        .status-inactive {
            background: #f8d7da;
            color: #721c24;
        }
        .duplicate-item {
            background: #f8f9fa;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 10px 0;
            border-radius: 4px;
        }
        .duplicate-header {
            font-weight: bold;
            color: #856404;
            margin-bottom: 10px;
        }
        .other-exams {
            margin-top: 10px;
            padding-left: 20px;
        }
        .other-exam-item {
            background: #e9ecef;
            padding: 8px;
            margin: 5px 0;
            border-radius: 4px;
            font-size: 0.9em;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        .stat-number {
            font-size: 2em;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .stat-label {
            font-size: 0.9em;
            opacity: 0.9;
        }
        .group-section {
            margin: 30px 0;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        .top-exams-list {
            list-style: none;
        }
        .top-exam-item {
            background: #fff;
            padding: 15px;
            margin: 10px 0;
            border-left: 4px solid #28a745;
            border-radius: 4px;
        }
        .md5-hash {
            font-family: monospace;
            font-size: 0.85em;
            color: #6c757d;
            word-break: break-all;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📋 Duplicate Questions Report</h1>
        <p><strong>Generated:</strong> ${new Date(report.timestamp).toLocaleString()}</p>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">${examDuplicates.size}</div>
                <div class="stat-label">Exams with Duplicates</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${report.exactDuplicates.length}</div>
                <div class="stat-label">Duplicate Groups</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${report.summary.totalExactDuplicates}</div>
                <div class="stat-label">Duplicate Questions</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${report.totalQuestions}</div>
                <div class="stat-label">Total Questions</div>
            </div>
        </div>
`;

// Add exams by group
sortedGroups.forEach(([groupNum, exams]) => {
  htmlReport += `
        <div class="group-section">
            <h2>📚 Group ${groupNum} - ${exams.length} exam(s) with duplicates</h2>
  `;
  
  exams.forEach((exam, examIndex) => {
    htmlReport += `
            <div class="exam-card">
                <div class="exam-header">
                    <div>
                        <div class="exam-title">${exam.examTitle}</div>
                        <div class="exam-meta">
                            Exam ID: ${exam.examId} | Group: ${exam.examGroup} | Order: ${exam.examOrder} | 
                            Duplicates: ${exam.duplicates.length} questions
                        </div>
                    </div>
                    <span class="status-badge ${exam.isActive ? 'status-active' : 'status-inactive'}">
                        ${exam.isActive ? '✅ Active' : '❌ Inactive'}
                    </span>
                </div>
    `;
    
    exam.duplicates.forEach((dup, dupIndex) => {
      htmlReport += `
                <div class="duplicate-item">
                    <div class="duplicate-header">
                        Duplicate ${dupIndex + 1}: Question Index ${dup.questionIndex} 
                        (Answer: ${dup.correctAnswer}) - Appears ${dup.duplicateCount} time(s)
                    </div>
                    <div class="md5-hash">MD5: ${dup.md5Hash}</div>
                    <div class="other-exams">
                        <strong>Also appears in:</strong>
      `;
      
      dup.appearsInOtherExams.forEach((other) => {
        htmlReport += `
                        <div class="other-exam-item">
                            "${other.examTitle}" (Group ${other.examGroup}, Order ${other.examOrder}, 
                            Question ${other.questionIndex}, Answer: ${other.correctAnswer})
                            <span class="status-badge ${other.isActive ? 'status-active' : 'status-inactive'}" style="margin-left: 10px;">
                                ${other.isActive ? '✅' : '❌'}
                            </span>
                        </div>
        `;
      });
      
      htmlReport += `
                    </div>
                </div>
      `;
    });
    
    htmlReport += `
            </div>
    `;
  });
  
  htmlReport += `
        </div>
  `;
});

// Add top exams
htmlReport += `
        <h2>🏆 Top 20 Exams with Most Duplicates</h2>
        <ul class="top-exams-list">
`;

topExams.forEach((exam, index) => {
  htmlReport += `
            <li class="top-exam-item">
                <strong>${index + 1}. "${exam.examTitle}"</strong><br>
                Group ${exam.examGroup}, Order ${exam.examOrder} | 
                ${exam.duplicateCount} duplicate questions | 
                <span class="status-badge ${exam.isActive ? 'status-active' : 'status-inactive'}">
                    ${exam.isActive ? '✅ Active' : '❌ Inactive'}
                </span>
            </li>
  `;
});

htmlReport += `
        </ul>
    </div>
</body>
</html>
`;

// Save HTML report
const htmlReportPath = path.join(__dirname, 'duplicate-questions-detailed-report.html');
fs.writeFileSync(htmlReportPath, htmlReport, 'utf8');

console.log('✅ Detailed reports generated successfully!');
console.log(`\n📄 Text Report: ${textReportPath}`);
console.log(`🌐 HTML Report: ${htmlReportPath}`);
console.log(`\n📊 Summary:`);
console.log(`   - Total exams with duplicates: ${examDuplicates.size}`);
console.log(`   - Total duplicate groups: ${report.exactDuplicates.length}`);
console.log(`   - Total duplicate questions: ${report.summary.totalExactDuplicates}`);
console.log(`\n📈 Top 5 exams with most duplicates:`);
topExams.slice(0, 5).forEach((exam, index) => {
  console.log(`   ${index + 1}. "${exam.examTitle}" (Group ${exam.examGroup}) - ${exam.duplicateCount} duplicates`);
});

