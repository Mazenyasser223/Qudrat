require('dotenv').config();
const mongoose = require('mongoose');
const Exam = require('./models/Exam');
const crypto = require('crypto');
const https = require('https');
const http = require('http');
const imghash = require('imghash');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/qudrat-platform', {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 20000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 60000,
      bufferCommands: false,
      retryReads: true,
      retryWrites: true
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
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
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Download timeout'));
    });
  });
};

const getImageBuffer = async (imageUrl) => {
  try {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return await downloadImage(imageUrl);
    }
    if (imageUrl.startsWith('data:')) {
      const base64 = imageUrl.split('base64,')[1];
      return base64 ? Buffer.from(base64, 'base64') : null;
    }
    return null;
  } catch (e) {
    console.warn(`⚠️  Failed to load image: ${e.message}`);
    return null;
  }
};

const md5 = (buf) => (buf ? crypto.createHash('md5').update(buf).digest('hex') : null);

const run = async () => {
  try {
    await connectDB();

    // Only exams visible on the website
    const exams = await Exam.find({ isActive: true })
      .select('_id title examGroup order isActive questions')
      .lean();

    console.log(`📚 Active exams: ${exams.length}`);

    const md5Map = new Map(); // md5 -> [occurrences]
    const phashMap = new Map(); // perceptual -> [occurrences]
    let processed = 0;

    for (const exam of exams) {
      if (!Array.isArray(exam.questions)) continue;
      for (let i = 0; i < exam.questions.length; i++) {
        const q = exam.questions[i];
        if (!q?.questionImage) continue;
        processed++;

        const buf = await getImageBuffer(q.questionImage);
        if (!buf) continue;

        const md5Hash = md5(buf);
        const pHash = await imghash.hash(buf, 16).catch(() => null);

        const info = {
          examId: exam._id.toString(),
          examTitle: exam.title,
          examGroup: exam.examGroup,
          examOrder: exam.order,
          questionIndex: i,
          correctAnswer: q.correctAnswer || '',
          explanation: q.explanation || ''
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

    // Prepare results (exact dupes only for clarity)
    const exact = [];
    md5Map.forEach((arr, hash) => {
      if (arr.length > 1) {
        exact.push({ md5Hash: hash, count: arr.length, occurrences: arr });
      }
    });

    // Similar (exclude those already exact)
    const similar = [];
    phashMap.forEach((arr, hash) => {
      const uniqueMD5 = [...new Set(arr.map(a => a.md5Hash).filter(Boolean))];
      if (arr.length > 1 && uniqueMD5.length > 1) {
        similar.push({ perceptualHash: hash, count: arr.length, occurrences: arr.map(({ md5Hash, ...rest }) => rest) });
      }
    });

    const fs = require('fs');
    const output = {
      timestamp: new Date().toISOString(),
      scope: 'active-only',
      processed,
      exactDuplicates: exact,
      similarDuplicates: similar
    };
    fs.writeFileSync('duplicate-questions-live.json', JSON.stringify(output, null, 2));
    console.log('💾 Saved duplicate-questions-live.json');

    await mongoose.connection.close();
    console.log('👋 Closed DB');
    process.exit(0);
  } catch (e) {
    console.error('❌ Failed:', e);
    await mongoose.connection.close();
    process.exit(1);
  }
};

run();


