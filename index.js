/**
 * 🤖 Auto Accept Bot - Main Entry Point
 * Bot mini untuk auto approve join request WhatsApp
 * Created by Qiventory
 */

const AutoAcceptBot = require('./src/core/bot');
const logger = require('./src/utils/logger');

// Create and start bot instance
async function main() {
  try {
    logger.info('🚀 Starting Auto Accept Bot...');
    
    const bot = new AutoAcceptBot();
    bot.start();
    
    // Graceful shutdown handling
    process.on('SIGINT', () => {
      logger.info('🛑 Received SIGINT, shutting down gracefully...');
      bot.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      logger.info('🛑 Received SIGTERM, shutting down gracefully...');
      bot.stop();
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('💥 Failed to start bot:', error);
    process.exit(1);
  }
}

// Start the application
main().catch(err => {
  logger.error('💥 Fatal error:', err);
  process.exit(1);
});

// Handle callback queries
async function handleCallbackQuery(callbackQuery) {
  const { id, data, message } = callbackQuery;
  const chatId = message.chat.id;
  const messageId = message.message_id;
  const userId = callbackQuery.from.id;
  
  if (!isOwner(userId)) {
    await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Unauthorized!', show_alert: true });
    return;
  }
  
  try {
    if (data === 'main_menu') {
      await bot.editMessageText(
        "*🤖 Auto Accept Bot*\n\nBot untuk auto approve join request WhatsApp\n\nPilih menu di bawah:",
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: getMainMenu(userId)
        }
      );
      
    } else if (data === 'login') {
      if (!userStates[userId]) userStates[userId] = {};
      userStates[userId].waitingForPhone = true;
      
      await bot.editMessageText(
        "*🔑 Login WhatsApp*\n\nKirim nomor WhatsApp dengan kode negara (tanpa +)\n\nContoh: 628123456789",
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '❌ Batal', callback_data: 'main_menu' }]
            ]
          }
        }
      );
      
    } else if (data === 'auto_accept_settings') {
      const user = userStates[userId];
      if (!user?.whatsapp?.isConnected) {
        await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ WhatsApp belum terhubung!', show_alert: true });
        return;
      }
      
      const settings = user.whatsapp.autoAccept;
      
      await bot.editMessageText(
        "*✅ Auto Accept Settings*\n\n" +
        `Status: ${settings.enabled ? '✅ AKTIF' : '❌ NONAKTIF'}\n` +
        `Mode: ${settings.mode === 'all' ? '🌍 Accept All' : `🎯 ${settings.targetNumber || 'Not Set'}`}\n` +
        `After Accept: ${settings.postAction === 'stay' ? '🏠 Stay' : '🚪 Exit'}\n\n` +
        "*Cara Kerja:*\n" +
        "• Bot monitor semua grup yang dia jadi admin\n" +
        "• Auto approve join request sesuai setting\n" +
        "• Eksekusi action setelah approve",
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: getAutoAcceptMenu(userId)
        }
      );
      
    } else if (data === 'toggle_auto_accept') {
      const user = userStates[userId];
      if (!user?.whatsapp?.isConnected) {
        await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ WhatsApp belum terhubung!', show_alert: true });
        return;
      }
      
      user.whatsapp.autoAccept.enabled = !user.whatsapp.autoAccept.enabled;
      
      await bot.editMessageReplyMarkup(
        { inline_keyboard: getAutoAcceptMenu(userId).inline_keyboard },
        { chat_id: chatId, message_id: messageId }
      );
      
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: `Auto Accept ${user.whatsapp.autoAccept.enabled ? 'diaktifkan' : 'dinonaktifkan'}!`
      });
      
    } else if (data === 'set_mode') {
      await bot.editMessageText(
        "*📋 Pilih Mode Auto Accept*\n\n" +
        "🎯 **Specific Number**: Accept nomor tertentu saja\n" +
        "🌍 **Accept All**: Accept siapa aja yang request",
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🎯 Accept Nomor Spesifik', callback_data: 'mode_specific' }],
              [{ text: '🌍 Accept Semua', callback_data: 'mode_all' }],
              [{ text: '🔙 Kembali', callback_data: 'auto_accept_settings' }]
            ]
          }
        }
      );
      
    } else if (data === 'mode_specific') {
      if (!userStates[userId]) userStates[userId] = {};
      userStates[userId].waitingForNumber = true;
      
      await bot.editMessageText(
        "*🎯 Input Nomor Target*\n\nMasukkan nomor yang ingin di-auto accept:\n\nContoh: 628123456789",
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '❌ Batal', callback_data: 'auto_accept_settings' }]
            ]
          }
        }
      );
      
    } else if (data === 'mode_all') {
      const user = userStates[userId];
      user.whatsapp.autoAccept.mode = 'all';
      user.whatsapp.autoAccept.targetNumber = null;
      
      await bot.editMessageText(
        "*✅ Mode Berhasil Diset!*\n\nMode: Accept All\nBot akan approve siapa aja yang request join!",
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔙 Kembali ke Settings', callback_data: 'auto_accept_settings' }]
            ]
          }
        }
      );
      
    } else if (data === 'set_post_action') {
      await bot.editMessageText(
        "*🚪 Pilih Action Setelah Accept*\n\n" +
        "🏠 **Stay**: Bot tetap di grup\n" +
        "🚪 **Exit**: Bot keluar dari grup setelah approve",
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🏠 Stay di Grup', callback_data: 'post_stay' }],
              [{ text: '🚪 Exit Setelah Accept', callback_data: 'post_exit' }],
              [{ text: '🔙 Kembali', callback_data: 'auto_accept_settings' }]
            ]
          }
        }
      );
      
    } else if (data === 'post_stay') {
      const user = userStates[userId];
      user.whatsapp.autoAccept.postAction = 'stay';
      
      await bot.editMessageText(
        "*✅ Post-Action Berhasil Diset!*\n\nAfter Accept: Stay di Grup\nBot akan tetap stay di grup setelah approve.",
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔙 Kembali ke Settings', callback_data: 'auto_accept_settings' }]
            ]
          }
        }
      );
      
    } else if (data === 'post_exit') {
      const user = userStates[userId];
      user.whatsapp.autoAccept.postAction = 'exit';
      
      await bot.editMessageText(
        "*✅ Post-Action Berhasil Diset!*\n\nAfter Accept: Exit dari Grup\nBot akan keluar dari grup setelah approve.",
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔙 Kembali ke Settings', callback_data: 'auto_accept_settings' }]
            ]
          }
        }
      );
      
    } else if (data === 'logout') {
      if (!userStates[userId]?.whatsapp?.isConnected) {
        await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ WhatsApp belum login!', show_alert: true });
        return;
      }
      
      await logoutWhatsApp(userId);
      
      await bot.editMessageText(
        "*✅ Logout Berhasil!*\n\nWhatsApp sudah logout dan session dihapus.",
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: getMainMenu(userId)
        }
      );
      
    } else if (data === 'noop') {
      // Do nothing
    }
    
    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (err) {
    logger.error(`Callback error: ${err.message}`);
    await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Error!', show_alert: true });
  }
}

// Handle text messages
bot.on('message', async (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return;
  if (msg.chat.type !== 'private') return;
  
  const userId = msg.from.id;
  const chatId = msg.chat.id;
  const text = msg.text.trim();
  
  if (!isOwner(userId)) return;
  
  try {
    // Handle phone number input
    if (userStates[userId]?.waitingForPhone) {
      userStates[userId].waitingForPhone = false;
      
      const validation = validatePhoneNumber(text);
      
      if (!validation.valid) {
        await bot.sendMessage(chatId, "❌ Format nomor tidak valid! Contoh: 628123456789");
        return;
      }
      
      // Send loading message
      const loadingMsg = await bot.sendMessage(chatId, "⏳ Membuat koneksi dan pairing code...");
      
      // Create WhatsApp connection
      await createWhatsAppConnection(userId, bot);
      
      // Wait 3 seconds then generate pairing code
      setTimeout(async () => {
        try {
          await generatePairingCode(userId, validation.phoneNumber, bot, loadingMsg.message_id);
        } catch (err) {
          await bot.sendMessage(chatId, `❌ Error: ${err.message}`);
        }
      }, 3000);
      
    }
    // Handle target number input
    else if (userStates[userId]?.waitingForNumber) {
      userStates[userId].waitingForNumber = false;
      
      const validation = validatePhoneNumber(text);
      
      if (!validation.valid) {
        await bot.sendMessage(chatId, "❌ Format nomor tidak valid! Contoh: 628123456789");
        return;
      }
      
      const user = userStates[userId];
      user.whatsapp.autoAccept.mode = 'specific';
      user.whatsapp.autoAccept.targetNumber = validation.phoneNumber;
      
      await bot.sendMessage(
        chatId,
        `*✅ Nomor Target Berhasil Diset!*\n\nNomor: ${validation.phoneNumber}\nBot akan accept nomor ini di semua grup.`,
        { 
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔙 Kembali ke Settings', callback_data: 'auto_accept_settings' }]
            ]
          }
        }
      );
    }
  } catch (err) {
    logger.error(`Message error: ${err.message}`);
  }
});

// Error handling
bot.on('polling_error', (error) => {
  logger.error('Polling error:', error);
});

bot.on('error', (error) => {
  logger.error('Bot error:', error);
});

// Start message
logger.info('🤖 Auto Accept Bot started!');
logger.info('💫 Bot is ready to auto approve WhatsApp join requests!');

console.log(`
🤖 AUTO ACCEPT BOT STARTED!

Features:
✅ Auto Accept Join Requests  
🔑 WhatsApp Login/Logout
⚙️ Settings Management

Ready to rock! 🔥
`);