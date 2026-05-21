import { useEffect, useState } from 'react';
import api from '@/api/axios';
import { FileText, Download, Plus, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Resources() {
  const [resources, setResources] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [userProfile] = useState(() => JSON.parse(localStorage.getItem('user_profile') || '{}'));
  const canUpload = ['ADMIN', 'DIRECTION', 'ENSEIGNANT'].includes(userProfile?.role);

  const [formData, setFormData] = useState({
    title: '',
    classroom: '',
    subject: '',
    file: null as File | null
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resRes, classRes, subRes] = await Promise.all([
        api.get('academics/resources/'),
        api.get('core/classrooms/'),
        api.get('academics/subjects/')
      ]);
      setResources(resRes.data);
      setClassrooms(classRes.data);
      setSubjects(subRes.data);
    } catch (error) {
      console.error("Erreur resources", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.file) return;

    setUploading(true);
    const data = new FormData();
    data.append('title', formData.title);
    data.append('classroom', formData.classroom);
    data.append('subject', formData.subject);
    data.append('file', formData.file);

    try {
      await api.post('academics/resources/', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setShowModal(false);
      setFormData({ title: '', classroom: '', subject: '', file: null });
      fetchData();
    } catch (error) {
      alert("Erreur lors de l'envoi du fichier.");
    } finally {
      setUploading(false);
    }
  };

  const deleteResource = async (id: number) => {
    if (confirm("Supprimer cette ressource ?")) {
      await api.delete(`academics/resources/${id}/`);
      fetchData();
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-900">Bibliothèque Numérique</h2>
           <p className="text-sm text-gray-500">Supports de cours, exercices et ressources partagées.</p>
        </div>
        {canUpload && (
          <Button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un document
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {resources.map((res: any) => (
          <div key={res.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col hover:shadow-md transition-shadow">
             <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                   <FileText className="w-6 h-6" />
                </div>
                <div className="flex space-x-1">
                   <a 
                    href={res.file} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                   >
                      <Download className="w-5 h-5" />
                   </a>
                   {canUpload && (
                     <button 
                      onClick={() => deleteResource(res.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                     >
                        <Trash2 className="w-5 h-5" />
                     </button>
                   )}
                </div>
             </div>
             
             <h3 className="font-bold text-slate-900 mb-1 line-clamp-1">{res.title}</h3>
             <div className="flex flex-wrap gap-2 mt-auto pt-4">
                <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-md uppercase">
                   {res.subject_name}
                </span>
                <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-md uppercase">
                   {res.classroom_name}
                </span>
             </div>
             <p className="text-[10px] text-slate-400 mt-3 italic">Partagé par {res.teacher_name}</p>
          </div>
        ))}
      </div>

      {loading && resources.length === 0 && (
        <div className="p-20 text-center"><Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600" /></div>
      )}

      {!loading && resources.length === 0 && (
        <div className="p-20 text-center bg-white rounded-2xl border-2 border-dashed border-slate-100">
           <FileText className="w-16 h-16 text-slate-200 mx-auto mb-4" />
           <p className="text-slate-400 font-medium">Aucune ressource disponible pour le moment.</p>
        </div>
      )}

      {/* Modal Upload */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50">
                 <h3 className="text-xl font-bold text-slate-900">Nouveau Document</h3>
                 <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">×</button>
              </div>
              
              <form onSubmit={handleUpload} className="p-6 space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Titre</label>
                    <input 
                      required 
                      type="text" 
                      className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:border-blue-500 transition-colors"
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                    />
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">Matière</label>
                       <select 
                        required 
                        className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:border-blue-500 transition-colors"
                        value={formData.subject}
                        onChange={e => setFormData({...formData, subject: e.target.value})}
                       >
                          <option value="">Choisir...</option>
                          {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                       </select>
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">Classe</label>
                       <select 
                        required 
                        className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:border-blue-500 transition-colors"
                        value={formData.classroom}
                        onChange={e => setFormData({...formData, classroom: e.target.value})}
                       >
                          <option value="">Choisir...</option>
                          {classrooms.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                       </select>
                    </div>
                 </div>

                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Fichier (PDF, Doc, Image...)</label>
                    <input 
                      required 
                      type="file" 
                      className="w-full border border-slate-200 border-dashed rounded-xl p-4 outline-none focus:border-blue-500 transition-colors bg-slate-50/50"
                      onChange={e => setFormData({...formData, file: e.target.files ? e.target.files[0] : null})}
                    />
                 </div>

                 <div className="flex pt-6 space-x-3">
                    <Button type="button" variant="ghost" className="flex-1 rounded-xl h-12" onClick={() => setShowModal(false)}>Annuler</Button>
                    <Button type="submit" disabled={uploading} className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-xl h-12">
                       {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Envoyer le document"}
                    </Button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
