#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Exam = require('../models/Exam');
const { scanDuplicateQuestions } = require('../controllers/reportController');

async function main() {
  await connectDB();

  const exams = await Exam.find({ isActive: true })
    .select('_id title examGroup order questions')
    .lean();

  const entries = [];
  let noImage = 0;
  for (const exam of exams) {
    if (!Array.isArray(exam.questions)) continue;
    for (let i = 0; i < exam.questions.length; i++) {
      const q = exam.questions[i];
      if (!q?.questionImage) {
        noImage++;
        continue;
      }
      entries.push({
        examId: exam._id.toString(),
        examTitle: exam.title,
        examGroup: exam.examGroup,
        examOrder: exam.order,
        questionIndex: i,
        questionImage: q.questionImage
      });
    }
  }

  // URL-string duplicates (same URL used in multiple questions)
  const urlMap = new Map();
  for (const e of entries) {
    if (!urlMap.has(e.questionImage)) urlMap.set(e.questionImage, []);
    urlMap.get(e.questionImage).push(e);
  }
  const urlDups = [...urlMap.entries()].filter(([, arr]) => arr.length > 1);

  console.log('\n=== Coverage audit ===\n');
  console.log(`Active exams:              ${exams.length}`);
  console.log(`Questions with image:      ${entries.length}`);
  console.log(`Questions without image:   ${noImage}`);
  console.log(`Unique image URLs:         ${urlMap.size}`);
  console.log(`URL duplicate groups:      ${urlDups.length} (same exact URL reused)`);

  const scan = await scanDuplicateQuestions((msg) => process.stdout.write(`\r${msg}`));
  console.log('\n');
  console.log(`Images successfully hashed: ${scan.processed}`);
  console.log(`Images NOT hashed:          ${entries.length - scan.processed}`);
  console.log(`MD5 duplicate groups:       ${scan.exact.length}`);

  // Cross-check: every URL dup should appear in MD5 dups
  const md5OccurrenceCount = scan.exact.reduce((s, g) => s + g.count, 0);
  const urlDupQuestionCount = urlDups.reduce((s, [, arr]) => s + arr.length, 0);
  console.log(`\nURL-dup questions total:    ${urlDupQuestionCount}`);
  console.log(`MD5-dup questions total:    ${md5OccurrenceCount}`);

  if (entries.length - scan.processed > 0) {
    console.log('\n⚠️  Some images could not be downloaded/hashed — duplicates among those may be missed.');
  }

  // Find URL dups where MD5 might differ (different URLs, need visual check)
  const urlOnlyGroups = urlDups.length;
  const md5Groups = scan.exact.length;
  if (urlOnlyGroups !== md5Groups) {
    console.log(`\nNote: URL groups (${urlOnlyGroups}) vs MD5 groups (${md5Groups}) — difference means some same-URL or cross-URL matches differ.`);
  }

  // Inactive exams
  const inactiveCount = await Exam.countDocuments({ isActive: false });
  const inactiveWithQuestions = await Exam.countDocuments({ isActive: false, 'questions.0': { $exists: true } });
  console.log(`\nInactive exams (not scanned): ${inactiveCount} (${inactiveWithQuestions} with questions)`);

  console.log('\n=== What the report does NOT catch ===');
  console.log('- Same question re-uploaded as a different file (crop, compression, new Cloudinary upload)');
  console.log('- Visually identical images with different pixel data');
  console.log('- Questions in inactive exams');
  console.log('- Any image that failed to download');

  await mongoose.connection.close();
}

main().catch(async (err) => {
  console.error(err);
  try { await mongoose.connection.close(); } catch (_) {}
  process.exit(1);
});
