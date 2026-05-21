import { useEffect, useState } from 'react';
import api from '@/api/axios';
import { Calendar, Plus, Trash2, Filter, Loader2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DAYS = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI'];

export default function Timetable() {
  const [userProfile] = useState(() => JSON.parse(localStorage.getItem('user_profile') || '{}'));
  const isAdmin = ['ADMIN', 'DIRECTION'].includes(userProfile?.role);

  const [timeslots, setTimeslots] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedClass, setSelectedClass] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    day: 'LUNDI',
    timeslot: '',
    allocation: '',
    classroom: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tsRes, classRes, allocRes] = await Promise.all([
        api.get('academics/timeslots/'),
        api.get('core/classrooms/'),
        api.get('academics/allocations/')
      ]);
      setTimeslots(tsRes.data);
      setClassrooms(classRes.data);
      setAllocations(allocRes.data);
      
      if (selectedClass || classRes.data.length > 0) {
        const cid = selectedClass || classRes.data[0].id;
        if (!selectedClass) setSelectedClass(cid.toString());
        const entryRes = await api.get(`academics/timetable/?classroom=${cid}`);
        setEntries(entryRes.data);
      }
    } catch (error) {
      console.error("Erreur timetable", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedClass]);

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('academics/timetable/', { ...formData, classroom: selectedClass });
      setShowModal(false);
      fetchData();
    } catch (error) {
      alert("Erreur: Conflit d'horaire ou données invalides.");
    }
  };

  const getEntry = (day: string, timeslotId: number) => {
    return entries.find(e => e.day === day && e.timeslot === timeslotId);
  };

  const deleteEntry = async (id: number) => {
     if(confirm("Supprimer ce cours ?")) {
        await api.delete(`academics/timetable/${id}/`);
        fetchData();
     }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Emploi du Temps</h2>
        <div className="flex space-x-3">
           <div className="flex items-center bg-white border rounded-lg px-3 py-1">
              <Filter className="w-4 h-4 text-gray-400 mr-2" />
              <select 
                className="text-sm outline-none bg-transparent font-medium"
                value={selectedClass}
                onChange={e => setSelectedClass(e.target.value)}
              >
                {classrooms.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
           </div>
           {isAdmin && (
             <Button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200">
               <Calendar className="w-4 h-4 mr-2" />
               CRÉER UN EMPLOI DU TEMPS
             </Button>
           )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200">
                <th className="p-4 border-r border-gray-200 w-32 font-bold text-xs text-gray-500 uppercase italic">Horaires</th>
                {DAYS.map(day => (
                  <th key={day} className="p-4 font-bold text-sm text-slate-900 uppercase tracking-wider">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {timeslots.map(ts => (
                <tr key={ts.id} className="h-24">
                  <td className="p-4 border-r border-gray-200 bg-slate-50/30">
                    <div className="flex items-center text-xs font-bold text-slate-600">
                       <Clock className="w-3 h-3 mr-1 text-blue-500" />
                       {ts.start_time.substring(0,5)} - {ts.end_time.substring(0,5)}
                    </div>
                  </td>
                  {DAYS.map(day => {
                    const entry = getEntry(day, ts.id);
                    return (
                      <td key={`${day}-${ts.id}`} className="p-2 border-r border-gray-100 align-top">
                        {entry ? (
                          <div className="h-full rounded-lg p-3 bg-blue-50 border border-blue-100 group relative animate-in fade-in zoom-in duration-300">
                             <div className="font-bold text-blue-900 text-xs mb-1">{entry.subject_name}</div>
                             <div className="text-[10px] text-blue-600 font-medium">{entry.teacher_name}</div>
                             {isAdmin && (
                               <button 
                                 onClick={() => deleteEntry(entry.id)}
                                 className="absolute top-1 right-1 p-1 text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-600 transition-opacity"
                               >
                                 <Trash2 className="w-3 h-3" />
                               </button>
                             )}
                          </div>
                        ) : (
                          <div 
                            onClick={() => isAdmin && (setFormData({...formData, day, timeslot: ts.id.toString()}), setShowModal(true))}
                            className={`h-full w-full border-2 border-dashed border-gray-50 rounded-lg transition-colors flex items-center justify-center ${isAdmin ? 'hover:border-blue-100 hover:bg-blue-50/30 cursor-pointer' : ''}`}
                          >
                             {isAdmin && <Plus className="w-4 h-4 text-gray-200" />}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <div className="p-10 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>}
        </div>
      </div>

      {/* Modal Ajout */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
               <h3 className="text-xl font-bold">Placer un cours</h3>
               <button onClick={() => setShowModal(false)} className="text-gray-400"><Plus className="w-6 h-6 rotate-45" /></button>
            </div>
            
            <form onSubmit={handleAddEntry} className="p-6 space-y-4">
               <div>
                  <label className="block text-sm font-medium mb-1">Jour</label>
                  <select className="w-full border rounded-md p-2 outline-none" value={formData.day} onChange={e => setFormData({...formData, day: e.target.value})}>
                     {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
               </div>
               <div>
                  <label className="block text-sm font-medium mb-1">Créneau</label>
                  <select required className="w-full border rounded-md p-2 outline-none" value={formData.timeslot} onChange={e => setFormData({...formData, timeslot: e.target.value})}>
                     <option value="">Choisir l'heure...</option>
                     {timeslots.map(ts => <option key={ts.id} value={ts.id}>{ts.start_time} - {ts.end_time}</option>)}
                  </select>
               </div>
               <div>
                  <label className="block text-sm font-medium mb-1">Matière / Enseignant</label>
                  {allocations.filter((a: any) => a.classroom.toString() === selectedClass).length === 0 ? (
                     <div className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100 font-medium">
                        Aucun cours n'est attribué à cette classe. 
                        <br />
                        <span className="font-bold text-amber-800">Allez dans Paramètres &gt; Attribution des Cours</span> pour affecter des matières aux enseignants.
                     </div>
                  ) : (
                     <select required className="w-full border rounded-md p-2 outline-none" value={formData.allocation} onChange={e => setFormData({...formData, allocation: e.target.value})}>
                        <option value="">Choisir le cours...</option>
                        {allocations.filter((a: any) => a.classroom.toString() === selectedClass).map((a: any) => (
                          <option key={a.id} value={a.id}>{a.subject_name} ({a.teacher_name})</option>
                        ))}
                     </select>
                  )}
               </div>
               <div className="flex pt-4 space-x-3">
                  <Button type="button" variant="ghost" className="flex-1" onClick={() => setShowModal(false)}>Annuler</Button>
                  <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">Enregistrer</Button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
