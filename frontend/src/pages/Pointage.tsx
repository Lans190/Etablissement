import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '@/api/axios';
import { 
  Plus, CheckCircle, XCircle, Clock, Loader2, Filter, Calendar,
  BookOpen, Award, TrendingUp, RefreshCw, X 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
 
export default function Pointage() {
  const [pointages, setPointages] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedPointage, setSelectedPointage] = useState<any>(null);
  const [actionType, setActionType] = useState<'VALIDATE' | 'REFUSE'>('VALIDATE');
  const [remark, setRemark] = useState('');
  
  const { userProfile } = useOutletContext<any>() || {};
  const isAdmin = ['ADMIN', 'DIRECTION'].includes(userProfile?.role);
  const isTeacher = userProfile?.role === 'ENSEIGNANT';
 
  // Filters State
  const [filterTeacher, setFilterTeacher] = useState('ALL');
  const [filterDate, setFilterDate] = useState('');
  const [filterMonth, setFilterMonth] = useState('ALL');
  const [filterYear, setFilterYear] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'PENDING' | 'HISTORY'>('PENDING');
 
  const [formData, setFormData] = useState({
    classroom: '',
    subject: '',
    hours_count: 1,
    topic: ''
  });
 
  const fetchData = async (showLoader = true) => {
    if (showLoader) {
      setLoading(true);
    }
    try {
      const [pRes, cRes, sRes] = await Promise.all([
        api.get('academics/pointages/'),
        api.get('core/classrooms/'),
        api.get('academics/subjects/')
      ]);
      setPointages(pRes.data);
      setClassrooms(cRes.data);
      setSubjects(sRes.data);
 
      if (isAdmin) {
        const usersRes = await api.get('auth/users/');
        setTeachers(usersRes.data.filter((u: any) => u.role === 'ENSEIGNANT'));
      }
    } catch (error) {
      console.error("Erreur de chargement des pointages", error);
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  };
 
  useEffect(() => {
    void fetchData(true);
    const interval = window.setInterval(() => {
      void fetchData(false);
    }, 15000);
    const onFocus = () => {
      void fetchData(false);
    };
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [isAdmin]);


  const handleAddPointage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.classroom || !formData.subject) {
      alert("Veuillez sélectionner la classe et la matière.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post('academics/pointages/', formData);
      setShowAddModal(false);
      setFormData({ classroom: '', subject: '', hours_count: 1, topic: '' });
      await fetchData();
      alert("Pointage enregistré avec succès ! En attente de validation.");
    } catch (error) {
      console.error(error);
      alert("Erreur lors de l'enregistrement du pointage.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenActionModal = (pointage: any, type: 'VALIDATE' | 'REFUSE') => {
    setSelectedPointage(pointage);
    setActionType(type);
    setRemark('');
    setShowActionModal(true);
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPointage) return;
    setSubmitting(true);
    try {
      const statusValue = actionType === 'VALIDATE' ? 'VALIDATED' : 'REFUSED';
      await api.patch(`academics/pointages/${selectedPointage.id}/`, {
        status: statusValue,
        remark: remark
      });
      setShowActionModal(false);
      setSelectedPointage(null);
      await fetchData();
      alert(`Pointage ${actionType === 'VALIDATE' ? 'validé' : 'refusé'} avec succès !`);
    } catch (error) {
      console.error(error);
      alert("Erreur lors du changement de statut.");
    } finally {
      setSubmitting(false);
    }
  };

  // Local Filtering logic
  const filteredPointages = pointages.filter((p: any) => {
    // 1. Filter by Teacher (Admin only)
    if (isAdmin && filterTeacher !== 'ALL' && p.teacher?.toString() !== filterTeacher) {
      return false;
    }

    // 2. Filter by Date
    if (filterDate && p.date !== filterDate) {
      return false;
    }

    // 3. Filter by Month & Year
    if (p.date) {
      const parts = p.date.split('-'); // YYYY-MM-DD
      const pYear = parts[0];
      const pMonth = parseInt(parts[1], 10).toString();

      if (filterMonth !== 'ALL' && pMonth !== filterMonth) {
        return false;
      }
      if (filterYear !== 'ALL' && pYear !== filterYear) {
        return false;
      }
    }

    // 4. Tab selection: Pending vs History
    if (activeTab === 'PENDING') {
      return p.status === 'PENDING';
    } else {
      return p.status === 'VALIDATED' || p.status === 'REFUSED';
    }
  });

  // Calculate statistics (based on all pointages of current view context)
  const totalWorkedHours = pointages
    .filter((p: any) => p.status === 'VALIDATED')
    .reduce((sum: number, p: any) => sum + (p.hours_count || 0), 0);

  const pendingCount = pointages.filter((p: any) => p.status === 'PENDING').length;
  const refusedCount = pointages.filter((p: any) => p.status === 'REFUSED').length;
  const validatedCount = pointages.filter((p: any) => p.status === 'VALIDATED').length;
  
  const validationRate = pointages.length > 0 
    ? Math.round((validatedCount / (pointages.length - pendingCount || 1)) * 100) 
    : 100;

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Pointage & Validation</h2>
          <p className="text-slate-500 font-medium">Gérez et validez le suivi des heures de cours effectuées par les enseignants.</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={() => void fetchData(true)} variant="outline" className="p-3">
            <RefreshCw className="w-4 h-4" />
          </Button>
          {isTeacher && (
            <Button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700 shadow-md">
              <Plus className="w-4 h-4 mr-2" />
              Déclarer une séance
            </Button>
          )}
        </div>
      {/* Bannière Calculateur Automatique du Taux Horaire pour Enseignants */}
      {isTeacher && (
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <span className="inline-block px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
                🧮 Calculateur Automatique du Taux Horaire
              </span>
              <h3 className="text-2xl font-black">Mon Estimation Salariale Mensuelle</h3>
              <p className="text-slate-300 text-xs mt-1">
                Le montant global de votre rémunération est calculé automatiquement à partir de votre taux horaire et de vos heures validées.
              </p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/10 p-4 rounded-2xl backdrop-blur-md">
              <div className="text-center border-r border-white/10 pr-2">
                <span className="text-[10px] text-blue-200 font-bold uppercase block">Taux Horaire</span>
                <span className="text-base font-black text-amber-300">
                  {parseFloat(userProfile?.hourly_rate || 0).toLocaleString()} F/h
                </span>
              </div>
              <div className="text-center border-r border-white/10 pr-2">
                <span className="text-[10px] text-blue-200 font-bold uppercase block">Base Fixe</span>
                <span className="text-base font-black text-white">
                  {parseFloat(userProfile?.base_salary || 0).toLocaleString()} F
                </span>
              </div>
              <div className="text-center border-r border-white/10 pr-2">
                <span className="text-[10px] text-blue-200 font-bold uppercase block">Heures Validées</span>
                <span className="text-base font-black text-emerald-400">
                  {totalWorkedHours} h
                </span>
              </div>
              <div className="text-center">
                <span className="text-[10px] text-blue-200 font-bold uppercase block">Net Estimé</span>
                <span className="text-lg font-black text-emerald-300">
                  {(parseFloat(userProfile?.base_salary || 0) + (totalWorkedHours * parseFloat(userProfile?.hourly_rate || 0))).toLocaleString()} F
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Heures validées</span>
            <h3 className="text-3xl font-black text-slate-900 mt-1">{totalWorkedHours} h</h3>
          </div>
          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">En attente</span>
            <h3 className="text-3xl font-black text-amber-600 mt-1">{pendingCount}</h3>
          </div>
          <div className="bg-amber-50 text-amber-600 p-3 rounded-xl">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Pointages refusés</span>
            <h3 className="text-3xl font-black text-rose-600 mt-1">{refusedCount}</h3>
          </div>
          <div className="bg-rose-50 text-rose-600 p-3 rounded-xl">
            <XCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Assiduité Globale</span>
            <h3 className="text-3xl font-black text-blue-600 mt-1">{validationRate}%</h3>
          </div>
          <div className="bg-blue-50 text-blue-600 p-3 rounded-xl">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filters & Control Panel */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
        <h4 className="text-sm font-bold text-slate-700 flex items-center">
          <Filter className="w-4 h-4 mr-2 text-slate-400" />
          Filtres de recherche
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {isAdmin && (
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Enseignant</label>
              <select
                className="w-full border rounded-xl p-2.5 outline-none focus:border-blue-500 text-sm bg-slate-50"
                value={filterTeacher}
                onChange={e => setFilterTeacher(e.target.value)}
              >
                <option value="ALL">Tous les enseignants</option>
                {teachers.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Date précise</label>
            <input 
              type="date"
              className="w-full border rounded-xl p-2.5 outline-none focus:border-blue-500 text-sm bg-slate-50"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Mois</label>
            <select
              className="w-full border rounded-xl p-2.5 outline-none focus:border-blue-500 text-sm bg-slate-50"
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
            >
              <option value="ALL">Tous les mois</option>
              <option value="1">Janvier</option>
              <option value="2">Février</option>
              <option value="3">Mars</option>
              <option value="4">Avril</option>
              <option value="5">Mai</option>
              <option value="6">Juin</option>
              <option value="7">Juillet</option>
              <option value="8">Août</option>
              <option value="9">Septembre</option>
              <option value="10">Octobre</option>
              <option value="11">Novembre</option>
              <option value="12">Décembre</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Année</label>
            <select
              className="w-full border rounded-xl p-2.5 outline-none focus:border-blue-500 text-sm bg-slate-50"
              value={filterYear}
              onChange={e => setFilterYear(e.target.value)}
            >
              <option value="ALL">Toutes les années</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
          </div>
        </div>

        {/* Clear Filters Helper */}
        {(filterTeacher !== 'ALL' || filterDate || filterMonth !== 'ALL' || filterYear !== 'ALL') && (
          <div className="flex justify-end">
            <button 
              onClick={() => {
                setFilterTeacher('ALL');
                setFilterDate('');
                setFilterMonth('ALL');
                setFilterYear('ALL');
              }}
              className="text-xs font-bold text-blue-600 hover:text-blue-700"
            >
              Réinitialiser les filtres
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area: Tabs + Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`flex-1 py-4 text-center font-bold text-sm border-b-2 transition-all ${
              activeTab === 'PENDING' 
                ? 'border-blue-600 text-blue-600 bg-blue-50/10' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            En attente de validation ({pendingCount})
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`flex-1 py-4 text-center font-bold text-sm border-b-2 transition-all ${
              activeTab === 'HISTORY' 
                ? 'border-blue-600 text-blue-600 bg-blue-50/10' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Historique ({validatedCount + refusedCount})
          </button>
        </div>

        {/* Table representation */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-20 text-center">
              <Loader2 className="w-10 h-10 animate-spin mx-auto text-blue-600" />
              <p className="text-slate-400 mt-2 text-sm font-medium">Chargement des données...</p>
            </div>
          ) : filteredPointages.length === 0 ? (
            <div className="p-16 text-center text-slate-400">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-400" />
              <p className="font-bold">Aucune séance trouvée</p>
              <p className="text-xs">Modifiez vos filtres ou effectuez un nouveau pointage.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</th>
                  {isAdmin && <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Enseignant</th>}
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Matière / Classe</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Durée</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sujet / Chapitre</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Statut & Notes</th>
                  {isAdmin && activeTab === 'PENDING' && (
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPointages.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
                      {new Date(p.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                            {p.teacher_name?.charAt(0)}
                          </div>
                          <span>{p.teacher_name}</span>
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-slate-900">{p.subject_name}</div>
                      <div className="text-xs text-slate-500 font-semibold">{p.classroom_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-black text-blue-600">
                      {p.hours_count} h
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-[200px] truncate" title={p.topic}>
                      {p.topic || <span className="text-slate-300 italic">Non renseigné</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-1">
                        <div>
                          {p.status === 'VALIDATED' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                              <CheckCircle className="w-3 h-3 mr-1" /> Validé
                            </span>
                          )}
                          {p.status === 'REFUSED' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle className="w-3 h-3 mr-1" /> Refusé
                            </span>
                          )}
                          {p.status === 'PENDING' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3 mr-1" /> En attente
                            </span>
                          )}
                        </div>
                        {p.remark && (
                          <div className="text-xs text-slate-500 flex items-start space-x-1 max-w-[250px]">
                            <BookOpen className="w-3 h-3 mt-0.5 text-slate-400 flex-shrink-0" />
                            <span className="italic">"{p.remark}"</span>
                          </div>
                        )}
                      </div>
                    </td>
                    {isAdmin && activeTab === 'PENDING' && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-bold space-x-2">
                        <button
                          onClick={() => handleOpenActionModal(p, 'VALIDATE')}
                          className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition-all"
                        >
                          Valider
                        </button>
                        <button
                          onClick={() => handleOpenActionModal(p, 'REFUSE')}
                          className="bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-xl transition-all"
                        >
                          Refuser
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal: Add Pointage */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-800 flex items-center">
                <BookOpen className="w-5 h-5 mr-2 text-blue-600" />
                Déclarer une séance de cours
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddPointage} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Matière enseignée</label>
                <select 
                  required 
                  className="w-full border rounded-xl p-3 outline-none focus:border-blue-500 text-sm bg-slate-50"
                  value={formData.subject} 
                  onChange={e => setFormData({...formData, subject: e.target.value})}
                >
                  <option value="">Choisir la matière...</option>
                  {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Classe</label>
                <select 
                  required 
                  className="w-full border rounded-xl p-3 outline-none focus:border-blue-500 text-sm bg-slate-50"
                  value={formData.classroom} 
                  onChange={e => setFormData({...formData, classroom: e.target.value})}
                >
                  <option value="">Choisir la classe...</option>
                  {classrooms.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre d'heures effectuées</label>
                <input 
                  type="number" 
                  min="1" 
                  max="12" 
                  className="w-full border rounded-xl p-3 outline-none focus:border-blue-500 text-sm bg-slate-50 font-bold" 
                  value={formData.hours_count} 
                  onChange={e => setFormData({...formData, hours_count: parseInt(e.target.value) || 1})} 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Sujet ou Chapitre abordé</label>
                <textarea 
                  className="w-full border rounded-xl p-3 outline-none focus:border-blue-500 text-sm bg-slate-50" 
                  placeholder="Ex: Équations du second degré..."
                  rows={3}
                  value={formData.topic} 
                  onChange={e => setFormData({...formData, topic: e.target.value})}
                />
              </div>

              <div className="flex pt-4 space-x-3">
                <Button type="button" variant="ghost" className="flex-1 rounded-xl" onClick={() => setShowAddModal(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={submitting} className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-100">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Enregistrer
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Validate / Refuse Action */}
      {showActionModal && selectedPointage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-800">
                {actionType === 'VALIDATE' ? 'Valider le pointage' : 'Refuser le pointage'}
              </h3>
              <button onClick={() => setShowActionModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleStatusSubmit} className="p-6 space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl text-xs space-y-1">
                <p><span className="font-bold text-slate-500">Enseignant :</span> {selectedPointage.teacher_name}</p>
                <p><span className="font-bold text-slate-500">Cours :</span> {selectedPointage.subject_name} ({selectedPointage.classroom_name})</p>
                <p><span className="font-bold text-slate-500">Durée :</span> {selectedPointage.hours_count} h</p>
                {selectedPointage.topic && <p><span className="font-bold text-slate-500">Sujet :</span> {selectedPointage.topic}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Remarque / Justification (facultatif)
                </label>
                <textarea 
                  className="w-full border rounded-xl p-3 outline-none focus:border-blue-500 text-sm bg-slate-50" 
                  placeholder={actionType === 'VALIDATE' ? 'Ex: Travail validé...' : 'Ex: Séance non conforme...'}
                  rows={3}
                  value={remark} 
                  onChange={e => setRemark(e.target.value)}
                />
              </div>

              <div className="flex pt-4 space-x-3">
                <Button type="button" variant="ghost" className="flex-1 rounded-xl" onClick={() => setShowActionModal(false)}>
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitting} 
                  className={`flex-1 rounded-xl shadow-lg ${
                    actionType === 'VALIDATE' 
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' 
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-100'
                  }`}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {actionType === 'VALIDATE' ? 'Confirmer Validation' : 'Confirmer Refus'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
