const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting build process...');

// Change to client directory
process.chdir('client');

// Install dependencies
console.log('Installing dependencies...');
execSync('npm install', { stdio: 'inherit' });

// Build the React app
console.log('Building React app...');
execSync('npm run build', { stdio: 'inherit' });

// Copy build files to root
console.log('Copying build files...');
const buildDir = path.join(__dirname, 'client', 'build');
const outputDir = path.join(__dirname, 'build');

if (fs.existsSync(outputDir)) {
  fs.rmSync(outputDir, { recursive: true });
}

fs.cpSync(buildDir, outputDir, { recursive: true });

console.log('Build completed successfully!');
