require('dotenv').config();
const mongoose = require('mongoose');
const Exam = require('./models/Exam');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');
const imghash = require('imghash');

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

const downloadImage = (url) => {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download: ${res.statusCode}`));
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Download timeout'));
    });
  });
};

const md5 = (buf) => (buf ? crypto.createHash('md5').update(buf).digest('hex') : null);

// Calculate Hamming distance between two hex hashes (for pHash comparison)
// Converts hex to binary and counts differing bits
const hammingDistance = (hash1, hash2) => {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) return Infinity;
  
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const hex1 = parseInt(hash1[i], 16);
    const hex2 = parseInt(hash2[i], 16);
    // XOR to find differing bits, then count set bits
    const diff = hex1 ^ hex2;
    distance += diff.toString(2).split('1').length - 1;
  }
  return distance;
};

const generateDuplicateReportByGroup = async () => {
  try {
    console.log('🔍 بدء تحليل الأسئلة المكررة...\n');
    
    // Get all active exams
    const exams = await Exam.find({ isActive: true })
      .select('_id title examGroup order questions')
      .lean()
      .sort({ examGroup: 1, order: 1 });

    console.log(`📊 تم العثور على ${exams.length} امتحان نشط\n`);

    // Maps to track question images and their occurrences
    const md5Map = new Map(); // md5Hash -> [{ examId, examTitle, examGroup, examOrder, questionIndex, correctAnswer, pHash }]
    const phashMap = new Map(); // pHash -> [{ examId, examTitle, examGroup, examOrder, questionIndex, correctAnswer, md5Hash }]
    const questionData = []; // Store all question data with hashes for comparison
    
    let processed = 0;
    let failed = 0;

    console.log('📥 جاري تحميل ومعالجة صور الأسئلة...\n');
    console.log('🔍 استخدام مقارنة محتوى الصور (Perceptual Hash) للكشف عن التكرارات\n\n');

    // Process all questions from all exams
    for (const exam of exams) {
      if (!Array.isArray(exam.questions)) continue;
      
      console.log(`   معالجة: "${exam.title}" (المجموعة ${exam.examGroup}, الترتيب ${exam.order})`);
      
      for (let i = 0; i < exam.questions.length; i++) {
        const question = exam.questions[i];
        if (!question?.questionImage) continue;

        let buf = null;
        try {
          if (question.questionImage.startsWith('http')) {
            buf = await downloadImage(question.questionImage).catch(() => null);
          } else if (question.questionImage.startsWith('data:')) {
            const part = question.questionImage.split('base64,')[1];
            if (part) buf = Buffer.from(part, 'base64');
          }
        } catch (err) {
          failed++;
          continue;
        }

        if (!buf) {
          failed++;
          continue;
        }

        processed++;
        const md5Hash = md5(buf);
        let pHash = null;
        
        try {
          // Calculate perceptual hash (16 bits = 256 bits total)
          pHash = await imghash.hash(buf, 16).catch(() => null);
        } catch (err) {
          // If pHash fails, continue with MD5 only
        }
        
        const questionInfo = {
          examId: exam._id.toString(),
          examTitle: exam.title,
          examGroup: exam.examGroup,
          examOrder: exam.order,
          questionIndex: i + 1, // 1-indexed for display
          correctAnswer: question.correctAnswer || 'غير محدد',
          md5Hash,
          pHash
        };
        
        // Store in MD5 map (exact duplicates)
        if (md5Hash) {
          if (!md5Map.has(md5Hash)) {
            md5Map.set(md5Hash, []);
          }
          md5Map.get(md5Hash).push(questionInfo);
        }
        
        // Store in pHash map (similar images)
        if (pHash) {
          if (!phashMap.has(pHash)) {
            phashMap.set(pHash, []);
          }
          phashMap.get(pHash).push(questionInfo);
        }
        
        // Store for Hamming distance comparison
        questionData.push(questionInfo);
      }
    }

    console.log(`\n✅ تم معالجة ${processed} سؤال`);
    if (failed > 0) {
      console.log(`⚠️  فشل تحميل ${failed} سؤال`);
    }

    console.log('\n🔍 جاري مقارنة الصور للعثور على التكرارات...\n');

    // Find exact duplicates using MD5
    const exactDuplicates = [];
    md5Map.forEach((occurrences, md5Hash) => {
      if (occurrences.length > 1) {
        const uniqueExams = new Set(occurrences.map(o => o.examId));
        exactDuplicates.push({
          type: 'exact',
          hash: md5Hash,
          occurrences,
          count: occurrences.length,
          examCount: uniqueExams.size,
          groupCount: new Set(occurrences.map(o => o.examGroup)).size
        });
      }
    });

    // Find similar duplicates using pHash (exact pHash matches)
    const phashDuplicates = [];
    phashMap.forEach((occurrences, pHash) => {
      if (occurrences.length > 1) {
        // Only include if not already in exact duplicates
        const md5Hashes = new Set(occurrences.map(o => o.md5Hash).filter(h => h));
        const isInExact = exactDuplicates.some(dup => 
          md5Hashes.has(dup.hash)
        );
        
        if (!isInExact) {
          const uniqueExams = new Set(occurrences.map(o => o.examId));
          phashDuplicates.push({
            type: 'similar',
            hash: pHash,
            occurrences,
            count: occurrences.length,
            examCount: uniqueExams.size,
            groupCount: new Set(occurrences.map(o => o.examGroup)).size
          });
        }
      }
    });

    // Find similar images using Hamming distance (threshold: 5 for 16-bit hash)
    // This catches images that are very similar but not identical
    const similarDuplicates = [];
    const processedPairs = new Set();
    const HAMMING_THRESHOLD = 5; // Adjustable threshold for similarity
    
    for (let i = 0; i < questionData.length; i++) {
      if (!questionData[i].pHash) continue;
      
      for (let j = i + 1; j < questionData.length; j++) {
        if (!questionData[j].pHash) continue;
        
        const pairKey = `${Math.min(i, j)}-${Math.max(i, j)}`;
        if (processedPairs.has(pairKey)) continue;
        
        const distance = hammingDistance(questionData[i].pHash, questionData[j].pHash);
        
        if (distance <= HAMMING_THRESHOLD && distance > 0) {
          // Check if they're not already exact duplicates
          const isExact = questionData[i].md5Hash && questionData[j].md5Hash && 
                         questionData[i].md5Hash === questionData[j].md5Hash;
          
          if (!isExact) {
            processedPairs.add(pairKey);
            
            // Group similar questions
            const groupKey = `${questionData[i].pHash}-${questionData[j].pHash}`;
            let found = false;
            
            for (const sim of similarDuplicates) {
              if (sim.occurrences.some(o => 
                (o.examId === questionData[i].examId && o.questionIndex === questionData[i].questionIndex) ||
                (o.examId === questionData[j].examId && o.questionIndex === questionData[j].questionIndex)
              )) {
                // Add to existing group
                if (!sim.occurrences.find(o => 
                  o.examId === questionData[i].examId && o.questionIndex === questionData[i].questionIndex
                )) {
                  sim.occurrences.push(questionData[i]);
                }
                if (!sim.occurrences.find(o => 
                  o.examId === questionData[j].examId && o.questionIndex === questionData[j].questionIndex
                )) {
                  sim.occurrences.push(questionData[j]);
                }
                sim.count = sim.occurrences.length;
                sim.examCount = new Set(sim.occurrences.map(o => o.examId)).size;
                sim.groupCount = new Set(sim.occurrences.map(o => o.examGroup)).size;
                found = true;
                break;
              }
            }
            
            if (!found) {
              similarDuplicates.push({
                type: 'very_similar',
                hash: `${questionData[i].pHash.substring(0, 8)}...`,
                distance,
                occurrences: [questionData[i], questionData[j]],
                count: 2,
                examCount: new Set([questionData[i].examId, questionData[j].examId]).size,
                groupCount: new Set([questionData[i].examGroup, questionData[j].examGroup]).size
              });
            }
          }
        }
      }
    }

    // Combine all duplicates
    const duplicates = [...exactDuplicates, ...phashDuplicates, ...similarDuplicates];

    console.log(`\n🔍 نتائج التحليل:`);
    console.log(`   • التكرارات التامة (MD5): ${exactDuplicates.length}`);
    console.log(`   • التكرارات المتشابهة (pHash مطابق): ${phashDuplicates.length}`);
    console.log(`   • التكرارات المشابهة جداً (Hamming distance ≤ ${HAMMING_THRESHOLD}): ${similarDuplicates.length}`);
    console.log(`   • إجمالي مجموعات التكرار: ${duplicates.length}\n`);

    // Build detailed Arabic report
    let report = '';
    report += '═══════════════════════════════════════════════════════════════\n';
    report += '📋 تقرير مفصل عن الأسئلة المكررة في جميع المجموعات\n';
    report += '═══════════════════════════════════════════════════════════════\n\n';
    report += `📅 تاريخ الإنشاء: ${new Date().toLocaleString('ar-EG', { 
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}\n\n`;
    report += `📊 إحصائيات عامة:\n`;
    report += `   • إجمالي الامتحانات النشطة: ${exams.length}\n`;
    report += `   • إجمالي الأسئلة المعالجة: ${processed}\n`;
    report += `   • عدد مجموعات الأسئلة المكررة: ${duplicates.length}\n`;
    report += `      - التكرارات التامة (MD5): ${exactDuplicates.length}\n`;
    report += `      - التكرارات المتشابهة (pHash مطابق): ${phashDuplicates.length}\n`;
    report += `      - التكرارات المشابهة جداً: ${similarDuplicates.length}\n`;
    report += `   • إجمالي تكرارات الأسئلة: ${duplicates.reduce((sum, d) => sum + d.count, 0)}\n\n`;
    report += `💡 ملاحظة: يستخدم هذا التقرير مقارنة محتوى الصور (Perceptual Hash)\n`;
    report += `   للكشف عن الأسئلة المكررة حتى لو كانت الصور مختلفة قليلاً.\n\n`;

    // Group duplicates by examGroup for better organization
    const duplicatesByGroup = new Map();
    duplicates.forEach(dup => {
      const groups = new Set(dup.occurrences.map(o => o.examGroup));
      groups.forEach(group => {
        if (!duplicatesByGroup.has(group)) {
          duplicatesByGroup.set(group, []);
        }
        duplicatesByGroup.get(group).push(dup);
      });
    });

    // Sort groups
    const sortedGroups = Array.from(duplicatesByGroup.keys()).sort((a, b) => a - b);

    if (duplicates.length === 0) {
      report += '✅ لا توجد أسئلة مكررة في جميع الامتحانات\n';
    } else {
      // Report organized by group
      for (const groupNum of sortedGroups) {
        const groupDuplicates = duplicatesByGroup.get(groupNum);
        const uniqueDuplicatesInGroup = groupDuplicates.filter((dup, idx, self) => 
          self.findIndex(d => d.md5Hash === dup.md5Hash) === idx
        );

        report += '\n═══════════════════════════════════════════════════════════════\n';
        report += `📚 المجموعة ${groupNum}\n`;
        report += '═══════════════════════════════════════════════════════════════\n\n';
        report += `   عدد مجموعات الأسئلة المكررة في هذه المجموعة: ${uniqueDuplicatesInGroup.length}\n\n`;

        uniqueDuplicatesInGroup.forEach((dup, idx) => {
          const typeLabel = dup.type === 'exact' ? 'تكرار تام' : 
                           dup.type === 'similar' ? 'متشابه (pHash مطابق)' : 
                           `مشابه جداً (مسافة ${dup.distance})`;
          report += `\n${idx + 1}. السؤال المكرر - ${typeLabel} (يظهر ${dup.count} مرة في ${dup.examCount} امتحان):\n`;
          report += `   ───────────────────────────────────────────────────────────\n`;
          
          // Group occurrences by exam for better readability
          const byExam = new Map();
          dup.occurrences.forEach(occ => {
            const key = `${occ.examId}|${occ.examTitle}|${occ.examOrder}`;
            if (!byExam.has(key)) {
              byExam.set(key, []);
            }
            byExam.get(key).push(occ);
          });

          // Display for each exam
          const sortedExams = Array.from(byExam.entries()).sort((a, b) => {
            const [, occA] = a;
            const [, occB] = b;
            if (occA[0].examGroup !== occB[0].examGroup) {
              return occA[0].examGroup - occB[0].examGroup;
            }
            return occA[0].examOrder - occB[0].examOrder;
          });

          sortedExams.forEach(([key, questions], examIdx) => {
            const [examId, examTitle, examOrder] = key.split('|');
            const questionNumbers = questions.map(q => q.questionIndex).sort((a, b) => a - b);
            const firstOcc = questions[0];
            
            report += `\n   📝 الامتحان: "${firstOcc.examTitle}"\n`;
            report += `      • المجموعة: ${firstOcc.examGroup}\n`;
            report += `      • الترتيب: ${firstOcc.examOrder}\n`;
            report += `      • أرقام الأسئلة: ${questionNumbers.join(', ')}\n`;
            report += `      • الإجابة الصحيحة: ${firstOcc.correctAnswer}\n`;
          });

          report += `\n`;
        });
      }

      // Summary section
      report += '\n═══════════════════════════════════════════════════════════════\n';
      report += '📊 ملخص التقرير\n';
      report += '═══════════════════════════════════════════════════════════════\n\n';

      // Count duplicates per group
      const groupStats = new Map();
      duplicates.forEach(dup => {
        const groups = new Set(dup.occurrences.map(o => o.examGroup));
        groups.forEach(group => {
          if (!groupStats.has(group)) {
            groupStats.set(group, { uniqueDuplicates: 0, totalOccurrences: 0 });
          }
          const stats = groupStats.get(group);
          if (dup.occurrences.some(o => o.examGroup === group)) {
            stats.uniqueDuplicates++;
            stats.totalOccurrences += dup.occurrences.filter(o => o.examGroup === group).length;
          }
        });
      });

      const sortedGroupStats = Array.from(groupStats.entries()).sort((a, b) => a[0] - b[0]);
      
      report += `📈 إحصائيات حسب المجموعة:\n\n`;
      sortedGroupStats.forEach(([group, stats]) => {
        report += `   المجموعة ${group}:\n`;
        report += `      • عدد مجموعات الأسئلة المكررة: ${stats.uniqueDuplicates}\n`;
        report += `      • إجمالي التكرارات: ${stats.totalOccurrences}\n\n`;
      });

      // Cross-group duplicates
      const crossGroupDuplicates = duplicates.filter(d => d.groupCount > 1);
      if (crossGroupDuplicates.length > 0) {
        report += `\n⚠️  ملاحظة مهمة:\n`;
        report += `   يوجد ${crossGroupDuplicates.length} سؤال مكرر يظهر في أكثر من مجموعة واحدة\n`;
        report += `   (هذه الأسئلة تظهر في مجموعات مختلفة من الامتحانات)\n\n`;
      }
    }

    // Save report to file
    const outputPath = path.join(__dirname, 'duplicate-questions-by-group.txt');
    const absolutePath = path.resolve(outputPath);
    
    try {
      fs.writeFileSync(outputPath, report, 'utf8');
      
      // Verify file was created
      if (fs.existsSync(outputPath)) {
        const stats = fs.statSync(outputPath);
        console.log('\n✅ تم إنشاء التقرير بنجاح!');
        console.log(`📄 المسار النسبي: ${outputPath}`);
        console.log(`📄 المسار الكامل: ${absolutePath}`);
        console.log(`📊 حجم الملف: ${(stats.size / 1024).toFixed(2)} KB`);
        console.log(`\n📊 الملخص:`);
        console.log(`   - إجمالي المجموعات: ${sortedGroups.length}`);
        console.log(`   - إجمالي مجموعات الأسئلة المكررة: ${duplicates.length}`);
        console.log(`   - إجمالي التكرارات: ${duplicates.reduce((sum, d) => sum + d.count, 0)}`);
        console.log(`\n💡 لعرض الملف استخدم:`);
        console.log(`   cat ${absolutePath}`);
        console.log(`   أو`);
        console.log(`   less ${absolutePath}`);
      } else {
        throw new Error('فشل إنشاء الملف - الملف غير موجود بعد الكتابة');
      }
    } catch (writeError) {
      console.error('❌ خطأ في كتابة الملف:', writeError);
      throw writeError;
    }

    return outputPath;
  } catch (error) {
    console.error('❌ خطأ في إنشاء التقرير:', error);
    throw error;
  }
};

// Main execution
const main = async () => {
  try {
    await connectDB();
    await generateDuplicateReportByGroup();
    process.exit(0);
  } catch (error) {
    console.error('خطأ فادح:', error);
    process.exit(1);
  }
};

main();
