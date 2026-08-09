import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import AuthBanner from './components/AuthBanner';
import SheetTab from './components/SheetTab';
import JsonTab from './components/JsonTab';
import GeminiTab from './components/GeminiTab';
import TemplateGallery from './components/TemplateGallery';
import AdminDashboard from './components/AdminDashboard';
import AdminTemplateManager from './components/AdminTemplateManager';
import ProgressCard from './components/ProgressCard';
import PreviewModal from './components/PreviewModal';
import HistoryModal from './components/HistoryModal';
import BuyCreditsModal from './components/BuyCreditsModal';
import UserAccountModal from './components/UserAccountModal';
import { useAuth } from './context/AuthContext';
import { useCredits } from './context/CreditContext';

export default function App() {
  const { authenticated, user, loading } = useAuth();
  const { isBuyModalOpen, openBuyModal, closeBuyModal, fetchCredits } = useCredits();

  const isAdmin = Boolean(user && user.isAdmin);

  const [activeTab, setActiveTab] = useState(isAdmin ? 'admin-users' : 'sheet');
  const [selectedTemplateUrl, setSelectedTemplateUrl] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [activeJobId, setActiveJobId] = useState(null);
  const [activeJobResult, setActiveJobResult] = useState(null);

  // Modals state
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [previewData, setPreviewData] = useState(null); // { templateUrl, sheetUrl }

  useEffect(() => {
    if (isAdmin && !['admin-users', 'admin-templates', 'history'].includes(activeTab)) {
      setActiveTab('admin-users');
    }
  }, [isAdmin]);

  const handleStartJob = (jobId) => {
    setActiveJobId(jobId);
    setActiveJobResult(null);
  };

  const handleJobCompleted = (resultData) => {
    setActiveJobResult(resultData);
  };

  const handleSelectTemplateFromGallery = (templateUrl) => {
    setSelectedTemplateUrl(templateUrl);
    setActiveTab('sheet'); // Switch to Google Sheets generator tab with pre-filled URL
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-body)' }}>
        <div className="spinner" style={{ width: '36px', height: '36px' }} />
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        onOpenAccount={() => setShowAccountModal(true)}
      />

      <div className="main-wrapper">
        {/* Header Navbar with Credits Pill */}
        <Navbar
          activeTab={activeTab}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          onOpenBuyCredits={openBuyModal}
          onOpenAccount={() => setShowAccountModal(true)}
        />

        <main className="container">
          {!authenticated ? (
            <AuthBanner />
          ) : (
            <div>
              <div className="glass-card">
                {isAdmin ? (
                  <>
                    {activeTab === 'admin-users' && (
                      <AdminDashboard onRefreshCredits={fetchCredits} />
                    )}
                    {activeTab === 'admin-templates' && (
                      <AdminTemplateManager />
                    )}
                    {activeTab === 'history' && (
                      <HistoryModal onClose={() => setActiveTab('admin-users')} isEmbedded={true} />
                    )}
                  </>
                ) : (
                  <>
                    {activeTab === 'sheet' && (
                      <SheetTab
                        onStartJob={handleStartJob}
                        onOpenPreview={(templateUrl, sheetUrl) => setPreviewData({ templateUrl, sheetUrl })}
                        activeJobResult={activeJobResult}
                        selectedTemplateUrl={selectedTemplateUrl}
                      />
                    )}

                    {activeTab === 'json' && (
                      <JsonTab
                        onStartJob={handleStartJob}
                        activeJobResult={activeJobResult}
                        selectedTemplateUrl={selectedTemplateUrl}
                      />
                    )}

                    {activeTab === 'gemini' && (
                      <GeminiTab
                        onStartJob={handleStartJob}
                        activeJobResult={activeJobResult}
                        selectedTemplateUrl={selectedTemplateUrl}
                      />
                    )}

                    {activeTab === 'templates' && (
                      <TemplateGallery
                        onSelectTemplate={handleSelectTemplateFromGallery}
                      />
                    )}

                    {activeTab === 'history' && (
                      <HistoryModal onClose={() => setActiveTab('sheet')} isEmbedded={true} />
                    )}
                  </>
                )}
              </div>

              {!isAdmin && activeJobId && (
                <ProgressCard
                  jobId={activeJobId}
                  onJobCompleted={handleJobCompleted}
                />
              )}
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      {previewData && (
        <PreviewModal
          templateUrl={previewData.templateUrl}
          onClose={() => setPreviewData(null)}
        />
      )}

      {isBuyModalOpen && (
        <BuyCreditsModal onClose={closeBuyModal} />
      )}

      {showAccountModal && (
        <UserAccountModal
          onClose={() => setShowAccountModal(false)}
          onOpenBuyCredits={openBuyModal}
        />
      )}
    </div>
  );
}
