// This script searches application logs for any trace of the deleted student
const fs = require('fs');
const path = require('path');

const studentInfo = {
  name: "عمر احمد مصطفى",
  phone: "0599086447"
};

console.log('\n=== SEARCHING LOGS FOR STUDENT DATA ===\n');
console.log('Searching for:', studentInfo.name);
console.log('Phone:', studentInfo.phone, '\n');

// Common log locations
const logLocations = [
  '../logs',
  './logs',
  '../server/logs',
  process.env.LOG_PATH,
  '/var/log/qudrat'
];

let foundData = false;

for (const logPath of logLocations) {
  if (!logPath) continue;
  
  try {
    if (fs.existsSync(logPath)) {
      console.log(`📂 Checking: ${logPath}`);
      const files = fs.readdirSync(logPath);
      
      for (const file of files) {
        const filePath = path.join(logPath, file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        if (content.includes(studentInfo.name) || content.includes(studentInfo.phone)) {
          console.log(`   ✅ Found reference in: ${file}`);
          foundData = true;
          
          // Extract relevant lines
          const lines = content.split('\n');
          lines.forEach((line, index) => {
            if (line.includes(studentInfo.name) || line.includes(studentInfo.phone)) {
              console.log(`   Line ${index + 1}:`, line.substring(0, 200));
            }
          });
        }
      }
    }
  } catch (err) {
    // Ignore permission errors
  }
}

if (!foundData) {
  console.log('❌ No log files found or student not found in logs\n');
  console.log('Try checking:');
  console.log('1. Your hosting provider\'s logs (if deployed)');
  console.log('2. Browser console logs (if you have screenshots)');
  console.log('3. Any exported reports or CSV files\n');
}

console.log('\n═══════════════════════════════════════════════════════════════\n');

