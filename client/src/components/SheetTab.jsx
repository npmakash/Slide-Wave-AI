import React, { useState } from 'react';
import { Search, Rocket, FileText, Image as ImageIcon, Link, FileSpreadsheet, Type, Calendar, CheckSquare } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useCredits } from '../context/CreditContext';
import ConfirmCreditModal from './ConfirmCreditModal';

const DEFAULT_TEMPLATE_URL = 'https://docs.google.com/presentation/d/1ecwiq4ZlzlQv8kapXBWEXViSXxhDIPnsgmT7F4-EpPo/edit?slide=id.g3f804837050_2_45#slide=id.g3f804837050_2_45';

export default function SheetTab({ onStartJob, onOpenPreview, activeJobResult }) {
  const [templateUrl, setTemplateUrl] = useState(DEFAULT_TEMPLATE_URL);
  const [sheetUrl, setSheetUrl] = useState('');
  const [outputName, setOutputName] = useState('');
  const [skipEmptyRows, setSkipEmptyRows] = useState(true);
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [submitting, setSubmitting] = useState(false);

  // Credit Confirmation modal state
  const [estimateData, setEstimateData] = useState(null);

  const { showToast } = useToast();
  const { fetchCredits, openBuyModal } = useCredits();

  const handlePreview = () => {
    if (!templateUrl) {
      showToast('Please enter a Template Slide URL first', 'warning');
      return;
    }
    onOpenPreview(templateUrl, sheetUrl);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (!templateUrl || !sheetUrl || !outputName) {
      showToast('Please fill in all required fields', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      showToast('Calculating sheet rows & credit requirements...', 'info');

      // Step 1: Request credit estimate from server
      const estimateRes = await api.post('/api/credits/estimate', {
        sourceType: 'sheet',
        sheetUrl,
        skipEmptyRows,
      });

      if (estimateRes.data.success) {
        setEstimateData(estimateRes.data);
      }
    } catch (err) {
      showToast(err.response?.data?.error || err.message || 'Failed to analyze Google Sheet', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmGeneration = async () => {
    setEstimateData(null);
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
      await fetchCredits(); // refresh credits balance
      onStartJob(res.data.jobId);
    } catch (err) {
      showToast(err.response?.data?.error || err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const presentationId = activeJobResult?.presentationId;

  return (
    <>
      <div className="card-header-title">
        <FileSpreadsheet size={22} color="var(--primary)" />
        <span>Generate Presentations from Google Sheets</span>
      </div>

      <form onSubmit={handleFormSubmit}>
        <div className="form-group">
          <label htmlFor="sheet-template-url">
            <Link size={16} />
            <span>Template Slide URL *</span>
          </label>
          <div className="input-with-icon">
            <Link size={17} className="input-icon" />
            <input
              type="url"
              id="sheet-template-url"
              className="form-control"
              value={templateUrl}
              onChange={(e) => setTemplateUrl(e.target.value)}
              placeholder="https://docs.google.com/presentation/d/1abc.../edit"
              required
            />
          </div>
          <div className="help-text">
            Google Slides presentation URL containing placeholders like <code>{'{{name}}'}</code>, <code>{'{{city}}'}</code>, etc.
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="sheet-url">
            <FileSpreadsheet size={16} />
            <span>Google Sheet URL *</span>
          </label>
          <div className="input-with-icon">
            <FileSpreadsheet size={17} className="input-icon" />
            <input
              type="url"
              id="sheet-url"
              className="form-control"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/1xyz.../edit"
              required
            />
          </div>
          <div className="help-text">
            Google Sheet URL with header row (name, city, score...). Each row generates 1 slide.
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="sheet-output-name">
            <Type size={16} />
            <span>Output Presentation Name *</span>
          </label>
          <div className="input-with-icon">
            <Type size={17} className="input-icon" />
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
        </div>

        <div className="form-group" style={{ display: 'flex', gap: '1.75rem', flexWrap: 'wrap', alignItems: 'center', background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-card-border)' }}>
          <label className="checkbox-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', margin: 0 }}>
            <input
              type="checkbox"
              checked={skipEmptyRows}
              onChange={(e) => setSkipEmptyRows(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
            />
            <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 500 }}>Skip empty data rows</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', color: 'var(--text-secondary)', margin: 0 }}>
            <Calendar size={16} />
            <span>Date Format:</span>
            <select
              className="form-control"
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value)}
              style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.88rem' }}
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
            {submitting ? <div className="spinner" style={{ borderColor: 'rgba(255, 255, 255, 0.3)', borderTopColor: '#fff' }} /> : <Rocket size={16} />}
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

      {/* Credit Confirmation Modal */}
      {estimateData && (
        <ConfirmCreditModal
          estimate={estimateData}
          onConfirm={handleConfirmGeneration}
          onCancel={() => setEstimateData(null)}
          onBuyCredits={openBuyModal}
        />
      )}
    </>
  );
}
