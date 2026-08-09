/**
 * controllers/template.controller.js
 * Slide presentation templates CRUD controller with MongoDB and JSON fallback
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Template = require('../models/Template');
const { extractGoogleFileId } = require('../middleware/validate.middleware');
const logger = require('../utils/logger');

const TEMPLATES_FILE = path.join(__dirname, '..', 'data', 'templates.json');

const DEFAULT_TEMPLATES = [
  {
    id: 'tpl_default_cert',
    title: 'Modern Certificate Template',
    tag: 'Certificate',
    description: 'Clean certificate layout with {{name}}, {{city}}, and {{score}} placeholders.',
    imageUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80',
    templateUrl: 'https://docs.google.com/presentation/d/1ecwiq4ZlzlQv8kapXBWEXViSXxhDIPnsgmT7F4-EpPo/edit?slide=id.g3f804837050_2_45#slide=id.g3f804837050_2_45',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tpl_default_quiz',
    title: 'AI Quiz & Flashcards Template',
    tag: 'Quiz',
    description: 'Interactive quiz slide with {{number}}, {{question}}, {{optionA}}, {{optionB}}, {{optionC}}, {{optionD}}.',
    imageUrl: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?auto=format&fit=crop&w=600&q=80',
    templateUrl: 'https://docs.google.com/presentation/d/1ecwiq4ZlzlQv8kapXBWEXViSXxhDIPnsgmT7F4-EpPo/edit?slide=id.g3f804837050_2_45#slide=id.g3f804837050_2_45',
    createdAt: new Date().toISOString(),
  },
];

function isMongoConnected() {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

function readLocalTemplates() {
  try {
    if (!fs.existsSync(TEMPLATES_FILE)) {
      fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(DEFAULT_TEMPLATES, null, 2), 'utf-8');
      return DEFAULT_TEMPLATES;
    }
    const content = fs.readFileSync(TEMPLATES_FILE, 'utf-8');
    const data = JSON.parse(content || '[]');
    if (data.length === 0) {
      fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(DEFAULT_TEMPLATES, null, 2), 'utf-8');
      return DEFAULT_TEMPLATES;
    }
    return data;
  } catch (err) {
    return DEFAULT_TEMPLATES;
  }
}

function writeLocalTemplates(data) {
  try {
    fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    logger.error(`Failed to save local templates: ${err.message}`);
  }
}

class TemplateController {
  /** GET /api/templates — List all curated templates */
  static async getTemplates(req, res) {
    try {
      if (isMongoConnected()) {
        let dbTemplates = await Template.find().sort({ createdAt: -1 });
        if (dbTemplates.length === 0) {
          // Seed defaults
          await Template.insertMany(DEFAULT_TEMPLATES.map(({ id, ...t }) => t));
          dbTemplates = await Template.find().sort({ createdAt: -1 });
        }
        const formatted = dbTemplates.map((t) => ({
          id: t._id.toString(),
          title: t.title,
          imageUrl: t.imageUrl,
          templateUrl: t.templateUrl,
          tag: t.tag,
          description: t.description,
          createdAt: t.createdAt.toISOString(),
        }));
        return res.json({ success: true, count: formatted.length, templates: formatted });
      }

      const templates = readLocalTemplates();
      res.json({ success: true, count: templates.length, templates });
    } catch (err) {
      logger.error(`Template getTemplates error: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  }

  /** POST /api/templates — Admin create new template */
  static async createTemplate(req, res) {
    try {
      const { title, imageUrl, templateUrl, tag, description } = req.body;

      if (!title || !imageUrl || !templateUrl) {
        return res.status(400).json({ error: 'Title, Image Preview URL, and Google Slides Template URL are required.' });
      }

      // Validate presentation URL format
      try {
        extractGoogleFileId(templateUrl);
      } catch (err) {
        return res.status(400).json({ error: 'Invalid Google Presentation URL format.' });
      }

      const newTag = tag ? tag.trim() : 'General';
      const newDesc = description ? description.trim() : '';

      if (isMongoConnected()) {
        const doc = await Template.create({
          title: title.trim(),
          imageUrl: imageUrl.trim(),
          templateUrl: templateUrl.trim(),
          tag: newTag,
          description: newDesc,
        });

        logger.info(`✨ Created new MongoDB Slide Template: "${doc.title}" [${doc.tag}]`);

        return res.json({
          success: true,
          template: {
            id: doc._id.toString(),
            title: doc.title,
            imageUrl: doc.imageUrl,
            templateUrl: doc.templateUrl,
            tag: doc.tag,
            description: doc.description,
            createdAt: doc.createdAt.toISOString(),
          },
        });
      }

      // Local JSON Fallback
      const templates = readLocalTemplates();
      const localItem = {
        id: `tpl_${Date.now()}`,
        title: title.trim(),
        imageUrl: imageUrl.trim(),
        templateUrl: templateUrl.trim(),
        tag: newTag,
        description: newDesc,
        createdAt: new Date().toISOString(),
      };
      templates.unshift(localItem);
      writeLocalTemplates(templates);

      logger.info(`✨ Created new local Slide Template: "${localItem.title}" [${localItem.tag}]`);

      res.json({ success: true, template: localItem });
    } catch (err) {
      logger.error(`Template createTemplate error: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  }

  /** PUT /api/templates/:id — Admin update template */
  static async updateTemplate(req, res) {
    try {
      const { id } = req.params;
      const { title, imageUrl, templateUrl, tag, description } = req.body;

      if (isMongoConnected() && mongoose.Types.ObjectId.isValid(id)) {
        const doc = await Template.findById(id);
        if (!doc) return res.status(404).json({ error: 'Template not found' });

        if (title) doc.title = title.trim();
        if (imageUrl) doc.imageUrl = imageUrl.trim();
        if (templateUrl) doc.templateUrl = templateUrl.trim();
        if (tag) doc.tag = tag.trim();
        if (description !== undefined) doc.description = description.trim();

        await doc.save();

        return res.json({
          success: true,
          template: {
            id: doc._id.toString(),
            title: doc.title,
            imageUrl: doc.imageUrl,
            templateUrl: doc.templateUrl,
            tag: doc.tag,
            description: doc.description,
            createdAt: doc.createdAt.toISOString(),
          },
        });
      }

      // Local JSON Fallback
      const templates = readLocalTemplates();
      const idx = templates.findIndex((t) => t.id === id);
      if (idx === -1) return res.status(404).json({ error: 'Template not found' });

      if (title) templates[idx].title = title.trim();
      if (imageUrl) templates[idx].imageUrl = imageUrl.trim();
      if (templateUrl) templates[idx].templateUrl = templateUrl.trim();
      if (tag) templates[idx].tag = tag.trim();
      if (description !== undefined) templates[idx].description = description.trim();

      writeLocalTemplates(templates);
      res.json({ success: true, template: templates[idx] });
    } catch (err) {
      logger.error(`Template updateTemplate error: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  }

  /** DELETE /api/templates/:id — Admin delete template */
  static async deleteTemplate(req, res) {
    try {
      const { id } = req.params;

      if (isMongoConnected() && mongoose.Types.ObjectId.isValid(id)) {
        await Template.findByIdAndDelete(id);
        return res.json({ success: true, message: 'Template deleted successfully' });
      }

      const templates = readLocalTemplates();
      const filtered = templates.filter((t) => t.id !== id);
      writeLocalTemplates(filtered);

      res.json({ success: true, message: 'Template deleted successfully' });
    } catch (err) {
      logger.error(`Template deleteTemplate error: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = TemplateController;
