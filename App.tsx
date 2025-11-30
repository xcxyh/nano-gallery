import React, { useState, useEffect } from 'react';
import { Plus, Zap, Image as ImageIcon, Github, UserCircle, LogOut, LayoutGrid, Lock } from 'lucide-react';
import { Template, User } from './types';
import { INITIAL_TEMPLATES } from './constants';
import TemplateCard from './components/TemplateCard';
import GeneratorModal from './components/GeneratorModal';
import LoginModal from './components/LoginModal';
import { ensureApiKey } from './services/gemini';
import { initDB, getAllTemplates, saveTemplateToDB } from './services/storage';

const App: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [columns, setColumns] = useState(1);
  
  // Auth & View State
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'gallery' | 'library'>('gallery');

  // Load User from local storage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('nano_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (name: string) => {
    const newUser: User = {
      id: `u-${Date.now()}`,
      name: name,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`
    };
    setUser(newUser);
    localStorage.setItem('nano_user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('nano_user');
    setActiveTab('gallery');
  };

  // Responsive Masonry Columns
  useEffect(() => {
    const updateColumns = () => {
      if (window.innerWidth >= 1280) setColumns(4);      // xl
      else if (window.innerWidth >= 1024) setColumns(3); // lg
      else if (window.innerWidth >= 768) setColumns(2);  // md
      else setColumns(1);                                // sm
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  // Load templates from IndexedDB
  useEffect(() => {
    const loadData = async () => {
      try {
        await initDB();
        
        let storedTemplates = await getAllTemplates();
        
        if (storedTemplates.length === 0) {
          // Initialize system templates with ownerId 'system' and isPublished true
          const initialWithMeta = INITIAL_TEMPLATES.map(t => ({
            ...t,
            ownerId: 'system',
            isPublished: true
          }));

          for (const t of initialWithMeta) {
            await saveTemplateToDB(t);
          }
          storedTemplates = [...initialWithMeta];
        }

        const sorted = storedTemplates.sort((a, b) => Number(b.id.replace(/\D/g, '')) - Number(a.id.replace(/\D/g, '')));
        setTemplates(sorted);
      } catch (error) {
        console.error("Failed to load templates:", error);
        setTemplates(INITIAL_TEMPLATES);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleOpenCreator = async () => {
    const hasKey = await ensureApiKey();
    if (hasKey) {
        setSelectedTemplate(null);
        setIsModalOpen(true);
    }
  };

  const handleSelectTemplate = async (template: Template) => {
    const hasKey = await ensureApiKey();
    if (hasKey) {
        setSelectedTemplate(template);
        setIsModalOpen(true);
    }
  };

  const handleSaveTemplate = async (newTemplate: Template) => {
    setTemplates(prev => [newTemplate, ...prev]);
    try {
      await saveTemplateToDB(newTemplate);
    } catch (error) {
      console.error("Failed to save template to DB:", error);
    }
  };

  // Filter Logic
  const filteredTemplates = templates.filter(t => {
    if (activeTab === 'gallery') {
      // Show if published OR (legacy system templates often lack explicit flags in old data, assume t- prefix is public)
      return t.isPublished || t.id.startsWith('t-') || t.ownerId === 'system';
    } else {
      // My Library: Show only my items
      return user && t.ownerId === user.id;
    }
  });

  // Distribute templates into columns for Masonry layout
  const getMasonryColumns = () => {
    const cols: Template[][] = Array.from({ length: columns }, () => []);
    filteredTemplates.forEach((template, index) => {
      cols[index % columns].push(template);
    });
    return cols;
  };

  const masonryColumns = getMasonryColumns();

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
                <div className="hidden sm:flex flex-col items-end">
                   <span className="text-sm font-medium">{user.name}</span>
                   <span className="text-[10px] text-yellow-500 uppercase tracking-wider">Creator</span>
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

        {/* Masonry Gallery Grid */}
        <div className="flex gap-6 items-start">
          {masonryColumns.map((col, colIndex) => (
            <div key={colIndex} className="flex-1 flex flex-col gap-6 w-full min-w-0">
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
            <div className="text-center py-20 border border-dashed border-neutral-800 rounded-3xl bg-neutral-900/20">
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

      {/* Floating Action Button (Mobile) */}
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
        onLoginRequest={() => {
            setIsModalOpen(false);
            setIsLoginOpen(true);
        }}
      />

      <LoginModal 
        isOpen={isLoginOpen} 
        onClose={() => setIsLoginOpen(false)}
        onLogin={handleLogin}
      />
    </div>
  );
};

export default App;
