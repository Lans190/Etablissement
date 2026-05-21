import { useEffect, useState } from 'react';
import api from '@/api/axios';
import { Plus, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Pointage() {
  const [pointages, setPointages] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  const [userProfile] = useState(() => JSON.parse(localStorage.getItem('user_profile') || '{}'));
  const isAdmin = ['ADMIN', 'DIRECTION'].includes(userProfile?.role);

  const [formData, setFormData] = useState({
    classroom: '',
    subject: '',
    hours_count: 1,
    topic: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes, cRes, sRes] = await Promise.all([
        api.get('academics/pointages/'),
        api.get('core/classrooms/'),
        api.get('academics/subjects/')
      ]);
      setPointages(pRes.data);
      setClassrooms(cRes.data);
      setSubjects(sRes.data);
    } catch (error) {
      console.error("Erreur pointage", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('academics/pointages/', formData);
      setShowModal(false);
      fetchData();
    } catch (error) {
      alert("Erreur lors de l'enregistrement du pointage.");
    }
  };

  const validatePointage = async (id: number) => {
    try {
      await api.patch(`academics/pointages/${id}/`, { is_validated: true });
      fetchData();
    } catch (error) {
      alert("Erreur de validation.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pointage des Heures</h2>
          <p className="text-sm text-gray-500">Suivi des heures de cours effectuées par les enseignants.</p>
        </div>
        {!isAdmin && (
          <Button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Enregistrer ma séance
          </Button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date</th>
              {isAdmin && <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Enseignant</th>}
              <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Matière / Classe</th>
              <th className="px-6 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Heures</th>
              <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sujet</th>
              <th className="px-6 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Statut</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {pointages.map((p: any) => (
              <tr key={p.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{p.date}</td>
                {isAdmin && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.teacher_name}</td>}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-bold text-slate-900">{p.subject_name}</div>
                  <div className="text-xs text-slate-500">{p.classroom_name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center font-bold text-blue-600">{p.hours_count}h</td>
                <td className="px-6 py-4 text-sm text-gray-500">{p.topic || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {p.is_validated ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" /> Validé
                    </span>
                  ) : (
                    isAdmin ? (
                      <button 
                        onClick={() => validatePointage(p.id)}
                        className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-bold hover:bg-blue-100 transition-colors"
                      >
                        Valider
                      </button>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        En attente
                      </span>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <div className="p-10 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold">Enregistrer une séance</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Matière</label>
                <select required className="w-full border rounded-md p-2" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})}>
                  <option value="">Choisir...</option>
                  {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Classe</label>
                <select required className="w-full border rounded-md p-2" value={formData.classroom} onChange={e => setFormData({...formData, classroom: e.target.value})}>
                  <option value="">Choisir...</option>
                  {classrooms.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nombre d'heures</label>
                <input type="number" min="1" max="10" className="w-full border rounded-md p-2" value={formData.hours_count} onChange={e => setFormData({...formData, hours_count: parseInt(e.target.value)})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Chapitre abordé</label>
                <input type="text" className="w-full border rounded-md p-2" value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})} />
              </div>
              <div className="flex pt-4 space-x-3">
                <Button type="button" variant="ghost" className="flex-1" onClick={() => setShowModal(false)}>Annuler</Button>
                <Button type="submit" className="flex-1 bg-blue-600">Enregistrer</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
