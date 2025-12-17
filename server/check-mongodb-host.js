require('dotenv').config();

console.log('\n=== MONGODB CONNECTION INFO ===\n');

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/qudrat-platform';

// Mask password for security
const maskedUri = mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
console.log('Connection String:', maskedUri);

// Identify hosting provider
let provider = 'Unknown';
let backupInstructions = '';

if (mongoUri.includes('mongodb.net') || mongoUri.includes('mongodb+srv')) {
  provider = 'MongoDB Atlas';
  backupInstructions = `
╔══════════════════════════════════════════════════════════════════════╗
║                    MONGODB ATLAS BACKUP RESTORE                      ║
╚══════════════════════════════════════════════════════════════════════╝

MongoDB Atlas has automatic backups! Here's how to restore:

1. Go to https://cloud.mongodb.com/
2. Log in to your account
3. Select your project
4. Click on your cluster
5. Go to "Backup" tab (on the left sidebar)
6. You should see:
   • Cloud Backups (automatic snapshots taken periodically)
   • Point-in-Time Restore (if enabled on M10+ clusters)

7. To restore:
   a) Find the snapshot from BEFORE the student was deleted
   b) Click "..." (three dots) next to the snapshot
   c) Choose "Download" or "Restore" option
   
   Option A - Download:
   • Download the snapshot to your computer
   • Restore specific collection (users) locally
   • Extract the deleted student data
   
   Option B - Restore to Cluster:
   • Restore to a new cluster (RECOMMENDED)
   • Connect to the new cluster
   • Export the student data
   • Import to your production cluster

8. IMPORTANT: Restoring will NOT overwrite your current data if you:
   • Restore to a NEW cluster, then manually copy the student record
   • Use mongodump/mongorestore to restore only the specific document

⚠️  DO NOT restore the entire snapshot over your production cluster
   unless you want to lose all changes made after that snapshot!

Need help with the technical restore? I can provide MongoDB commands.
`;
} else if (mongoUri.includes('amazonaws.com') || mongoUri.includes('aws')) {
  provider = 'AWS DocumentDB/EC2';
  backupInstructions = `
╔══════════════════════════════════════════════════════════════════════╗
║                      AWS BACKUP RESTORE                              ║
╚══════════════════════════════════════════════════════════════════════╝

For AWS-hosted MongoDB:

1. If using AWS DocumentDB:
   • Go to AWS DocumentDB Console
   • Select your cluster
   • Click "Actions" → "Restore to point in time"
   • Choose a time before deletion
   • Create a new cluster with the restored data

2. If using EC2 with MongoDB:
   • Check if you have EBS snapshots
   • Go to EC2 → Elastic Block Store → Snapshots
   • Find snapshot from before deletion
   • Create volume from snapshot
   • Mount and extract data

3. If using AWS Backup:
   • Go to AWS Backup Console
   • Find backup from before deletion
   • Restore to a new resource
   • Extract student data
`;
} else if (mongoUri.includes('localhost') || mongoUri.includes('127.0.0.1')) {
  provider = 'Local MongoDB';
  backupInstructions = `
╔══════════════════════════════════════════════════════════════════════╗
║                     LOCAL MONGODB RESTORE                            ║
╚══════════════════════════════════════════════════════════════════════╝

For local MongoDB, check these backup sources:

1. Manual backups (if you created them):
   • Check your backup directory for .bson files
   • Use: mongorestore --db qudrat-platform --collection users path/to/backup

2. MongoDB Compass snapshots:
   • Open MongoDB Compass
   • Check if you have any saved queries/exports

3. File system snapshots:
   • Windows: Check Volume Shadow Copies
     Right-click MongoDB data folder → Restore previous versions
   • Look for: C:\\Program Files\\MongoDB\\Server\\*\\data

4. Time Machine / System Restore:
   • If enabled, restore MongoDB data directory from backup

Unfortunately, without automated backups, recovery is very difficult.
`;
} else if (mongoUri.includes('digitalocean')) {
  provider = 'DigitalOcean Managed Database';
  backupInstructions = `
╔══════════════════════════════════════════════════════════════════════╗
║                  DIGITALOCEAN BACKUP RESTORE                         ║
╚══════════════════════════════════════════════════════════════════════╝

DigitalOcean Managed Databases have automatic daily backups:

1. Go to https://cloud.digitalocean.com/
2. Navigate to Databases
3. Select your database cluster
4. Click "Backups & Restore" tab
5. You'll see daily backups (retained for 7 days)
6. Click "Restore" on a backup from before deletion
7. Choose to restore to:
   • Same cluster (will replace current data)
   • New cluster (RECOMMENDED - then copy student data)

Note: Backups are taken daily, so you can only restore to yesterday.
`;
} else {
  backupInstructions = `
╔══════════════════════════════════════════════════════════════════════╗
║                    GENERAL BACKUP INSTRUCTIONS                       ║
╚══════════════════════════════════════════════════════════════════════╝

Unable to automatically identify your hosting provider.

Please check:
1. Your hosting provider's control panel/dashboard
2. Look for "Backups", "Snapshots", or "Point-in-Time Recovery"
3. Contact your hosting provider's support

Common providers and their backup features:
• MongoDB Atlas: Automatic backups in the Backup tab
• AWS DocumentDB: Point-in-time restore
• DigitalOcean: Daily automatic backups (7-day retention)
• Heroku: Use heroku pg:backups
• ScaleGrid: Automatic backups with point-in-time recovery
`;
}

console.log('\n📍 Hosting Provider:', provider);
console.log(backupInstructions);

console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
console.log('║                    ALTERNATIVE RECOVERY OPTIONS                      ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝\n');
console.log('If backups are not available:');
console.log('1. Check application logs for student data (exam submissions, etc.)');
console.log('2. Check any external analytics or monitoring tools');
console.log('3. Ask if anyone has screenshots or exported reports with student info');
console.log('4. Recreate the student account (I can help with this)\n');

console.log('═══════════════════════════════════════════════════════════════════════\n');

