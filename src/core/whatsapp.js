const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require("@whiskeysockets/baileys");
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const config = require('../../config');
const logger = require('../utils/logger');

// Fix untuk crypto issue
global.crypto = require('crypto');

// User sessions & reconnect tracking
const userStates = {};
const reconnectAttempts = {};
const MAX_RECONNECT_ATTEMPTS = 3;

/**
 * Buat koneksi WhatsApp dengan proper reconnect system
 */
async function createWhatsAppConnection(userId, bot, reconnect = false) {
  try {
    const sessionPath = path.join(config.whatsapp.sessionPath, `wa_${userId}`);
    
    // Pastikan folder session ada
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
    }
    
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    
    // Buat socket dengan browser config lengkap
    const sock = makeWASocket({
      printQRInTerminal: false,
      auth: state,
      logger: pino({ level: "silent" }),
      browser: Browsers.ubuntu("Chrome"),
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 10000,
      retryRequestDelayMs: 5000
    });
    
    // Initialize user state
    if (!userStates[userId]) {
      userStates[userId] = {};
    }
    
    userStates[userId].whatsapp = {
      socket: sock,
      isConnected: false,
      lastConnect: null,
      autoAccept: {
        enabled: false,
        mode: 'specific', // 'specific' atau 'all'
        targetNumber: null,
        postAction: 'stay' // 'stay' atau 'exit'
      },
      isWaitingForPairingCode: false,
      isWaitingForQR: false,
      lastQRTime: null,
      phoneNumber: null
    };
    
    // Save credentials when updated
    sock.ev.on('creds.update', saveCreds);
    
    // Handle connection updates
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      console.log(`[DEBUG] Connection update for ${userId}: ${connection}`);
      
      // Handle QR code if available and user is waiting for QR
      if (qr && userStates[userId]?.whatsapp?.isWaitingForQR) {
        // Check for QR spam (only send new QR if last one was more than 30 seconds ago)
        const now = Date.now();
        const lastQRTime = userStates[userId].whatsapp.lastQRTime || 0;
        
        if (now - lastQRTime < 30000) { // 30 seconds cooldown
          console.log(`[DEBUG] Skipping QR code for ${userId} - too soon since last QR`);
          return;
        }
        
        try {
          const qrCode = qr;
          
          // Update last QR time
          userStates[userId].whatsapp.lastQRTime = now;
          
          // Generate QR code image
          const qrUrl = await require('qrcode').toDataURL(qrCode);
          const qrBuffer = Buffer.from(qrUrl.split(',')[1], 'base64');
          
          // Send QR code to user
          await bot.sendPhoto(userId, qrBuffer, {
            caption: "🔒 *Scan QR Code untuk Login*\n\nBuka WhatsApp > Menu > Perangkat Tertaut > Tautkan Perangkat\n\nQR code valid selama 60 detik!",
            parse_mode: 'Markdown'
          });
          
          console.log(`[DEBUG] Sent QR code to user ${userId}`);
        } catch (qrErr) {
          console.error(`[ERROR] Failed to send QR code: ${qrErr.message}`);
          
          await bot.sendMessage(
            userId,
            "❌ *Error saat mengirim QR code*\nCoba lagi nanti atau gunakan pairing code.",
            { parse_mode: 'Markdown' }
          );
        }
      }
      
      if (connection === "open") {
        logger.info(`WhatsApp connection open for user: ${userId}`);
        
        // Reset reconnect attempts counter
        reconnectAttempts[userId] = 0;
        
        // Setup auto accept handler
        setupAutoAcceptHandler(userId, bot);
        
        // Update state
        if (userStates[userId] && userStates[userId].whatsapp) {
          userStates[userId].whatsapp.isConnected = true;
          userStates[userId].whatsapp.lastConnect = new Date();
          userStates[userId].whatsapp.isWaitingForPairingCode = false;
          userStates[userId].whatsapp.isWaitingForQR = false;
          userStates[userId].whatsapp.lastQRTime = null;
        }
        
        // Send success message based on reconnect status
        if (reconnect) {
          await bot.sendMessage(
            userId,
            "✅ *Reconnect berhasil!*\n\nBot WhatsApp sudah terhubung kembali.",
            { parse_mode: 'Markdown' }
          );
        } else {
          await bot.sendMessage(
            userId, 
            "✅ *WhatsApp Terhubung!*\n\nBot siap digunakan untuk auto accept join request!", 
            { parse_mode: 'Markdown' }
          );
        }
        
      } else if (connection === "close") {
        // Update state
        if (userStates[userId] && userStates[userId].whatsapp) {
          userStates[userId].whatsapp.isConnected = false;
        }
        
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const disconnectReason = lastDisconnect?.error?.output?.payload?.message || "Unknown";
        
        console.log(`[DEBUG] Connection closed for userId ${userId}. Status code: ${statusCode}, Reason: ${disconnectReason}`);
        
        // Cek apakah perlu reconnect
        let shouldReconnect = true;
        
        // Status code 401 atau 403 biasanya logout/banned
        if (statusCode === 401 || statusCode === 403) {
          shouldReconnect = false;
        }
        
        // Tambah tracking reconnect attempts
        if (!reconnectAttempts[userId]) {
          reconnectAttempts[userId] = 0;
        }
        
        // Logika reconnect
        if (shouldReconnect && userStates[userId] && reconnectAttempts[userId] < MAX_RECONNECT_ATTEMPTS) {
          // Increment reconnect attempt counter
          reconnectAttempts[userId]++;
          
          // Kasih notifikasi ke user - hanya untuk attempt pertama
          if (reconnectAttempts[userId] === 1) {
            await bot.sendMessage(
              userId, 
              `⚠️ *Koneksi terputus*\nReason: ${disconnectReason}\n\nSedang mencoba reconnect... (Attempt ${reconnectAttempts[userId]}/${MAX_RECONNECT_ATTEMPTS})`,
              { parse_mode: 'Markdown' }
            );
          }
          
          // Tunggu sebelum reconnect
          setTimeout(async () => {
            if (userStates[userId]) {
              console.log(`[DEBUG] Attempting to reconnect for userId: ${userId} (Attempt ${reconnectAttempts[userId]}/${MAX_RECONNECT_ATTEMPTS})`);
              await createWhatsAppConnection(userId, bot, true);
            }
          }, 5000);
        } else if (userStates[userId]) {
          // Reset reconnect attempts counter
          reconnectAttempts[userId] = 0;
          
          // Hapus session fisik
          const sessionPath = path.join(config.whatsapp.sessionPath, `wa_${userId}`);
          if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
            console.log(`Session files deleted for userId: ${userId}`);
          }
          
          // Clear state
          userStates[userId].whatsapp = {
            socket: null,
            isConnected: false,
            autoAccept: {
              enabled: false,
              mode: 'specific',
              targetNumber: null,
              postAction: 'stay'
            },
            isWaitingForPairingCode: false,
            isWaitingForQR: false,
            lastQRTime: null,
            phoneNumber: null
          };
          
          // Kirim pesan terputus permanen
          await bot.sendMessage(
            userId, 
            "❌ *Koneksi Terputus Permanen*\n\nPerlu login ulang dengan pairing code.", 
            { parse_mode: 'Markdown' }
          );
        }
      }
    });
    
    return sock;
  } catch (err) {
    logger.error(`Error creating WhatsApp connection for ${userId}:`, err);
    
    if (!reconnect) {
      await bot.sendMessage(
        userId,
        `❌ Ada error saat membuat koneksi: ${err.message}`,
        { parse_mode: 'Markdown' }
      );
    }
    
    return null;
  }
}

/**
 * Generate pairing code for login
 */
async function generatePairingCode(userId, phoneNumber, bot, messageId) {
  try {
    // Check if socket exists
    if (!userStates[userId]?.whatsapp?.socket) {
      throw new Error("Koneksi WhatsApp belum dibuat");
    }
    
    const sock = userStates[userId].whatsapp.socket;
    
    // Set flag to indicate we're in the pairing phase
    userStates[userId].whatsapp.isWaitingForPairingCode = true;
    
    // Store the phone number for potential reconnect
    userStates[userId].whatsapp.phoneNumber = phoneNumber;
    
    // Delete the loading message first if messageId provided
    if (messageId) {
      try {
        await bot.deleteMessage(userId, messageId);
      } catch (err) {
        logger.warn(`Could not delete loading message: ${err.message}`);
      }
    }
    
    // Request pairing code from WhatsApp with updated method
    const code = await sock.requestPairingCode(phoneNumber, {
      timeoutMs: 60000, // 60 detik timeout
      retryCount: 3 // Mencoba 3 kali jika gagal
    });
    
    // Send a fresh message with the pairing code
    await bot.sendMessage(
      userId,
      `🔑 *Pairing Code:*\n\n*${code}*\n\nMasukkan code di atas ke WhatsApp kamu dalam 60 detik!\n\n*Cara Pairing:*\n1. Buka WhatsApp\n2. Menu > Perangkat Tertaut\n3. Tautkan Perangkat\n4. Masukkan code di atas\n\nKalau terputus, otomatis akan reconnect!`,
      { 
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '❌ Batal Login', callback_data: 'main_menu' }]
          ]
        }
      }
    );
    
    return true;
  } catch (err) {
    logger.error(`Error generating pairing code for ${userId}:`, err);
    
    // Send a fresh message with error
    await bot.sendMessage(
      userId,
      `❌ *Error Pairing Code*\n\nGagal membuat pairing code: ${err.message}\n\nCoba lagi nanti atau pakai nomor lain!`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Kembali', callback_data: 'main_menu' }]
          ]
        }
      }
    );
    
    return false;
  }
}

/**
 * Setup auto accept handler untuk monitor join requests
 */
function setupAutoAcceptHandler(userId, bot) {
  const sock = userStates[userId].whatsapp.socket;
  
  // Cegah duplicate handler
  if (userStates[userId].whatsapp.autoAcceptHandlerActive) {
    return;
  }
  
  sock.ev.on('group-participants.update', async (update) => {
    const autoAcceptSettings = userStates[userId].whatsapp.autoAccept;
    
    // Check if auto accept is enabled
    if (!autoAcceptSettings.enabled) {
      return;
    }
    
    const { id, participants, action } = update;
    
    // Only process join requests/pending
    if (action !== 'pending' && action !== 'request') {
      return;
    }
    
    try {
      // Get group metadata
      const groupMetadata = await sock.groupMetadata(id);
      const botJid = sock.user.id;
      const botJidNoDevice = botJid.split(':')[0];
      
      // Check if bot is admin
      const isAdmin = groupMetadata.participants.some(p => {
        const participantNoDevice = p.id.split(':')[0];
        return (
          participantNoDevice === botJidNoDevice && 
          ['admin', 'superadmin'].includes(p.admin)
        );
      });
      
      if (!isAdmin) {
        logger.info(`Bot is not admin in group ${groupMetadata.subject}`);
        return;
      }
      
      // Process each participant
      for (const participantJid of participants) {
        const participantNumber = participantJid.split('@')[0].split(':')[0];
        
        let shouldAccept = false;
        
        // Determine if we should accept
        if (autoAcceptSettings.mode === 'all') {
          shouldAccept = true;
        } else if (autoAcceptSettings.mode === 'specific') {
          const targetNumber = autoAcceptSettings.targetNumber;
          if (targetNumber && participantNumber === targetNumber) {
            shouldAccept = true;
          }
        }
        
        if (shouldAccept) {
          try {
            // Accept the participant
            await sock.groupParticipantsUpdate(id, [participantJid], 'approve');
            
            logger.info(`Auto-accepted ${participantNumber} in group ${groupMetadata.subject}`);
            
            // Notify user
            await bot.sendMessage(
              userId,
              `✅ *Auto-Accept Triggered*\n\n` +
              `📱 Grup: *${groupMetadata.subject}*\n` +
              `👤 Nomor: ${participantNumber}\n` +
              `🎯 Mode: ${autoAcceptSettings.mode === 'all' ? 'Accept All' : 'Specific Number'}\n` +
              `⚡ Status: Berhasil di-approve!`,
              { parse_mode: 'Markdown' }
            );
            
            // Execute post-action
            if (autoAcceptSettings.postAction === 'exit') {
              setTimeout(async () => {
                try {
                  await sock.groupLeave(id);
                  logger.info(`Auto-exit after accepting ${participantNumber}`);
                  
                  await bot.sendMessage(
                    userId,
                    `🚪 *Auto-Exit Executed*\n\n` +
                    `📱 Grup: *${groupMetadata.subject}*\n` +
                    `👤 Setelah accept: ${participantNumber}\n` +
                    `⚡ Status: Bot keluar dari grup!`,
                    { parse_mode: 'Markdown' }
                  );
                } catch (exitErr) {
                  logger.error(`Error in auto-exit: ${exitErr.message}`);
                  
                  await bot.sendMessage(
                    userId,
                    `❌ *Auto-Exit Failed*\n\nGagal keluar dari grup: ${exitErr.message}`,
                    { parse_mode: 'Markdown' }
                  );
                }
              }, 2000); // 2 second delay
            }
            
          } catch (acceptErr) {
            logger.error(`Error accepting participant: ${acceptErr.message}`);
            
            await bot.sendMessage(
              userId,
              `❌ *Auto-Accept Failed*\n\n` +
              `📱 Grup: *${groupMetadata.subject}*\n` +
              `👤 Nomor: ${participantNumber}\n` +
              `⚠️ Error: ${acceptErr.message}`,
              { parse_mode: 'Markdown' }
            );
          }
        }
      }
    } catch (err) {
      logger.error(`Error in auto-accept handler: ${err.message}`);
    }
  });
  
  // Mark handler as active
  userStates[userId].whatsapp.autoAcceptHandlerActive = true;
  logger.info(`Auto-accept handler setup for user ${userId}`);
}

/**
 * Logout WhatsApp dan cleanup
 */
async function logoutWhatsApp(userId) {
  try {
    if (userStates[userId]?.whatsapp?.socket) {
      try {
        await userStates[userId].whatsapp.socket.logout();
      } catch (logoutErr) {
        logger.warn(`Error during logout: ${logoutErr.message}`);
      }
    }
    
    // Delete session files
    const sessionPath = path.join(config.whatsapp.sessionPath, `wa_${userId}`);
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
      logger.info(`Session files deleted for user ${userId}`);
    }
    
    // Clear state
    if (userStates[userId]) {
      userStates[userId].whatsapp = {
        socket: null,
        isConnected: false,
        autoAccept: {
          enabled: false,
          mode: 'specific',
          targetNumber: null,
          postAction: 'stay'
        },
        isWaitingForPairingCode: false,
        isWaitingForQR: false,
        lastQRTime: null,
        phoneNumber: null,
        autoAcceptHandlerActive: false
      };
    }
    
    // Reset reconnect attempts
    reconnectAttempts[userId] = 0;
    
    return true;
  } catch (err) {
    logger.error(`Error logging out: ${err.message}`);
    return false;
  }
}

module.exports = {
  createWhatsAppConnection,
  generatePairingCode,
  logoutWhatsApp,
  userStates
};