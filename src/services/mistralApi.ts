import { MatrixData, SentenceAnalysis, EvaluationResult } from '../types';

const MODEL_NAME = 'mistral-large-latest';

const getApiKey = () => localStorage.getItem('mistral_api_key') || '';

const cleanJson = (text: string) => {
  // Remove markdown code blocks if present
  return text.replace(/```json\n?|```/g, '').trim();
};

const callMistral = async (messages: any[], responseFormat: any = { type: 'json_object' }) => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('API Key missing. Please check settings.');

  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: MODEL_NAME,
      messages,
      response_format: responseFormat,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || `Mistral API error (${response.status})`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  if (!content) throw new Error('Empty response from AI');

  try {
    return JSON.parse(cleanJson(content));
  } catch (e) {
    console.error("JSON Parse failed", content);
    throw new Error('AI returned invalid data format');
  }
};

export const generateMatrix = async (
  storyLog: string[],
  globalDirection: string,
  localPrompts: any,
  sectionsToUpdate: string[]
): Promise<Partial<MatrixData>> => {
  const prompt = `
    You are an Italian language teacher. Generate new vocabulary for language learning based on the current story and vector.
    
    Story so far: "${storyLog.join(' ')}"
    Overall vector: "${globalDirection}"
    Local constraints: ${JSON.stringify(localPrompts)}
    Sections to generate: ${sectionsToUpdate.join(', ')}

    RULES:
    1. Russian translation (ru) must be strictly 1-2 words.
    2. Verbs must return 3 tenses (past, present, future). Match the person to the story context (default 1st person singular 'Io').
    3. Return strictly JSON.

    Expected structure (only for requested sections):
    {
      "nouns": [{ "id": "n1", "it": "il corridoio", "ru": "коридор" }],
      "verbs": [{
        "group": "бежать",
        "past": { "id": "v1_p", "it": "sono scappato", "ru": "убежал" },
        "present": { "id": "v1_pr", "it": "scappo", "ru": "убегаю" },
        "future": { "id": "v1_f", "it": "scapperò", "ru": "убегу" }
      }],
      ...other sections
    }
  `;

  return await callMistral([
    { role: 'system', content: 'You are a helpful language teacher generating structured JSON vocabulary.' },
    { role: 'user', content: prompt }
  ]);
};

export const analyzeSentence = async (sentence: string): Promise<SentenceAnalysis> => {
  const prompt = `
    Analyze this Italian sentence: "${sentence}".
    1. Check for grammar, spelling, or unnatural choice.
    2. Return a corrected version if needed.
    3. Break into segments: unchanged (isCorrection: false) and changed/fixed (isCorrection: true).
    4. Provide explanation and a flag "isCorrect".
    
    Expected structure:
    {
      "isCorrect": boolean,
      "original": "string",
      "corrected": "string",
      "explanation": "string (in Russian)",
      "segments": [
        { "text": "string", "isCorrection": boolean }
      ],
      "englishTranslation": "string"
    }
  `;

  return await callMistral([
    { role: 'system', content: 'You are an Italian grammar checker. Respond in JSON.' },
    { role: 'user', content: prompt }
  ], { type: 'json_object' });
};

export const evaluateStory = async (story: string, presentedWords: string[]): Promise<EvaluationResult> => {
  const prompt = `
    Analyze this Italian story.
    Target words to include: ${JSON.stringify(presentedWords)}.
    Story: "${story}"

    Tasks:
    1. Score 0-100.
    2. Check used/missing target words.
    3. Provide feedback in Russian.
    
    Return JSON: { score, usedWords, missingWords, logicalConsistency, grammarFeedback, creativityComment }
  `;

  return await callMistral([
    { role: 'system', content: 'You are an Italian teacher evaluating a story. Respond in JSON.' },
    { role: 'user', content: prompt }
  ]);
};
