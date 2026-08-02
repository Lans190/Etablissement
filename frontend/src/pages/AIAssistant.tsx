import React, { useState } from 'react';
import api from '@/api/axios';
import { 
  Sparkles, Brain, Cpu, FileText, ArrowRight, Loader2, 
  Activity, ShieldAlert, BadgeInfo, CheckCircle, Printer
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AIAssistant() {
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [provider, setProvider] = useState<string>('');

  const steps = [
    "Agrégation des effectifs scolaires...",
    "Extraction du bilan comptable (recettes & dépenses)...",
    "Calcul du taux de recouvrement des frais...",
    "Analyse de la courbe d'absentéisme des élèves...",
    "Génération des recommandations via Grok AI..."
  ];

  const runAnalysis = async () => {
    setLoading(true);
    setAnalysis('');
    setProvider('');

    // Simulate steps for a high-fidelity visual experience
    for (let i = 0; i < steps.length; i++) {
      setCurrentStep(steps[i]);
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    try {
      const response = await api.get('core/grok-analysis/');
      setAnalysis(response.data.analysis);
      setProvider(response.data.provider);
    } catch (error) {
      console.error(error);
      setAnalysis("### ❌ Erreur d'analyse\nImpossible de contacter le service d'analyse SeneSchool AI pour le moment. Veuillez réessayer plus tard.");
    } finally {
      setLoading(false);
    }
  };

  const printAnalysis = () => {
    window.print();
  };

  // Convert basic markdown format to HTML elements manually to avoid heavy libraries
  const renderMarkdown = (text: string) => {
    if (!text) return null;
    
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Headers
      if (line.startsWith('### ')) {
        return <h3 key={idx} className="text-lg font-extrabold text-slate-800 mt-6 mb-2 border-b pb-1">{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('#### ')) {
        return <h4 key={idx} className="text-base font-bold text-slate-800 mt-4 mb-2">{line.replace('#### ', '')}</h4>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={idx} className="text-xl font-black text-slate-900 mt-8 mb-3">{line.replace('## ', '')}</h2>;
      }
      // List items
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const content = line.substring(2);
        return (
          <li key={idx} className="ml-6 list-disc text-sm text-slate-600 my-1 leading-relaxed">
            {parseBoldText(content)}
          </li>
        );
      }
      if (/^\d+\.\s/.test(line)) {
        const content = line.replace(/^\d+\.\s/, '');
        return (
          <li key={idx} className="ml-6 list-decimal text-sm text-slate-600 my-1 leading-relaxed">
            {parseBoldText(content)}
          </li>
        );
      }
      // Empty lines
      if (line.trim() === '') {
        return <div key={idx} className="h-2"></div>;
      }
      // Normal paragraph
      return (
        <p key={idx} className="text-sm text-slate-600 leading-relaxed my-2">
          {parseBoldText(line)}
        </p>
      );
    });
  };

  // Helper to parse **bold** and *italic* text
  const parseBoldText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-extrabold text-slate-900">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={i} className="italic text-slate-700">{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center">
            <Brain className="w-8 h-8 mr-3 text-indigo-600" />
            Audit & Assistant IA (Grok)
          </h2>
          <p className="text-slate-500 font-medium">Analysez vos indicateurs de performance scolaire, financière et d'assiduité.</p>
        </div>
      </div>

      {/* Intro Card */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-blue-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden print:hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -z-10"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-lg">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-white/10 text-xs font-bold text-indigo-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Grok AI Engine actif</span>
            </div>
            <h3 className="text-2xl font-black">Besoin d'un audit de rentabilité et d'assiduité ?</h3>
            <p className="text-slate-300 text-xs leading-relaxed">
              SeneSchool AI croise les paiements en attente, le taux d'absentéisme des élèves et l'activité des professeurs pour vous fournir des conseils stratégiques exploitables.
            </p>
          </div>
          <div>
            <Button 
              onClick={runAnalysis} 
              disabled={loading} 
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-5 rounded-xl shadow-lg shadow-indigo-500/20 w-full md:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Audit en cours...
                </>
              ) : (
                <>
                  Lancer l'Audit IA
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Loading Steps Indicator */}
      {loading && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 print:hidden animate-pulse">
          <div className="flex items-center space-x-3 text-indigo-600 font-bold text-sm">
            <Cpu className="w-5 h-5 animate-spin" />
            <span>{currentStep}</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600 rounded-full animate-infinite-loading w-2/3"></div>
          </div>
        </div>
      )}

      {/* Analysis Result */}
      {analysis && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Header toolbar */}
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between print:hidden">
            <div className="flex items-center space-x-2 text-slate-500 text-xs font-bold">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span>Diagnostic généré via : <b className="text-slate-700">{provider}</b></span>
            </div>
            <Button variant="outline" size="sm" onClick={printAnalysis} className="h-8 px-3 text-xs border-slate-200">
              <Printer className="w-3.5 h-3.5 mr-2" />
              Imprimer le rapport
            </Button>
          </div>

          {/* Styled document content */}
          <div className="p-8 md:p-12 space-y-4 print:p-0 print:shadow-none bg-white">
            {/* School header visible ONLY in print */}
            <div className="hidden print:block border-b pb-4 mb-6 text-center">
              <h1 className="text-xl font-bold text-slate-900 uppercase">Rapport Pédagogique &amp; Financier</h1>
              <p className="text-xs text-slate-400">Généré par l'Intelligence Artificielle SeneSchool le {new Date().toLocaleDateString('fr-FR')}</p>
            </div>

            <div className="prose max-w-none">
              {renderMarkdown(analysis)}
            </div>
          </div>
        </div>
      )}

      {!analysis && !loading && (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 print:hidden">
          <Brain className="w-12 h-12 mx-auto mb-3 opacity-20 text-indigo-600" />
          <p className="font-bold text-sm text-slate-600">Aucun audit disponible</p>
          <p className="text-xs max-w-xs mx-auto mt-1">Cliquez sur le bouton ci-dessus pour compiler les données d'établissement et lancer l'intelligence artificielle.</p>
        </div>
      )}
    </div>
  );
}
