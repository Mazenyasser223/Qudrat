const fs = require('fs');
const path = require('path');

const fileName = 'duplicate-questions-by-group.txt';

// Check in current directory
const currentDir = process.cwd();
const currentPath = path.join(currentDir, fileName);
if (fs.existsSync(currentPath)) {
  console.log(`✅ Found file in current directory:`);
  console.log(`   ${path.resolve(currentPath)}`);
  process.exit(0);
}

// Check in server directory (where script is located)
const scriptDir = __dirname;
const scriptPath = path.join(scriptDir, fileName);
if (fs.existsSync(scriptPath)) {
  console.log(`✅ Found file in script directory:`);
  console.log(`   ${path.resolve(scriptPath)}`);
  process.exit(0);
}

// Search in common locations
const searchPaths = [
  '/root/Qudrat/server',
  '/root/Qudrat',
  process.cwd(),
  __dirname
];

console.log('🔍 Searching for file...\n');
let found = false;

for (const searchPath of searchPaths) {
  const fullPath = path.join(searchPath, fileName);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ Found file at:`);
    console.log(`   ${path.resolve(fullPath)}`);
    const stats = fs.statSync(fullPath);
    console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
    found = true;
    break;
  }
}

if (!found) {
  console.log('❌ File not found in common locations.');
  console.log('\nSearched in:');
  searchPaths.forEach(p => console.log(`   - ${path.resolve(p)}`));
  console.log('\n💡 Try running the report script again:');
  console.log('   node get-duplicate-questions-by-group.js');
  process.exit(1);
}

