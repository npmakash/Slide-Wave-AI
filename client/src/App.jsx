import React, { useState } from 'react';
import { Table, Code, Sparkles } from 'lucide-react';
import Navbar from './components/Navbar';
import AuthBanner from './components/AuthBanner';
import SheetTab from './components/SheetTab';
import JsonTab from './components/JsonTab';
import GeminiTab from './components/GeminiTab';
import ProgressCard from './components/ProgressCard';
import PreviewModal from './components/PreviewModal';
import HistoryModal from './components/HistoryModal';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { authenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('sheet'); // sheet | json | gemini
  const [activeJobId, setActiveJobId] = useState(null);
  const [activeJobResult, setActiveJobResult] = useState(null);

  // Modals state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [previewData, setPreviewData] = useState(null); // { templateUrl, sheetUrl }

  const handleStartJob = (jobId) => {
    setActiveJobId(jobId);
    setActiveJobResult(null);
  };

  const handleJobCompleted = (resultData) => {
    setActiveJobResult(resultData);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
        <div className="spinner" style={{ width: '32px', height: '32px' }} />
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Navbar onOpenHistory={() => setShowHistoryModal(true)} />

      <main className="container">
        {!authenticated ? (
          <AuthBanner />
        ) : (
          <div>
            <div className="glass-card">
              <div className="tabs-header">
                <button
                  className={`tab-btn ${activeTab === 'sheet' ? 'active' : ''}`}
                  onClick={() => setActiveTab('sheet')}
                >
                  <Table size={18} />
                  <span>Generate from Google Sheets</span>
                </button>

                <button
                  className={`tab-btn ${activeTab === 'json' ? 'active' : ''}`}
                  onClick={() => setActiveTab('json')}
                >
                  <Code size={18} />
                  <span>Generate from JSON</span>
                </button>

                <button
                  className={`tab-btn ${activeTab === 'gemini' ? 'active' : ''}`}
                  onClick={() => setActiveTab('gemini')}
                >
                  <Sparkles size={18} />
                  <span>Generate from Gemini</span>
                </button>
              </div>

              {activeTab === 'sheet' && (
                <SheetTab
                  onStartJob={handleStartJob}
                  onOpenPreview={(templateUrl, sheetUrl) => setPreviewData({ templateUrl, sheetUrl })}
                  activeJobResult={activeJobResult}
                />
              )}

              {activeTab === 'json' && (
                <JsonTab
                  onStartJob={handleStartJob}
                  activeJobResult={activeJobResult}
                />
              )}

              {activeTab === 'gemini' && (
                <GeminiTab
                  onStartJob={handleStartJob}
                  activeJobResult={activeJobResult}
                />
              )}
            </div>

            {activeJobId && (
              <ProgressCard
                jobId={activeJobId}
                onJobCompleted={handleJobCompleted}
              />
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      {previewData && (
        <PreviewModal
          templateUrl={previewData.templateUrl}
          onClose={() => setPreviewData(null)}
        />
      )}

      {showHistoryModal && (
        <HistoryModal onClose={() => setShowHistoryModal(false)} />
      )}
    </div>
  );
}
