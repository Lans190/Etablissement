import React, { useEffect, useState, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '@/api/axios';
import {
  BookOpen, Plus, Trash2, Loader2, RefreshCw, X,
  GraduationCap, School
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Courses() {
  const { userProfile } = (useOutletContext<any>() || {}) as any;
  const isAdmin = ['ADMIN', 'DIRECTION'].includes(userProfile?.role);
  const isTeacher = userProfile?.role === 'ENSEIGNANT';

  const [allocations, setAllocations] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [formError, setFormError] = useState('');

  // Filters
  const [filterTeacher, setFilterTeacher] = useState('ALL');
  const [filterCycle, setFilterCycle] = useState('ALL');

  const [formData, setFormData] = useState({
    teacher: '',
    subject: '',
    classroom: '',
    coefficient: 1,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [allocRes, subRes, classRes] = await Promise.all([
        api.get('academics/allocations/'),
        api.get('academics/subjects/'),
        api.get('core/classrooms/'),
      ]);
      setAllocations(allocRes.data);
      setSubjects(subRes.data);
      setClassrooms(classRes.data);
      if (isAdmin) {
        const usersRes = await api.get('auth/users/');
        setTeachers(usersRes.data.filter((u: any) => u.role === 'ENSEIGNANT'));
      }
    } catch (e) {
      console.error('Erreur chargement cours', e);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!formData.teacher || !formData.subject || !formData.classroom) {
      setFormError('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('academics/allocations/', {
        teacher: Number(formData.teacher),
        subject: Number(formData.subject),
        classroom: Number(formData.classroom),
        coefficient: formData.coefficient,
      });
      setShowModal(false);
      setFormData({ teacher: '', subject: '', classroom: '', coefficient: 1 });
      await fetchData();
    } catch (err: any) {
      const detail = err.response?.data;
      setFormError(
        typeof detail === 'string'
          ? detail
          : detail?.non_field_errors?.[0] || JSON.stringify(detail) || 'Erreur lors de la création.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`academics/allocations/${id}/`);
      setDeleteConfirmId(null);
      await fetchData();
    } catch {
      alert('Erreur lors de la suppression.');
    }
  };

  // Unique cycles for filter dropdown
  const cycles = Array.from(new Set(allocations.map((a: any) => a.classroom_cycle).filter(Boolean)));

  const filtered = allocations.filter((a: any) => {
    if (filterTeacher !== 'ALL' && String(a.teacher) !== filterTeacher) return false;
    if (filterCycle !== 'ALL' && a.classroom_cycle !== filterCycle) return false;
    return true;
  });

  // Group by teacher name for admin view
  const grouped: Record<string, any[]> = {};
  if (isTeacher) {
    grouped['Mes cours attribués'] = filtered;
  } else {
    for (const a of filtered) {
      const key = a.teacher_name || 'Inconnu';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(a);
    }
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {isTeacher ? 'Mes Cours Attribués' : 'Attribution des Cours'}
          </h2>
          <p className="text-slate-500 font-medium mt-1">
            {isTeacher
              ? "Liste des cours qui vous sont affectés pour cette année académique."
              : "Gérez les affectations des matières aux enseignants par classe."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={fetchData} variant="outline" className="p-3 rounded-xl" title="Actualiser">
            <RefreshCw className="w-4 h-4" />
          </Button>
          {isAdmin && (
            <Button
              onClick={() => { setShowModal(true); setFormError(''); }}
              className="bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-100"
            >
              <Plus className="w-4 h-4 mr-2" />
              Attribuer un cours
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          icon={<BookOpen className="w-6 h-6" />}
          label="Total attributions"
          value={allocations.length}
          color="blue"
        />
        <StatCard
          icon={<GraduationCap className="w-6 h-6" />}
          label="Enseignants concernés"
          value={Array.from(new Set(allocations.map((a: any) => a.teacher))).length}
          color="emerald"
        />
        <StatCard
          icon={<School className="w-6 h-6" />}
          label="Classes couvertes"
          value={Array.from(new Set(allocations.map((a: any) => a.classroom))).length}
          color="violet"
        />
      </div>

      {/* Filters (admin only) */}
      {isAdmin && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Enseignant</label>
            <select
              className="border rounded-xl px-3 py-2 text-sm bg-slate-50 outline-none focus:border-blue-500 min-w-[180px]"
              value={filterTeacher}
              onChange={e => setFilterTeacher(e.target.value)}
            >
              <option value="ALL">Tous les enseignants</option>
              {teachers.map((t: any) => (
                <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Cycle</label>
            <select
              className="border rounded-xl px-3 py-2 text-sm bg-slate-50 outline-none focus:border-blue-500 min-w-[160px]"
              value={filterCycle}
              onChange={e => setFilterCycle(e.target.value)}
            >
              <option value="ALL">Tous les cycles</option>
              {cycles.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {(filterTeacher !== 'ALL' || filterCycle !== 'ALL') && (
            <button
              className="text-xs font-bold text-blue-600 hover:underline self-end pb-2"
              onClick={() => { setFilterTeacher('ALL'); setFilterCycle('ALL'); }}
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      )}

      {/* Table / Content */}
      {loading ? (
        <div className="flex justify-center items-center py-24">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-16 text-center">
          <BookOpen className="w-14 h-14 mx-auto text-slate-200 mb-4" />
          <p className="font-bold text-slate-500 text-lg">Aucune attribution trouvée</p>
          <p className="text-slate-400 text-sm mt-1">
            {isAdmin
              ? 'Cliquez sur "Attribuer un cours" pour commencer.'
              : "Aucun cours ne vous a encore été attribué."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([teacherName, items]) => (
            <div key={teacherName} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              {/* Group header (admin view) */}
              {!isTeacher && (
                <div className="bg-gradient-to-r from-slate-50 to-blue-50/30 border-b border-slate-100 px-6 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-black flex-shrink-0">
                    {teacherName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{teacherName}</p>
                    <p className="text-xs text-slate-400">
                      {items.length} cours attribué{items.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/60 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Matière</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Classe</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cycle</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Coef.</th>
                      {isAdmin && (
                        <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {items.map((a: any) => (
                      <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-3">
                          <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-800">
                            <BookOpen className="w-4 h-4 text-blue-400" />
                            {a.subject_name}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm font-medium text-slate-700">{a.classroom_name}</td>
                        <td className="px-6 py-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                            {a.classroom_cycle || '—'}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-center">
                          <span className="text-sm font-black text-blue-600">{a.coefficient}</span>
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-3 text-right whitespace-nowrap">
                            {deleteConfirmId === a.id ? (
                              <div className="inline-flex gap-2">
                                <button
                                  onClick={() => handleDelete(a.id)}
                                  className="text-xs font-bold text-rose-600 border border-rose-200 bg-rose-50 px-3 py-1.5 rounded-lg hover:bg-rose-100 transition-colors"
                                >
                                  Confirmer
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="text-xs font-bold text-slate-500 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                                >
                                  Annuler
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirmId(a.id)}
                                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Retirer cette attribution"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create Allocation */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 bg-slate-50 border-b flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-600" />
                Attribuer un cours
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {formError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-2.5 rounded-xl">
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Enseignant *</label>
                <select
                  required
                  className="w-full border rounded-xl p-3 text-sm bg-slate-50 outline-none focus:border-blue-500"
                  value={formData.teacher}
                  onChange={e => setFormData({ ...formData, teacher: e.target.value })}
                >
                  <option value="">Sélectionner l'enseignant...</option>
                  {teachers.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Matière *</label>
                <select
                  required
                  className="w-full border rounded-xl p-3 text-sm bg-slate-50 outline-none focus:border-blue-500"
                  value={formData.subject}
                  onChange={e => setFormData({ ...formData, subject: e.target.value })}
                >
                  <option value="">Sélectionner la matière...</option>
                  {subjects.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Classe *</label>
                <select
                  required
                  className="w-full border rounded-xl p-3 text-sm bg-slate-50 outline-none focus:border-blue-500"
                  value={formData.classroom}
                  onChange={e => setFormData({ ...formData, classroom: e.target.value })}
                >
                  <option value="">Sélectionner la classe...</option>
                  {classrooms.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.cycle_name ? ` (${c.cycle_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Coefficient</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  className="w-full border rounded-xl p-3 text-sm bg-slate-50 outline-none focus:border-blue-500 font-bold"
                  value={formData.coefficient}
                  onChange={e => setFormData({ ...formData, coefficient: Number(e.target.value) || 1 })}
                />
              </div>
              <div className="flex gap-3 pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1 rounded-xl"
                  onClick={() => setShowModal(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-100"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Attribuer
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'blue' | 'emerald' | 'violet';
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    violet: 'bg-violet-50 text-violet-600',
  };
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-3xl font-black text-slate-900 mt-1">{value}</p>
      </div>
      <div className={`p-3 rounded-xl ${colors[color]}`}>{icon}</div>
    </div>
  );
}
