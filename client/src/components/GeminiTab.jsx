import React, { useState } from 'react';
import { Sparkles, Rocket, FileText, Image as ImageIcon, Key, HelpCircle, Code, AlignLeft, Link, Type, Hash, BarChart } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useCredits } from '../context/CreditContext';
import ConfirmCreditModal from './ConfirmCreditModal';

const DEFAULT_TEMPLATE_URL = 'https://docs.google.com/presentation/d/1ecwiq4ZlzlQv8kapXBWEXViSXxhDIPnsgmT7F4-EpPo/edit?slide=id.g3f804837050_2_45#slide=id.g3f804837050_2_45';

const SAMPLE_PASTE_TEXT = `number\tquestion\toptionA\toptionB\toptionC\toptionD
1\tWhat is the capital of France?\tParis\tLondon\tBerlin\tMadrid
2\tWhich planet is known as the Red Planet?\tMars\tVenus\tJupiter\tSaturn
3\tWhat is the largest ocean on Earth?\tPacific\tAtlantic\tIndian\tArctic
4\tWho wrote 'Romeo and Juliet'?\tWilliam Shakespeare\tCharles Dickens\tMark Twain\tJane Austen
5\tWhat is the chemical symbol for water?\tH2O\tCO2\tO2\tNaCl`;

export default function GeminiTab({ onStartJob, activeJobResult }) {
  const [inputMode, setInputMode] = useState('paste'); // 'paste' | 'topic'
  const [rawText, setRawText] = useState(SAMPLE_PASTE_TEXT);
  const [topic, setTopic] = useState('Python Programming Essentials');
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState('medium');
  const [apiKey, setApiKey] = useState('');
  const [templateUrl, setTemplateUrl] = useState(DEFAULT_TEMPLATE_URL);
  const [outputName, setOutputName] = useState('Gemini Quiz Presentation');

  const [isProcessing, setIsProcessing] = useState(false);
  const [questions, setQuestions] = useState(null);
  const [jsonText, setJsonText] = useState('');

  // Credit Confirmation modal state
  const [estimateData, setEstimateData] = useState(null);
  const [parsedData, setParsedData] = useState(null);

  const { showToast } = useToast();
  const { fetchCredits, openBuyModal } = useCredits();

  const handleParseOrGenerate = async () => {
    setIsProcessing(true);
    try {
      let currentQuestions = null;

      if (inputMode === 'paste') {
        if (!rawText.trim()) {
          showToast('Please paste your questions text first', 'warning');
          return null;
        }

        showToast('Parsing questions text...', 'info');
        const res = await api.post('/api/gemini/parse-text', {
          rawText,
          apiKey,
        });

        currentQuestions = res.data.data;
        showToast(`Successfully parsed ${currentQuestions.length} questions!`, 'success');
      } else {
        if (!topic.trim()) {
          showToast('Please enter a Quiz Topic', 'warning');
          return null;
        }

        showToast(`Generating ${count} questions via Gemini AI...`, 'info');
        const res = await api.post('/api/gemini/generate-questions', {
          topic,
          count,
          difficulty,
          apiKey,
        });

        currentQuestions = res.data.data;
        showToast(`Gemini generated ${currentQuestions.length} questions!`, 'success');
      }

      setQuestions(currentQuestions);
      setJsonText(JSON.stringify(currentQuestions, null, 2));
      return currentQuestions;
    } catch (err) {
      showToast(err.response?.data?.error || err.message, 'error');
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateFullFlow = async (e) => {
    e.preventDefault();

    if (!templateUrl || !outputName) {
      showToast('Please enter Template Slide URL and Output Name', 'warning');
      return;
    }

    try {
      setIsProcessing(true);

      let dataToUse = questions;

      if (!dataToUse || dataToUse.length === 0) {
        dataToUse = await handleParseOrGenerate();
      }

      if (!dataToUse || !Array.isArray(dataToUse) || dataToUse.length === 0) {
        return;
      }

      const estimateRes = await api.post('/api/credits/estimate', {
        sourceType: 'gemini',
        data: dataToUse,
      });

      if (estimateRes.data.success) {
        setParsedData(dataToUse);
        setEstimateData(estimateRes.data);
      }
    } catch (err) {
      showToast(err.response?.data?.error || err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmGeneration = async () => {
    setEstimateData(null);
    try {
      setIsProcessing(true);
      const genRes = await api.post('/api/generate-json', {
        templateUrl,
        outputName,
        data: parsedData,
      });

      showToast('Gemini slide generation started!', 'success');
      await fetchCredits();
      onStartJob(genRes.data.jobId);
    } catch (err) {
      showToast(err.response?.data?.error || err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const presentationId = activeJobResult?.presentationId;

  return (
    <div>
      <div className="card-header-title">
        <Sparkles size={22} color="var(--accent)" />
        <span>Generate Presentations with Gemini AI</span>
      </div>

      <form onSubmit={handleGenerateFullFlow}>
        {/* Input Mode Selector & AI Box */}
        <div style={{ background: 'var(--accent-light)', padding: '1.35rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-border)', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.1rem' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6d28d9', fontSize: '1rem', fontWeight: 600, margin: 0 }}>
              <Sparkles size={20} />
              <span>Gemini AI Question Generator</span>
            </h4>

            {/* Sub-tabs for Paste vs Topic Prompt */}
            <div style={{ display: 'flex', gap: '0.35rem', background: '#ffffff', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-border)' }}>
              <button
                type="button"
                className="btn"
                onClick={() => setInputMode('paste')}
                style={{
                  padding: '0.35rem 0.85rem',
                  fontSize: '0.82rem',
                  borderRadius: 'var(--radius-sm)',
                  height: 'auto',
                  minHeight: '32px',
                  background: inputMode === 'paste' ? 'var(--accent)' : 'transparent',
                  color: inputMode === 'paste' ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                }}
              >
                <AlignLeft size={14} />
                <span>Paste Text / TSV</span>
              </button>

              <button
                type="button"
                className="btn"
                onClick={() => setInputMode('topic')}
                style={{
                  padding: '0.35rem 0.85rem',
                  fontSize: '0.82rem',
                  borderRadius: 'var(--radius-sm)',
                  height: 'auto',
                  minHeight: '32px',
                  background: inputMode === 'topic' ? 'var(--accent)' : 'transparent',
                  color: inputMode === 'topic' ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                }}
              >
                <Sparkles size={14} />
                <span>AI Topic Prompt</span>
              </button>
            </div>
          </div>

          {inputMode === 'paste' ? (
            <div className="form-group">
              <label htmlFor="raw-text-input">
                <AlignLeft size={16} />
                <span>Paste Raw Questions & Options Text *</span>
              </label>
              <textarea
                id="raw-text-input"
                className="form-control"
                value={rawText}
                onChange={(e) => {
                  setRawText(e.target.value);
                  setQuestions(null);
                }}
                placeholder={`number\tquestion\toptionA\toptionB\toptionC\toptionD\n1\tWhat is the capital of France?\tParis\tLondon\tBerlin\tMadrid`}
                style={{ minHeight: '140px', fontSize: '0.85rem' }}
              />
              <div className="help-text">
                Paste tabular data or plain text. AI will parse questions into slide objects.
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="gemini-topic">
                  <Type size={15} />
                  <span>Quiz Topic / Subject *</span>
                </label>
                <input
                  type="text"
                  id="gemini-topic"
                  className="form-control"
                  value={topic}
                  onChange={(e) => {
                    setTopic(e.target.value);
                    setQuestions(null);
                  }}
                  placeholder="e.g. World History, Python..."
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="gemini-count">
                  <Hash size={15} />
                  <span>Questions Count</span>
                </label>
                <select
                  id="gemini-count"
                  className="form-control"
                  value={count}
                  onChange={(e) => {
                    setCount(e.target.value);
                    setQuestions(null);
                  }}
                >
                  <option value={5}>5 Questions</option>
                  <option value={10}>10 Questions</option>
                  <option value={15}>15 Questions</option>
                  <option value={20}>20 Questions</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="gemini-diff">
                  <BarChart size={15} />
                  <span>Difficulty Level</span>
                </label>
                <select
                  id="gemini-diff"
                  className="form-control"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label htmlFor="gemini-key">
              <Key size={15} />
              <span>Gemini API Key (Optional if set in server .env)</span>
            </label>
            <input
              type="password"
              id="gemini-key"
              className="form-control"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy... (leave blank to use server environment key)"
            />
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleParseOrGenerate}
            disabled={isProcessing}
            style={{ width: '100%', borderColor: 'var(--accent)', color: '#6d28d9', background: '#ffffff' }}
          >
            {isProcessing ? <div className="spinner" /> : <Sparkles size={16} />}
            <span>✨ Parse & Preview Questions Only</span>
          </button>
        </div>

        {/* Question Preview Table */}
        {questions && questions.length > 0 && (
          <div style={{ marginBottom: '1.5rem', background: '#ffffff', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-card-border)', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)' }}>
            <h5 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#047857', fontSize: '0.95rem', fontWeight: 600 }}>
              <HelpCircle size={16} />
              <span>AI Mapped Placeholders ({questions.length} Slides)</span>
            </h5>

            <div style={{ overflowX: 'auto', maxHeight: '250px' }}>
              <table className="preview-table">
                <thead>
                  <tr>
                    <th># ({'{{number}}'})</th>
                    <th>Question ({'{{question}}'})</th>
                    <th>Option A ({'{{optionA}}'})</th>
                    <th>Option B ({'{{optionB}}'})</th>
                    <th>Option C ({'{{optionC}}'})</th>
                    <th>Option D ({'{{optionD}}'})</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((q, idx) => (
                    <tr key={idx}>
                      <td><strong>{q.number}</strong></td>
                      <td>{q.question}</td>
                      <td>{q.optionA}</td>
                      <td>{q.optionB}</td>
                      <td>{q.optionC}</td>
                      <td>{q.optionD}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Editable JSON Area */}
        {jsonText && (
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Code size={16} />
              <span>Parsed JSON Data Array (Auto-Mapped to Slide Placeholders)</span>
            </label>
            <textarea
              className="form-control"
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                try {
                  setQuestions(JSON.parse(e.target.value));
                } catch (err) {}
              }}
              style={{ minHeight: '130px' }}
            />
          </div>
        )}

        {/* Slide Setup Inputs */}
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
          <div className="help-text">
            Slide template containing placeholders: <code>{'{{number}}'}</code>, <code>{'{{question}}'}</code>, <code>{'{{optionA}}'}</code>, <code>{'{{optionB}}'}</code>, <code>{'{{optionC}}'}</code>, <code>{'{{optionD}}'}</code>
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
              placeholder="e.g. Gemini Quiz Presentation"
              required
            />
          </div>
        </div>

        <div className="btn-group">
          <button type="submit" className="btn btn-primary" disabled={isProcessing}>
            {isProcessing ? <div className="spinner" style={{ borderColor: 'rgba(255, 255, 255, 0.3)', borderTopColor: '#fff' }} /> : <Rocket size={16} />}
            <span>Generate AI Presentation Slides</span>
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

      {/* Credit Confirm Modal */}
      {estimateData && (
        <ConfirmCreditModal
          estimate={estimateData}
          onConfirm={handleConfirmGeneration}
          onCancel={() => setEstimateData(null)}
          onBuyCredits={openBuyModal}
        />
      )}
    </div>
  );
}
