import React, { useState } from 'react';
import { useAIStub } from '../../hooks';

export default function AIInsightsPanel() {
  const { analyzeDescription, analyzeImage, safetyScoreInsights } = useAIStub();
  const [description, setDescription] = useState('Fuite chimique observée près de la zone de stockage');
  const [result, setResult]           = useState<any>(null);
  const [error, setError]             = useState('');

  const runDescription = async () => {
    try { setError(''); setResult(await analyzeDescription(description)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erreur IA description'); }
  };

  const runImage = async () => {
    try { setError(''); setResult(await analyzeImage()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erreur IA image'); }
  };

  const runSafety = async () => {
    try { setError(''); setResult(await safetyScoreInsights()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erreur IA safety'); }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <h2 className="text-xl font-bold text-slate-900 mb-4">AI Insights (Stub)</h2>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full mb-3 border rounded-lg px-3 py-2" />
      <div className="flex flex-wrap gap-2 mb-3">
        <button type="button" onClick={() => void runDescription()} className="px-3 py-2 rounded-lg bg-blue-600 text-white">Analyze Description</button>
        <button type="button" onClick={() => void runImage()}       className="px-3 py-2 rounded-lg bg-indigo-600 text-white">Analyze Image</button>
        <button type="button" onClick={() => void runSafety()}      className="px-3 py-2 rounded-lg bg-cyan-600 text-white">Safety Insights</button>
      </div>
      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
      <pre className="text-xs bg-slate-50 p-3 rounded-lg border border-slate-200 overflow-auto">
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
}