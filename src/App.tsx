import React, { useState, useEffect } from 'react';
import { GameState, StoryConfig, MatrixState, MatrixData } from './types';
import { analyzeSentence, generateMatrix, evaluateStory } from './services/mistralApi';
import { Settings, BookOpen, Sparkles, KeyRound, PenLine, Shuffle, Loader2, AlertCircle } from 'lucide-react';
import StoryMatrixEditor from './components/StoryMatrixEditor';

const APP_VERSION = "0.1.0";

const SetupScreen: React.FC<{ onStart: (config: StoryConfig) => void }> = ({ onStart }) => {
  const [theme, setTheme] = useState('');
  const [apiKey, setApiKey] = useState(localStorage.getItem('mistral_api_key') || '');
  const [showSettings, setShowSettings] = useState(!apiKey);

  const handleStart = () => {
    if (theme.trim() && apiKey.trim()) {
      localStorage.setItem('mistral_api_key', apiKey);
      onStart({ theme, mode: 'thematic' });
    }
  };

  return (
    <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-indigo-50 relative animate-in fade-in slide-in-from-bottom-4">
      <div className="absolute top-6 right-6">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded-full transition-colors ${showSettings ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:bg-gray-100'}`}
        >
          <Settings size={20} />
        </button>
      </div>

      <div className="text-center mb-8">
        <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-4 text-indigo-600">
          <BookOpen size={32} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">StoryMatrix</h1>
        <p className="text-gray-500 text-sm">Build your Italian story with an AI-powered matrix.</p>
      </div>

      <div className="space-y-6">
        {showSettings && (
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-4">
            <div className="flex items-center gap-2 mb-2 text-slate-700 font-medium text-sm">
              <KeyRound size={16} />
              <span>Mistral API Key</span>
            </div>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Mistral API key..."
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500/20 outline-none"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">What is your story about?</label>
          <input
            type="text"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="e.g. A mysterious murder in Venice..."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleStart()}
          />
        </div>

        <button
          onClick={handleStart}
          disabled={!theme.trim() || !apiKey.trim()}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200"
        >
          Start Writing <Sparkles size={18} />
        </button>
      </div>
      
      <div className="mt-8 text-center">
        <span className="text-xs text-gray-400 font-medium tracking-wider">v{APP_VERSION}</span>
      </div>
    </div>
  );
};

const App = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.SETUP);
  const [config, setConfig] = useState<StoryConfig | null>(null);
  const [matrixData, setMatrixData] = useState<MatrixData | null>(null);
  const [storyLog, setStoryLog] = useState<string[]>([]);

  const handleStart = async (newConfig: StoryConfig) => {
    setConfig(newConfig);
    setGameState(GameState.LOADING);

    try {
      const initialMatrix = await generateMatrix([], newConfig.theme, {}, [
        'connectors', 'subjects', 'verbs', 'prepositions', 'nouns', 'adjectives'
      ]);
      setMatrixData(initialMatrix as MatrixData);
      setGameState(GameState.PLAYING);
    } catch (error: any) {
      console.error("Failed to start", error);
      alert(error.message);
      setGameState(GameState.SETUP);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-0 md:p-4">
      {gameState === GameState.SETUP && <SetupScreen onStart={handleStart} />}
      
      {gameState === GameState.LOADING && (
        <div className="flex flex-col items-center">
          <Loader2 size={48} className="animate-spin text-indigo-600 mb-4" />
          <p className="text-slate-600 font-medium">Generating your word matrix...</p>
        </div>
      )}

      {gameState === GameState.PLAYING && matrixData && config && (
        <StoryMatrixEditor 
          initialData={matrixData}
          storyTheme={config.theme}
          onExit={() => setGameState(GameState.SETUP)}
        />
      )}
    </div>
  );
};

export default App;
