const TelegramBot = require('node-telegram-bot-api');
const config = require('../../config');
const logger = require('../utils/logger');
const { setupHandlers } = require('./handlers');

class AutoAcceptBot {
  constructor() {
    this.bot = new TelegramBot(config.telegram.token, { polling: true });
    this.setupErrorHandling();
    this.setupHandlers();
  }

  setupErrorHandling() {
    this.bot.on('polling_error', (error) => {
      logger.error('Polling error:', error);
    });

    this.bot.on('error', (error) => {
      logger.error('Bot error:', error);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception:', err);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });
  }

  setupHandlers() {
    setupHandlers(this.bot);
  }

  // Check if user is owner
  isOwner(userId) {
    return config.telegram.owners.includes(userId.toString());
  }

  // Start the bot
  start() {
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
  }

  // Stop the bot
  stop() {
    this.bot.stopPolling();
    logger.info('🛑 Bot stopped');
  }
}

module.exports = AutoAcceptBot;