import { useEffect, useState } from 'react';
import api from '@/api/axios';
import { Send, History, MessageSquare, CheckCircle, XCircle, Clock, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Comms() {
  const [logs, setLogs] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [message, setMessage] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [recipientType, setRecipientType] = useState('CLASS'); // 'CLASS' or 'ALL'

  const fetchData = async () => {
    setLoading(true);
    try {
      const [logsRes, classRes] = await Promise.all([
        api.get('core/sms/logs/'),
        api.get('core/classrooms/')
      ]);
      setLogs(logsRes.data);
      setClassrooms(classRes.data);
    } catch (error) {
      console.error("Erreur de chargement", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSendSMS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message) return;
    
    setSubmitting(true);
    try {
      let recipients: string[] = [];
      const usersRes = await api.get('auth/users/');
      
      if (recipientType === 'CLASS' && selectedClass) {
        // 1. Récupérer les ID des élèves inscrits dans cette classe
        const enrollRes = await api.get(`students/enrollments/?classroom=${selectedClass}`);
        const studentIds = enrollRes.data.map((enroll: any) => enroll.student);
        
        // 2. Récupérer les parents liés à ces élèves
        const parents = usersRes.data.filter((u: any) => u.role === 'PARENT');
        recipients = parents
          .filter((p: any) => p.children && p.children.some((childId: number) => studentIds.includes(childId)))
          .map((p: any) => p.phone_number)
          .filter(Boolean);
      } else {
        // Envoi d'urgence à tous les parents et enseignants
        recipients = usersRes.data
          .filter((u: any) => (u.role === 'PARENT' || u.role === 'ENSEIGNANT') && u.phone_number)
          .map((u: any) => u.phone_number)
          .filter(Boolean);
      }

      if (recipients.length === 0) {
        alert("Aucun numéro de téléphone trouvé pour cette sélection.");
        setSubmitting(false);
        return;
      }

      await api.post('core/sms/send-bulk/', {
        recipients,
        message
      });

      alert(`Campagne SMS lancée avec succès auprès de ${recipients.length} destinataires !`);
      setMessage('');
      fetchData();
    } catch (error) {
      alert("Erreur lors de l'envoi des SMS.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Centre de Communication SMS</h2>
        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg flex items-center text-sm font-medium border border-blue-100">
          <Clock className="w-4 h-4 mr-2" />
          Solde : 1 250 Crédits
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulaire d'envoi */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <Send className="w-5 h-5 mr-2 text-blue-600" />
              Envoyer un message
            </h3>
            
            <form onSubmit={handleSendSMS} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Destinataires</label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                   <button 
                    type="button"
                    onClick={() => setRecipientType('CLASS')}
                    className={`px-3 py-2 text-xs font-bold rounded-md border ${recipientType === 'CLASS' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}
                   >
                     Par Classe
                   </button>
                   <button 
                    type="button"
                    onClick={() => setRecipientType('ALL')}
                    className={`px-3 py-2 text-xs font-bold rounded-md border ${recipientType === 'ALL' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}
                   >
                     Urgence (Tous)
                   </button>
                </div>
                
                {recipientType === 'CLASS' && (
                  <select 
                    className="w-full border rounded-md p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    required
                  >
                    <option value="">Choisir une classe...</option>
                    {classrooms.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message (Max 160 chars)</label>
                <textarea 
                  className="w-full border rounded-md p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 h-32"
                  placeholder="Tapez votre message ici..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={160}
                  required
                />
                <div className="flex justify-between mt-1">
                   <span className="text-[10px] text-gray-400">{message.length}/160 caractères</span>
                   <span className="text-[10px] text-gray-400">1 SMS = 1 crédit</span>
                </div>
              </div>

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 font-bold" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Diffuser le message
              </Button>
            </form>
          </div>

          <div className="bg-slate-900 rounded-xl p-6 text-white overflow-hidden relative">
             <div className="absolute -right-4 -bottom-4 opacity-10">
                <MessageSquare className="w-24 h-24" />
             </div>
             <h4 className="font-bold text-sm mb-2">💡 Astuce</h4>
             <p className="text-xs text-slate-300 leading-relaxed">
               Les SMS d'absence sont envoyés automatiquement dès que vous validez l'appel en classe. Vous n'avez pas besoin de les envoyer manuellement d'ici.
             </p>
          </div>
        </div>

        {/* Historique */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <History className="w-5 h-5 mr-2 text-slate-400" />
                Historique des envois
              </h3>
              <Button variant="ghost" size="sm" onClick={fetchData}><RefreshCw className="w-4 h-4" /></Button>
            </div>
            
            <div className="flex-1 overflow-auto max-h-[600px]">
              {loading ? (
                <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
              ) : logs.length === 0 ? (
                <div className="p-20 text-center text-gray-400 italic">
                   <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
                   Aucun SMS envoyé pour le moment.
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase">Destinataire</th>
                      <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase">Message</th>
                      <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {logs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.recipient_number}</td>
                        <td className="px-6 py-4 text-xs text-gray-600 max-w-xs truncate">{log.message}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-[10px] text-gray-500">
                          {new Date(log.sent_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {log.status === 'SENT' ? (
                            <span className="flex items-center text-green-600 text-[10px] font-bold">
                              <CheckCircle className="w-3 h-3 mr-1" /> ENVOYÉ
                            </span>
                          ) : (
                            <span className="flex items-center text-red-600 text-[10px] font-bold">
                              <XCircle className="w-3 h-3 mr-1" /> ÉCHEC
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
