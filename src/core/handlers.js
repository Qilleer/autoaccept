const config = require('../../config');
const logger = require('../utils/logger');
const { validatePhoneNumber } = require('../utils/validator');
const { createWhatsAppConnection, generatePairingCode, logoutWhatsApp, userStates } = require('./whatsapp');
const { getMainMenu, getAutoAcceptMenu } = require('../ui/menus');

// Check if user is owner
function isOwner(userId) {
  return config.telegram.owners.includes(userId.toString());
}

/**
 * Setup all handlers
 */
function setupHandlers(bot) {
  setupCommandHandlers(bot);
  setupCallbackHandlers(bot);
  setupMessageHandlers(bot);
}

/**
 * Setup command handlers
 */
function setupCommandHandlers(bot) {
  // Handle /start command
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (!isOwner(userId)) {
      await bot.sendMessage(chatId, "❌ Unauthorized access!");
      return;
    }
    
    await bot.sendMessage(
      chatId,
      "*🤖 Auto Accept Bot*\n\nBot untuk auto approve join request WhatsApp\n\nPilih menu di bawah:",
      {
        parse_mode: 'Markdown',
        reply_markup: getMainMenu(userId)
      }
    );
  });
}

/**
 * Setup callback query handlers
 */
function setupCallbackHandlers(bot) {
  bot.on('callback_query', async (callbackQuery) => {
    const data = callbackQuery.data;
    const userId = callbackQuery.from.id;
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    
    if (!isOwner(userId)) {
      await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Unauthorized!', show_alert: true });
      return;
    }
    
    try {
      switch (data) {
        case 'main_menu':
          await handleMainMenu(bot, chatId, messageId, userId);
          break;
          
        case 'login':
          await handleLogin(bot, chatId, messageId, userId);
          break;
          
        case 'auto_accept_settings':
          await handleAutoAcceptSettings(bot, chatId, messageId, userId);
          break;
          
        case 'toggle_auto_accept':
          await handleToggleAutoAccept(bot, chatId, messageId, userId);
          break;
          
        case 'set_mode':
          await handleSetMode(bot, chatId, messageId, userId);
          break;
          
        case 'mode_specific':
          await handleModeSpecific(bot, chatId, messageId, userId);
          break;
          
        case 'mode_all':
          await handleModeAll(bot, chatId, messageId, userId);
          break;
          
        case 'set_post_action':
          await handleSetPostAction(bot, chatId, messageId, userId);
          break;
          
        case 'post_stay':
          await handlePostStay(bot, chatId, messageId, userId);
          break;
          
        case 'post_exit':
          await handlePostExit(bot, chatId, messageId, userId);
          break;
          
        case 'logout':
          await handleLogout(bot, chatId, messageId, userId);
          break;
          
        case 'noop':
          // Do nothing
          break;
          
        default:
          logger.warn(`Unknown callback data: ${data}`);
      }
      
      await bot.answerCallbackQuery(callbackQuery.id);
    } catch (err) {
      logger.error(`Callback error: ${err.message}`);
      await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Error!', show_alert: true });
    }
  });
}

/**
 * Setup message handlers
 */
function setupMessageHandlers(bot) {
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
        await handlePhoneInput(bot, chatId, userId, text);
      }
      // Handle target number input
      else if (userStates[userId]?.waitingForNumber) {
        await handleNumberInput(bot, chatId, userId, text);
      }
    } catch (err) {
      logger.error(`Message error: ${err.message}`);
    }
  });
}

// =============================================================================
// CALLBACK HANDLERS
// =============================================================================

async function handleMainMenu(bot, chatId, messageId, userId) {
  await bot.editMessageText(
    "*🤖 Auto Accept Bot*\n\nBot untuk auto approve join request WhatsApp\n\nPilih menu di bawah:",
    {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: getMainMenu(userId)
    }
  );
}

async function handleLogin(bot, chatId, messageId, userId) {
  if (!userStates[userId]) userStates[userId] = {};
  userStates[userId].waitingForPhone = true;
  
  await bot.editMessageText(
    "*🔑 Login WhatsApp*\n\nKirim nomor WhatsApp dengan kode negara (tanpa +)\n\n*Contoh:*\n• 628123456789 (Indonesia)\n• 12025550179 (USA)\n• 447700900123 (UK)",
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
}

async function handleAutoAcceptSettings(bot, chatId, messageId, userId) {
  const user = userStates[userId];
  if (!user?.whatsapp?.isConnected) {
    await bot.editMessageText(
      "❌ *WhatsApp Belum Terhubung*\n\nSilakan login WhatsApp terlebih dahulu untuk menggunakan fitur Auto Accept.",
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔑 Login WhatsApp', callback_data: 'login' }],
            [{ text: '🔙 Kembali', callback_data: 'main_menu' }]
          ]
        }
      }
    );
    return;
  }
  
  const settings = user.whatsapp.autoAccept;
  
  await bot.editMessageText(
    "*✅ Auto Accept Settings*\n\n" +
    `*Status:* ${settings.enabled ? '✅ AKTIF' : '❌ NONAKTIF'}\n` +
    `*Mode:* ${settings.mode === 'all' ? '🌍 Accept All' : `🎯 ${settings.targetNumber || 'Not Set'}`}\n` +
    `*After Accept:* ${settings.postAction === 'stay' ? '🏠 Stay' : '🚪 Exit'}\n\n` +
    "*📋 Cara Kerja:*\n" +
    "• Bot monitor semua grup yang dia jadi admin\n" +
    "• Auto approve join request sesuai setting\n" +
    "• Eksekusi action setelah approve\n\n" +
    "*⚠️ PENTING:* Bot harus jadi admin di grup!",
    {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: getAutoAcceptMenu(userId)
    }
  );
}

async function handleToggleAutoAccept(bot, chatId, messageId, userId) {
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
  
  // Send notification
  await bot.sendMessage(
    chatId,
    `🔔 *Auto Accept ${user.whatsapp.autoAccept.enabled ? 'Diaktifkan' : 'Dinonaktifkan'}!*\n\n${user.whatsapp.autoAccept.enabled ? 'Bot akan mulai monitor join request di semua grup.' : 'Bot berhenti monitor join request.'}`,
    { parse_mode: 'Markdown' }
  );
}

async function handleSetMode(bot, chatId, messageId, userId) {
  await bot.editMessageText(
    "*📋 Pilih Mode Auto Accept*\n\n" +
    "*🎯 Specific Number*\n" +
    "Bot hanya akan approve nomor tertentu yang kamu tentukan\n\n" +
    "*🌍 Accept All*\n" +
    "Bot akan approve siapa aja yang request join\n\n" +
    "Pilih mode yang kamu inginkan:",
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
}

async function handleModeSpecific(bot, chatId, messageId, userId) {
  if (!userStates[userId]) userStates[userId] = {};
  userStates[userId].waitingForNumber = true;
  
  await bot.editMessageText(
    "*🎯 Input Nomor Target*\n\nMasukkan nomor WhatsApp yang ingin di-auto accept:\n\n*Contoh:*\n• 628123456789 (Indonesia)\n• 12025550179 (USA)\n• 447700900123 (UK)\n\n*Format:* Kode negara + nomor (tanpa + dan spasi)",
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
}

async function handleModeAll(bot, chatId, messageId, userId) {
  const user = userStates[userId];
  user.whatsapp.autoAccept.mode = 'all';
  user.whatsapp.autoAccept.targetNumber = null;
  
  await bot.editMessageText(
    "*✅ Mode Berhasil Diset!*\n\n*Mode:* Accept All 🌍\n\nBot akan approve siapa aja yang request join ke semua grup!",
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
}

async function handleSetPostAction(bot, chatId, messageId, userId) {
  await bot.editMessageText(
    "*🚪 Pilih Action Setelah Accept*\n\n" +
    "*🏠 Stay di Grup*\n" +
    "Bot akan tetap stay di grup setelah approve join request\n\n" +
    "*🚪 Exit Setelah Accept*\n" +
    "Bot akan otomatis keluar dari grup setelah approve join request\n\n" +
    "Pilih action yang kamu inginkan:",
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
}

async function handlePostStay(bot, chatId, messageId, userId) {
  const user = userStates[userId];
  user.whatsapp.autoAccept.postAction = 'stay';
  
  await bot.editMessageText(
    "*✅ Post-Action Berhasil Diset!*\n\n*After Accept:* Stay di Grup 🏠\n\nBot akan tetap stay di grup setelah approve member.",
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
}

async function handlePostExit(bot, chatId, messageId, userId) {
  const user = userStates[userId];
  user.whatsapp.autoAccept.postAction = 'exit';
  
  await bot.editMessageText(
    "*✅ Post-Action Berhasil Diset!*\n\n*After Accept:* Exit dari Grup 🚪\n\nBot akan keluar dari grup setelah approve member.",
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
}

async function handleLogout(bot, chatId, messageId, userId) {
  if (!userStates[userId]?.whatsapp?.isConnected) {
    await bot.editMessageText(
      "❌ *WhatsApp Belum Login*\n\nKamu belum login WhatsApp, tidak ada yang perlu di-logout.",
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: getMainMenu(userId)
      }
    );
    return;
  }
  
  await logoutWhatsApp(userId);
  
  await bot.editMessageText(
    "*✅ Logout Berhasil!*\n\nWhatsApp sudah logout dan session dihapus.\nSemua auto accept settings di-reset.",
    {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: getMainMenu(userId)
    }
  );
}

// =============================================================================
// MESSAGE HANDLERS
// =============================================================================

async function handlePhoneInput(bot, chatId, userId, text) {
  userStates[userId].waitingForPhone = false;
  
  const validation = validatePhoneNumber(text);
  
  if (!validation.valid) {
    await bot.sendMessage(
      chatId, 
      "❌ *Format nomor tidak valid!*\n\n*Syarat nomor:*\n• Hanya berisi angka\n• Panjang 10-15 digit\n• Termasuk kode negara (tanpa +)\n\n*Contoh:* 628123456789",
      { parse_mode: 'Markdown' }
    );
    return;
  }
  
  // Send loading message
  const loadingMsg = await bot.sendMessage(
    chatId, 
    "⏳ *Membuat koneksi WhatsApp...*\n\nSedang setup connection dan generate pairing code...",
    { parse_mode: 'Markdown' }
  );
  
  // Create WhatsApp connection
  await createWhatsAppConnection(userId, bot);
  
  // Wait 3 seconds then generate pairing code
  setTimeout(async () => {
    try {
      await generatePairingCode(userId, validation.phoneNumber, bot, loadingMsg.message_id);
    } catch (err) {
      await bot.sendMessage(chatId, `❌ *Error:* ${err.message}`, { parse_mode: 'Markdown' });
    }
  }, 3000);
}

async function handleNumberInput(bot, chatId, userId, text) {
  userStates[userId].waitingForNumber = false;
  
  const validation = validatePhoneNumber(text);
  
  if (!validation.valid) {
    await bot.sendMessage(
      chatId,
      "❌ *Format nomor tidak valid!*\n\n*Syarat nomor:*\n• Hanya berisi angka\n• Panjang 10-15 digit\n• Termasuk kode negara (tanpa +)\n\n*Contoh:* 628123456789",
      { parse_mode: 'Markdown' }
    );
    return;
  }
  
  const user = userStates[userId];
  user.whatsapp.autoAccept.mode = 'specific';
  user.whatsapp.autoAccept.targetNumber = validation.phoneNumber;
  
  await bot.sendMessage(
    chatId,
    `*✅ Nomor Target Berhasil Diset!*\n\n*Target Nomor:* ${validation.phoneNumber}\n\nBot akan accept nomor ini di semua grup yang bot jadi admin.`,
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

module.exports = {
  setupHandlers
};