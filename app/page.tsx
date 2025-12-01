'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Zap, Image as ImageIcon, LogOut, LayoutGrid, Coins, Lock, Search } from 'lucide-react';
import { Template, User } from '@/types';
import TemplateCard from '@/components/TemplateCard';
import GeneratorModal from '@/components/GeneratorModal';
import LoginModal from '@/components/LoginModal';
import { getSessionAction, logoutAction, getTemplatesAction, saveTemplateAction } from '@/app/actions';

export default function Home() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Auth & View State
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'gallery' | 'library'>('gallery');
  const [columns, setColumns] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleLoginSuccess = (newUser: User) => {
    setUser(newUser);
    // Reload templates to see user's private library if needed
    loadTemplates();
  };

  const handleLogout = async () => {
    await logoutAction();
    setUser(null);
    setActiveTab('gallery');
  };

  const loadTemplates = async () => {
      setIsLoading(true);
      try {
          const data = await getTemplatesAction();
          setTemplates(data);
      } catch (e) {
          console.error("Failed to load templates", e);
      } finally {
          setIsLoading(false);
      }
  };

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  const handleOpenCreator = () => {
    setSelectedTemplate(null);
    setIsModalOpen(true);
  };

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setIsModalOpen(true);
  };

  const handleSaveTemplate = async (newTemplate: Template) => {
    // Optimistic update
    setTemplates(prev => [newTemplate, ...prev]);
    try {
      // Actually save to Supabase
      await saveTemplateAction(newTemplate);
      // Background reload to get real ID
      loadTemplates();
    } catch (error) {
      console.error("Failed to save template:", error);
    }
  };

  // Filter Logic
  const filteredTemplates = templates.filter(t => {
    // Search Filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = t.title.toLowerCase().includes(query) || 
                          t.prompt.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    if (activeTab === 'gallery') {
      // Show public templates
      return t.isPublished || t.ownerId === 'system';
    } else {
      // Show my templates (public or private)
      return user && t.ownerId === user.id;
    }
  });

  // Distribute templates into columns for horizontal masonry
  const getColumns = () => {
    const cols = Array.from({ length: columns }, () => [] as Template[]);
    filteredTemplates.forEach((t, i) => {
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
            </div>

            <div className="flex items-center gap-2 text-sm text-neutral-400">
                <ImageIcon size={16} />
                <span>{isLoading ? 'Loading...' : `${filteredTemplates.length} ${activeTab === 'gallery' ? 'Public' : 'Personal'} Styles`}</span>
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
                        />
                    ))}
                </div>
            ))}
        </div>

        {/* Loading State */}
        {isLoading && (
           <div className="text-center py-20">
              <div className="animate-spin w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-neutral-500">Loading gallery...</p>
           </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredTemplates.length === 0 && (
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
