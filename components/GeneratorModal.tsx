'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Save, Download, RefreshCw, AlertCircle, ImagePlus, Trash2, Globe, Lock, UserCircle, Coins } from 'lucide-react';
import { Template, AspectRatio, ImageSize, User } from '@/types';
import { generateImageAction } from '@/app/actions';

interface GeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTemplate?: Template | null;
  onSaveTemplate: (t: Template) => void;
  user: User | null;
  setUser: (u: User) => void;
  onLoginRequest: () => void;
}

const ASPECT_RATIOS = ["1:1", "3:4", "4:3", "9:16", "16:9"] as const;

const GeneratorModal: React.FC<GeneratorModalProps> = ({ 
  isOpen, 
  onClose, 
  initialTemplate,
  onSaveTemplate,
  user,
  setUser,
  onLoginRequest
}) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [imageSize, setImageSize] = useState<ImageSize>("1K");
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  
  // generatedImage stores Base64 for display, remoteImageUrl stores Supabase URL for DB saving
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [remoteImageUrl, setRemoteImageUrl] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRefInput, setShowRefInput] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  
  const [isSaveMode, setIsSaveMode] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getCost = () => {
    if (imageSize === "2K") return 2;
    if (imageSize === "4K") return 4;
    return 1;
  };

  const cost = getCost();

  useEffect(() => {
    if (isOpen) {
      if (initialTemplate) {
        setPrompt(initialTemplate.prompt);
        setAspectRatio(initialTemplate.aspectRatio);
        setGeneratedImage(initialTemplate.imageUrl || null);
        setRemoteImageUrl(initialTemplate.imageUrl || null);
        setReferenceImage(initialTemplate.referenceImage || null);
        setNewTitle(initialTemplate.title + " (Remix)");
        setShowRefInput(!!initialTemplate.referenceImage);
      } else {
        setPrompt('');
        setAspectRatio("1:1");
        setGeneratedImage(null);
        setRemoteImageUrl(null);
        setReferenceImage(null);
        setNewTitle('');
        setShowRefInput(false);
      }
      setIsSaveMode(false);
      setError(null);
      setShowExitConfirm(false);
      setIsPublished(true);
    }
  }, [isOpen, initialTemplate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReferenceImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    if (!user) {
        onLoginRequest();
        return;
    }

    if (user.credits < cost && user.role !== 'admin') {
        setError(`Insufficient credits. You need ${cost} credits but have ${user.credits}.`);
        return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);
    setRemoteImageUrl(null);

    try {
      // Call Server Action
      const result = await generateImageAction({
        prompt,
        aspectRatio,
        imageSize,
        referenceImage: referenceImage || undefined
      });

      if (!result.success || !result.imageBase64) {
        throw new Error(result.error || "Generation failed");
      }

      setGeneratedImage(result.imageBase64);
      setRemoteImageUrl(result.imageUrl || result.imageBase64); // Fallback to base64 if URL not present
      setIsSaveMode(false);
      
      // Update local user state from server response to reflect deducted credit immediately
      if (typeof result.remainingCredits === 'number') {
        setUser({ ...user, credits: result.remainingCredits });
      }

    } catch (err: any) {
      setError(err.message || "Failed to generate image.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (!generatedImage || !newTitle.trim() || !user) return;
    
    const newTemplate: Template = {
      id: Date.now().toString(), // Temp ID, server assigns real one
      title: newTitle,
      prompt,
      aspectRatio,
      imageUrl: remoteImageUrl || generatedImage, // Prefer remote URL for saving
      referenceImage: referenceImage || undefined,
      author: user.name,
      ownerId: user.id,
      isPublished: isPublished
    };
    
    onSaveTemplate(newTemplate);
    onClose();
  };

  const downloadImage = async () => {
    if (!generatedImage) return;
    const response = await fetch(generatedImage);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nano-banana-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCloseRequest = () => {
    const isDirty = (prompt.trim().length > 0 && prompt !== initialTemplate?.prompt) || (generatedImage && !initialTemplate);
    if (isDirty && !showExitConfirm) {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  };

  const isRemixChanged = initialTemplate && (
    prompt.trim() !== initialTemplate.prompt.trim() ||
    aspectRatio !== initialTemplate.aspectRatio ||
    referenceImage !== (initialTemplate.referenceImage || null)
  );

  const isNewGeneration = initialTemplate ? generatedImage !== initialTemplate.imageUrl : true;
  const showSaveButton = generatedImage && !isSaveMode && user && (!initialTemplate || (isRemixChanged && isNewGeneration));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" 
        onClick={handleCloseRequest}
      />
      
      <div className="relative w-full max-w-6xl bg-[#0f0f0f] border border-neutral-800 rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh]">
        
        {showExitConfirm && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
            <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
              <h3 className="text-xl font-bold text-white mb-2">Unsaved Changes</h3>
              <p className="text-neutral-400 text-sm mb-6">
                You have unsaved work. Are you sure you want to discard it and leave?
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 px-4 py-2 rounded-lg bg-neutral-800 text-white hover:bg-neutral-700 transition-colors font-medium text-sm"
                >
                  Keep Editing
                </button>
                <button 
                  onClick={onClose}
                  className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium text-sm"
                >
                  Discard & Exit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Left: Controls */}
        <div className="w-full md:w-1/3 p-6 flex flex-col border-r border-neutral-800 overflow-y-auto custom-scrollbar bg-[#0f0f0f]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white tracking-tight">Studio</h2>
            <button onClick={handleCloseRequest} className="p-2 hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-6 flex-1">
            <div>
              <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2">Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your imagination..."
                className="w-full h-32 bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-white/20 resize-none text-sm leading-relaxed"
              />
            </div>

            <div>
               <div className="flex items-center justify-between mb-3">
                 <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Reference Image</label>
                 <button 
                   onClick={() => setShowRefInput(!showRefInput)}
                   className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                     showRefInput 
                       ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400/30' 
                       : 'bg-neutral-900 text-neutral-500 border-neutral-800 hover:text-neutral-300'
                   }`}
                 >
                   {showRefInput ? 'Enabled' : 'Add Reference'}
                 </button>
               </div>
               
               {showRefInput && (
                 <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                   {!referenceImage ? (
                     <div 
                       onClick={() => fileInputRef.current?.click()}
                       className="w-full h-24 border border-dashed border-neutral-700 hover:border-neutral-500 hover:bg-neutral-900/50 rounded-xl flex items-center justify-center gap-3 cursor-pointer transition-all group"
                     >
                       <div className="p-2 bg-neutral-800 rounded-lg group-hover:scale-110 transition-transform">
                         <ImagePlus size={18} className="text-neutral-400" />
                       </div>
                       <span className="text-sm text-neutral-500 group-hover:text-neutral-300">Upload Image</span>
                     </div>
                   ) : (
                     <div className="relative w-full h-40 bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden group">
                       <img 
                         src={referenceImage} 
                         alt="Reference" 
                         className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                       />
                       <button 
                         onClick={() => {
                            setReferenceImage(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                         }}
                         className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-500/80 text-white rounded-lg backdrop-blur-sm transition-colors opacity-0 group-hover:opacity-100"
                       >
                         <Trash2 size={14} />
                       </button>
                     </div>
                   )}
                   <input 
                     type="file" 
                     ref={fileInputRef} 
                     onChange={handleFileChange} 
                     accept="image/*" 
                     className="hidden" 
                   />
                 </div>
               )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2">Ratio</label>
                <div className="grid grid-cols-3 gap-2">
                  {ASPECT_RATIOS.map((ratio) => (
                    <button
                      key={ratio}
                      onClick={() => setAspectRatio(ratio)}
                      className={`px-1 py-2 text-xs rounded-lg border transition-all ${
                        aspectRatio === ratio
                          ? 'bg-neutral-100 text-black border-neutral-100 font-bold'
                          : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:border-neutral-600'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>
               <div>
                <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2">Quality</label>
                <select 
                  value={imageSize}
                  onChange={(e) => setImageSize(e.target.value as ImageSize)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-sm text-white focus:outline-none"
                >
                  <option value="1K">Standard (1K)</option>
                  <option value="2K">High (2K)</option>
                  <option value="4K">Ultra (4K)</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-900/50 p-4 rounded-xl flex gap-3 text-red-200 text-sm items-start">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}
            
            {user && (
                <div className={`p-4 rounded-xl flex items-center justify-between text-sm ${
                    (user.credits < cost && user.role !== 'admin') ? 'bg-red-900/10 border border-red-900/30' : 'bg-neutral-900/50 border border-neutral-800'
                }`}>
                    <span className="text-neutral-400">Available Credits</span>
                    <div className="flex items-center gap-2">
                        <Coins size={14} className={user.credits >= cost || user.role === 'admin' ? "text-yellow-400 fill-yellow-400" : "text-red-400"} />
                        <span className={`font-bold ${user.credits >= cost || user.role === 'admin' ? "text-white" : "text-red-400"}`}>{user.role === 'admin' ? '∞' : user.credits}</span>
                    </div>
                </div>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-neutral-800 space-y-3">
            {!user ? (
                 <button
                    onClick={onLoginRequest}
                    className="w-full py-3.5 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm bg-yellow-400 text-black hover:bg-yellow-300 transition-all"
                >
                    <UserCircle size={18} />
                    Login to Generate
                </button>
            ) : (
                <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim() || (user.credits < cost && user.role !== 'admin')}
                className={`w-full py-3.5 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm transition-all ${
                    isGenerating || !prompt.trim() || (user.credits < cost && user.role !== 'admin')
                    ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                    : 'bg-white text-black hover:bg-neutral-200 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]'
                }`}
                >
                {isGenerating ? (
                    <>
                    <RefreshCw className="animate-spin" size={18} />
                    Generating...
                    </>
                ) : (user.credits < cost && user.role !== 'admin') ? (
                    <>
                    <Lock size={18} />
                    Insufficient Credits
                    </>
                ) : (
                    <>
                    <Sparkles size={18} />
                    Generate ({cost} Credit{cost > 1 ? 's' : ''})
                    </>
                )}
                </button>
            )}

            {showSaveButton && (
                <button
                    onClick={() => setIsSaveMode(true)}
                    className="w-full py-3.5 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm bg-neutral-800 text-white hover:bg-neutral-700 border border-neutral-700 hover:border-neutral-600 transition-all"
                >
                    <Save size={18} />
                    {initialTemplate ? 'Publish Remix' : 'Save Template'}
                </button>
            )}
          </div>
        </div>

        {/* Right: Preview */}
        <div className="w-full md:w-2/3 bg-neutral-950 flex flex-col items-center justify-center p-8 relative min-h-[400px]">
          <div className="absolute inset-0 opacity-10 pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
          </div>

          {generatedImage ? (
            <div className="relative group max-h-full max-w-full shadow-2xl rounded-lg overflow-hidden flex items-center justify-center w-full h-full">
               <img 
                 src={generatedImage} 
                 alt="Generated Result" 
                 className={`max-h-[75vh] w-auto max-w-full object-contain rounded-lg border border-neutral-800 shadow-2xl`}
               />
               <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={downloadImage}
                    className="p-2 bg-black/50 hover:bg-black/80 text-white rounded-lg backdrop-blur-sm transition-colors"
                    title="Download"
                  >
                    <Download size={20} />
                  </button>
               </div>
            </div>
          ) : (
            <div className="text-center text-neutral-500 flex flex-col items-center gap-4">
              <div className="w-24 h-24 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                 <Sparkles size={32} className="text-neutral-700" />
              </div>
              <p className="text-sm font-light">Preview will appear here</p>
            </div>
          )}

          {isSaveMode && generatedImage && (
             <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
                <div className="bg-[#0f0f0f] border border-neutral-700 p-6 rounded-2xl shadow-2xl w-full max-w-md animate-in slide-in-from-bottom-5 fade-in">
                    <h3 className="text-white text-lg font-medium mb-1">Save to Gallery</h3>
                    <p className="text-neutral-400 text-sm mb-4">Give your creation a memorable title.</p>
                    
                    <input
                        type="text"
                        placeholder="E.g., Neon Cyber Samurai"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-white/30 mb-6"
                        autoFocus
                    />

                    <div className="mb-6 bg-neutral-900 rounded-xl p-3 border border-neutral-800 flex items-center justify-between cursor-pointer" onClick={() => setIsPublished(!isPublished)}>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isPublished ? 'bg-green-900/30 text-green-400' : 'bg-neutral-800 text-neutral-500'}`}>
                           {isPublished ? <Globe size={18} /> : <Lock size={18} />}
                        </div>
                        <div className="text-left">
                          <p className="text-sm text-white font-medium">{isPublished ? 'Public Template' : 'Private Draft'}</p>
                          <p className="text-xs text-neutral-500">{isPublished ? 'Visible to everyone on homepage' : 'Only visible in your library'}</p>
                        </div>
                      </div>
                      <div className={`w-10 h-5 rounded-full relative transition-colors ${isPublished ? 'bg-green-500' : 'bg-neutral-700'}`}>
                        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${isPublished ? 'left-6' : 'left-1'}`}></div>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setIsSaveMode(false)}
                            className="flex-1 py-3 text-sm text-neutral-400 hover:text-white transition-colors hover:bg-neutral-800 rounded-xl"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={!newTitle.trim()}
                            className="flex-1 py-3 bg-white text-black text-sm font-bold rounded-xl hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Save Template
                        </button>
                    </div>
                </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GeneratorModal;
