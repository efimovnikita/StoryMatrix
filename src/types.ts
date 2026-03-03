export enum GameState {
  SETUP = 'SETUP',
  LOADING = 'LOADING',
  PLAYING = 'PLAYING',
  EVALUATING = 'EVALUATING',
  REVIEW = 'REVIEW',
  ERROR = 'ERROR'
}

export interface WordPair {
  id: string;
  it: string;
  ru: string;
}

export interface VerbRow {
  group: string;
  past: WordPair;
  present: WordPair;
  future: WordPair;
}

export interface MatrixData {
  connectors: WordPair[];
  subjects: WordPair[];
  verbs: VerbRow[];
  prepositions: WordPair[];
  nouns: WordPair[];
  adjectives: WordPair[];
}

export interface TextSegment {
  text: string;
  isCorrection: boolean;
}

export interface SentenceAnalysis {
  original: string;
  segments: TextSegment[];
  englishTranslation?: string;
  isCorrect?: boolean;
  explanation?: string;
  corrected?: string;
}

export interface EvaluationResult {
  score: number;
  usedWords: string[];
  missingWords: string[];
  logicalConsistency: string;
  grammarFeedback: string;
  creativityComment: string;
}

export interface StoryConfig {
  theme: string;
  mode: 'thematic' | 'random';
}

export interface MatrixState {
  settings: {
    mistralApiKey: string;
    targetLanguage: string;
    nativeLanguage: string;
  };
  session: {
    globalDirection: string;
    localPrompts: {
      connectors: string;
      subjects: string;
      verbs: string;
      prepositions: string;
      nouns: string;
      adjectives: string;
    };
    storyLog: string[];
    currentMatrix: MatrixData;
  };
}
