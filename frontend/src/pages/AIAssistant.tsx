import React, { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '@/api/axios';
import { Bot, Send, Loader2, Sparkles, RefreshCw, User, TrendingUp, BookOpen, DollarSign } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const QUICK_QUESTIONS = [
  { icon: '💰', label: 'Bilan financier', prompt: 'Donne-moi un résumé du bilan financier de l\'établissement : recettes, dépenses et solde.' },
  { icon: '👥', label: 'Absences élèves', prompt: 'Quels sont les élèves qui ont le plus d\'absences ? Y a-t-il des classes particulièrement touchées ?' },
  { icon: '📊', label: 'Statistiques globales', prompt: 'Fais-moi un résumé complet des statistiques de l\'école : élèves, enseignants, classes, assiduité.' },
  { icon: '⏰', label: 'Pointage enseignants', prompt: 'Comment se porte le pointage des enseignants ? Y a-t-il des anomalies à signaler ?' },
  { icon: '📈', label: 'Tendances financières', prompt: 'Analyse les tendances financières et identifie les principaux postes de dépenses.' },
  { icon: '🎓', label: 'Performance académique', prompt: 'Quel est l\'état général de l\'établissement en termes de présence et d\'organisation pédagogique ?' },
];

export default function AIAssistant() {
  const { userProfile } = (useOutletContext<any>() || {}) as any;
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Bonjour ! Je suis votre assistant IA SeneSchool 🎓\n\nJe peux analyser les données de votre établissement et répondre à vos questions sur :\n• 💰 Les finances (recettes, dépenses, impayés)\n• 👥 Les absences et l'assiduité des élèves\n• ⏰ Le pointage des enseignants\n• 📊 Les statistiques générales\n\nQue souhaitez-vous savoir ?`,
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [schoolData, setSchoolData] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Charger les données contextuelles au démarrage
    api.get('core/stats/').then(r => setSchoolData(r.data)).catch(() => {});
  }, []);

  const buildContext = (schoolData: any) => {
    if (!schoolData) return '';
    const s = schoolData.stats || {};
    const cycles = (schoolData.cycles || []).map((c: any) => `${c.name}: ${c.students} élèves, ${c.teachers} enseignants`).join(' | ');
    return `
DONNÉES DE L'ÉTABLISSEMENT "${userProfile?.school_name || 'SeneSchool'}" :
- Élèves inscrits : ${s.total_students ?? '?'}
- Enseignants : ${s.total_teachers ?? '?'}
- Classes : ${s.total_classes ?? '?'}
- Recettes totales : ${(s.revenue ?? 0).toLocaleString()} FCFA
- Dépenses totales : ${(s.expenses ?? 0).toLocaleString()} FCFA
- Solde : ${(s.balance ?? 0).toLocaleString()} FCFA
- Frais scolaires impayés : ${s.unpaid_fees ?? 0}
- Absences aujourd'hui : ${s.today_absences ?? 0}
- Absences en attente de validation : ${s.pending_absences ?? 0}
- Pointages en attente de validation : ${s.pending_pointages ?? 0}
- Répartition par cycle : ${cycles || 'Non disponible'}
    `.trim();
  };

  const sendMessage = async (userMessage: string) => {
    if (!userMessage.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: userMessage, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const context = buildContext(schoolData);
      const systemPrompt = `Tu es un assistant IA expert en gestion scolaire pour l'application SeneSchool au Sénégal. Tu analyses les données d'un établissement scolaire et fournis des conseils professionnels, des analyses financières et des recommandations pédagogiques. Tu réponds toujours en français, de manière claire, structurée et actionnable. Tu utilises des émojis de manière appropriée pour rendre la réponse lisible. Voici les données actuelles de l'établissement :\n\n${context}`;

      const response = await api.post('core/ai-assistant/', {
        prompt: userMessage,
      });

      const assistantMsg: Message = {
        role: 'assistant',
        content: response.data.answer || 'Je n\'ai pas pu générer de réponse.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);

    } catch (err: any) {
      const errContent = err.response?.status === 404
        ? '⚠️ L\'intégration IA n\'est pas encore configurée sur le serveur. Veuillez configurer la clé API Grok dans les paramètres du backend.'
        : '❌ Erreur lors de la communication avec l\'assistant IA. Vérifiez votre connexion.';
      setMessages(prev => [...prev, { role: 'assistant', content: errContent, timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const clearConversation = () => {
    setMessages([{
      role: 'assistant',
      content: 'Conversation réinitialisée. Comment puis-je vous aider ?',
      timestamp: new Date(),
    }]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-violet-500 to-blue-600 rounded-xl text-white">
              <Sparkles className="w-6 h-6" />
            </div>
            Assistant IA SeneSchool
          </h2>
          <p className="text-slate-500 font-medium mt-1">Analysez vos données avec l'intelligence artificielle</p>
        </div>
        <button onClick={clearConversation} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
          <RefreshCw className="w-4 h-4" />
          Nouvelle conversation
        </button>
      </div>

      {/* Quick Questions */}
      <div className="flex-shrink-0">
        <p className="text-xs font-bold text-slate-400 uppercase mb-2">Questions rapides</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_QUESTIONS.map(q => (
            <button
              key={q.prompt}
              onClick={() => sendMessage(q.prompt)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors disabled:opacity-50"
            >
              <span>{q.icon}</span> {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'assistant' ? 'bg-gradient-to-br from-violet-500 to-blue-600' : 'bg-slate-200'}`}>
                {msg.role === 'assistant' ? <Bot className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-slate-600" />}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'assistant' ? 'bg-slate-50 border border-slate-100 text-slate-800' : 'bg-blue-600 text-white'}`}>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                <p className={`text-[10px] mt-1.5 ${msg.role === 'assistant' ? 'text-slate-400' : 'text-blue-200'}`}>
                  {msg.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span className="text-sm text-slate-500">L'assistant réfléchit...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-slate-100 p-4">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Posez votre question sur les données de l'établissement..."
              disabled={loading}
              className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 bg-slate-50 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl transition-colors flex items-center gap-2 font-bold"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <p className="text-[10px] text-slate-400 mt-2 text-center">
            L'IA analyse les données en temps réel de votre établissement · Propulsé par Grok (xAI)
          </p>
        </div>
      </div>
    </div>
  );
}
