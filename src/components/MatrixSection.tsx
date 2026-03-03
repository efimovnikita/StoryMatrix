import React from 'react';
import { RefreshCw, Loader2, LucideIcon, X } from 'lucide-react';

interface MatrixSectionProps {
  id: string;
  title: string;
  icon: LucideIcon;
  colorTheme: { iconColor: string; borderColor: string };
  localPrompt: string;
  onPromptChange: (val: string) => void;
  onReroll: () => void;
  isLoading: boolean;
  children: React.ReactNode;
}

const MatrixSection: React.FC<MatrixSectionProps> = ({ 
  id, title, icon: Icon, colorTheme, localPrompt, onPromptChange, onReroll, isLoading, children 
}) => {
  return (
    <section className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm relative overflow-hidden">
      <div className="flex flex-col gap-2 mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Icon size={16} className={colorTheme.iconColor} />
            <h3 className="text-xs font-bold uppercase tracking-wider">{title}</h3>
          </div>
        </div>
        <div className="flex gap-2 relative z-10">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder={`Refine...`}
              value={localPrompt}
              onChange={(e) => onPromptChange(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 pr-8 focus:outline-none focus:border-indigo-400 focus:bg-white transition-colors placeholder:text-slate-400"
            />
            {localPrompt && (
              <button
                onClick={() => onPromptChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button 
            onClick={onReroll}
            disabled={isLoading}
            className={`p-1.5 rounded-lg border transition-all flex items-center justify-center min-w-[36px] ${
              isLoading ? 'bg-slate-100 border-slate-200 text-slate-400' : `bg-white hover:bg-slate-50 text-slate-600 ${colorTheme.borderColor} shadow-sm active:scale-95`
            }`}
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={14} />}
          </button>
        </div>
      </div>
      <div className={`relative transition-opacity duration-300 ${isLoading ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
        {children}
      </div>
      {isLoading && (
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
          <span className="bg-white/90 px-3 py-1 rounded-full text-xs font-medium text-slate-600 shadow-sm backdrop-blur-sm flex items-center gap-1.5">
            <Loader2 size={12} className="animate-spin text-indigo-500"/> Loading...
          </span>
        </div>
      )}
    </section>
  );
};

export default MatrixSection;
