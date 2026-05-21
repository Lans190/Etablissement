import { useEffect, useState } from 'react';
import api from '@/api/axios';
import { Plus, CreditCard, Loader2, Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Students() {
  const [enrollments, setEnrollments] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    classroom: '',
    profile_picture: null as File | null
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [enRes, classRes] = await Promise.all([
        api.get('students/enrollments/'),
        api.get('core/classrooms/')
      ]);
      setEnrollments(enRes.data);
      setClassrooms(classRes.data);
    } catch (error) {
      console.error("Erreur", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const data = new FormData();
    data.append('first_name', formData.first_name);
    data.append('last_name', formData.last_name);
    data.append('phone_number', formData.phone_number);
    data.append('classroom', formData.classroom);
    if (formData.profile_picture) {
      data.append('profile_picture', formData.profile_picture);
    }

    try {
      await api.post('students/enrollments/register_student/', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setShowModal(false);
      setFormData({ first_name: '', last_name: '', phone_number: '', classroom: '', profile_picture: null });
      fetchData();
    } catch (error) {
      alert("Erreur lors de l'inscription.");
    } finally {
      setSubmitting(false);
    }
  };

  const downloadIDCard = async (id: number) => {
    try {
      const response = await api.get(`students/enrollments/${id}/id_card/`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `carte_scolaire_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      alert("Erreur lors du téléchargement de la carte.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Élèves & Inscriptions</h2>
          <p className="text-sm text-gray-500">Gérez la base des élèves et générez leurs cartes scolaires.</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Inscrire un élève
        </Button>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Élève</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Classe</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Année</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">Carte ID</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {enrollments.map((e: any) => (
              <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                   <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold overflow-hidden">
                         {e.student_name.charAt(0)}
                      </div>
                      <div className="ml-4">
                         <div className="text-sm font-bold text-gray-900">{e.student_name}</div>
                         <div className="text-xs text-gray-500">ID: {e.student.toString().padStart(5, '0')}</div>
                      </div>
                   </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">{e.classroom_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{e.academic_year_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                   <button 
                    onClick={() => downloadIDCard(e.id)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors title='Générer carte scolaire'"
                   >
                      <CreditCard className="w-5 h-5" />
                   </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                   <Button variant="ghost" className="text-blue-600 hover:text-blue-700">Détails</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <div className="p-10 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                 <h3 className="text-xl font-bold">Nouvelle Inscription</h3>
                 <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X /></button>
              </div>
              <form onSubmit={handleRegister} className="p-6 space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Prénom</label>
                       <input required type="text" className="w-full border rounded-xl p-3 outline-none focus:border-blue-500" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} />
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nom</label>
                       <input required type="text" className="w-full border rounded-xl p-3 outline-none focus:border-blue-500" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} />
                    </div>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Téléphone Parent</label>
                    <input type="text" className="w-full border rounded-xl p-3 outline-none focus:border-blue-500" value={formData.phone_number} onChange={e => setFormData({...formData, phone_number: e.target.value})} />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Classe</label>
                    <select required className="w-full border rounded-xl p-3 outline-none focus:border-blue-500" value={formData.classroom} onChange={e => setFormData({...formData, classroom: e.target.value})}>
                       <option value="">Sélectionnez une classe...</option>
                       {classrooms.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Photo d'identité</label>
                    <div className="mt-1 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-6 hover:border-blue-300 transition-colors cursor-pointer relative">
                       <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setFormData({...formData, profile_picture: e.target.files ? e.target.files[0] : null})} />
                       <div className="text-center">
                          <Camera className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-xs text-gray-500">{formData.profile_picture ? formData.profile_picture.name : "Cliquez pour uploader la photo"}</p>
                       </div>
                    </div>
                 </div>
                 <div className="flex pt-4 space-x-3">
                    <Button type="button" variant="ghost" className="flex-1" onClick={() => setShowModal(false)}>Annuler</Button>
                    <Button type="submit" disabled={submitting} className="flex-1 bg-blue-600 hover:bg-blue-700">
                       {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Inscrire l'élève"}
                    </Button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
