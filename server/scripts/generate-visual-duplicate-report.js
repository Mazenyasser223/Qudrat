#!/usr/bin/env node
/**
 * Full visual similarity scan for active exam questions.
 * Usage: node server/scripts/generate-visual-duplicate-report.js [output-path]
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const connectDB = require('../config/database');
const { generateVisualSimilarityReportFile } = require('../utils/visualSimilarityScan');

const defaultOutput = path.join(__dirname, '..', '..', 'duplicate-questions-visual-report.txt');
const outputPath = process.argv[2] ? path.resolve(process.argv[2]) : defaultOutput;

async function main() {
  await connectDB();

  console.log('Running full visual similarity scan on active exams...');
  const result = await generateVisualSimilarityReportFile(outputPath, (msg) => console.log(msg));

  console.log('\nDone.');
  console.log(`  File: ${result.file}`);
  console.log(`  Exams scanned: ${result.examsScanned}`);
  console.log(`  Questions scanned: ${result.questionsScanned}`);
  console.log(`  Images hashed: ${result.imagesHashed}`);
  console.log(`  Visual-only clusters: ${result.visualClusters}`);
  console.log(`  Exact-match clusters: ${result.exactClusters}`);
  console.log(`  Total clusters: ${result.totalClusters}`);

  await mongoose.connection.close();
}

main().catch(async (err) => {
  console.error('Failed to generate visual report:', err.message);
  try {
    await mongoose.connection.close();
  } catch (_) {}
  process.exit(1);
});
