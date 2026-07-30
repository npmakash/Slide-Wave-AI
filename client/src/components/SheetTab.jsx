import React, { useState } from 'react';
import { Search, Rocket, FileText, Image as ImageIcon } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const DEFAULT_TEMPLATE_URL = 'https://docs.google.com/presentation/d/1ecwiq4ZlzlQv8kapXBWEXViSXxhDIPnsgmT7F4-EpPo/edit?slide=id.g3f804837050_2_45#slide=id.g3f804837050_2_45';

export default function SheetTab({ onStartJob, onOpenPreview, activeJobResult }) {
  const [templateUrl, setTemplateUrl] = useState(DEFAULT_TEMPLATE_URL);
  const [sheetUrl, setSheetUrl] = useState('');
  const [outputName, setOutputName] = useState('');
  const [skipEmptyRows, setSkipEmptyRows] = useState(true);
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [submitting, setSubmitting] = useState(false);

  const { showToast } = useToast();

  const handlePreview = () => {
    if (!templateUrl) {
      showToast('Please enter a Template Slide URL first', 'warning');
      return;
    }
    onOpenPreview(templateUrl, sheetUrl);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!templateUrl || !sheetUrl || !outputName) {
      showToast('Please fill in all required fields', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/api/generate-sheet', {
        templateUrl,
        sheetUrl,
        outputName,
        skipEmptyRows,
        dateFormat,
      });

      showToast('Generation started in background!', 'success');
      onStartJob(res.data.jobId);
    } catch (err) {
      showToast(err.response?.data?.error || err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const presentationId = activeJobResult?.presentationId;

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="sheet-template-url">Template Slide URL *</label>
        <input
          type="url"
          id="sheet-template-url"
          className="form-control"
          value={templateUrl}
          onChange={(e) => setTemplateUrl(e.target.value)}
          placeholder="https://docs.google.com/presentation/d/1abc.../edit"
          required
        />
        <div className="help-text">
          Google Slides presentation URL containing placeholders like <code>{'{{name}}'}</code>, <code>{'{{city}}'}</code>, etc.
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="sheet-url">Google Sheet URL *</label>
        <input
          type="url"
          id="sheet-url"
          className="form-control"
          value={sheetUrl}
          onChange={(e) => setSheetUrl(e.target.value)}
          placeholder="https://docs.google.com/spreadsheets/d/1xyz.../edit"
          required
        />
        <div className="help-text">
          Google Sheet URL with header row (name, city, score...). Each row generates 1 slide.
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="sheet-output-name">Output Presentation Name *</label>
        <input
          type="text"
          id="sheet-output-name"
          className="form-control"
          value={outputName}
          onChange={(e) => setOutputName(e.target.value)}
          placeholder="e.g. Q3 Sales Certificates"
          required
        />
      </div>

      <div className="form-group" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        <label className="checkbox-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={skipEmptyRows}
            onChange={(e) => setSkipEmptyRows(e.target.checked)}
            style={{ width: '18px', height: '18px' }}
          />
          <span>Skip empty data rows</span>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Date Format:
          <select
            className="form-control"
            value={dateFormat}
            onChange={(e) => setDateFormat(e.target.value)}
            style={{ width: 'auto', padding: '0.4rem 0.8rem' }}
          >
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="MM-DD-YYYY">MM-DD-YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </label>
      </div>

      <div className="btn-group">
        <button type="button" className="btn btn-secondary" onClick={handlePreview}>
          <Search size={16} />
          <span>Preview & Map</span>
        </button>

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? <div className="spinner" /> : <Rocket size={16} />}
          <span>Generate Slides</span>
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          disabled={!presentationId}
          onClick={() => presentationId && (window.location.href = `/api/download/pdf/${presentationId}`)}
        >
          <FileText size={16} />
          <span>Download PDF</span>
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          disabled={!presentationId}
          onClick={() => presentationId && (window.location.href = `/api/download/images/${presentationId}`)}
        >
          <ImageIcon size={16} />
          <span>Download Images (ZIP)</span>
        </button>
      </div>
    </form>
  );
}
