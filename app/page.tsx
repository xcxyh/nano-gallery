'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Zap, Image as ImageIcon, LogOut, LayoutGrid, Coins, Lock, Search, ShieldCheck } from 'lucide-react';
import { Template, User } from '@/types';
import TemplateCard from '@/components/TemplateCard';
import GeneratorModal from '@/components/GeneratorModal';
import LoginModal from '@/components/LoginModal';
import { 
  getSessionAction, 
  logoutAction, 
  getTemplatesAction, 
  saveTemplateAction, 
  getMyTemplatesAction, 
  getPendingTemplatesAction, 
  updateTemplateStatusAction 
} from '@/app/actions';

type TabData = {
  items: Template[];
  page: number;
  hasMore: boolean;
  lastSearch: string;
  initialized: boolean;
};

const initialTabData: TabData = {
  items: [],
  page: 1,
  hasMore: true,
  lastSearch: '',
  initialized: false
};

export default function Home() {
  // Tabs Cache State
  const [tabsData, setTabsData] = useState<Record<string, TabData>>({
    gallery: { ...initialTabData },
    library: { ...initialTabData },
    review: { ...initialTabData },
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  
  // Auth & View State
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'gallery' | 'library' | 'review'>('gallery');
  const [columns, setColumns] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [pendingCount, setPendingCount] = useState(0);

  // Derived state for current view
  const currentTabState = tabsData[activeTab];
  const templates = currentTabState.items;
  const hasMore = currentTabState.hasMore;
  // Show loading if we are fetching AND (it's the first load OR search changed)
  // If we are just loading more, we show the button spinner, not the main loader
  const isFirstLoad = !currentTabState.initialized || currentTabState.lastSearch !== debouncedSearchQuery;
  const showMainLoading = isFetching && isFirstLoad;

  // Handle Resize for Masonry Layout
  useEffect(() => {
    const updateColumns = () => {
      if (window.innerWidth >= 1280) setColumns(4); // xl
      else if (window.innerWidth >= 1024) setColumns(3); // lg
      else if (window.innerWidth >= 768) setColumns(2); // md
      else setColumns(1);
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  // Load Session
  useEffect(() => {
    getSessionAction().then(sessionUser => {
      if (sessionUser) setUser(sessionUser);
    });
  }, []);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handleLoginSuccess = (newUser: User) => {
    setUser(newUser);
    // Force reload library
    loadTemplates(true, 'library');
    // If we are currently on library, this will trigger update
  };

  // Fetch pending count for admin (Initial only)
  useEffect(() => {
    if (user?.role === 'admin') {
      getPendingTemplatesAction().then(data => setPendingCount(data.length));
    }
  }, [user]); // Removed activeTab dependency to avoid refetching on tab switch

  const handleLogout = async () => {
    await logoutAction();
    setUser(null);
    setActiveTab('gallery');
    // Reset library cache
    setTabsData(prev => ({
        ...prev,
        library: { ...initialTabData },
        review: { ...initialTabData }
    }));
  };

  const loadTemplates = async (reset = false, tabOverride?: string) => {
      const targetTab = tabOverride || activeTab;
      const currentData = tabsData[targetTab];
      
      // Prevent multiple fetches if already fetching (basic lock)
      // Note: In a real app we might use AbortController
      if (isFetching && !reset) return; 

      setIsFetching(true);

      try {
          const currentPage = reset ? 1 : currentData.page + 1;
          const limit = 20;
          const searchToUse = debouncedSearchQuery; 

          let data: Template[] = [];
          if (targetTab === 'gallery') {
              data = await getTemplatesAction(currentPage, limit, searchToUse);
          } else if (targetTab === 'library') {
              data = await getMyTemplatesAction(currentPage, limit, searchToUse);
          } else if (targetTab === 'review') {
              data = await getPendingTemplatesAction(currentPage, limit, searchToUse);
          }
          
          // If we got fewer items than limit, no more items
          const newHasMore = data.length === limit; 

          setTabsData(prev => ({
              ...prev,
              [targetTab]: {
                  items: reset ? data : [...prev[targetTab].items, ...data],
                  page: currentPage,
                  hasMore: newHasMore,
                  lastSearch: searchToUse,
                  initialized: true
              }
          }));

      } catch (e) {
          console.error("Failed to load templates", e);
      } finally {
          setIsFetching(false);
      }
  };

  // Load templates on mount or tab change or search change
  useEffect(() => {
    const currentData = tabsData[activeTab];
    const searchChanged = currentData.lastSearch !== debouncedSearchQuery;
    
    // If not initialized OR search criteria changed, reload
    // Otherwise, use cache (do nothing)
    if (!currentData.initialized || searchChanged) {
        loadTemplates(true);
    }
  }, [activeTab, debouncedSearchQuery]);

  const handleOpenCreator = () => {
    setSelectedTemplate(null);
    setIsModalOpen(true);
  };

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setIsModalOpen(true);
  };

  const handleSaveTemplate = async (newTemplate: Template) => {
    try {
      await saveTemplateAction(newTemplate);
      // If user is admin, gallery might need update. 
      // If user is normal, library needs update.
      // Easiest is to invalidate caches.
      
      setTabsData(prev => ({
          ...prev,
          library: { ...prev.library, initialized: false }, // Mark dirty
          gallery: { ...prev.gallery, initialized: false }  // Mark dirty
      }));

      if (activeTab === 'library') {
          loadTemplates(true, 'library');
      } else if (activeTab === 'gallery') {
           // If admin, it appears in gallery
           if (user?.role === 'admin') {
               loadTemplates(true, 'gallery');
           } else {
               // Switch to library to see it
               setActiveTab('library');
           }
      }
    } catch (error) {
      console.error("Failed to save template:", error);
    }
  };

  const handleApprove = async (id: string) => {
    if (user?.role !== 'admin') return;
    try {
        await updateTemplateStatusAction(id, 'approved');
        // Update Review Cache: Remove item
        setTabsData(prev => ({
            ...prev,
            review: {
                ...prev.review,
                items: prev.review.items.filter(t => t.id !== id)
            },
            // Gallery Cache: Mark dirty so it reloads when visited
            gallery: { ...prev.gallery, initialized: false }
        }));
        setPendingCount(prev => Math.max(0, prev - 1));
    } catch (error) {
        console.error("Failed to approve:", error);
    }
  };

  const handleReject = async (id: string) => {
    if (user?.role !== 'admin') return;
    try {
        await updateTemplateStatusAction(id, 'rejected');
        // Update Review Cache: Remove item
        setTabsData(prev => ({
            ...prev,
            review: {
                ...prev.review,
                items: prev.review.items.filter(t => t.id !== id)
            }
        }));
        setPendingCount(prev => Math.max(0, prev - 1));
    } catch (error) {
        console.error("Failed to reject:", error);
    }
  };

  // Distribute templates into columns for horizontal masonry
  const getColumns = () => {
    const cols = Array.from({ length: columns }, () => [] as Template[]);
    templates.forEach((t, i) => {
      cols[i % columns].push(t);
    });
    return cols;
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-white/20">
      
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-[#050505]/80 backdrop-blur-md">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(250,204,21,0.3)]">
                <Zap className="text-black fill-current" size={20} />
             </div>
             <div>
                <h1 className="text-xl font-bold tracking-tight">Nano Banana <span className="text-yellow-400">Pro</span></h1>
                <p className="text-[10px] text-neutral-500 font-mono tracking-widest uppercase">Gemini 3 Pro Gallery</p>
             </div>
          </div>
          
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4 pl-4 border-l border-neutral-800">
                
                {/* Credits Indicator */}
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${user.credits === 0 && user.role !== 'admin' ? 'bg-red-900/20 border-red-800 text-red-400' : 'bg-neutral-800 border-neutral-700 text-yellow-400'}`}>
                    <Coins size={14} className={user.credits > 0 || user.role === 'admin' ? "fill-yellow-400" : ""} />
                    <span className="text-xs font-bold font-mono">
                        {user.role === 'admin' ? '∞' : user.credits}
                    </span>
                </div>

                <div className="hidden sm:flex flex-col items-end">
                   <span className="text-sm font-medium">{user.name}</span>
                   <span className="text-[10px] text-neutral-500 uppercase tracking-wider">{user.role === 'admin' ? 'Super User' : 'Creator'}</span>
                </div>
                <div className="relative group">
                   <button className="w-9 h-9 rounded-full bg-neutral-800 overflow-hidden border border-neutral-700">
                      <img src={user.avatar} alt="avatar" className="w-full h-full" />
                   </button>
                   <div className="absolute right-0 top-full mt-2 w-48 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform origin-top-right">
                      <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-neutral-800 first:rounded-t-xl last:rounded-b-xl flex items-center gap-2">
                        <LogOut size={14} /> Logout
                      </button>
                   </div>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setIsLoginOpen(true)}
                className="text-sm font-medium text-neutral-400 hover:text-white transition-colors"
              >
                Login
              </button>
            )}

            <button 
              onClick={handleOpenCreator}
              className="hidden sm:flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-full font-medium text-sm hover:bg-neutral-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:shadow-[0_0_25px_rgba(255,255,255,0.15)] transform active:scale-95"
            >
              <Plus size={18} />
              {user ? 'Create' : 'Try Demo'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        
        {/* Intro Section */}
        <div className="mb-12 text-center max-w-3xl mx-auto">
           <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
             Discover & Create with <span className="text-yellow-400">Nano Banana Pro</span>
           </h2>
           <p className="text-neutral-400 text-lg">
             Explore a curated collection of Gemini 3 Pro prompts and templates. 
             Generate stunning visuals, remix existing styles, and build your personal library.
           </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-12 relative">
           <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                 <Search className="text-neutral-500 group-focus-within:text-yellow-400 transition-colors" size={20} />
              </div>
              <input 
                type="text" 
                placeholder="Search templates by title or prompt..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-900/50 border border-neutral-800 text-white pl-12 pr-4 py-4 rounded-2xl focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/50 transition-all placeholder:text-neutral-600"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-4 flex items-center text-neutral-500 hover:text-white transition-colors"
                >
                  <span className="sr-only">Clear search</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              )}
           </div>
        </div>

        {/* Tabs / Navigation */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-6">
            <div className="flex bg-neutral-900/50 p-1 rounded-full border border-neutral-800 backdrop-blur-sm">
                <button 
                    onClick={() => setActiveTab('gallery')}
                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'gallery' ? 'bg-white text-black shadow-lg' : 'text-neutral-500 hover:text-white'}`}
                >
                    Gallery
                </button>
                <button 
                    onClick={() => user ? setActiveTab('library') : setIsLoginOpen(true)}
                    className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'library' ? 'bg-white text-black shadow-lg' : 'text-neutral-500 hover:text-white'}`}
                >
                    {activeTab !== 'library' && <Lock size={12} className="opacity-50" />}
                    My Library
                </button>
                {user?.role === 'admin' && (
                    <button 
                        onClick={() => setActiveTab('review')}
                        className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'review' ? 'bg-white text-black shadow-lg' : 'text-neutral-500 hover:text-white'}`}
                    >
                        {activeTab !== 'review' && <ShieldCheck size={12} className="opacity-50" />}
                        Review ({pendingCount})
                    </button>
                )}
            </div>

            <div className="flex items-center gap-2 text-sm text-neutral-400">
                <ImageIcon size={16} />
                <span>{showMainLoading ? 'Loading...' : `${templates.length} ${activeTab === 'gallery' ? 'Public' : activeTab === 'review' ? 'Pending' : 'Personal'} Styles`}</span>
            </div>
        </div>

        {/* Masonry Layout (Horizontal Priority) */}
        <div className="flex gap-6 items-start">
            {getColumns().map((col, colIndex) => (
                <div key={colIndex} className="flex-1 flex flex-col gap-6">
                    {col.map((template) => (
                        <TemplateCard 
                            key={template.id} 
                            template={template} 
                            onSelect={handleSelectTemplate}
                            onApprove={activeTab === 'review' ? handleApprove : undefined}
                            onReject={activeTab === 'review' ? handleReject : undefined}
                            showStatus={activeTab === 'library'}
                        />
                    ))}
                </div>
            ))}
        </div>

        {/* Load More Button */}
        {!showMainLoading && hasMore && templates.length > 0 && (
            <div className="flex justify-center mt-12 mb-8">
                <button
                    onClick={() => loadTemplates(false)}
                    disabled={isFetching}
                    className="px-8 py-3 bg-neutral-900 border border-neutral-800 rounded-full text-white font-medium hover:bg-neutral-800 hover:border-neutral-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isFetching ? (
                        <>
                            <div className="animate-spin w-4 h-4 border-2 border-white/50 border-t-white rounded-full"></div>
                            Loading...
                        </>
                    ) : (
                        'Load More'
                    )}
                </button>
            </div>
        )}

        {/* Loading State */}
        {showMainLoading && (
           <div className="text-center py-20">
              <div className="animate-spin w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-neutral-500">Loading gallery...</p>
           </div>
        )}

        {/* Empty State */}
        {!showMainLoading && templates.length === 0 && (
            <div className="text-center py-20 border border-dashed border-neutral-800 rounded-3xl bg-neutral-900/20 break-inside-avoid">
                <div className="w-16 h-16 bg-neutral-900 rounded-2xl flex items-center justify-center mx-auto mb-4 text-neutral-700">
                    <LayoutGrid size={32} />
                </div>
                <h3 className="text-lg font-medium text-neutral-300 mb-2">No templates found</h3>
                <p className="text-neutral-500 max-w-sm mx-auto mb-6">
                    {activeTab === 'library' 
                        ? "You haven't created any templates yet. Start creating to build your personal collection." 
                        : "The public gallery is empty."}
                </p>
                <button 
                  onClick={handleOpenCreator}
                  className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                   Create First Template
                </button>
            </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full py-6 text-center border-t border-white/5 bg-[#050505] text-neutral-500 text-sm">
        <p>Copyright © 2025, Created by XCC</p>
      </footer>

      <button 
            onClick={handleOpenCreator}
            className="sm:hidden fixed bottom-6 right-6 z-40 w-14 h-14 bg-yellow-400 text-black rounded-full flex items-center justify-center shadow-2xl"
      >
            <Plus size={24} />
      </button>

      {/* Modals */}
      <GeneratorModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialTemplate={selectedTemplate}
        onSaveTemplate={handleSaveTemplate}
        user={user}
        setUser={setUser}
        onLoginRequest={() => {
            setIsModalOpen(false);
            setIsLoginOpen(true);
        }}
      />

      <LoginModal 
        isOpen={isLoginOpen} 
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
