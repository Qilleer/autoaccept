const { userStates } = require('../core/whatsapp');

/**
 * Main menu dengan status WhatsApp
 */
function getMainMenu(userId) {
  const user = userStates[userId];
  const isConnected = user?.whatsapp?.isConnected || false;
  const statusText = isConnected ? '🟢 WhatsApp Connected' : '🔴 WhatsApp Disconnected';
  
  return {
    inline_keyboard: [
      [{ text: statusText, callback_data: 'noop' }],
      [{ text: '🔑 Login WhatsApp', callback_data: 'login' }],
      [{ text: '✅ Auto Accept Settings', callback_data: 'auto_accept_settings' }],
      [{ text: '🚪 Logout WhatsApp', callback_data: 'logout' }]
    ]
  };
}

/**
 * Auto Accept Settings Menu
 */
function getAutoAcceptMenu(userId) {
  const settings = userStates[userId]?.whatsapp?.autoAccept || {
    enabled: false,
    mode: 'specific',
    targetNumber: null,
    postAction: 'stay'
  };
  
  // Format mode text
  let modeText;
  if (settings.mode === 'all') {
    modeText = '🌍 Accept All';
  } else {
    modeText = settings.targetNumber ? `🎯 ${settings.targetNumber}` : '🎯 Not Set';
  }
  
  // Format post action text
  const postActionText = settings.postAction === 'stay' ? '🏠 Stay' : '🚪 Exit';
  
  return {
    inline_keyboard: [
      [{ 
        text: `🤖 Auto Accept: ${settings.enabled ? 'ON ✅' : 'OFF ❌'}`, 
        callback_data: 'toggle_auto_accept' 
      }],
      [{ 
        text: `📋 Mode: ${modeText}`, 
        callback_data: 'set_mode' 
      }],
      [{ 
        text: `🚪 After Accept: ${postActionText}`, 
        callback_data: 'set_post_action' 
      }],
      [{ text: '🔙 Kembali ke Menu Utama', callback_data: 'main_menu' }]
    ]
  };
}

/**
 * Login options menu
 */
function getLoginMenu() {
  return {
    inline_keyboard: [
      [{ text: '📱 Login dengan Pairing Code', callback_data: 'login_pairing' }],
      [{ text: '📷 Login dengan QR Code', callback_data: 'login_qr' }],
      [{ text: '🔙 Kembali', callback_data: 'main_menu' }]
    ]
  };
}

/**
 * Cancel button menu
 */
function getCancelMenu(backCallback = 'main_menu') {
  return {
    inline_keyboard: [
      [{ text: '❌ Batal', callback_data: backCallback }]
    ]
  };
}

/**
 * Back button menu
 */
function getBackMenu(backCallback = 'main_menu', text = '🔙 Kembali') {
  return {
    inline_keyboard: [
      [{ text: text, callback_data: backCallback }]
    ]
  };
}

/**
 * Mode selection menu
 */
function getModeSelectionMenu() {
  return {
    inline_keyboard: [
      [{ text: '🎯 Accept Nomor Spesifik', callback_data: 'mode_specific' }],
      [{ text: '🌍 Accept Semua Orang', callback_data: 'mode_all' }],
      [{ text: '🔙 Kembali', callback_data: 'auto_accept_settings' }]
    ]
  };
}

/**
 * Post action selection menu
 */
function getPostActionMenu() {
  return {
    inline_keyboard: [
      [{ text: '🏠 Stay di Grup', callback_data: 'post_stay' }],
      [{ text: '🚪 Exit Setelah Accept', callback_data: 'post_exit' }],
      [{ text: '🔙 Kembali', callback_data: 'auto_accept_settings' }]
    ]
  };
}

module.exports = {
  getMainMenu,
  getAutoAcceptMenu,
  getLoginMenu,
  getCancelMenu,
  getBackMenu,
  getModeSelectionMenu,
  getPostActionMenu
};