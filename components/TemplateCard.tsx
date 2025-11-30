import React from 'react';
import { Template } from '../types';
import { Play, Copy, Image as ImageIcon, Lock } from 'lucide-react';

interface TemplateCardProps {
  template: Template;
  onSelect: (t: Template) => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, onSelect }) => {
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(template.prompt);
  };

  return (
    <div 
      className="group relative overflow-hidden rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-neutral-600 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl hover:-translate-y-1"
      onClick={() => onSelect(template)}
    >
      {/* Aspect Ratio Container */}
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
        
        {/* Indicators Container */}
        <div className="absolute top-2 right-2 flex flex-col gap-2">
            {template.referenceImage && (
                <div className="bg-black/50 backdrop-blur-sm p-1.5 rounded-lg text-white/80 border border-white/10" title="Includes Reference Image">
                    <ImageIcon size={12} />
                </div>
            )}
            {template.isPublished === false && (
                <div className="bg-neutral-900/80 backdrop-blur-sm p-1.5 rounded-lg text-neutral-400 border border-neutral-700" title="Private Template">
                    <Lock size={12} />
                </div>
            )}
        </div>
        
        {/* Overlay on Hover */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4 backdrop-blur-[2px]">
            <button className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full font-medium transform scale-95 group-hover:scale-100 transition-transform">
                <Play size={16} fill="currentColor" />
                Try this
            </button>
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
