import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import AuthBanner from './components/AuthBanner';
import SheetTab from './components/SheetTab';
import JsonTab from './components/JsonTab';
import GeminiTab from './components/GeminiTab';
import MultiItemBetaTab from './components/MultiItemBetaTab';
import TemplateGallery from './components/TemplateGallery';
import AdminDashboard from './components/AdminDashboard';
import AdminTemplateManager from './components/AdminTemplateManager';
import ProgressCard from './components/ProgressCard';
import PreviewModal from './components/PreviewModal';
import HistoryModal from './components/HistoryModal';
import BuyCreditsModal from './components/BuyCreditsModal';
import UserAccountModal from './components/UserAccountModal';
import SupportModal from './components/SupportModal';
import TemplatePickerModal from './components/TemplatePickerModal';
import PrivacyPolicyPage from './components/pages/PrivacyPolicyPage';
import TermsOfServicePage from './components/pages/TermsOfServicePage';
import AboutPage from './components/pages/AboutPage';
import Footer from './components/Footer';
import { useAuth } from './context/AuthContext';
import { useCredits } from './context/CreditContext';

const DEFAULT_TEMPLATE_CHOICE = {
  id: 'tpl_default_cert',
  title: 'Modern Certificate Template',
  templateUrl: 'https://docs.google.com/presentation/d/1ecwiq4ZlzlQv8kapXBWEXViSXxhDIPnsgmT7F4-EpPo/edit?slide=id.g3f804837050_2_45#slide=id.g3f804837050_2_45',
  tag: 'Certificate',
  isPersonal: false,
};

export default function App() {
  const { authenticated, user, loading } = useAuth();
  const { isBuyModalOpen, openBuyModal, closeBuyModal, fetchCredits } = useCredits();

  const isAdmin = Boolean(user && user.isAdmin);

  // Determine initial tab based on URL path
  const getTabFromPath = () => {
    const path = window.location.pathname.toLowerCase();
    if (path === '/privacy') return 'privacy';
    if (path === '/terms') return 'terms';
    if (path === '/about') return 'about';
    return isAdmin ? 'admin-users' : 'sheet';
  };

  const [activeTab, setActiveTab] = useState(getTabFromPath());
  const [selectedTemplate, setSelectedTemplate] = useState(() => {
    try {
      const stored = localStorage.getItem('slidewave_chosen_template');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to load saved template selection', e);
    }
    return DEFAULT_TEMPLATE_CHOICE;
  });

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [tabJobs, setTabJobs] = useState({
    sheet: { jobId: null, result: null },
    json: { jobId: null, result: null },
    gemini: { jobId: null, result: null },
    'multi-item-beta': { jobId: null, result: null },
  });

  // Modals state
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showTemplatePickerModal, setShowTemplatePickerModal] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  // Sync state with browser URL navigation
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      if (path === '/privacy') setActiveTab('privacy');
      else if (path === '/terms') setActiveTab('terms');
      else if (path === '/about') setActiveTab('about');
      else setActiveTab(isAdmin ? 'admin-users' : 'sheet');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin && !['admin-users', 'admin-templates', 'history', 'privacy', 'terms', 'about'].includes(activeTab)) {
      setActiveTab('admin-users');
    }
  }, [isAdmin]);

  const handleNavigatePage = (path) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    if (path === '/privacy') setActiveTab('privacy');
    else if (path === '/terms') setActiveTab('terms');
    else if (path === '/about') setActiveTab('about');
    else {
      window.history.pushState({}, '', '/');
      setActiveTab(isAdmin ? 'admin-users' : 'sheet');
    }
  };

  const handleSelectTemplate = (template) => {
    const updatedChoice = {
      id: template.id || `tpl_${Date.now()}`,
      title: template.title || 'Selected Presentation Template',
      templateUrl: template.templateUrl,
      tag: template.tag || 'General',
      isPersonal: Boolean(template.isPersonal),
    };

    setSelectedTemplate(updatedChoice);
    try {
      localStorage.setItem('slidewave_chosen_template', JSON.stringify(updatedChoice));
    } catch (e) {
      console.error('Failed to persist template selection choice', e);
    }
  };

  const handleSelectTemplateFromGallery = (templateUrl, title = 'Gallery Template') => {
    handleSelectTemplate({
      id: `tpl_gallery_${Date.now()}`,
      title,
      templateUrl,
      tag: 'Gallery',
      isPersonal: false,
    });
    handleNavigatePage('/');
    setActiveTab('sheet');
  };

  const handleStartJob = (jobId, targetTab = activeTab) => {
    setTabJobs((prev) => ({
      ...prev,
      [targetTab]: { jobId, result: null },
    }));
  };

  const handleJobCompleted = (targetTab, resultData) => {
    setTabJobs((prev) => ({
      ...prev,
      [targetTab]: { jobId: null, result: resultData },
    }));
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-body)' }}>
        <div className="spinner" style={{ width: '36px', height: '36px' }} />
      </div>
    );
  }

  const isPublicPage = ['privacy', 'terms', 'about'].includes(activeTab);

  return (
    <div className="app-layout">
      {/* Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (['privacy', 'terms', 'about'].includes(tab)) {
            handleNavigatePage(`/${tab}`);
          } else {
            if (['/privacy', '/terms', '/about'].includes(window.location.pathname)) {
              window.history.pushState({}, '', '/');
            }
            setActiveTab(tab);
          }
        }}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        onOpenAccount={() => setShowAccountModal(true)}
        onNavigatePage={handleNavigatePage}
        onOpenSupport={() => setShowSupportModal(true)}
      />

      <div className="main-wrapper">
        {/* Header Navbar */}
        <Navbar
          activeTab={activeTab}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          onOpenBuyCredits={openBuyModal}
          onOpenAccount={() => setShowAccountModal(true)}
          onOpenSupport={() => setShowSupportModal(true)}
        />

        <main className="container">
          {/* Render Public Pages Regardless of Auth State */}
          {activeTab === 'privacy' && (
            <PrivacyPolicyPage
              onGoHome={() => handleNavigatePage('/')}
              onOpenSupport={() => setShowSupportModal(true)}
            />
          )}

          {activeTab === 'terms' && (
            <TermsOfServicePage
              onGoHome={() => handleNavigatePage('/')}
              onOpenSupport={() => setShowSupportModal(true)}
            />
          )}

          {activeTab === 'about' && (
            <AboutPage
              onGoHome={() => handleNavigatePage('/')}
              onOpenSupport={() => setShowSupportModal(true)}
            />
          )}

          {/* Render Application Generator Tabs */}
          {!isPublicPage && (
            !authenticated ? (
              <AuthBanner
                onNavigatePage={handleNavigatePage}
                onOpenSupport={() => setShowSupportModal(true)}
              />
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
                          onStartJob={(jobId) => handleStartJob(jobId, 'sheet')}
                          onOpenPreview={(templateUrl, sheetUrl) => setPreviewData({ templateUrl, sheetUrl })}
                          activeJobResult={tabJobs.sheet?.result}
                          selectedTemplateUrl={selectedTemplate.templateUrl}
                          selectedTemplate={selectedTemplate}
                          onOpenTemplatePicker={() => setShowTemplatePickerModal(true)}
                        />
                      )}

                      {activeTab === 'json' && (
                        <JsonTab
                          onStartJob={(jobId) => handleStartJob(jobId, 'json')}
                          activeJobResult={tabJobs.json?.result}
                          selectedTemplateUrl={selectedTemplate.templateUrl}
                          selectedTemplate={selectedTemplate}
                          onOpenTemplatePicker={() => setShowTemplatePickerModal(true)}
                        />
                      )}

                      {activeTab === 'gemini' && (
                        <GeminiTab
                          onStartJob={(jobId) => handleStartJob(jobId, 'gemini')}
                          activeJobResult={tabJobs.gemini?.result}
                          selectedTemplateUrl={selectedTemplate.templateUrl}
                          selectedTemplate={selectedTemplate}
                          onOpenTemplatePicker={() => setShowTemplatePickerModal(true)}
                        />
                      )}

                      {activeTab === 'multi-item-beta' && (
                        <MultiItemBetaTab
                          onStartJob={(jobId) => handleStartJob(jobId, 'multi-item-beta')}
                          activeJobResult={tabJobs['multi-item-beta']?.result}
                          selectedTemplateUrl={selectedTemplate.templateUrl}
                          selectedTemplate={selectedTemplate}
                          onOpenTemplatePicker={() => setShowTemplatePickerModal(true)}
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

                {!isAdmin && tabJobs[activeTab]?.jobId && (
                  <ProgressCard
                    jobId={tabJobs[activeTab].jobId}
                    onJobCompleted={(resultData) => handleJobCompleted(activeTab, resultData)}
                  />
                )}
              </div>
            )
          )}
        </main>

        {/* Responsive Footer */}
        <Footer
          onNavigatePage={handleNavigatePage}
          onOpenSupport={() => setShowSupportModal(true)}
        />
      </div>

      {/* Mobile Bottom Icon Navigation Bar */}
      {authenticated && !isPublicPage && (
        <BottomNav
          activeTab={activeTab}
          setActiveTab={(tab) => {
            if (['privacy', 'terms', 'about'].includes(tab)) {
              handleNavigatePage(`/${tab}`);
            } else {
              if (['/privacy', '/terms', '/about'].includes(window.location.pathname)) {
                window.history.pushState({}, '', '/');
              }
              setActiveTab(tab);
            }
          }}
          onOpenAccount={() => setShowAccountModal(true)}
        />
      )}

      {/* Modals */}
      {showTemplatePickerModal && (
        <TemplatePickerModal
          currentSelectedUrl={selectedTemplate.templateUrl}
          onSelectTemplate={handleSelectTemplate}
          onClose={() => setShowTemplatePickerModal(false)}
        />
      )}

      {showSupportModal && (
        <SupportModal onClose={() => setShowSupportModal(false)} />
      )}

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
