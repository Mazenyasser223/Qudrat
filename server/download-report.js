const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();

const config = {
  host: '62.72.29.136',
  username: 'root',
  password: '@Mm20120012012001',
  port: 22,
  tryKeyboard: true,
  readyTimeout: 20000
};

const remoteFile = '/root/Qudrat/server/duplicate-questions-by-group.txt';
const localFile = path.join(__dirname, 'duplicate-questions-by-group.txt');

console.log('🔌 Connecting to server...');

conn.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
  finish(['@Mm20120012012001']);
});

conn.on('ready', () => {
  console.log('✅ Connected to server');
  console.log('📥 Downloading file...');
  
  conn.sftp((err, sftp) => {
    if (err) {
      console.log('⚠️  SFTP not available, trying command execution...');
      // Fallback: execute cat command
      conn.exec(`cat ${remoteFile}`, (err, stream) => {
        if (err) {
          console.error('❌ Command execution error:', err);
          conn.end();
          return;
        }
        
        let content = '';
        stream.on('close', (code, signal) => {
          if (code === 0) {
            fs.writeFileSync(localFile, content, 'utf8');
            console.log('✅ File downloaded successfully!');
            console.log(`📄 Saved to: ${localFile}`);
            const stats = fs.statSync(localFile);
            console.log(`📊 File size: ${(stats.size / 1024).toFixed(2)} KB`);
          } else {
            console.error(`❌ Command failed with code ${code}`);
          }
          conn.end();
        }).on('data', (data) => {
          content += data.toString();
        }).stderr.on('data', (data) => {
          console.error('❌ Error:', data.toString());
        });
      });
      return;
    }
    
    // Try SFTP download
    sftp.fastGet(remoteFile, localFile, (err) => {
      if (err) {
        console.error('❌ Download error:', err);
        conn.end();
        return;
      }
      
      console.log('✅ File downloaded successfully!');
      console.log(`📄 Saved to: ${localFile}`);
      
      const stats = fs.statSync(localFile);
      console.log(`📊 File size: ${(stats.size / 1024).toFixed(2)} KB`);
      
      conn.end();
    });
  });
});

conn.on('error', (err) => {
  console.error('❌ Connection error:', err.message);
});

conn.connect(config);

