import { useEffect, useState } from 'react';
import api from '@/api/axios';
import { Plus, Trash2, Filter, Loader2, Clock, X, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DAYS = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI'];
const DAY_LABELS: Record<string, string> = {
  LUNDI: 'Lundi', MARDI: 'Mardi', MERCREDI: 'Mercredi',
  JEUDI: 'Jeudi', VENDREDI: 'Vendredi', SAMEDI: 'Samedi',
};

type Timeslot = { id: number; start_time: string; end_time: string };
type Classroom = { id: number; name: string; level?: string; level_display?: string; series?: string };
type Allocation = { id: number; subject_name: string; teacher_name: string; classroom: number };
type TimetableEntry = { id: number; day: string; timeslot: number; subject_name: string; teacher_name: string };

export default function Timetable() {
  const [userProfile] = useState(() => JSON.parse(localStorage.getItem('user_profile') || '{}'));

  // Seul l'ADMIN peut modifier l'emploi du temps
  const isAdmin = userProfile?.role === 'ADMIN';

  const [timeslots, setTimeslots]   = useState<Timeslot[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [entries, setEntries]       = useState<TimetableEntry[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selectedClass, setSelectedClass] = useState('');
  const [showModal, setShowModal]   = useState(false);

  const [formData, setFormData] = useState({
    day: 'LUNDI',
    timeslot: '',
    allocation: '',
  });

  // ── Chargement des données ───────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    try {
      const [tsRes, classRes, allocRes] = await Promise.all([
        api.get('academics/timeslots/'),
        api.get('core/classrooms/'),
        api.get('academics/allocations/'),
      ]);
      setTimeslots(tsRes.data);
      setClassrooms(classRes.data);
      setAllocations(allocRes.data);

      const cid = selectedClass || classRes.data?.[0]?.id?.toString();
      if (cid) {
        if (!selectedClass) setSelectedClass(cid);
        const entryRes = await api.get(`academics/timetable/?classroom=${cid}`);
        setEntries(entryRes.data);
        // pré-remplir allocation par défaut pour la classe sélectionnée
        const classAllocs = allocRes.data.filter((a: Allocation) => a.classroom === parseInt(cid));
        if (classAllocs.length > 0) setFormData(f => ({ ...f, allocation: classAllocs[0].id.toString() }));
      }
    } catch (error) {
      console.error('Erreur timetable', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedClass]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const getEntry = (day: string, timeslotId: number) =>
    entries.find(e => e.day === day && e.timeslot === timeslotId);

  const filteredAllocations = allocations.filter(
    a => a.classroom === parseInt(selectedClass)
  );

  // ── Actions ADMIN uniquement ─────────────────────────────────────────────
  const deleteEntry = async (id: number) => {
    if (!isAdmin) return;
    if (confirm('Supprimer ce cours de l\'emploi du temps ?')) {
      await api.delete(`academics/timetable/${id}/`);
      fetchData();
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.timeslot || !formData.allocation) {
      alert('Veuillez sélectionner un créneau et une matière.');
      return;
    }
    try {
      await api.post('academics/timetable/', {
        day: formData.day,
        timeslot: parseInt(formData.timeslot),
        allocation: parseInt(formData.allocation),
        classroom: parseInt(selectedClass),
      });
      setShowModal(false);
      fetchData();
    } catch {
      alert('Erreur : ce créneau est peut-être déjà occupé pour cette classe.');
    }
  };

  // ── Couleurs par matière (cycle sur 8) ───────────────────────────────────
  const COLORS = [
    'bg-blue-50 border-blue-200 text-blue-800',
    'bg-emerald-50 border-emerald-200 text-emerald-800',
    'bg-purple-50 border-purple-200 text-purple-800',
    'bg-amber-50 border-amber-200 text-amber-800',
    'bg-rose-50 border-rose-200 text-rose-800',
    'bg-sky-50 border-sky-200 text-sky-800',
    'bg-indigo-50 border-indigo-200 text-indigo-800',
    'bg-orange-50 border-orange-200 text-orange-800',
  ];
  const subjectColorMap: Record<string, string> = {};
  let colorIdx = 0;
  entries.forEach(e => {
    if (!subjectColorMap[e.subject_name]) {
      subjectColorMap[e.subject_name] = COLORS[colorIdx % COLORS.length];
      colorIdx++;
    }
  });

  return (
    <div className="space-y-6">

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Emploi du Temps</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {isAdmin
              ? 'Gérez les créneaux horaires de chaque classe.'
              : 'Consultation uniquement — les modifications sont réservées à l\'administration.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Sélecteur de classe */}
          <div className="flex items-center bg-white border rounded-xl px-3 py-2 shadow-sm">
            <Filter className="w-4 h-4 text-gray-400 mr-2" />
            <select
              className="text-sm outline-none bg-transparent font-medium"
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
            >
              {classrooms.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.level_display ? ` — ${c.level_display}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Bouton Ajouter (ADMIN uniquement) */}
          {isAdmin ? (
            <Button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 hover:bg-blue-700 rounded-xl"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un cours
            </Button>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-slate-400 border border-slate-200 rounded-xl px-3 py-2">
              <Lock className="w-3.5 h-3.5" /> Lecture seule
            </span>
          )}
        </div>
      </div>

      {/* Tableau de l'emploi du temps */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        {loading ? (
          <div className="p-16 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          </div>
        ) : (
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200">
                <th className="p-4 text-xs font-bold text-slate-400 uppercase w-32 text-left">Horaires</th>
                {DAYS.map(day => (
                  <th key={day} className="p-4 text-xs font-bold text-slate-600 uppercase text-center min-w-[130px]">
                    {DAY_LABELS[day]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeslots.map(ts => (
                <tr key={ts.id} className="border-b border-slate-50 last:border-0">
                  <td className="p-3 bg-slate-50/50">
                    <div className="flex items-center text-xs font-bold text-slate-600">
                      <Clock className="w-3 h-3 mr-1.5 text-blue-500" />
                      {ts.start_time.substring(0, 5)}<br />
                      <span className="text-slate-400 font-normal ml-1">{ts.end_time.substring(0, 5)}</span>
                    </div>
                  </td>

                  {DAYS.map(day => {
                    const entry = getEntry(day, ts.id);
                    const colorClass = entry ? (subjectColorMap[entry.subject_name] || COLORS[0]) : '';
                    return (
                      <td key={`${day}-${ts.id}`} className="p-2 align-top">
                        {entry ? (
                          <div className={`p-2.5 border rounded-xl relative group transition-all ${colorClass}`}>
                            <div className="font-bold text-xs leading-tight">{entry.subject_name}</div>
                            <div className="text-[10px] mt-0.5 opacity-70">{entry.teacher_name}</div>
                            {isAdmin && (
                              <button
                                onClick={() => deleteEntry(entry.id)}
                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-100 rounded-md p-0.5 transition-all"
                                title="Supprimer ce cours"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div
                            className={`h-16 border-dashed border-2 rounded-xl flex items-center justify-center transition-all ${isAdmin ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer' : 'border-gray-100'}`}
                            onClick={() => {
                              if (!isAdmin) return;
                              setFormData(f => ({ ...f, day, timeslot: ts.id.toString() }));
                              setShowModal(true);
                            }}
                          >
                            {isAdmin && <Plus className="w-4 h-4 text-gray-300" />}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {timeslots.length === 0 && (
                <tr>
                  <td colSpan={DAYS.length + 1} className="p-10 text-center text-gray-400 italic text-sm">
                    Aucun créneau horaire configuré. Contactez l'administrateur.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal ajout cours — ADMIN uniquement */}
      {showModal && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-lg font-bold">Ajouter un cours</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddEntry} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Jour</label>
                <select
                  className="w-full border rounded-xl p-3 outline-none focus:border-blue-500"
                  value={formData.day}
                  onChange={e => setFormData({ ...formData, day: e.target.value })}
                >
                  {DAYS.map(d => (
                    <option key={d} value={d}>{DAY_LABELS[d]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Créneau Horaire</label>
                <select
                  required
                  className="w-full border rounded-xl p-3 outline-none focus:border-blue-500"
                  value={formData.timeslot}
                  onChange={e => setFormData({ ...formData, timeslot: e.target.value })}
                >
                  <option value="">Choisir un créneau...</option>
                  {timeslots.map(ts => (
                    <option key={ts.id} value={ts.id}>
                      {ts.start_time.substring(0, 5)} – {ts.end_time.substring(0, 5)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Matière / Enseignant</label>
                <select
                  required
                  className="w-full border rounded-xl p-3 outline-none focus:border-blue-500"
                  value={formData.allocation}
                  onChange={e => setFormData({ ...formData, allocation: e.target.value })}
                >
                  <option value="">Choisir une matière...</option>
                  {filteredAllocations.length === 0 ? (
                    <option disabled>Aucune matière attribuée à cette classe</option>
                  ) : (
                    filteredAllocations.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.subject_name} — {a.teacher_name}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="ghost" className="flex-1" onClick={() => setShowModal(false)}>
                  Annuler
                </Button>
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                  Enregistrer
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}