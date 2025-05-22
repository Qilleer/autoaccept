/**
 * Bot Configuration
 * Edit sesuai dengan setup kamu
 */

const config = {
  // Telegram Bot Settings
  telegram: {
    token: '7578700357:AAEH1KVIu-SA63-Nvcucs-CdHFndC2vH4xM', // Ganti dengan token dari @BotFather
    owners: ['6564704455']  // Ganti dengan Telegram ID kamu (bisa multiple)
  },
  
  // WhatsApp Settings
  whatsapp: {
    sessionPath: './sessions',    // Folder untuk simpan session WhatsApp
    reconnectDelay: 5000,        // Delay reconnect (5 detik)
    maxReconnectAttempts: 3      // Max percobaan reconnect
  },
  
  // Logging Settings
  logging: {
    level: 'info',               // Level log: error, warn, info, debug
    maxFileSize: 5242880,        // Max ukuran file log (5MB)
    maxFiles: 5                  // Max jumlah file log
  }
};

module.exports = config;