/**
 * Validate phone number for WhatsApp
 * Format: country code + number (without +)
 */
function validatePhoneNumber(phoneNumber) {
  // Clean the input
  phoneNumber = phoneNumber.replace(/\s+/g, '').replace(/[-()+]/g, '');
  
  // Check if only digits
  if (!/^\d+$/.test(phoneNumber)) {
    return { 
      valid: false, 
      phoneNumber, 
      reason: 'format',
      message: 'Nomor hanya boleh berisi angka' 
    };
  }
  
  // Check length (10-15 digits is standard for international numbers)
  if (phoneNumber.length < 10 || phoneNumber.length > 15) {
    return { 
      valid: false, 
      phoneNumber, 
      reason: 'length',
      message: 'Panjang nomor harus 10-15 digit' 
    };
  }
  
  // Additional validation for common country codes
  const commonPrefixes = ['1', '7', '20', '27', '30', '31', '32', '33', '34', '36', '39', '40', '41', '43', '44', '45', '46', '47', '48', '49', '51', '52', '53', '54', '55', '56', '57', '58', '60', '61', '62', '63', '64', '65', '66', '81', '82', '84', '86', '90', '91', '92', '93', '94', '95', '98'];
  
  const hasValidPrefix = commonPrefixes.some(prefix => phoneNumber.startsWith(prefix));
  
  if (!hasValidPrefix) {
    return {
      valid: false,
      phoneNumber,
      reason: 'prefix',
      message: 'Kode negara tidak dikenali. Pastikan menggunakan kode negara yang benar.'
    };
  }
  
  return { 
    valid: true, 
    phoneNumber,
    formatted: `+${phoneNumber}` 
  };
}

/**
 * Validate text input
 */
function validateText(text, minLength = 1, maxLength = 100) {
  if (!text || typeof text !== 'string') {
    return {
      valid: false,
      reason: 'empty',
      message: 'Teks tidak boleh kosong'
    };
  }
  
  const trimmed = text.trim();
  
  if (trimmed.length < minLength) {
    return {
      valid: false,
      reason: 'too_short',
      message: `Teks minimal ${minLength} karakter`
    };
  }
  
  if (trimmed.length > maxLength) {
    return {
      valid: false,
      reason: 'too_long',
      message: `Teks maksimal ${maxLength} karakter`
    };
  }
  
  return {
    valid: true,
    text: trimmed
  };
}

/**
 * Validate number input
 */
function validateNumber(input, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const num = parseInt(input, 10);
  
  if (isNaN(num)) {
    return {
      valid: false,
      reason: 'not_number',
      message: 'Input harus berupa angka'
    };
  }
  
  if (num < min) {
    return {
      valid: false,
      reason: 'too_small',
      message: `Angka minimal ${min}`
    };
  }
  
  if (num > max) {
    return {
      valid: false,
      reason: 'too_large',
      message: `Angka maksimal ${max}`
    };
  }
  
  return {
    valid: true,
    number: num
  };
}

/**
 * Sanitize text for safe display
 */
function sanitizeText(text) {
  if (!text) return '';
  
  return String(text)
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/[*_`]/g, '\\$&') // Escape markdown
    .trim();
}

/**
 * Escape markdown for Telegram
 */
function escapeMarkdown(text) {
  if (!text) return '';
  
  return String(text)
    .replace(/_/g, '\\_')
    .replace(/\*/g, '\\*')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/~/g, '\\~')
    .replace(/`/g, '\\`')
    .replace(/>/g, '\\>')
    .replace(/#/g, '\\#')
    .replace(/\+/g, '\\+')
    .replace(/-/g, '\\-')
    .replace(/=/g, '\\=')
    .replace(/\|/g, '\\|')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\./g, '\\.')
    .replace(/\!/g, '\\!');
}

module.exports = {
  validatePhoneNumber,
  validateText,
  validateNumber,
  sanitizeText,
  escapeMarkdown
};
