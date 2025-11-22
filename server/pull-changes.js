const { Client } = require('ssh2');

const conn = new Client();

const config = {
  host: '62.72.29.136',
  username: 'root',
  password: '@Mm20120012012001',
  port: 22,
  tryKeyboard: true,
  readyTimeout: 20000
};

console.log('🔌 Connecting to server...');

conn.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
  finish(['@Mm20120012012001']);
});

conn.on('ready', () => {
  console.log('✅ Connected to server');
  console.log('📥 Pulling latest changes from Git...');
  
  conn.exec('cd /root/Qudrat && git pull', (err, stream) => {
    if (err) {
      console.error('❌ Error executing command:', err);
      conn.end();
      return;
    }

    stream.on('close', (code, signal) => {
      console.log(`\n✅ Git pull completed with code ${code}`);
      if (code === 0) {
        console.log('✅ Changes pulled successfully!');
      } else {
        console.log('⚠️  Git pull completed with non-zero exit code');
      }
      conn.end();
    });

    stream.on('data', (data) => {
      process.stdout.write(data);
    });

    stream.stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
});

conn.on('error', (err) => {
  console.error('❌ Connection error:', err.message);
  process.exit(1);
});

conn.connect(config);

