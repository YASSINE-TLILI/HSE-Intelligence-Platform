import { apiRequest } from '../services';

export function useAIStub() {
  const analyzeDescription = (description: string) =>
    apiRequest('/api/ai/analyze-description', {
      method: 'POST',
      body: JSON.stringify({ description }),
    });

  const analyzeImage = () =>
    apiRequest('/api/ai/analyze-image', { method: 'POST' });

  const safetyScoreInsights = () =>
    apiRequest('/api/ai/safety-score', { method: 'POST' });

  return { analyzeDescription, analyzeImage, safetyScoreInsights };
}