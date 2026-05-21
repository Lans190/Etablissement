import { useEffect, useState } from 'react';
import api from '@/api/axios';
import { Award, FileText, Download, CheckCircle, Eye, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Bulletins() {
  const [reportCards, setReportCards] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [generating, setGenerating] = useState(false);

  const [userProfile] = useState(() => JSON.parse(localStorage.getItem('user_profile') || '{}'));
  const canManage = ['ADMIN', 'DIRECTION'].includes(userProfile?.role);
  const isTeacher = userProfile?.role === 'ENSEIGNANT';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reportsRes, classRes, termsRes] = await Promise.all([
        api.get('evaluations/report-cards/'),
        api.get('core/classrooms/'),
        api.get('evaluations/terms/')
      ]);
      setReportCards(reportsRes.data);
      setClassrooms(classRes.data);
      setTerms(termsRes.data);
      
      if (classRes.data.length > 0) setSelectedClass(classRes.data[0].id.toString());
      if (termsRes.data.length > 0) setSelectedTerm(termsRes.data[0].id.toString());
    } catch (error) {
      console.error("Erreur", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGenerate = async () => {
    if (!selectedClass || !selectedTerm) return;
    setGenerating(true);
    try {
      await api.post('evaluations/report-cards/generate-reports/', {
        classroom_id: selectedClass,
        term_id: selectedTerm
      });
      fetchData();
      alert("Bulletins initialisés avec succès !");
    } catch (error) {
      alert("Erreur lors de la génération.");
    } finally {
      setGenerating(false);
    }
  };

  const publishBulletin = async (id: number, status: boolean) => {
    try {
      await api.patch(`evaluations/report-cards/${id}/`, { is_published: status });
      fetchData();
    } catch (error) {
      alert("Erreur de publication.");
    }
  };

  const downloadPDF = async (id: number) => {
    try {
      const response = await api.get(`evaluations/report-cards/${id}/pdf/`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bulletin_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      alert("Erreur lors du téléchargement.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
           <h2 className="text-2xl font-bold text-gray-900">Bulletins de Notes</h2>
           <p className="text-sm text-gray-500">Gérez l'édition et la publication des bulletins officiels.</p>
        </div>
        {canManage && (
           <div className="flex space-x-3 items-end">
              <div className="flex flex-col">
                 <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">Classe</label>
                 <select className="border rounded-lg px-3 py-2 text-sm" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                    {classrooms.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                 </select>
              </div>
              <div className="flex flex-col">
                 <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">Période</label>
                 <select className="border rounded-lg px-3 py-2 text-sm" value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}>
                    {terms.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                 </select>
              </div>
              <Button onClick={handleGenerate} disabled={generating} className="bg-blue-600 hover:bg-blue-700">
                 {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                 Générer
              </Button>
           </div>
        )}
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden">
         <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-slate-50">
               <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Élève</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">Moyenne</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">Statut</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
               {reportCards.map((rc: any) => (
                  <tr key={rc.id} className="hover:bg-slate-50/50 transition-colors">
                     <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{rc.enrollment_name || rc.id}</td>
                     <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`font-bold ${rc.general_average >= 10 ? 'text-green-600' : 'text-red-600'}`}>
                           {rc.general_average ? rc.general_average.toFixed(2) : '-'} / 20
                        </span>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-center">
                        {rc.is_published ? (
                           <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" /> Publié
                           </span>
                        ) : (
                           <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              Brouillon
                           </span>
                        )}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                        <button onClick={() => downloadPDF(rc.id)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                           <Download className="w-5 h-5" />
                        </button>
                        {canManage && (
                           <button 
                            onClick={() => publishBulletin(rc.id, !rc.is_published)}
                            className={`p-2 rounded-lg ${rc.is_published ? 'text-amber-600 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'}`}
                            title={rc.is_published ? "Dépublier" : "Publier"}
                           >
                              <Eye className="w-5 h-5" />
                           </button>
                        )}
                     </td>
                  </tr>
               ))}
            </tbody>
         </table>
         {loading && <div className="p-10 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>}
      </div>
    </div>
  );
}
