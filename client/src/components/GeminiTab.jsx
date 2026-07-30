import React, { useState } from 'react';
import { Sparkles, Rocket, FileText, Image as ImageIcon, Key, HelpCircle, Code, AlignLeft } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

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

  const { showToast } = useToast();

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

      // If questions haven't been parsed yet, parse/generate them now
      if (!dataToUse || dataToUse.length === 0) {
        dataToUse = await handleParseOrGenerate();
      }

      if (!dataToUse || !Array.isArray(dataToUse) || dataToUse.length === 0) {
        return;
      }

      showToast('Slide presentation generation started!', 'info');
      const genRes = await api.post('/api/generate-json', {
        templateUrl,
        outputName,
        data: dataToUse,
      });

      showToast('Gemini Slide Generation started!', 'success');
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
      <form onSubmit={handleGenerateFullFlow}>
        {/* Input Mode Selector & AI Box */}
        <div style={{ background: 'rgba(139, 92, 246, 0.08)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(139, 92, 246, 0.25)', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#a78bfa' }}>
              <Sparkles size={20} />
              <span>Gemini AI Question Generator</span>
            </h4>

            {/* Sub-tabs for Paste vs Topic Prompt */}
            <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(15, 23, 42, 0.6)', padding: '0.25rem', borderRadius: 'var(--radius-sm)' }}>
              <button
                type="button"
                className={`tab-btn ${inputMode === 'paste' ? 'active' : ''}`}
                onClick={() => setInputMode('paste')}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              >
                <AlignLeft size={14} />
                <span>Paste Text / TSV</span>
              </button>
              <button
                type="button"
                className={`tab-btn ${inputMode === 'topic' ? 'active' : ''}`}
                onClick={() => setInputMode('topic')}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              >
                <Sparkles size={14} />
                <span>AI Topic Prompt</span>
              </button>
            </div>
          </div>

          {inputMode === 'paste' ? (
            <div className="form-group">
              <label htmlFor="raw-text-input">Paste Raw Questions & Options Text *</label>
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
                Paste tabular data (number, question, optionA, optionB, optionC, optionD) or informal text. AI will parse it automatically into slides JSON.
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="gemini-topic">Quiz Topic / Subject *</label>
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
                <label htmlFor="gemini-count">Questions Count</label>
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
                <label htmlFor="gemini-diff">Difficulty Level</label>
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
            <label htmlFor="gemini-key" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Key size={14} />
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
            style={{ width: '100%', border: '1px solid #8b5cf6', color: '#c4b5fd' }}
          >
            {isProcessing ? <div className="spinner" /> : <Sparkles size={16} />}
            <span>✨ Parse & Preview Questions Only</span>
          </button>
        </div>

        {/* Question Preview Table */}
        {questions && questions.length > 0 && (
          <div style={{ marginBottom: '1.5rem', background: 'rgba(15, 23, 42, 0.5)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-card-border)' }}>
            <h5 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#10b981' }}>
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
          <label htmlFor="gemini-template-url">Template Slide URL *</label>
          <input
            type="url"
            id="gemini-template-url"
            className="form-control"
            value={templateUrl}
            onChange={(e) => setTemplateUrl(e.target.value)}
            placeholder="https://docs.google.com/presentation/d/1abc.../edit"
            required
          />
          <div className="help-text">
            Slide template containing placeholders: <code>{'{{number}}'}</code>, <code>{'{{question}}'}</code>, <code>{'{{optionA}}'}</code>, <code>{'{{optionB}}'}</code>, <code>{'{{optionC}}'}</code>, <code>{'{{optionD}}'}</code>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="gemini-output-name">Output Presentation Name *</label>
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

        <div className="btn-group">
          <button type="submit" className="btn btn-primary" disabled={isProcessing}>
            {isProcessing ? <div className="spinner" /> : <Rocket size={16} />}
            <span>🚀 Generate AI Presentation Slides</span>
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
    </div>
  );
}
