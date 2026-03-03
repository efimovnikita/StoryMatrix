import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Compass, Check, Trash2, Link, Users, Zap, Box, Palette, MapPin, Loader2, Sparkles, AlertCircle, ArrowRight, Edit2, LayoutGrid, X, Wand2, Send, Copy, Share2, ExternalLink } from 'lucide-react';
import { MatrixData, WordPair, SentenceAnalysis, VerbRow } from '../types';
import WordButton from './WordButton';
import MatrixSection from './MatrixSection';
import { analyzeSentence, generateMatrix, evaluateStory } from '../services/mistralApi';

interface StoryMatrixEditorProps {
  initialData: MatrixData;
  storyTheme: string;
  onExit: () => void;
}

const StoryMatrixEditor: React.FC<StoryMatrixEditorProps> = ({ initialData, storyTheme, onExit }) => {
  const [story, setStory] = useState<string[]>([]);
  const [currentSentence, setCurrentSentence] = useState<WordPair[]>([]);
  const [mode, setMode] = useState<'blocks' | 'text'>('blocks');
  const [manualText, setManualText] = useState("");
  const [globalDirection, setGlobalDirection] = useState(storyTheme);
  const [localPrompts, setLocalPrompts] = useState({ 
    connectors: "", subjects: "", verbs: "", prepositions: "", nouns: "", adjectives: "" 
  });
  
  const [loadingSections, setLoadingSections] = useState<Record<string, boolean>>({ 
    connectors: false, subjects: false, verbs: false, prepositions: false, nouns: false, adjectives: false 
  });

  const [matrixData, setMatrixData] = useState<MatrixData>(initialData);
  const [checkState, setCheckState] = useState<'building' | 'checking' | 'result'>('building');
  const [validationResult, setValidationResult] = useState<SentenceAnalysis | null>(null);

  // Sharing states
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [hasCopied, setHasCopied] = useState(false);

  // Sharing logic
  const handleCopyStory = () => {
    const fullStory = story.join(' ');
    if (!fullStory) return alert("Story is empty!");
    navigator.clipboard.writeText(fullStory);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  const fetchSmartTitle = async (storyText: string): Promise<string> => {
    const apiKey = localStorage.getItem('mistral_api_key');
    if (!apiKey) return 'StoryMatrix - My Italian Story';

    try {
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "mistral-small-latest",
          messages: [
            {
              role: "system",
              content: "You are an expert editor. Give a short, creative title in Italian to the story provided. Respond ONLY with the title."
            },
            {
              role: "user",
              content: storyText
            }
          ],
          temperature: 0.7,
          max_tokens: 20
        })
      });

      const data = await response.json();
      return data.choices?.[0]?.message?.content?.trim() || 'Italian Story';
    } catch (error) {
      return 'My Italian Story';
    }
  };

  const handleShareToTelegraph = async () => {
    const fullStory = story.join(' ');
    if (!fullStory) return alert("Write some story first!");
    
    setIsSharing(true);
    setShareUrl(null);
    try {
      let token = localStorage.getItem('telegraph_token');
      if (!token) {
        const accRes = await fetch('https://api.telegra.ph/createAccount?short_name=StoryMatrix&author_name=Learner');
        const accData = await accRes.json();
        if (accData.ok) {
          token = accData.result.access_token;
          localStorage.setItem('telegraph_token', token);
        }
      }

      const smartTitle = await fetchSmartTitle(fullStory) || "My Story";
      const contentNodes = [{ tag: 'p', children: [fullStory] }];

      const finalToken = token || "";
      if (!finalToken) throw new Error("Telegraph token is missing");

      const formData = new FormData();
      formData.append('access_token', finalToken);
      formData.append('title', smartTitle);
      formData.append('author_name', 'StoryMatrix App');
      formData.append('content', JSON.stringify(contentNodes));

      const pageRes = await fetch('https://api.telegra.ph/createPage', { method: 'POST', body: formData });
      const pageData = await pageRes.json();

      if (pageData.ok) {
        setShareUrl(pageData.result.url);
      } else {
        throw new Error(pageData.error);
      }
    } catch (error: any) {
      alert("Sharing failed: " + error.message);
    } finally {
      setIsSharing(false);
    }
  };

  const storyEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (storyEndRef.current) {
      storyEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [story]);

  const handleAddWord = (word: WordPair) => {
    setCurrentSentence([...currentSentence, word]);
    if (mode === 'text') {
      setManualText(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + word.it);
    }
  };

  const handleRemoveWord = (indexToRemove: number) => {
    setCurrentSentence(currentSentence.filter((_, index) => index !== indexToRemove));
  };

  const handleClear = () => {
    setCurrentSentence([]);
    setManualText("");
    setCheckState('building');
    setValidationResult(null);
  };

  const switchToText = (overrideText: string | null = null) => {
    const textToSet = overrideText !== null ? overrideText : currentSentence.map(w => w.it).join(' ');
    setManualText(textToSet);
    setMode('text');
  };

  const handleRerollSection = async (sectionId: keyof MatrixData) => {
    setLoadingSections(prev => ({ ...prev, [sectionId]: true }));
    try {
      const result = await generateMatrix(story, globalDirection, localPrompts, [sectionId]);
      setMatrixData(prev => ({ ...prev, ...result }));
    } catch (error) {
      console.error("Reroll failed", error);
      alert("Failed to update section");
    } finally {
      setLoadingSections(prev => ({ ...prev, [sectionId]: false }));
    }
  };

  const handleRerollAll = async () => {
    setLoadingSections({ connectors: true, subjects: true, verbs: true, prepositions: true, nouns: true, adjectives: true });
    try {
      const result = await generateMatrix(story, globalDirection, localPrompts, [
        'connectors', 'subjects', 'verbs', 'prepositions', 'nouns', 'adjectives'
      ]);
      // Defensive merge: only update sections that were returned and are valid arrays
      setMatrixData(prev => ({
        ...prev,
        ...Object.keys(result).reduce((acc, key) => {
          if (Array.isArray((result as any)[key])) {
            (acc as any)[key] = (result as any)[key];
          }
          return acc;
        }, {} as Partial<MatrixData>)
      }));
    } catch (error) {
      console.error("Reroll all failed", error);
      alert("Failed to update matrix");
    } finally {
      setLoadingSections({ connectors: false, subjects: false, verbs: false, prepositions: false, nouns: false, adjectives: false });
    }
  };

  const handleCheckGrammar = async () => {
    const textToCheck = mode === 'text' ? manualText.trim() : currentSentence.map(w => w.it).join(' ').trim();
    if (!textToCheck) return;
    
    setCheckState('checking');
    try {
      const result = await analyzeSentence(textToCheck);
      setValidationResult(result);
      setCheckState('result');
    } catch (error) {
      console.error("Check failed", error);
      setCheckState('building');
      alert("Grammar check failed");
    }
  };

  const handleConfirmAndAdd = (textToAdd: string) => {
    setStory([...story, textToAdd]);
    handleClear();
    setMode('blocks');
  };

  const isBuildingEmpty = mode === 'blocks' ? currentSentence.length === 0 : manualText.trim().length === 0;

  return (
    <div className="w-full max-w-md bg-slate-50 shadow-2xl overflow-hidden flex flex-col h-[100vh] md:h-[90vh] md:rounded-3xl relative">
      
      <div className="bg-slate-900 text-white p-4 flex justify-between items-center z-50 shadow-md shrink-0">
        <div>
          <h1 className="font-bold text-lg leading-tight flex items-center gap-2">
            StoryMatrix <Sparkles size={16} className="text-blue-400" />
          </h1>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest">Italiano</p>
        </div>
        <div className="flex gap-2 items-center">
          <button 
            onClick={handleCopyStory}
            title="Copy story"
            className={`p-2 rounded-lg transition-colors ${hasCopied ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}
          >
            {hasCopied ? <Check size={18} /> : <Copy size={18} />}
          </button>
          <button 
            onClick={handleShareToTelegraph}
            disabled={isSharing}
            title="Publish to Telegraph"
            className="p-2 hover:bg-slate-800 text-slate-300 rounded-lg transition-colors disabled:opacity-50"
          >
            {isSharing ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />}
          </button>
          <div className="w-[1px] h-6 bg-slate-700 mx-1" />
          <button onClick={onExit} className="text-slate-400 hover:text-white transition-colors p-1">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-80">
        {/* Share Link Result */}
        {shareUrl && (
          <div className="bg-emerald-600 text-white p-3 flex items-center justify-between animate-in slide-in-from-top-full">
            <div className="flex items-center gap-2 overflow-hidden">
              <Link size={14} className="shrink-0" />
              <span className="text-xs truncate font-medium">Story published!</span>
            </div>
            <div className="flex gap-3">
              <a href={shareUrl} target="_blank" rel="noopener" className="text-xs font-bold underline flex items-center gap-1">
                Open <ExternalLink size={12} />
              </a>
              <button onClick={() => setShareUrl(null)}><X size={14} /></button>
            </div>
          </div>
        )}
        <div className="p-5 bg-[#fdfbf7] border-b border-slate-200 shadow-inner">
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Your Story</h2>
          <div className="space-y-1 text-slate-800 text-lg leading-relaxed font-serif">
            {story.length === 0 ? (
              <span className="text-slate-300 italic">Type something to start...</span>
            ) : (
              story.map((sentence, idx) => (
                <span key={idx} className="mr-1.5">{sentence}</span>
              ))
            )}
            <div ref={storyEndRef} />
          </div>
        </div>

        <div className="p-4 bg-indigo-50 border-b border-indigo-100 shadow-sm sticky top-0 z-40 backdrop-blur-md bg-indigo-50">
          <label className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-1 mb-2">
            <Compass size={14}/> Global Plot Vector
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input 
                type="text" 
                placeholder="e.g. Absurd, Detective, Romantic..."
                value={globalDirection}
                onChange={(e) => setGlobalDirection(e.target.value)}
                className="w-full px-3 py-2 pr-10 text-sm rounded-xl border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white shadow-sm"
              />
              {globalDirection && (
                <button
                  onClick={() => setGlobalDirection("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600 transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <button 
              onClick={handleRerollAll}
              disabled={Object.values(loadingSections).some(Boolean)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center justify-center hover:bg-indigo-700 transition-all font-bold text-sm shadow-md active:scale-95 disabled:opacity-50"
            >
              {Object.values(loadingSections).some(Boolean) ? <Loader2 size={18} className="animate-spin" /> : <><RefreshCw size={16} className="mr-1.5"/> All</>}
            </button>
          </div>
        </div>

        <div className="p-3 space-y-4">
          <MatrixSection 
            id="connectors" title="Connectors" icon={Link} 
            colorTheme={{ iconColor: 'text-slate-500', borderColor: 'border-slate-300' }}
            localPrompt={localPrompts.connectors}
            onPromptChange={(v) => setLocalPrompts(p => ({ ...p, connectors: v }))}
            onReroll={() => handleRerollSection('connectors')}
            isLoading={loadingSections.connectors}
          >
            <div className="flex flex-wrap gap-2">
              {(matrixData?.connectors || []).map(word => <WordButton key={word.id} word={word} onClick={handleAddWord} disabled={checkState === 'checking'} colorClass="bg-slate-100 border-slate-300 hover:bg-slate-200" />)}
            </div>
          </MatrixSection>

          <MatrixSection 
            id="subjects" title="Who / What" icon={Users} 
            colorTheme={{ iconColor: 'text-indigo-500', borderColor: 'border-indigo-300' }}
            localPrompt={localPrompts.subjects}
            onPromptChange={(v) => setLocalPrompts(p => ({ ...p, subjects: v }))}
            onReroll={() => handleRerollSection('subjects')}
            isLoading={loadingSections.subjects}
          >
            <div className="flex flex-wrap gap-2">
              {(matrixData?.subjects || []).map(word => <WordButton key={word.id} word={word} onClick={handleAddWord} disabled={checkState === 'checking'} colorClass="bg-indigo-50 border-indigo-300 hover:bg-indigo-100 text-indigo-900" />)}
            </div>
          </MatrixSection>

          <MatrixSection 
            id="verbs" title="Actions" icon={Zap} 
            colorTheme={{ iconColor: 'text-amber-500', borderColor: 'border-amber-300' }}
            localPrompt={localPrompts.verbs}
            onPromptChange={(v) => setLocalPrompts(p => ({ ...p, verbs: v }))}
            onReroll={() => handleRerollSection('verbs')}
            isLoading={loadingSections.verbs}
          >
            <div className="bg-slate-50 rounded-xl border border-slate-100 p-2">
              <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-2">
                <span>⏳ Passato</span><span>🟢 Presente</span><span>🔮 Futuro</span>
              </div>
              <div className="space-y-2">
                {(matrixData?.verbs || []).map((verbRow, idx) => (
                  <div key={idx} className="grid grid-cols-3 gap-2">
                    <WordButton word={verbRow.past} onClick={handleAddWord} disabled={checkState === 'checking'} colorClass="bg-amber-50 border-amber-300 hover:bg-amber-100" />
                    <WordButton word={verbRow.present} onClick={handleAddWord} disabled={checkState === 'checking'} colorClass="bg-emerald-50 border-emerald-300 hover:bg-emerald-100" />
                    <WordButton word={verbRow.future} onClick={handleAddWord} disabled={checkState === 'checking'} colorClass="bg-blue-50 border-blue-300 hover:bg-blue-100" />
                  </div>
                ))}
              </div>
            </div>
          </MatrixSection>

          <MatrixSection 
            id="prepositions" title="Prepositions" icon={MapPin} 
            colorTheme={{ iconColor: 'text-fuchsia-500', borderColor: 'border-fuchsia-300' }}
            localPrompt={localPrompts.prepositions}
            onPromptChange={(v) => setLocalPrompts(p => ({ ...p, prepositions: v }))}
            onReroll={() => handleRerollSection('prepositions')}
            isLoading={loadingSections.prepositions}
          >
            <div className="flex flex-wrap gap-2">
              {(matrixData?.prepositions || []).map(word => <WordButton key={word.id} word={word} onClick={handleAddWord} disabled={checkState === 'checking'} colorClass="bg-fuchsia-50 border-fuchsia-300 hover:bg-fuchsia-100 text-fuchsia-900" />)}
            </div>
          </MatrixSection>

          <MatrixSection 
            id="nouns" title="Nouns" icon={Box} 
            colorTheme={{ iconColor: 'text-rose-500', borderColor: 'border-rose-300' }}
            localPrompt={localPrompts.nouns}
            onPromptChange={(v) => setLocalPrompts(p => ({ ...p, nouns: v }))}
            onReroll={() => handleRerollSection('nouns')}
            isLoading={loadingSections.nouns}
          >
            <div className="flex flex-wrap gap-2">
              {(matrixData?.nouns || []).map(word => <WordButton key={word.id} word={word} onClick={handleAddWord} disabled={checkState === 'checking'} colorClass="bg-rose-50 border-rose-300 hover:bg-rose-100 text-rose-900" />)}
            </div>
          </MatrixSection>

          <MatrixSection 
            id="adjectives" title="Adjectives" icon={Palette} 
            colorTheme={{ iconColor: 'text-teal-500', borderColor: 'border-teal-300' }}
            localPrompt={localPrompts.adjectives}
            onPromptChange={(v) => setLocalPrompts(p => ({ ...p, adjectives: v }))}
            onReroll={() => handleRerollSection('adjectives')}
            isLoading={loadingSections.adjectives}
          >
            <div className="flex flex-wrap gap-2">
              {(matrixData?.adjectives || []).map(word => <WordButton key={word.id} word={word} onClick={handleAddWord} disabled={checkState === 'checking'} colorClass="bg-teal-50 border-teal-300 hover:bg-teal-100 text-teal-900" />)}
            </div>
          </MatrixSection>
        </div>
      </div>

      <div className="absolute bottom-0 w-full bg-white border-t border-slate-200 shadow-[0_-15px_40px_rgba(0,0,0,0.1)] z-30 transition-all duration-300">
        <div className="p-4 pb-safe animate-in fade-in slide-in-from-bottom-2">
          
          {/* AI Feedback Panel (Visible if we have a result) */}
          {validationResult && (
            <div className="mb-4 animate-in slide-in-from-bottom-2">
              {validationResult.isCorrect ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-start gap-3">
                  <div className="bg-emerald-100 p-1.5 rounded-full text-emerald-600">
                    <Check size={16} />
                  </div>
                  <div>
                    <h4 className="font-bold text-emerald-900 text-xs uppercase tracking-wider">Perfect!</h4>
                    <p className="text-emerald-700 text-sm">{validationResult.explanation}</p>
                  </div>
                  <button onClick={() => setValidationResult(null)} className="ml-auto text-emerald-400 hover:text-emerald-600">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className="bg-orange-100 p-1.5 rounded-full text-orange-600">
                        <AlertCircle size={16} />
                      </div>
                      <h4 className="font-bold text-orange-900 text-xs uppercase tracking-wider">Suggestion</h4>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          const fixed = validationResult.corrected || validationResult.segments.map(s => s.text).join('');
                          setManualText(fixed);
                          if (mode === 'blocks') setMode('text');
                          setValidationResult(null);
                        }}
                        className="text-[10px] bg-orange-200 hover:bg-orange-300 text-orange-900 px-2 py-1 rounded-md font-bold flex items-center gap-1 transition-colors"
                      >
                        <Wand2 size={12} /> Apply Fix
                      </button>
                      <button onClick={() => setValidationResult(null)} className="text-orange-400 hover:text-orange-600">
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                  <p className="text-orange-800 text-xs mb-2 leading-relaxed">{validationResult.explanation}</p>
                  <div className="bg-white/60 border border-orange-100 rounded-lg p-2 font-serif text-base">
                    {validationResult.segments.map((s, i) => (
                      <span key={i} className={s.isCorrection ? "text-orange-600 bg-orange-50 px-0.5 rounded border-b-2 border-orange-200 font-bold" : ""}>
                        {s.text}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between items-end mb-2">
            <h2 className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-1">
              Sentence Assembly {mode === 'text' && <span className="text-slate-400 lowercase font-normal">(manual input)</span>}
            </h2>
            
            <div className="flex gap-4">
              {mode === 'blocks' ? (
                <button 
                  onClick={() => switchToText()} 
                  disabled={checkState === 'checking'}
                  className="text-xs font-bold text-blue-500 hover:text-blue-700 flex items-center gap-1 transition-colors disabled:opacity-50"
                >
                  <Edit2 size={12}/> To Text
                </button>
              ) : (
                <button 
                  onClick={() => setMode('blocks')} 
                  disabled={checkState === 'checking'}
                  className="text-xs font-bold text-blue-500 hover:text-blue-700 flex items-center gap-1 transition-colors disabled:opacity-50"
                >
                  <LayoutGrid size={12}/> To Blocks
                </button>
              )}
              
              {!isBuildingEmpty && (
                <button 
                  onClick={handleClear} 
                  disabled={checkState === 'checking'}
                  className="text-xs font-bold text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors disabled:opacity-50"
                >
                  <Trash2 size={12}/> Clear
                </button>
              )}
            </div>
          </div>
          
          {mode === 'blocks' ? (
            <div className="min-h-[56px] bg-slate-50 border border-slate-200 rounded-xl p-2 flex flex-wrap gap-2 items-center mb-4">
              {currentSentence.length === 0 ? (
                <span className="text-slate-400 text-sm italic w-full text-center">Click words above...</span>
              ) : (
                currentSentence.map((word, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => handleRemoveWord(idx)}
                    disabled={checkState === 'checking'}
                    className="bg-white border border-slate-300 px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors disabled:opacity-50"
                  >
                    {word.it}
                  </button>
                ))
              )}
            </div>
          ) : (
            <textarea
              value={manualText}
              disabled={checkState === 'checking'}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Type here or click words above..."
              className="w-full min-h-[64px] bg-white border border-slate-300 rounded-xl p-3 text-sm font-medium text-slate-800 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none mb-4 shadow-inner disabled:bg-slate-50 disabled:text-slate-400"
              rows={2}
            />
          )}

          <div className="flex gap-2">
            <button 
              onClick={handleCheckGrammar}
              disabled={isBuildingEmpty || checkState === 'checking'}
              className={`flex-[2] py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-200 ${
                !isBuildingEmpty && checkState !== 'checking'
                  ? 'bg-slate-900 hover:bg-black text-white shadow-lg active:scale-[0.98]' 
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              {checkState === 'checking' ? (
                <>
                  <Loader2 size={18} className="animate-spin text-blue-400" />
                  <span>Checking...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} className={!isBuildingEmpty ? "text-blue-400" : ""} />
                  <span>Check</span>
                </>
              )}
            </button>
            <button 
              onClick={() => {
                const textToAdd = mode === 'text' ? manualText.trim() : currentSentence.map(w => w.it).join(' ').trim();
                if (textToAdd) handleConfirmAndAdd(textToAdd);
              }}
              disabled={isBuildingEmpty || checkState === 'checking'}
              className={`flex-1 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-200 ${
                !isBuildingEmpty && checkState !== 'checking'
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg active:scale-[0.98]' 
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Send size={18} /> Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryMatrixEditor;
