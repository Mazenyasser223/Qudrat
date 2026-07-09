const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');
const Exam = require('../models/Exam');
const { generateCombinedDuplicateReportFile } = require('../utils/visualSimilarityScan');

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
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Download timeout'));
    });
  });
};

const md5 = (buf) => (buf ? crypto.createHash('md5').update(buf).digest('hex') : null);

const mapPool = async (items, limit, fn) => {
  const results = new Array(items.length);
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
};

const imageBufferFromSource = (questionImage, bufCache) => {
  if (!questionImage) return null;
  if (questionImage.startsWith('http')) return bufCache.get(questionImage) || null;
  if (questionImage.startsWith('data:')) {
    const part = questionImage.split('base64,')[1];
    return part ? Buffer.from(part, 'base64') : null;
  }
  return null;
};

const occurrenceSortKey = (o) => [o.examGroup, o.examOrder, o.questionIndex];

const compareOccurrences = (a, b) => {
  const ka = occurrenceSortKey(a);
  const kb = occurrenceSortKey(b);
  for (let i = 0; i < ka.length; i++) {
    if (ka[i] !== kb[i]) return ka[i] - kb[i];
  }
  return 0;
};

const buildDuplicateReportText = (exact) => {
  const duplicateGroups = exact
    .map((grp) => {
      const sorted = [...grp.occurrences].sort(compareOccurrences);
      const primary = sorted[0];
      const others = sorted.slice(1);
      const sameExam = others.filter((o) => o.examId === primary.examId);
      const otherExams = others.filter((o) => o.examId !== primary.examId);
      return { md5Hash: grp.md5Hash, count: grp.count, primary, sameExam, otherExams };
    })
    .sort((a, b) => compareOccurrences(a.primary, b.primary));

  const groupsByExamGroup = new Map();
  for (const dup of duplicateGroups) {
    const g = dup.primary.examGroup;
    if (!groupsByExamGroup.has(g)) groupsByExamGroup.set(g, []);
    groupsByExamGroup.get(g).push(dup);
  }

  const sortedGroupNumbers = [...groupsByExamGroup.keys()].sort((a, b) => a - b);
  const totalAffectedQuestions = duplicateGroups.reduce((sum, d) => sum + d.count, 0);

  const lines = [];
  const hr = '═'.repeat(60);
  const subHr = '─'.repeat(60);

  lines.push(hr);
  lines.push('  تقرير الأسئلة المكررة (الامتحانات النشطة فقط)');
  lines.push(hr);
  lines.push('');
  lines.push(`  تاريخ الإنشاء     : ${new Date().toLocaleString('ar-EG')}`);
  lines.push(`  مجموعات التكرار   : ${duplicateGroups.length}`);
  lines.push(`  إجمالي النسخ      : ${totalAffectedQuestions} سؤال`);
  lines.push('');
  lines.push('  ملاحظة: كل تكرار يُذكر مرة واحدة فقط من أول ظهور للسؤال.');
  lines.push('');

  let globalIndex = 0;

  for (const groupNum of sortedGroupNumbers) {
    const dups = groupsByExamGroup.get(groupNum);
    lines.push(hr);
    lines.push(`  المجموعة ${groupNum}  (${dups.length} تكرار)`);
    lines.push(hr);
    lines.push('');

    dups.forEach((dup) => {
      globalIndex++;
      const { primary, sameExam, otherExams } = dup;

      lines.push(`  ┌─ تكرار #${globalIndex} ${'─'.repeat(Math.max(0, 44 - String(globalIndex).length))}`);
      lines.push('  │');
      lines.push('  │  المصدر (أول ظهور):');
      lines.push(`  │    الامتحان  : ${primary.examTitle}`);
      lines.push(`  │    الترتيب   : ${primary.examOrder}`);
      lines.push(`  │    السؤال    : ${primary.questionIndex + 1}`);
      lines.push(`  │    الإجابة   : ${primary.correctAnswer || '—'}`);
      lines.push('  │');

      if (sameExam.length > 0) {
        lines.push('  │  مكرر داخل نفس الامتحان:');
        sameExam.forEach((o) => {
          lines.push(`  │    • سؤال ${o.questionIndex + 1} (إجابة: ${o.correctAnswer || '—'})`);
        });
        lines.push('  │');
      }

      if (otherExams.length > 0) {
        lines.push(`  │  يتكرر أيضاً في ${otherExams.length} موقع:`);
        otherExams.forEach((o) => {
          lines.push(`  │    • ${o.examTitle} — مجموعة ${o.examGroup}، ترتيب ${o.examOrder}، سؤال ${o.questionIndex + 1}`);
        });
      } else if (sameExam.length === 0) {
        lines.push('  │  (لا توجد نسخ إضافية)');
      }

      lines.push(`  └${'─'.repeat(48)}`);
      lines.push('');
    });
  }

  if (duplicateGroups.length === 0) {
    lines.push('  لا توجد أسئلة مكررة.');
    lines.push('');
  }

  lines.push(subHr);
  lines.push('  نهاية التقرير');
  lines.push(subHr);

  return lines.join('\n');
};

const scanDuplicateQuestions = async (onProgress) => {
  const exams = await Exam.find({ isActive: true })
    .select('_id title examGroup order isActive questions')
    .lean();

  const entries = [];
  for (const exam of exams) {
    if (!Array.isArray(exam.questions)) continue;
    for (let i = 0; i < exam.questions.length; i++) {
      const q = exam.questions[i];
      if (!q?.questionImage) continue;
      entries.push({
        examId: exam._id.toString(),
        examTitle: exam.title,
        examGroup: exam.examGroup,
        examOrder: exam.order,
        questionIndex: i,
        correctAnswer: q.correctAnswer || '',
        questionImage: q.questionImage
      });
    }
  }

  const httpUrls = [...new Set(entries.map((e) => e.questionImage).filter((img) => img.startsWith('http')))];
  const bufCache = new Map();

  if (onProgress) onProgress(`Downloading ${httpUrls.length} unique images...`);
  let downloaded = 0;
  await mapPool(httpUrls, 20, async (url) => {
    const buf = await downloadImage(url).catch(() => null);
    bufCache.set(url, buf);
    downloaded++;
    if (onProgress && downloaded % 100 === 0) {
      onProgress(`Downloaded ${downloaded}/${httpUrls.length} images...`);
    }
  });

  const md5Map = new Map();
  let processed = 0;

  for (const entry of entries) {
    const buf = imageBufferFromSource(entry.questionImage, bufCache);
    if (!buf) continue;

    processed++;
    const md5Hash = md5(buf);
    if (!md5Hash) continue;

    const info = {
      examId: entry.examId,
      examTitle: entry.examTitle,
      examGroup: entry.examGroup,
      examOrder: entry.examOrder,
      questionIndex: entry.questionIndex,
      correctAnswer: entry.correctAnswer
    };

    if (!md5Map.has(md5Hash)) md5Map.set(md5Hash, []);
    md5Map.get(md5Hash).push(info);
  }

  const exact = [];
  md5Map.forEach((arr, hash) => {
    if (arr.length > 1) exact.push({ md5Hash: hash, count: arr.length, occurrences: arr });
  });

  return { exact, processed, examsScanned: exams.length, questionsScanned: entries.length };
};

const generateDuplicateReportFile = async (outputPath, onProgress) => {
  return generateCombinedDuplicateReportFile(outputPath, onProgress);
};

const generateLiveDuplicateReport = async (req, res) => {
  try {
    const result = await generateDuplicateReportFile(
      path.join(__dirname, '..', 'duplicate-questions-live-ar.txt')
    );

    return res.json({
      success: true,
      message: 'تم إنشاء التقرير',
      file: result.file,
      groups: result.groups,
      processed: result.processed
    });
  } catch (err) {
    console.error('Duplicate report error:', err);
    return res.status(500).json({ success: false, message: 'فشل إنشاء التقرير', error: err.message });
  }
};

module.exports = { generateLiveDuplicateReport, generateDuplicateReportFile, scanDuplicateQuestions };


