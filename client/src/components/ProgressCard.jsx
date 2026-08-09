import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink, FileText, Image as ImageIcon, FileCode, XCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useCredits } from '../context/CreditContext';

// Global set across re-renders to ensure a job ID is notified exactly once
const globalNotifiedJobs = new Set();

export default function ProgressCard({ jobId, onJobCompleted }) {
  const [jobStatus, setJobStatus] = useState('pending'); // pending | running | done | error | cancelled
  const [progress, setProgress] = useState({ current: 0, total: 0, message: 'Initializing job...' });
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const { showToast } = useToast();
  const { fetchCredits } = useCredits();
  const pollTimerRef = useRef(null);

  useEffect(() => {
    if (!jobId) return;

    // Refresh credits balance when job attaches
    fetchCredits();

    const checkStatus = async () => {
      try {
        const res = await api.get(`/api/status/${jobId}`);
        const { status, progress: prog, result: resData, error } = res.data;

        setJobStatus(status);
        if (prog) setProgress(prog);

        if (['done', 'error', 'cancelled'].includes(status)) {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);

          // Guarantee single notification execution per jobId
          if (!globalNotifiedJobs.has(jobId)) {
            globalNotifiedJobs.add(jobId);

            // Instant credit balance refresh
            fetchCredits();

            if (status === 'done') {
              setResult(resData);
              showToast('Slides Generated Successfully!', 'success');
              if (onJobCompleted) onJobCompleted(resData);
            } else if (status === 'error') {
              setErrorMsg(error || 'Generation failed');
              showToast(error || 'Generation failed', 'error');
            } else if (status === 'cancelled') {
              showToast('Job was cancelled', 'warning');
            }
          }
        }
      } catch (err) {
        console.error('Polling status error:', err);
      }
    };

    checkStatus();
    pollTimerRef.current = setInterval(checkStatus, 1500);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [jobId]);

  const handleCancel = async () => {
    try {
      await api.post(`/api/cancel/${jobId}`);
      showToast('Cancellation requested...', 'info');
    } catch (err) {
      showToast(err.response?.data?.error || err.message, 'error');
    }
  };

  const handleDownloadLogs = () => {
    window.location.href = `/api/logs/${jobId}`;
  };

  const pct = progress.total > 0 ? Math.min(Math.round((progress.current / progress.total) * 100), 98) : 5;
  const barWidth = jobStatus === 'done' ? '100%' : `${pct}%`;

  return (
    <div className="glass-card progress-card">
      <div className="progress-header">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {jobStatus === 'done' ? (
            <>
              <CheckCircle2 size={20} color="var(--success)" />
              <span>Generation Complete!</span>
            </>
          ) : jobStatus === 'error' ? (
            <>
              <AlertCircle size={20} color="var(--danger)" />
              <span>Generation Failed</span>
            </>
          ) : jobStatus === 'cancelled' ? (
            <>
              <XCircle size={20} color="var(--warning)" />
              <span>Generation Cancelled</span>
            </>
          ) : (
            <>
              <div className="spinner" style={{ width: '18px', height: '18px' }} />
              <span>Generating Slides... ({pct}%)</span>
            </>
          )}
        </h3>

        {['pending', 'running'].includes(jobStatus) && (
          <button className="btn btn-danger" onClick={handleCancel} style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', minHeight: '34px' }}>
            <XCircle size={14} />
            <span>Cancel Job</span>
          </button>
        )}
      </div>

      <div className="progress-bar-bg">
        <div
          className="progress-bar-fill"
          style={{
            width: barWidth,
            backgroundColor: jobStatus === 'error' ? 'var(--danger)' : jobStatus === 'cancelled' ? 'var(--warning)' : undefined,
          }}
        />
      </div>

      <div className="progress-status">{progress.message || errorMsg}</div>

      {jobStatus === 'done' && result && (
        <div className="btn-group" style={{ marginTop: '1.25rem' }}>
          {result.presentationUrl && (
            <a href={result.presentationUrl} target="_blank" rel="noreferrer" className="btn btn-primary">
              <ExternalLink size={16} />
              <span>Open Generated Slides</span>
            </a>
          )}

          <button
            className="btn btn-secondary"
            onClick={() => (window.location.href = `/api/download/pdf/${result.presentationId}`)}
          >
            <FileText size={16} />
            <span>Download PDF</span>
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => (window.location.href = `/api/download/images/${result.presentationId}`)}
          >
            <ImageIcon size={16} />
            <span>Download PNG Images (ZIP)</span>
          </button>

          <button className="btn btn-secondary" onClick={handleDownloadLogs}>
            <FileCode size={16} />
            <span>Download Log</span>
          </button>
        </div>
      )}
    </div>
  );
}
