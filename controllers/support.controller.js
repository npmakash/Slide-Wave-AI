/**
 * controllers/support.controller.js
 * Express Controller for Developer Support messaging & Admin Inbox Management
 */

const SupportService = require('../services/SupportService');
const SocketService = require('../services/SocketService');
const logger = require('../utils/logger');

class SupportController {
  /** POST /api/support — Send message from user to Admin */
  static async sendMessage(req, res) {
    try {
      const { message } = req.body;
      const user = req.session?.user;

      if (!user || !user.email) {
        return res.status(401).json({ error: 'Authentication required to send support message.' });
      }

      if (!message || !String(message).trim()) {
        return res.status(400).json({ error: 'Message content cannot be empty.' });
      }

      const created = await SupportService.createMessage({
        userEmail: user.email,
        userName: user.name,
        userPicture: user.picture,
        message: String(message).trim(),
      });

      // Emit real-time Socket.IO event to admin
      SocketService.emitNewSupportMessage(created);

      return res.json({
        success: true,
        message: 'Developer support message sent successfully!',
        data: created,
      });
    } catch (err) {
      logger.error(`SupportController sendMessage error: ${err.message}`);
      res.status(500).json({ error: err.message || 'Failed to send message.' });
    }
  }

  /** GET /api/admin/support — Get all developer support inbox messages */
  static async getAdminMessages(req, res) {
    try {
      const messages = await SupportService.getAllMessages();
      return res.json({
        success: true,
        count: messages.length,
        messages,
      });
    } catch (err) {
      logger.error(`SupportController getAdminMessages error: ${err.message}`);
      res.status(500).json({ error: err.message || 'Failed to load support messages.' });
    }
  }

  /** DELETE /api/admin/support — Clean / reset all support messages from database */
  static async clearAllMessages(req, res) {
    try {
      await SupportService.deleteAllMessages();

      // Emit real-time Socket.IO event
      SocketService.emitSupportMessagesCleared();

      return res.json({
        success: true,
        message: 'All support messages have been cleared from the database.',
      });
    } catch (err) {
      logger.error(`SupportController clearAllMessages error: ${err.message}`);
      res.status(500).json({ error: err.message || 'Failed to clear support messages.' });
    }
  }

  /** DELETE /api/admin/support/:id — Delete single message */
  static async deleteSingleMessage(req, res) {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ error: 'Message ID is required.' });

      await SupportService.deleteMessageById(id);

      // Emit real-time Socket.IO event
      SocketService.emitSupportMessageDeleted(id);

      return res.json({
        success: true,
        message: `Message deleted successfully.`,
      });
    } catch (err) {
      logger.error(`SupportController deleteSingleMessage error: ${err.message}`);
      res.status(500).json({ error: err.message || 'Failed to delete message.' });
    }
  }
}

module.exports = SupportController;
