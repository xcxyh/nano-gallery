'use client';

import React from 'react';
import { Template } from '@/types';
import { Play, Copy, Image as ImageIcon, Lock, CheckCircle, XCircle, Clock } from 'lucide-react';

interface TemplateCardProps {
  template: Template;
  onSelect: (t: Template) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  showStatus?: boolean;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, onSelect, onApprove, onReject, showStatus }) => {
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(template.prompt);
  };

  const handleApprove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onApprove?.(template.id);
  };

  const handleReject = (e: React.MouseEvent) => {
    e.stopPropagation();
    onReject?.(template.id);
  };

  return (
    <div 
      className="group relative overflow-hidden rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-neutral-600 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl hover:-translate-y-1 transform-gpu"
      onClick={() => onSelect(template)}
    >
      <div className={`w-full overflow-hidden bg-neutral-950 relative ${
        template.aspectRatio === "16:9" ? "aspect-video" :
        template.aspectRatio === "9:16" ? "aspect-[9/16]" :
        template.aspectRatio === "4:3" ? "aspect-[4/3]" :
        template.aspectRatio === "3:4" ? "aspect-[3/4]" : "aspect-square"
      }`}>
        <img 
          src={template.imageUrl} 
          alt={template.title} 
          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
          loading="lazy"
        />
        
        <div className="absolute top-2 right-2 flex flex-col gap-2">
            {(template.referenceImage || (template.referenceImages && template.referenceImages.length > 0)) && (
                <div className="bg-black/50 backdrop-blur-sm px-2 py-1 rounded-lg text-white/80 border border-white/10 flex items-center gap-1.5" title="Includes Reference Image(s)">
                    <ImageIcon size={12} />
                    <span className="text-[10px] font-medium">
                         {template.referenceImages && template.referenceImages.length > 1 
                            ? `${template.referenceImages.length} Refs` 
                            : 'Ref Image'}
                    </span>
                </div>
            )}
            {template.isPublished === false && (
                <div className="bg-neutral-900/80 backdrop-blur-sm p-1.5 rounded-lg text-neutral-400 border border-neutral-700" title="Private Template">
                    <Lock size={12} />
                </div>
            )}
            {showStatus && template.status === 'pending' && (
               <div className="bg-yellow-500/20 backdrop-blur-sm px-2 py-1 rounded-lg text-yellow-400 border border-yellow-500/30 flex items-center gap-1">
                  <Clock size={12} />
                  <span className="text-[10px] font-bold uppercase">Pending</span>
               </div>
            )}
            {showStatus && template.status === 'rejected' && (
               <div className="bg-red-500/20 backdrop-blur-sm px-2 py-1 rounded-lg text-red-400 border border-red-500/30 flex items-center gap-1">
                  <XCircle size={12} />
                  <span className="text-[10px] font-bold uppercase">Rejected</span>
               </div>
            )}
        </div>
        
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4 backdrop-blur-[2px]">
            {onApprove && onReject ? (
               <div className="flex gap-2">
                 <button 
                    onClick={handleApprove}
                    className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-full font-medium transition-colors"
                 >
                    <CheckCircle size={16} /> Approve
                 </button>
                 <button 
                    onClick={handleReject}
                    className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full font-medium transition-colors"
                 >
                    <XCircle size={16} /> Reject
                 </button>
               </div>
            ) : (
                <button className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full font-medium transform scale-95 group-hover:scale-100 transition-transform">
                    <Play size={16} fill="currentColor" />
                    Try this
                </button>
            )}
        </div>
      </div>

      <div className="p-4 relative z-10 bg-neutral-900">
        <div className="flex justify-between items-start mb-2">
            <h3 className="text-white font-medium text-lg truncate pr-2">{template.title}</h3>
            <span className="text-xs text-neutral-500 border border-neutral-800 px-2 py-0.5 rounded uppercase tracking-wider">
                {template.aspectRatio}
            </span>
        </div>
        <p className="text-neutral-400 text-sm line-clamp-2 leading-relaxed mb-3">
            {template.prompt}
        </p>
        <div className="flex items-center justify-between mt-2 border-t border-neutral-800 pt-3">
            <span className="text-xs text-neutral-600">By {template.author || 'Anonymous'}</span>
            <button 
                onClick={handleCopy}
                className="text-neutral-500 hover:text-white transition-colors p-1.5 hover:bg-neutral-800 rounded-md"
                title="Copy Prompt"
            >
                <Copy size={14} />
            </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateCard;
