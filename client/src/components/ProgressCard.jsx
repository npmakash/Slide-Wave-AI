import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink, FileText, Image as ImageIcon, FileCode, XCircle } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

export default function ProgressCard({ jobId, onJobCompleted }) {
  const [jobStatus, setJobStatus] = useState('pending'); // pending | running | done | error | cancelled
  const [progress, setProgress] = useState({ current: 0, total: 0, message: 'Initializing job...' });
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const { showToast } = useToast();
  const pollTimerRef = useRef(null);
  const hasNotifiedRef = useRef(false);

  useEffect(() => {
    if (!jobId) return;
    hasNotifiedRef.current = false;

    const checkStatus = async () => {
      try {
        const res = await api.get(`/api/status/${jobId}`);
        const { status, progress: prog, result: resData, error } = res.data;

        setJobStatus(status);
        if (prog) setProgress(prog);

        if (status === 'done') {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setResult(resData);
          if (!hasNotifiedRef.current) {
            hasNotifiedRef.current = true;
            showToast('Presentation generated successfully!', 'success');
          }
          if (onJobCompleted) onJobCompleted(resData);
        } else if (status === 'error') {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setErrorMsg(error || 'Generation failed');
          if (!hasNotifiedRef.current) {
            hasNotifiedRef.current = true;
            showToast(error || 'Generation failed', 'error');
          }
        } else if (status === 'cancelled') {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          if (!hasNotifiedRef.current) {
            hasNotifiedRef.current = true;
            showToast('Job was cancelled', 'warning');
          }
        }
      } catch (err) {
        console.error('Polling status error:', err);
      }
    };

    // Initial check and set interval
    checkStatus();
    pollTimerRef.current = setInterval(checkStatus, 1500);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [jobId, showToast, onJobCompleted]);

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
        <h3>
          {jobStatus === 'done'
            ? '✨ Generation Complete!'
            : jobStatus === 'error'
            ? '❌ Generation Failed'
            : jobStatus === 'cancelled'
            ? '⚠️ Generation Cancelled'
            : 'Generating Slides...'}
        </h3>

        {['pending', 'running'].includes(jobStatus) && (
          <button className="btn btn-danger" onClick={handleCancel} style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
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
            backgroundColor: jobStatus === 'error' ? '#ef4444' : jobStatus === 'cancelled' ? '#f59e0b' : undefined,
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
