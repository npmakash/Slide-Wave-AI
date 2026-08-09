import React, { useState } from 'react';
import { Upload, Rocket, FileText, Image as ImageIcon, Code, Link, Type, FileCode } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useCredits } from '../context/CreditContext';
import ConfirmCreditModal from './ConfirmCreditModal';

const DEFAULT_TEMPLATE_URL = 'https://docs.google.com/presentation/d/1ecwiq4ZlzlQv8kapXBWEXViSXxhDIPnsgmT7F4-EpPo/edit?slide=id.g3f804837050_2_45#slide=id.g3f804837050_2_45';
const DEFAULT_JSON = `[
  { "name": "John", "city": "New York", "score": "95" },
  { "name": "Alice", "city": "London", "score": "88" }
]`;

export default function JsonTab({ onStartJob, activeJobResult }) {
  const [templateUrl, setTemplateUrl] = useState(DEFAULT_TEMPLATE_URL);
  const [jsonString, setJsonString] = useState(DEFAULT_JSON);
  const [outputName, setOutputName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Credit estimate modal state
  const [estimateData, setEstimateData] = useState(null);
  const [parsedData, setParsedData] = useState(null);

  const { showToast } = useToast();
  const { fetchCredits, openBuyModal } = useCredits();

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

    if (!templateUrl || !outputName || !jsonString.trim()) {
      showToast('Please fill in all required fields', 'warning');
      return;
    }

    let data;
    try {
      data = JSON.parse(jsonString);
      if (!Array.isArray(data)) {
        throw new Error('JSON input must be an array of objects.');
      }
    } catch (err) {
      showToast(`Invalid JSON: ${err.message}`, 'error');
      return;
    }

    try {
      setSubmitting(true);
      const estimateRes = await api.post('/api/credits/estimate', {
        sourceType: 'json',
        data,
      });

      if (estimateRes.data.success) {
        setParsedData(data);
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
      const res = await api.post('/api/generate-json', {
        templateUrl,
        outputName,
        data: parsedData,
      });

      showToast('JSON generation started in background!', 'success');
      await fetchCredits();
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
        <Code size={22} color="var(--primary)" />
        <span>Generate Presentations from JSON Array</span>
      </div>

      <form onSubmit={handleFormSubmit}>
        <div className="form-group">
          <label htmlFor="json-template-url">
            <Link size={16} />
            <span>Template Slide URL *</span>
          </label>
          <div className="input-with-icon">
            <Link size={17} className="input-icon" />
            <input
              type="url"
              id="json-template-url"
              className="form-control"
              value={templateUrl}
              onChange={(e) => setTemplateUrl(e.target.value)}
              placeholder="https://docs.google.com/presentation/d/1abc.../edit"
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label>
            <FileCode size={16} />
            <span>JSON Data Array *</span>
          </label>
          <div
            className={`drag-drop-area ${dragOver ? 'drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
            onDrop={handleDrop}
            onClick={() => document.getElementById('json-file-input')?.click()}
          >
            <Upload size={24} color="var(--primary)" />
            <span>Drag & Drop a .json file here, or click to browse</span>
            <input
              type="file"
              id="json-file-input"
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
          <div className="help-text">JSON array of objects. Each object represents 1 slide.</div>
        </div>

        <div className="form-group">
          <label htmlFor="json-output-name">
            <Type size={16} />
            <span>Output Presentation Name *</span>
          </label>
          <div className="input-with-icon">
            <Type size={17} className="input-icon" />
            <input
              type="text"
              id="json-output-name"
              className="form-control"
              value={outputName}
              onChange={(e) => setOutputName(e.target.value)}
              placeholder="e.g. Customer Reports 2026"
              required
            />
          </div>
        </div>

        <div className="btn-group">
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

      {/* Confirm Credit Modal */}
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
