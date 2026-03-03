import React from 'react';
import { WordPair } from '../types';

interface WordButtonProps {
  word: WordPair;
  colorClass: string;
  onClick: (word: WordPair) => void;
  disabled?: boolean;
}

const WordButton: React.FC<WordButtonProps> = ({ word, colorClass, onClick, disabled }) => (
  <button 
    onClick={() => onClick(word)}
    disabled={disabled}
    className={`flex flex-col items-center justify-center p-2 rounded-xl border-b-4 active:border-b-0 active:translate-y-1 transition-all ${
      disabled ? 'opacity-50 cursor-not-allowed bg-slate-100 border-slate-200' : colorClass
    }`}
  >
    <span className="font-bold text-slate-800 text-sm md:text-base">{word.it}</span>
    <span className="text-[10px] text-slate-500 opacity-90 mt-0.5">{word.ru}</span>
  </button>
);

export default WordButton;
