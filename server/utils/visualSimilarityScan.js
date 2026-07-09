const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');
const imghash = require('imghash');
const Exam = require('../models/Exam');

const PHASH_BITS = 32;
const PHASH_THRESHOLD = 8;

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

const hammingHex = (a, b) => {
  if (!a || !b) return Infinity;
  if (a.length !== b.length) return Infinity;
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) {
      dist += x & 1;
      x >>= 1;
    }
  }
  return dist;
};

class UnionFind {
  constructor(n) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = new Array(n).fill(0);
  }

  find(x) {
    if (this.parent[x] !== x) this.parent[x] = this.find(this.parent[x]);
    return this.parent[x];
  }

  union(a, b) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return;
    if (this.rank[ra] < this.rank[rb]) this.parent[ra] = rb;
    else if (this.rank[ra] > this.rank[rb]) this.parent[rb] = ra;
    else {
      this.parent[rb] = ra;
      this.rank[ra]++;
    }
  }
}

const occurrenceSortKey = (o) => [o.examGroup, o.examOrder, o.questionIndex];

const compareOccurrences = (a, b) => {
  const ka = occurrenceSortKey(a);
  const kb = occurrenceSortKey(b);
  for (let i = 0; i < ka.length; i++) {
    if (ka[i] !== kb[i]) return ka[i] - kb[i];
  }
  return 0;
};

const clusterType = (occurrences) => {
  const md5Set = new Set(occurrences.map((o) => o.md5Hash).filter(Boolean));
  if (md5Set.size <= 1) return 'exact';
  return 'visual';
};

const collectActiveQuestionEntries = async () => {
  const exams = await Exam.find({ isActive: true })
    .select('_id title examGroup order questions')
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

  return { exams, entries };
};

const scanVisualSimilarQuestions = async (onProgress) => {
  const { exams, entries } = await collectActiveQuestionEntries();

  const imageKeys = [...new Set(entries.map((e) => e.questionImage))];
  const keyToIndex = new Map(imageKeys.map((k, i) => [k, i]));

  if (onProgress) onProgress(`Downloading and hashing ${imageKeys.length} unique images...`);

  const imageMeta = new Array(imageKeys.length);
  let done = 0;
  await mapPool(imageKeys, 20, async (imageKey) => {
    let buf = null;
    if (imageKey.startsWith('http')) {
      buf = await downloadImage(imageKey).catch(() => null);
    } else if (imageKey.startsWith('data:')) {
      const part = imageKey.split('base64,')[1];
      if (part) buf = Buffer.from(part, 'base64');
    }

    const idx = keyToIndex.get(imageKey);
    if (!buf) {
      imageMeta[idx] = { imageKey, md5Hash: null, phash: null };
    } else {
      const md5Hash = md5(buf);
      const phash = await imghash.hash(buf, PHASH_BITS).catch(() => null);
      imageMeta[idx] = { imageKey, md5Hash, phash };
    }

    done++;
    if (onProgress && done % 100 === 0) onProgress(`Hashed ${done}/${imageKeys.length} images...`);
  });

  const hashable = imageMeta
    .map((m, i) => ({ ...m, index: i }))
    .filter((m) => m.phash);

  if (onProgress) onProgress(`Clustering ${hashable.length} images by visual similarity...`);

  const uf = new UnionFind(hashable.length);
  const totalPairs = (hashable.length * (hashable.length - 1)) / 2;
  let compared = 0;
  let lastLog = 0;

  for (let i = 0; i < hashable.length; i++) {
    for (let j = i + 1; j < hashable.length; j++) {
      if (hammingHex(hashable[i].phash, hashable[j].phash) <= PHASH_THRESHOLD) {
        uf.union(i, j);
      }
      compared++;
      if (onProgress && compared - lastLog >= 500000) {
        lastLog = compared;
        const pct = ((compared / totalPairs) * 100).toFixed(1);
        onProgress(`Comparing images: ${pct}% (${compared.toLocaleString()}/${totalPairs.toLocaleString()})`);
      }
    }
  }

  const clusterMap = new Map();
  for (let i = 0; i < hashable.length; i++) {
    const root = uf.find(i);
    if (!clusterMap.has(root)) clusterMap.set(root, []);
    clusterMap.get(root).push(hashable[i]);
  }

  const imageKeyToMeta = new Map(imageMeta.map((m) => [m.imageKey, m]));

  const clusters = [];
  for (const members of clusterMap.values()) {
    if (members.length < 2) continue;

    const memberImageKeys = new Set();
    for (const m of members) memberImageKeys.add(m.imageKey);

    const occurrences = entries
      .filter((e) => memberImageKeys.has(e.questionImage))
      .map((e) => ({
        ...e,
        md5Hash: imageKeyToMeta.get(e.questionImage)?.md5Hash || null,
        phash: imageKeyToMeta.get(e.questionImage)?.phash || null
      }));

    if (occurrences.length < 2) continue;

    clusters.push({
      type: clusterType(occurrences),
      count: occurrences.length,
      uniqueImages: members.length,
      occurrences
    });
  }

  clusters.sort((a, b) => compareOccurrences(
    [...a.occurrences].sort(compareOccurrences)[0],
    [...b.occurrences].sort(compareOccurrences)[0]
  ));

  const unhashed = entries.filter((e) => !imageKeyToMeta.get(e.questionImage)?.phash).length;

  return {
    clusters,
    examsScanned: exams.length,
    questionsScanned: entries.length,
    uniqueImages: imageKeys.length,
    imagesHashed: hashable.length,
    imagesUnhashed: unhashed,
    exactClusters: clusters.filter((c) => c.type === 'exact').length,
    visualClusters: clusters.filter((c) => c.type === 'visual').length
  };
};

const buildVisualSimilarityReportText = (scanResult) => {
  const { clusters, examsScanned, questionsScanned, uniqueImages, imagesHashed, imagesUnhashed, exactClusters, visualClusters } = scanResult;

  const duplicateGroups = clusters
    .map((cluster) => {
      const sorted = [...cluster.occurrences].sort(compareOccurrences);
      const primary = sorted[0];
      const others = sorted.slice(1);
      const sameExam = others.filter((o) => o.examId === primary.examId);
      const otherExams = others.filter((o) => o.examId !== primary.examId);
      return { ...cluster, primary, sameExam, otherExams };
    })
    .sort((a, b) => compareOccurrences(a.primary, b.primary));

  const visualOnly = duplicateGroups.filter((d) => d.type === 'visual');
  const exact = duplicateGroups.filter((d) => d.type === 'exact');

  const lines = [];
  const hr = '═'.repeat(60);
  const subHr = '─'.repeat(60);

  lines.push(hr);
  lines.push('  تقرير التشابه البصري للأسئلة (الامتحانات النشطة فقط)');
  lines.push(hr);
  lines.push('');
  lines.push(`  تاريخ الإنشاء       : ${new Date().toLocaleString('ar-EG')}`);
  lines.push(`  الامتحانات المفحوصة  : ${examsScanned}`);
  lines.push(`  الأسئلة المفحوصة     : ${questionsScanned}`);
  lines.push(`  صور فريدة            : ${uniqueImages}`);
  lines.push(`  صور تم تحليلها       : ${imagesHashed}`);
  if (imagesUnhashed > 0) lines.push(`  صور لم تُحلل         : ${imagesUnhashed}`);
  lines.push(`  عتبة التشابه         : ${PHASH_THRESHOLD} بت (من ${PHASH_BITS})`);
  lines.push('');
  lines.push(`  مجموعات التشابه البصري فقط : ${visualClusters}  ← ملفات مختلفة لكن شكل متشابه`);
  lines.push(`  مجموعات التطابق التام      : ${exactClusters}  ← نفس الصورة بالضبط`);
  lines.push('');
  lines.push('  ملاحظة: كل مجموعة تُذكر مرة واحدة من أول ظهور للسؤال.');
  lines.push('');

  const renderGroup = (dup, globalIndex, typeLabel) => {
    const { primary, sameExam, otherExams, count, uniqueImages } = dup;
    const block = [];
    block.push(`  ┌─ ${typeLabel} #${globalIndex} ${'─'.repeat(Math.max(0, 40 - String(globalIndex).length - typeLabel.length))}`);
    block.push('  │');
    block.push('  │  المصدر (أول ظهور):');
    block.push(`  │    الامتحان  : ${primary.examTitle}`);
    block.push(`  │    الترتيب   : ${primary.examOrder}`);
    block.push(`  │    السؤال    : ${primary.questionIndex + 1}`);
    block.push(`  │    الإجابة   : ${primary.correctAnswer || '—'}`);
    block.push(`  │    نسخ مماثلة: ${count} سؤال / ${uniqueImages} صورة`);
    block.push('  │');

    if (sameExam.length > 0) {
      block.push('  │  مكرر داخل نفس الامتحان:');
      sameExam.forEach((o) => {
        const tag = o.md5Hash === primary.md5Hash ? 'تطابق تام' : 'تشابه بصري';
        block.push(`  │    • سؤال ${o.questionIndex + 1} (${tag})`);
      });
      block.push('  │');
    }

    if (otherExams.length > 0) {
      block.push(`  │  يتكرر أيضاً في ${otherExams.length} موقع:`);
      otherExams.forEach((o) => {
        const tag = o.md5Hash === primary.md5Hash ? 'تطابق تام' : 'تشابه بصري';
        block.push(`  │    • ${o.examTitle} — مجموعة ${o.examGroup}، ترتيب ${o.examOrder}، سؤال ${o.questionIndex + 1} (${tag})`);
      });
    } else if (sameExam.length === 0) {
      block.push('  │  (لا توجد نسخ إضافية)');
    }

    block.push(`  └${'─'.repeat(48)}`);
    block.push('');
    return block;
  };

  let globalIndex = 0;

  if (visualOnly.length > 0) {
    lines.push(hr);
    lines.push(`  تشابه بصري فقط — ملفات مختلفة (${visualOnly.length} مجموعة)`);
    lines.push(hr);
    lines.push('');
    visualOnly.forEach((dup) => {
      globalIndex++;
      lines.push(...renderGroup(dup, globalIndex, 'تشابه بصري'));
    });
  }

  if (exact.length > 0) {
    lines.push(hr);
    lines.push(`  تطابق تام للصورة (${exact.length} مجموعة)`);
    lines.push(hr);
    lines.push('');
    exact.forEach((dup) => {
      globalIndex++;
      lines.push(...renderGroup(dup, globalIndex, 'تطابق تام'));
    });
  }

  if (duplicateGroups.length === 0) {
    lines.push('  لا توجد أسئلة متشابهة بصرياً.');
    lines.push('');
  }

  lines.push(subHr);
  lines.push('  نهاية التقرير');
  lines.push(subHr);

  return lines.join('\n');
};

/** Main duplicate report: exact + visual, grouped by المجموعة */
const buildCombinedDuplicateReportText = (scanResult) => {
  const { clusters, examsScanned, questionsScanned, exactClusters, visualClusters } = scanResult;

  const duplicateGroups = clusters
    .map((cluster) => {
      const sorted = [...cluster.occurrences].sort(compareOccurrences);
      const primary = sorted[0];
      const others = sorted.slice(1);
      return {
        type: cluster.type,
        count: cluster.count,
        primary,
        sameExam: others.filter((o) => o.examId === primary.examId),
        otherExams: others.filter((o) => o.examId !== primary.examId)
      };
    })
    .sort((a, b) => compareOccurrences(a.primary, b.primary));

  const groupsByExamGroup = new Map();
  for (const dup of duplicateGroups) {
    const g = dup.primary.examGroup;
    if (!groupsByExamGroup.has(g)) groupsByExamGroup.set(g, []);
    groupsByExamGroup.get(g).push(dup);
  }

  const sortedGroupNumbers = [...groupsByExamGroup.keys()].sort((a, b) => a - b);
  const totalAffected = duplicateGroups.reduce((sum, d) => sum + d.count, 0);
  const typeLabel = (type) => (type === 'visual' ? 'تشابه بصري' : 'تطابق تام');

  const lines = [];
  const hr = '═'.repeat(60);
  const subHr = '─'.repeat(60);

  lines.push(hr);
  lines.push('  تقرير الأسئلة المكررة (الامتحانات النشطة فقط)');
  lines.push(hr);
  lines.push('');
  lines.push(`  تاريخ الإنشاء       : ${new Date().toLocaleString('ar-EG')}`);
  lines.push(`  الامتحانات المفحوصة  : ${examsScanned}`);
  lines.push(`  الأسئلة المفحوصة     : ${questionsScanned}`);
  lines.push(`  مجموعات التكرار      : ${duplicateGroups.length} (${exactClusters} تطابق تام + ${visualClusters} تشابه بصري)`);
  lines.push(`  إجمالي النسخ         : ${totalAffected} سؤال`);
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
      const { primary, sameExam, otherExams, type } = dup;

      lines.push(`  ┌─ تكرار #${globalIndex} [${typeLabel(type)}] ${'─'.repeat(Math.max(0, 30 - String(globalIndex).length - typeLabel(type).length))}`);
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
          const tag = type === 'visual' ? 'تشابه بصري' : 'تطابق تام';
          lines.push(`  │    • سؤال ${o.questionIndex + 1} (إجابة: ${o.correctAnswer || '—'}) — ${tag}`);
        });
        lines.push('  │');
      }

      if (otherExams.length > 0) {
        lines.push(`  │  يتكرر أيضاً في ${otherExams.length} موقع:`);
        otherExams.forEach((o) => {
          const tag = type === 'visual' ? 'تشابه بصري' : 'تطابق تام';
          lines.push(`  │    • ${o.examTitle} — مجموعة ${o.examGroup}، ترتيب ${o.examOrder}، سؤال ${o.questionIndex + 1} — ${tag}`);
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

const generateCombinedDuplicateReportFile = async (outputPath, onProgress) => {
  const scanResult = await scanVisualSimilarQuestions(onProgress);
  const out = buildCombinedDuplicateReportText(scanResult);
  const file = outputPath || path.join(__dirname, '..', '..', 'duplicate-questions-report.txt');
  fs.writeFileSync(file, out, 'utf8');
  return {
    file,
    groups: scanResult.clusters.length,
    exactClusters: scanResult.exactClusters,
    visualClusters: scanResult.visualClusters,
    processed: scanResult.imagesHashed,
    examsScanned: scanResult.examsScanned,
    questionsScanned: scanResult.questionsScanned
  };
};

const generateVisualSimilarityReportFile = async (outputPath, onProgress) => {
  const scanResult = await scanVisualSimilarQuestions(onProgress);
  const out = buildVisualSimilarityReportText(scanResult);
  const file = outputPath || path.join(__dirname, '..', '..', 'duplicate-questions-visual-report.txt');
  fs.writeFileSync(file, out, 'utf8');
  return {
    file,
    ...scanResult,
    totalClusters: scanResult.clusters.length
  };
};

module.exports = {
  scanVisualSimilarQuestions,
  buildVisualSimilarityReportText,
  buildCombinedDuplicateReportText,
  generateVisualSimilarityReportFile,
  generateCombinedDuplicateReportFile,
  PHASH_BITS,
  PHASH_THRESHOLD
};
