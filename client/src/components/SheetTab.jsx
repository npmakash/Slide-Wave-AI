import React, { useState, useEffect, useRef } from 'react';
import { Search, Rocket, FileText, Image as ImageIcon, Link, FileSpreadsheet, Type, Calendar, Upload, FileCode, CheckCircle } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useCredits } from '../context/CreditContext';
import ConfirmCreditModal from './ConfirmCreditModal';
import { parseCSV } from '../utils/csvParser';

const DEFAULT_TEMPLATE_URL = 'https://docs.google.com/presentation/d/1ecwiq4ZlzlQv8kapXBWEXViSXxhDIPnsgmT7F4-EpPo/edit?slide=id.g3f804837050_2_45#slide=id.g3f804837050_2_45';

export default function SheetTab({ onStartJob, onOpenPreview, activeJobResult, selectedTemplateUrl }) {
  const [sourceType, setSourceType] = useState('sheet'); // 'sheet' | 'csv'
  const [templateUrl, setTemplateUrl] = useState(selectedTemplateUrl || DEFAULT_TEMPLATE_URL);
  const [sheetUrl, setSheetUrl] = useState('');
  
  // CSV mode states
  const [csvText, setCsvText] = useState('');
  const [csvFileName, setCsvFileName] = useState('');
  const [parsedCsvInfo, setParsedCsvInfo] = useState({ count: 0, headers: [] });
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const [outputName, setOutputName] = useState('');
  const [skipEmptyRows, setSkipEmptyRows] = useState(true);
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [submitting, setSubmitting] = useState(false);

  // Credit Confirmation modal state
  const [estimateData, setEstimateData] = useState(null);

  const { showToast } = useToast();
  const { fetchCredits, openBuyModal } = useCredits();

  useEffect(() => {
    if (selectedTemplateUrl) {
      setTemplateUrl(selectedTemplateUrl);
    }
  }, [selectedTemplateUrl]);

  // Update parsed CSV info when csvText changes
  useEffect(() => {
    if (sourceType === 'csv' && csvText) {
      const { headers, records } = parseCSV(csvText);
      setParsedCsvInfo({ count: records.length, headers });
    } else {
      setParsedCsvInfo({ count: 0, headers: [] });
    }
  }, [csvText, sourceType]);

  const handleFileUpload = (file) => {
    if (!file) return;
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      showToast('Please upload a valid .csv file', 'warning');
      return;
    }

    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      setCsvText(content);
      showToast(`Loaded ${file.name} successfully`, 'success');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handlePreview = () => {
    if (!templateUrl) {
      showToast('Please enter a Template Slide URL first', 'warning');
      return;
    }
    onOpenPreview(templateUrl, sourceType === 'sheet' ? sheetUrl : null);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (!templateUrl || !outputName) {
      showToast('Please fill in all required fields', 'warning');
      return;
    }

    if (sourceType === 'sheet' && !sheetUrl) {
      showToast('Please enter a valid Google Sheet URL', 'warning');
      return;
    }

    if (sourceType === 'csv' && (!csvText || parsedCsvInfo.count === 0)) {
      showToast('Please upload or paste valid CSV data', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      showToast('Analyzing data & credit requirements...', 'info');

      if (sourceType === 'sheet') {
        const estimateRes = await api.post('/api/credits/estimate', {
          sourceType: 'sheet',
          sheetUrl,
          skipEmptyRows,
        });
        if (estimateRes.data.success) {
          setEstimateData(estimateRes.data);
        }
      } else {
        const { records } = parseCSV(csvText);
        const estimateRes = await api.post('/api/credits/estimate', {
          sourceType: 'csv',
          data: records,
        });
        if (estimateRes.data.success) {
          setEstimateData(estimateRes.data);
        }
      }
    } catch (err) {
      showToast(err.response?.data?.error || err.message || 'Failed to analyze data source', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmGeneration = async () => {
    setEstimateData(null);
    try {
      setSubmitting(true);
      let res;
      if (sourceType === 'sheet') {
        res = await api.post('/api/generate-sheet', {
          templateUrl,
          sheetUrl,
          outputName,
          skipEmptyRows,
          dateFormat,
        });
      } else {
        const { records } = parseCSV(csvText);
        res = await api.post('/api/generate-csv', {
          templateUrl,
          outputName,
          data: records,
          dateFormat,
        });
      }

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
      <div className="card-header-title" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <FileSpreadsheet size={22} color="var(--primary)" />
          <span>Bulk Presentation Generator</span>
        </div>

        {/* Source Switcher Toggle */}
        <div style={{ display: 'flex', background: 'var(--bg-body)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-card-border)' }}>
          <button
            type="button"
            onClick={() => setSourceType('sheet')}
            style={{
              padding: '0.4rem 0.85rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              background: sourceType === 'sheet' ? 'var(--primary)' : 'transparent',
              color: sourceType === 'sheet' ? '#ffffff' : 'var(--text-secondary)',
              transition: 'var(--transition-fast)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <FileSpreadsheet size={15} />
            <span>Google Sheet</span>
          </button>

          <button
            type="button"
            onClick={() => setSourceType('csv')}
            style={{
              padding: '0.4rem 0.85rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              background: sourceType === 'csv' ? 'var(--primary)' : 'transparent',
              color: sourceType === 'csv' ? '#ffffff' : 'var(--text-secondary)',
              transition: 'var(--transition-fast)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <FileCode size={15} />
            <span>CSV File / Data</span>
          </button>
        </div>
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

        {sourceType === 'sheet' ? (
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
                required={sourceType === 'sheet'}
              />
            </div>
            <div className="help-text">
              Google Sheet URL with header row (name, city, score...). Each row generates 1 slide.
            </div>
          </div>
        ) : (
          <div className="form-group">
            <label>
              <Upload size={16} />
              <span>Upload CSV File or Paste Raw CSV *</span>
            </label>

            <div
              className={`drag-drop-area ${isDragOver ? 'drag-over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{ minHeight: '100px', cursor: 'pointer' }}
            >
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv,text/csv"
                style={{ display: 'none' }}
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              />
              <Upload size={24} color="var(--primary)" />
              <div>
                {csvFileName ? (
                  <span style={{ fontWeight: 600, color: 'var(--success)' }}>
                    <CheckCircle size={15} style={{ display: 'inline', marginRight: '4px' }} />
                    {csvFileName} ({parsedCsvInfo.count} rows)
                  </span>
                ) : (
                  <span>Drag & Drop your <strong>.csv</strong> file here, or click to browse</span>
                )}
              </div>
            </div>

            <textarea
              className="form-control"
              value={csvText}
              onChange={(e) => { setCsvFileName(''); setCsvText(e.target.value); }}
              placeholder="Or paste CSV text directly here:&#10;name,city,score&#10;Alex,New York,95&#10;Sarah,London,88"
              rows={4}
              style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
            />

            {parsedCsvInfo.count > 0 && (
              <div className="help-text" style={{ color: 'var(--success)', fontWeight: 600 }}>
                ✓ Parsed {parsedCsvInfo.count} rows with headers: {parsedCsvInfo.headers.slice(0, 6).join(', ')}{parsedCsvInfo.headers.length > 6 ? '...' : ''}
              </div>
            )}
          </div>
        )}

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

        <div className="form-group" style={{ display: 'flex', gap: '1.75rem', flexWrap: 'wrap', alignItems: 'center', background: 'var(--bg-body)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-card-border)' }}>
          {sourceType === 'sheet' && (
            <label className="checkbox-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', margin: 0 }}>
              <input
                type="checkbox"
                checked={skipEmptyRows}
                onChange={(e) => setSkipEmptyRows(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
              />
              <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 500 }}>Skip empty data rows</span>
            </label>
          )}

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
