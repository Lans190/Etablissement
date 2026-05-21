import { useEffect, useState } from 'react';
import api from '@/api/axios';
import { BookOpen, Calendar, Plus, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Diary() {
  const [userProfile] = useState(() => JSON.parse(localStorage.getItem('user_profile') || '{}'));
  const canEdit = ['ADMIN', 'DIRECTION', 'ENSEIGNANT'].includes(userProfile?.role);

  const [entries, setEntries] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    allocation: '',
    date: new Date().toISOString().split('T')[0],
    title: '',
    content: '',
    homework: '',
    status: 'PUBLISHED',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [diaryRes, allocRes] = await Promise.all([
        api.get('academics/diary/'),
        api.get('academics/allocations/')
      ]);
      setEntries(diaryRes.data);
      setAllocations(allocRes.data);
    } catch (error) {
      console.error("Erreur lors du chargement des données", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.allocation) {
      alert("Veuillez sélectionner une matière/classe.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post('academics/diary/', formData);
      setShowModal(false);
      setFormData({
        allocation: '',
        date: new Date().toISOString().split('T')[0],
        title: '',
        content: '',
        homework: '',
        status: 'PUBLISHED',
      });
      fetchData();
    } catch (error) {
      alert("Erreur lors de l'enregistrement de la leçon.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Cahier de Texte</h2>
        {canEdit && (
          <Button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle Leçon
          </Button>
        )}
      </div>

      {/* Modal Nouvelle Leçon */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Saisir une leçon</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleCreateEntry} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Cours (Matière - Classe)</label>
                  <select 
                    required
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={formData.allocation}
                    onChange={(e) => setFormData({...formData, allocation: e.target.value})}
                  >
                    <option value="">Sélectionnez un cours...</option>
                    {allocations.map((alloc: any) => (
                      <option key={alloc.id} value={alloc.id}>
                        {alloc.subject_name} - {alloc.classroom_name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date</label>
                  <input
                    type="date"
                    required
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Titre de la leçon</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Les fractions"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Contenu du cours</label>
                  <textarea
                    required
                    rows={4}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Travail à faire (Devoirs)</label>
                  <textarea
                    rows={2}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-orange-50/50"
                    value={formData.homework}
                    onChange={(e) => setFormData({...formData, homework: e.target.value})}
                  />
                </div>
              </div>

              <div className="pt-4 flex space-x-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowModal(false)}
                >
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Publier la leçon"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Aucune leçon enregistrée</h3>
          <p className="mt-1 text-gray-500">Cliquez sur "Nouvelle Leçon" pour commencer.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry: any) => (
            <div key={entry.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-slate-50 border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center text-blue-600 font-medium bg-blue-50 px-3 py-1 rounded-full text-sm">
                    <BookOpen className="w-4 h-4 mr-2" />
                    {entry.subject_name}
                  </div>
                  <div className="flex items-center text-gray-500 text-sm">
                    <Calendar className="w-4 h-4 mr-2" />
                    {entry.date}
                  </div>
                </div>
                <div className="text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1 rounded-full">
                  Classe : {entry.classroom_name}
                </div>
              </div>
              <div className="px-6 py-5 space-y-4">
                <h4 className="text-lg font-semibold text-gray-900">{entry.title}</h4>
                <div className="text-gray-600 whitespace-pre-wrap">{entry.content}</div>
                
                {entry.homework && (
                  <div className="mt-4 bg-orange-50 rounded-lg p-4 border border-orange-100">
                    <h5 className="text-sm font-semibold text-orange-800 mb-2">Travail à faire :</h5>
                    <p className="text-sm text-orange-700">{entry.homework}</p>
                  </div>
                )}
                
                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    Dispensé par : {entry.teacher_name}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${entry.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {entry.status === 'PUBLISHED' ? 'Publié' : 'Brouillon'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
