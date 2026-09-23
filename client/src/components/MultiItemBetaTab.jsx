import React, { useState, useEffect } from 'react';
import { Grid, Layers, Sparkles, Link, FileCode, Upload, Rocket, FileText, Image as ImageIcon, Type, Info, HelpCircle, Copy, Check } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useCredits } from '../context/CreditContext';
import ConfirmCreditModal from './ConfirmCreditModal';

const DEFAULT_TEMPLATE_URL = 'https://docs.google.com/presentation/d/1EL90TLpXULg_aAmtvzC3GqSPqI6gmVtBru3DxdJj8To/edit?usp=sharing';
const DEFAULT_JSON = `[
  { "number": "1", "question": "What is the capital of France?", "optionA": "Paris", "optionB": "London", "optionC": "Berlin", "optionD": "Madrid", "answer": "A", "explanation": "Paris is the capital and largest city of France." },
  { "number": "2", "question": "Which planet is known as the Red Planet?", "optionA": "Venus", "optionB": "Mars", "optionC": "Jupiter", "optionD": "Saturn", "answer": "B", "explanation": "Mars appears red due to iron oxide on its surface." },
  { "number": "3", "question": "What is 15 x 12?", "optionA": "160", "optionB": "170", "optionC": "180", "optionD": "190", "answer": "C", "explanation": "15 times 12 equals 180." }
]`;

export default function MultiItemBetaTab({ onStartJob, activeJobResult, selectedTemplateUrl }) {
  const [sourceType, setSourceType] = useState('json'); // 'json' | 'sheet'
  const [templateUrl, setTemplateUrl] = useState(selectedTemplateUrl || DEFAULT_TEMPLATE_URL);
  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [jsonString, setJsonString] = useState(DEFAULT_JSON);
  const [copied, setCopied] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [outputName, setOutputName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [estimateData, setEstimateData] = useState(null);
  const [parsedData, setParsedData] = useState(null);

  const { showToast } = useToast();
  const { fetchCredits, openBuyModal } = useCredits();

  useEffect(() => {
    if (selectedTemplateUrl) {
      setTemplateUrl(selectedTemplateUrl);
    }
  }, [selectedTemplateUrl]);

  const handleFileUpload = (file) => {
    if (!file.name.endsWith('.json')) {
      showToast('Please select a valid .json file', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        setJsonString(JSON.stringify(parsed, null, 2));
        showToast(`Loaded JSON file with ${Array.isArray(parsed) ? parsed.length : 1} items`, 'success');
      } catch (err) {
        showToast('Invalid JSON file format', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (!templateUrl || !outputName) {
      showToast('Please fill in Template URL and Output Name', 'warning');
      return;
    }

    if (sourceType === 'sheet' && !sheetUrl) {
      showToast('Please provide a Google Sheet URL', 'warning');
      return;
    }

    let jsonArr = null;
    if (sourceType === 'json') {
      try {
        jsonArr = JSON.parse(jsonString);
        if (!Array.isArray(jsonArr) || jsonArr.length === 0) {
          throw new Error('JSON data must be a non-empty array of objects.');
        }
      } catch (err) {
        showToast(`Invalid JSON input: ${err.message}`, 'error');
        return;
      }
    }

    try {
      setSubmitting(true);
      const estimateRes = await api.post('/api/credits/estimate', {
        sourceType,
        sheetUrl: sourceType === 'sheet' ? sheetUrl : undefined,
        sheetName: sourceType === 'sheet' ? sheetName : undefined,
        data: sourceType === 'json' ? jsonArr : undefined,
        isMultiItem: true,
        itemsPerPage,
      });

      if (estimateRes.data.success) {
        setParsedData(jsonArr);
        setEstimateData(estimateRes.data);
      }
    } catch (err) {
      showToast(err.response?.data?.error || err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmGeneration = async () => {
    setEstimateData(null);
    try {
      setSubmitting(true);
      const endpoint = sourceType === 'sheet' ? '/api/generate-sheet' : '/api/generate-json';
      const payload = sourceType === 'sheet' ? {
        templateUrl,
        sheetUrl,
        sheetName,
        outputName,
        isMultiItem: true,
        itemsPerPage: parseInt(itemsPerPage, 10),
      } : {
        templateUrl,
        outputName,
        data: parsedData,
        isMultiItem: true,
        itemsPerPage: parseInt(itemsPerPage, 10),
      };

      const res = await api.post(endpoint, payload);
      showToast('Multi-Item Batch Generation started in background!', 'success');
      await fetchCredits();
      onStartJob(res.data.jobId);
    } catch (err) {
      showToast(err.response?.data?.error || err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyJson = () => {
    if (!jsonString) return;
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    showToast('Copied JSON structure to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const presentationId = activeJobResult?.presentationId;

  return (
    <>
      <div className="card-header-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Grid size={22} color="var(--primary)" />
          <span>Multi-Item Batch Generator</span>
          <span className="badge-beta">BETA</span>
        </div>
      </div>

      {/* Feature Explainer Banner */}
      <div className="beta-info-box">
        <div className="beta-info-icon">
          <Sparkles size={20} color="#6366f1" />
        </div>
        <div className="beta-info-text">
          <strong>Multi-Placeholder Batching (Apps Script Engine)</strong>
          <p>
            Generate multiple items (e.g. 12 questions/cards per slide) using multi-slot placeholders like <code>{`{{question_1}}`}</code>, <code>{`{{question_2}}`}</code> ... <code>{`{{question_12}}`}</code>. 
            The system automatically batches data into chunks and auto-clears empty slots on the last slide!
          </p>
        </div>
      </div>

      {/* Source Type Toggle */}
      <div className="source-toggle-group">
        <button
          type="button"
          className={`source-toggle-btn ${sourceType === 'json' ? 'active' : ''}`}
          onClick={() => setSourceType('json')}
        >
          <FileCode size={16} />
          <span>JSON Array Input</span>
        </button>
        <button
          type="button"
          className={`source-toggle-btn ${sourceType === 'sheet' ? 'active' : ''}`}
          onClick={() => setSourceType('sheet')}
        >
          <Link size={16} />
          <span>Google Sheet Input</span>
        </button>
      </div>

      <form onSubmit={handleFormSubmit}>
        <div className="form-group">
          <label htmlFor="beta-template-url">
            <Link size={16} />
            <span>Template Slide URL (with multi-slot placeholders) *</span>
          </label>
          <div className="input-with-icon">
            <Link size={17} className="input-icon" />
            <input
              type="url"
              id="beta-template-url"
              className="form-control"
              value={templateUrl}
              onChange={(e) => setTemplateUrl(e.target.value)}
              placeholder="https://docs.google.com/presentation/d/1abc.../edit"
              required
            />
          </div>
        </div>

        {sourceType === 'sheet' ? (
          <>
            <div className="form-group">
              <label htmlFor="beta-sheet-url">
                <Link size={16} />
                <span>Google Sheet URL *</span>
              </label>
              <div className="input-with-icon">
                <Link size={17} className="input-icon" />
                <input
                  type="url"
                  id="beta-sheet-url"
                  className="form-control"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/1xyz.../edit"
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="beta-sheet-name">
                <Type size={16} />
                <span>Sheet Tab Name (Optional)</span>
              </label>
              <input
                type="text"
                id="beta-sheet-name"
                className="form-control"
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
                placeholder="e.g. Reasoning_Qs"
              />
            </div>
          </>
        ) : (
          <div className="form-group">
            <div className="form-label-row">
              <label style={{ margin: 0 }}>
                <FileCode size={16} />
                <span>JSON Data Array *</span>
              </label>
              <button
                type="button"
                className="copy-json-btn"
                onClick={handleCopyJson}
                title="Copy JSON structure to clipboard"
              >
                {copied ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
              </button>
            </div>
            <div
              className={`drag-drop-area ${dragOver ? 'drag-over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
              onDrop={handleDrop}
              onClick={() => document.getElementById('beta-json-file')?.click()}
            >
              <Upload size={24} color="var(--primary)" />
              <span>Drag & Drop a .json file here, or click to browse</span>
              <input
                type="file"
                id="beta-json-file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              />
            </div>

            <textarea
              className="form-control"
              value={jsonString}
              onChange={(e) => setJsonString(e.target.value)}
              placeholder="Paste JSON array here..."
              required
            />
          </div>
        )}

        <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="form-group">
            <label htmlFor="beta-items-per-page">
              <Grid size={16} />
              <span>Items / Placeholders Per Slide *</span>
            </label>
            <input
              type="number"
              id="beta-items-per-page"
              className="form-control"
              min="1"
              max="50"
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(e.target.value)}
              required
            />
            <div className="help-text">Default 12 (matches placeholders 1 to 12)</div>
          </div>

          <div className="form-group">
            <label htmlFor="beta-output-name">
              <Type size={16} />
              <span>Output Presentation Name *</span>
            </label>
            <input
              type="text"
              id="beta-output-name"
              className="form-control"
              value={outputName}
              onChange={(e) => setOutputName(e.target.value)}
              placeholder="e.g. Question Bank Batch 1"
              required
            />
          </div>
        </div>

        <div className="btn-group">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? <div className="spinner" style={{ borderColor: 'rgba(255, 255, 255, 0.3)', borderTopColor: '#fff' }} /> : <Rocket size={16} />}
            <span>Generate Multi-Item Presentation</span>
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

      {/* Credit Estimate Confirmation Modal */}
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
