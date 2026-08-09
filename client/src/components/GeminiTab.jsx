import React, { useState, useEffect } from 'react';
import { Sparkles, Rocket, Link, Type, HelpCircle } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useCredits } from '../context/CreditContext';
import ConfirmCreditModal from './ConfirmCreditModal';

const DEFAULT_TEMPLATE_URL = 'https://docs.google.com/presentation/d/1ecwiq4ZlzlQv8kapXBWEXViSXxhDIPnsgmT7F4-EpPo/edit?slide=id.g3f804837050_2_45#slide=id.g3f804837050_2_45';

export default function GeminiTab({ onStartJob, activeJobResult, selectedTemplateUrl }) {
  const [templateUrl, setTemplateUrl] = useState(selectedTemplateUrl || DEFAULT_TEMPLATE_URL);
  const [prompt, setPrompt] = useState('Generate 5 quiz questions about World War 2 with question, optionA, optionB, optionC, optionD, and answer.');
  const [outputName, setOutputName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Credit estimate modal state
  const [estimateData, setEstimateData] = useState(null);
  const [generatedJsonData, setGeneratedJsonData] = useState(null);

  const { showToast } = useToast();
  const { fetchCredits, openBuyModal } = useCredits();

  useEffect(() => {
    if (selectedTemplateUrl) {
      setTemplateUrl(selectedTemplateUrl);
    }
  }, [selectedTemplateUrl]);

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (!templateUrl || !prompt || !outputName) {
      showToast('Please fill in all required fields', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      showToast('Asking Gemini AI to generate structured presentation data...', 'info');

      // 1. Call Gemini AI to produce JSON array
      const aiRes = await api.post('/api/gemini/generate-json', { prompt });

      if (!aiRes.data.success || !Array.isArray(aiRes.data.data)) {
        throw new Error('Gemini AI did not return a valid data array.');
      }

      const aiData = aiRes.data.data;
      setGeneratedJsonData(aiData);

      // 2. Request credit estimate for the AI generated items
      const estimateRes = await api.post('/api/credits/estimate', {
        sourceType: 'json',
        data: aiData,
      });

      if (estimateRes.data.success) {
        setEstimateData(estimateRes.data);
      }
    } catch (err) {
      showToast(err.response?.data?.error || err.message || 'Gemini AI Generation failed', 'error');
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
        data: generatedJsonData,
      });

      showToast('Gemini AI slide generation started!', 'success');
      await fetchCredits();
      onStartJob(res.data.jobId);
    } catch (err) {
      showToast(err.response?.data?.error || err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="card-header-title">
        <Sparkles size={22} color="var(--primary)" />
        <span>Generate Presentation Data with Gemini AI</span>
      </div>

      <form onSubmit={handleFormSubmit}>
        <div className="form-group">
          <label htmlFor="gemini-template-url">
            <Link size={16} />
            <span>Template Slide URL *</span>
          </label>
          <div className="input-with-icon">
            <Link size={17} className="input-icon" />
            <input
              type="url"
              id="gemini-template-url"
              className="form-control"
              value={templateUrl}
              onChange={(e) => setTemplateUrl(e.target.value)}
              placeholder="https://docs.google.com/presentation/d/1abc.../edit"
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="gemini-prompt">
            <HelpCircle size={16} />
            <span>AI Prompt Description *</span>
          </label>
          <textarea
            id="gemini-prompt"
            className="form-control"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe what slides or questions you want AI to generate..."
            rows={4}
            required
          />
          <div className="help-text">
            Specify the topics, number of slides, and fields you need (e.g., question, optionA, optionB, answer).
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="gemini-output-name">
            <Type size={16} />
            <span>Output Presentation Name *</span>
          </label>
          <div className="input-with-icon">
            <Type size={17} className="input-icon" />
            <input
              type="text"
              id="gemini-output-name"
              className="form-control"
              value={outputName}
              onChange={(e) => setOutputName(e.target.value)}
              placeholder="e.g. World War 2 AI Quiz"
              required
            />
          </div>
        </div>

        <div className="btn-group">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? <div className="spinner" style={{ borderColor: 'rgba(255, 255, 255, 0.3)', borderTopColor: '#fff' }} /> : <Sparkles size={16} />}
            <span>Generate with Gemini AI</span>
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
