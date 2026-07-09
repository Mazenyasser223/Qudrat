#!/usr/bin/env node
/**
 * Generate duplicate-questions report as a local .txt file.
 * Usage: node server/scripts/generate-duplicate-report.js [output-path]
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const connectDB = require('../config/database');
const { generateCombinedDuplicateReportFile } = require('../utils/visualSimilarityScan');

const defaultOutput = path.join(__dirname, '..', '..', 'duplicate-questions-report.txt');
const outputPath = process.argv[2] ? path.resolve(process.argv[2]) : defaultOutput;

async function main() {
  await connectDB();

  console.log('Scanning active exams (exact + visual duplicates)...');
  const result = await generateCombinedDuplicateReportFile(outputPath, (msg) => console.log(msg));

  console.log('Done.');
  console.log(`  File: ${result.file}`);
  console.log(`  Exams scanned: ${result.examsScanned}`);
  console.log(`  Questions scanned: ${result.questionsScanned}`);
  console.log(`  Exact duplicate groups: ${result.exactClusters}`);
  console.log(`  Visual duplicate groups: ${result.visualClusters}`);
  console.log(`  Total duplicate groups: ${result.groups}`);
  console.log(`  Images hashed: ${result.processed}`);

  await mongoose.connection.close();
}

main().catch(async (err) => {
  console.error('Failed to generate report:', err.message);
  try {
    await mongoose.connection.close();
  } catch (_) {}
  process.exit(1);
});
