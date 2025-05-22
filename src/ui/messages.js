/**
 * Message Templates untuk UI
 * Semua template pesan ada di sini
 */

// Random kawaii faces
const kawaiiFaces = ['(´｡• ᵕ •｡`)', '(◕‿◕)', '(✿◠‿◠)', '(◕ᴗ◕✿)', '(づ｡◕‿‿◕｡)づ', '(≧◡≦)', '(￣▽￣)ゞ', '(ง •̀_•́)ง'];

function getRandomKawaii() {
  return kawaiiFaces[Math.floor(Math.random() * kawaiiFaces.length)];
}

// Main Messages
const messages = {
  // Welcome & Main
  welcome: `*🤖 Auto Accept Bot*

Bot untuk auto approve join request WhatsApp

Pilih menu di bawah:`,

  // Login Messages
  loginPrompt: `*🔑 Login WhatsApp*

Kirim nomor WhatsApp dengan kode negara (tanpa +)

*Contoh:*
• 628123456789 (Indonesia)
• 12025550179 (USA)
• 447700900123 (UK)

_Bot akan generate pairing code untuk kamu~_`,

  loginSuccess: `*✅ WhatsApp Terhubung!*

Bot siap digunakan untuk auto accept join request!

_Sekarang kamu bisa setup auto accept settings_ ${getRandomKawaii()}`,

  loginError: (error) => `*❌ Error Login*

Gagal login WhatsApp: ${error}

_Coba lagi dengan nomor yang berbeda_`,

  // Auto Accept Messages
  autoAcceptSettings: (settings) => `*✅ Auto Accept Settings*

*Status:* ${settings.enabled ? '✅ AKTIF' : '❌ NONAKTIF'}
*Mode:* ${settings.mode === 'all' ? '🌍 Accept All' : `🎯 ${settings.targetNumber || 'Not Set'}`}
*After Accept:* ${settings.postAction === 'stay' ? '🏠 Stay' : '🚪 Exit'}

*📋 Cara Kerja:*
• Bot monitor semua grup yang dia jadi admin
• Auto approve join request sesuai setting
• Eksekusi action setelah approve

*⚠️ PENTING:* Bot harus jadi admin di grup!`,

  autoAcceptEnabled: `*🔔 Auto Accept Diaktifkan!*

Bot akan mulai monitor join request di semua grup.

_Ready to auto approve!_ ✨`,

  autoAcceptDisabled: `*🔔 Auto Accept Dinonaktifkan!*

Bot berhenti monitor join request.

_Auto accept stopped_ ${getRandomKawaii()}`,

  // Mode Selection
  modeSelection: `*📋 Pilih Mode Auto Accept*

*🎯 Specific Number*
Bot hanya akan approve nomor tertentu yang kamu tentukan

*🌍 Accept All*
Bot akan approve siapa aja yang request join

Pilih mode yang kamu inginkan:`,

  modeSpecificPrompt: `*🎯 Input Nomor Target*

Masukkan nomor WhatsApp yang ingin di-auto accept:

*Contoh:*
• 628123456789 (Indonesia)
• 12025550179 (USA)
• 447700900123 (UK)

*Format:* Kode negara + nomor (tanpa + dan spasi)`,

  modeAllSet: `*✅ Mode Berhasil Diset!*

*Mode:* Accept All 🌍

Bot akan approve siapa aja yang request join ke semua grup!`,

  modeSpecificSet: (number) => `*✅ Nomor Target Berhasil Diset!*

*Target Nomor:* ${number}

Bot akan accept nomor ini di semua grup yang bot jadi admin.`,

  // Post Action
  postActionSelection: `*🚪 Pilih Action Setelah Accept*

*🏠 Stay di Grup*
Bot akan tetap stay di grup setelah approve join request

*🚪 Exit Setelah Accept*
Bot akan otomatis keluar dari grup setelah approve join request

Pilih action yang kamu inginkan:`,

  postActionStaySet: `*✅ Post-Action Berhasil Diset!*

*After Accept:* Stay di Grup 🏠

Bot akan tetap stay di grup setelah approve member.`,

  postActionExitSet: `*✅ Post-Action Berhasil Diset!*

*After Accept:* Exit dari Grup 🚪

Bot akan keluar dari grup setelah approve member.`,

  // Auto Accept Notifications
  autoAcceptTriggered: (groupName, number, mode) => `*✅ Auto-Accept Triggered*

📱 *Grup:* ${groupName}
👤 *Nomor:* ${number}
🎯 *Mode:* ${mode === 'all' ? 'Accept All' : 'Specific Number'}
⚡ *Status:* Berhasil di-approve!

_Auto accept working perfectly!_ ${getRandomKawaii()}`,

  autoAcceptFailed: (groupName, number, error) => `*❌ Auto-Accept Failed*

📱 *Grup:* ${groupName}
👤 *Nomor:* ${number}
⚠️ *Error:* ${error}

_Mungkin bot bukan admin di grup ini_`,

  autoExitExecuted: (groupName, number) => `*🚪 Auto-Exit Executed*

📱 *Grup:* ${groupName}
👤 *Setelah accept:* ${number}
⚡ *Status:* Bot keluar dari grup!

_Mission accomplished!_ ${getRandomKawaii()}`,

  autoExitFailed: (error) => `*❌ Auto-Exit Failed*

Gagal keluar dari grup: ${error}

_Coba manual exit dari grup_`,

  // Connection Messages
  connectionLost: (reason) => `*⚠️ Koneksi Terputus*

Reason: ${reason}

Sedang mencoba reconnect... _Ganbare!_ ${getRandomKawaii()}`,

  reconnectSuccess: `*✅ Reconnect Berhasil!*

Bot WhatsApp sudah terhubung kembali.

_Back online!_ ✨`,

  connectionPermanentLoss: `*❌ Koneksi Terputus Permanen*

Perlu login ulang dengan pairing code.

_Session expired atau conflict dengan device lain_`,

  // Logout Messages
  logoutSuccess: `*✅ Logout Berhasil!*

WhatsApp sudah logout dan session dihapus.
Semua auto accept settings di-reset.

_See you later!_ ${getRandomKawaii()}`,

  logoutError: (error) => `*❌ Error Logout*

Error: ${error}

_Tapi session sudah di-cleanup_`,

  notLoggedIn: `*❌ WhatsApp Belum Login*

Kamu belum login WhatsApp, tidak ada yang perlu di-logout.

_Login dulu yuk!_`,

  // Validation Errors
  invalidPhoneFormat: `*❌ Format nomor tidak valid!*

*Syarat nomor:*
• Hanya berisi angka
• Panjang 10-15 digit
• Termasuk kode negara (tanpa +)

*Contoh:* 628123456789`,

  phoneValidationError: (reason) => {
    const reasons = {
      format: 'Nomor hanya boleh berisi angka',
      length: 'Panjang nomor harus 10-15 digit',
      prefix: 'Kode negara tidak dikenali'
    };
    
    return `*❌ Nomor Tidak Valid*

${reasons[reason] || reason}

_Coba lagi dengan format yang benar_`;
  },

  // Connection Requirements
  whatsappNotConnected: `*❌ WhatsApp Belum Terhubung*

Silakan login WhatsApp terlebih dahulu untuk menggunakan fitur Auto Accept.

_Connect dulu baru bisa auto accept!_`,

  // General Messages
  unauthorized: `*❌ Unauthorized Access*

Kamu tidak memiliki akses ke bot ini.

_Contact admin for access_`,

  processingRequest: `*⏳ Processing...*

Sedang memproses request kamu...

_Chotto matte kudasai~_ ${getRandomKawaii()}`,

  errorGeneric: (error) => `*❌ Error*

${error}

_Something went wrong_ (╥﹏╥)`,

  // Success Messages
  successGeneric: (message) => `*✅ Success*

${message}

_Yokatta ne~_ ${getRandomKawaii()}`
};

// Helper function to get message
function getMessage(key, ...args) {
  const template = messages[key];
  
  if (typeof template === 'function') {
    return template(...args);
  } else if (typeof template === 'string') {
    return template;
  } else {
    return `*❌ Message template not found: ${key}*`;
  }
}

module.exports = {
  messages,
  getMessage,
  getRandomKawaii
};