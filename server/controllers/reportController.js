const fs = require('fs');
const path = require('path');
const imghash = require('imghash');
const crypto = require('crypto');
const https = require('https');
const http = require('http');
const Exam = require('../models/Exam');

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

// Generate duplicate report using the existing server DB connection (no new connection)
const generateLiveDuplicateReport = async (req, res) => {
  try {
    const exams = await Exam.find({ isActive: true })
      .select('_id title examGroup order isActive questions')
      .lean();

    const md5Map = new Map();
    const phashMap = new Map();
    let processed = 0;

    for (const exam of exams) {
      if (!Array.isArray(exam.questions)) continue;
      for (let i = 0; i < exam.questions.length; i++) {
        const q = exam.questions[i];
        if (!q?.questionImage) continue;

        let buf = null;
        if (q.questionImage.startsWith('http')) {
          buf = await downloadImage(q.questionImage).catch(() => null);
        } else if (q.questionImage.startsWith('data:')) {
          const part = q.questionImage.split('base64,')[1];
          if (part) buf = Buffer.from(part, 'base64');
        }
        if (!buf) continue;

        processed++;
        const md5Hash = md5(buf);
        const pHash = await imghash.hash(buf, 16).catch(() => null);
        const info = {
          examId: exam._id.toString(),
          examTitle: exam.title,
          examGroup: exam.examGroup,
          examOrder: exam.order,
          questionIndex: i,
          correctAnswer: q.correctAnswer || ''
        };
        if (md5Hash) {
          if (!md5Map.has(md5Hash)) md5Map.set(md5Hash, []);
          md5Map.get(md5Hash).push(info);
        }
        if (pHash) {
          if (!phashMap.has(pHash)) phashMap.set(pHash, []);
          phashMap.get(pHash).push({ ...info, md5Hash });
        }
      }
    }

    const exact = [];
    md5Map.forEach((arr, hash) => {
      if (arr.length > 1) exact.push({ md5Hash: hash, count: arr.length, occurrences: arr });
    });

    // Build simple Arabic text
    let out = '';
    out += '====================================\n';
    out += '📋 تقرير الأسئلة المكررة (الامتحانات النشطة فقط)\n';
    out += '====================================\n\n';
    out += `تاريخ الإنشاء: ${new Date().toLocaleString('ar-EG')}\n`;
    out += `عدد مجموعات التكرار (تطابق تام): ${exact.length}\n\n`;

    // Group by exam
    const examMap = new Map();
    exact.forEach((grp) => {
      grp.occurrences.forEach((occ) => {
        const id = occ.examId;
        if (!examMap.has(id)) {
          examMap.set(id, { title: occ.examTitle, group: occ.examGroup, order: occ.examOrder, dups: [] });
        }
        const others = grp.occurrences
          .filter((o) => o.examId !== id)
          .map((o) => ({ title: o.examTitle, group: o.examGroup, order: o.examOrder, q: o.questionIndex + 1 }));
        const entry = examMap.get(id);
        if (!entry.dups.find(d => d.md5 === grp.md5Hash)) {
          entry.dups.push({ md5: grp.md5Hash, q: occ.questionIndex + 1, answer: occ.correctAnswer, also: others, count: grp.count });
        }
      });
    });

    const sorted = Array.from(examMap.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => (a.group === b.group ? a.order - b.order : a.group - b.group));

    let currentGroup = null;
    for (const exam of sorted) {
      if (currentGroup !== exam.group) {
        currentGroup = exam.group;
        out += '------------------------------------\n';
        out += `📚 المجموعة ${exam.group}\n`;
        out += '------------------------------------\n\n';
      }
      out += `- الامتحان: "${exam.title}" (ترتيب ${exam.order})\n`;
      out += `  عدد الأسئلة المكررة: ${exam.dups.length}\n`;
      exam.dups.forEach((d, i) => {
        out += `  ${i + 1}) السؤال رقم: ${d.q}\n`;
        out += `     الإجابة الصحيحة: ${d.answer}\n`;
        if (d.also.length > 0) {
          out += `     يظهر أيضاً في (${d.count - 1}) امتحان:\n`;
          d.also.forEach((o) => {
            out += `       ▸ "${o.title}" (مجموعة ${o.group}، ترتيب ${o.order}، سؤال ${o.q})\n`;
          });
        } else {
          out += '     لا توجد نسخ أخرى.\n';
        }
      });
      out += '\n';
    }

    const outputPath = path.join(__dirname, '..', 'duplicate-questions-live-ar.txt');
    fs.writeFileSync(outputPath, out, 'utf8');

    return res.json({
      success: true,
      message: 'تم إنشاء التقرير',
      file: outputPath,
      groups: exact.length,
      processed
    });
  } catch (err) {
    console.error('Duplicate report error:', err);
    return res.status(500).json({ success: false, message: 'فشل إنشاء التقرير', error: err.message });
  }
};

module.exports = { generateLiveDuplicateReport };


