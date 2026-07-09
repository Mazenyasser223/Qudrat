#!/usr/bin/env node
/** Quick scan: inactive exams + perceptual near-duplicates among unique images */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const imghash = require('imghash');
const connectDB = require('../config/database');
const Exam = require('../models/Exam');
const crypto = require('crypto');
const https = require('https');
const http = require('http');

const downloadImage = (url) => new Promise((resolve, reject) => {
  const protocol = url.startsWith('https') ? https : http;
  const req = protocol.get(url, (res) => {
    if (res.statusCode !== 200) return reject(new Error(res.statusCode));
    const chunks = [];
    res.on('data', (c) => chunks.push(c));
    res.on('end', () => resolve(Buffer.concat(chunks)));
  });
  req.on('error', reject);
  req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
});

const hamming = (a, b) => {
  if (!a || !b || a.length !== b.length) return 99;
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
};

async function scanExams(filter, label) {
  const exams = await Exam.find(filter).select('title examGroup order questions').lean();
  const urlMap = new Map();
  let total = 0;
  for (const exam of exams) {
    for (const q of exam.questions || []) {
      if (!q?.questionImage?.startsWith('http')) continue;
      total++;
      if (!urlMap.has(q.questionImage)) urlMap.set(q.questionImage, 0);
      urlMap.set(q.questionImage, urlMap.get(q.questionImage) + 1);
    }
  }
  const urlDups = [...urlMap.values()].filter((c) => c > 1).length;
  return { exams: exams.length, questions: total, urlDupGroups: urlDups };
}

async function sampleNearDuplicates(entries, sampleSize = 500) {
  // phash all is too slow; sample for estimate OR hash unique md5 representatives
  const sampled = entries.slice(0, sampleSize);
  const hashes = [];
  for (const e of sampled) {
    const buf = await downloadImage(e.questionImage).catch(() => null);
    if (!buf) continue;
    const ph = await imghash.hash(buf, 16).catch(() => null);
    if (ph) hashes.push({ ph, ...e });
  }
  let nearPairs = 0;
  const THRESHOLD = 5;
  for (let i = 0; i < hashes.length; i++) {
    for (let j = i + 1; j < hashes.length; j++) {
      if (hamming(hashes[i].ph, hashes[j].ph) <= THRESHOLD) nearPairs++;
    }
  }
  return { sampled: hashes.length, nearPairs, threshold: THRESHOLD };
}

async function main() {
  await connectDB();

  const inactive = await scanExams({ isActive: false }, 'inactive');
  console.log('Inactive exams:', inactive);

  // Collect one entry per unique URL from active exams for phash sampling
  const exams = await Exam.find({ isActive: true }).select('title examGroup order questions').lean();
  const seen = new Set();
  const uniqueEntries = [];
  for (const exam of exams) {
    for (let i = 0; i < (exam.questions || []).length; i++) {
      const q = exam.questions[i];
      if (!q?.questionImage?.startsWith('http') || seen.has(q.questionImage)) continue;
      seen.add(q.questionImage);
      uniqueEntries.push({ examTitle: exam.title, questionImage: q.questionImage });
    }
  }

  console.log(`\nSampling perceptual near-duplicates (first 300 unique images, threshold ≤5)...`);
  const near = await sampleNearDuplicates(uniqueEntries, 300);
  console.log('Near-duplicate sample:', near);
  console.log('\nIf nearPairs > 0 in sample, more visual duplicates may exist beyond the 44 exact matches.');

  await mongoose.connection.close();
}

main().catch(async (e) => { console.error(e); try { await mongoose.connection.close(); } catch (_) {} process.exit(1); });
