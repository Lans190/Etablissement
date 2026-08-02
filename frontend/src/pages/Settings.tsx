import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '@/api/axios';
import { Settings as SettingsIcon, Save, Camera, Loader2, MapPin, Phone, Mail, Building, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Settings() {
  const { setUserProfile } = useOutletContext<any>() || {};
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'classes' | 'subjects' | 'allocations' | 'timeslots'>('profile');
  const [school, setSchool] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);


  // Core configurations
  const [subjects, setSubjects] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [timeslots, setTimeslots] = useState([]);

  // Form states
  const [schoolData, setSchoolData] = useState({
    name: '',
    address: '',
    phone_number: '',
    email: '',
    logo: null as File | null
  });

  const [newSubject, setNewSubject] = useState({ name: '', code: '', description: '' });

  const [newAlloc, setNewAlloc] = useState({
    subject: '', classroom: '', teacher: '', coefficient: '1'
  });

  const [newTimeslot, setNewTimeslot] = useState({
    start_time: '08:00', end_time: '09:00'
  });

  // ── Gestion des Classes ────────────────────────────────────────────────
  const LEVELS_PRIMAIRE = [
    { value: 'CI', label: 'CI – Cours d\'Initiation' },
    { value: 'CP', label: 'CP – Cours Préparatoire' },
    { value: 'CE1', label: 'CE1 – Cours Élémentaire 1' },
    { value: 'CE2', label: 'CE2 – Cours Élémentaire 2' },
    { value: 'CM1', label: 'CM1 – Cours Moyen 1' },
    { value: 'CM2', label: 'CM2 – Cours Moyen 2' },
  ];
  const LEVELS_COLLEGE = [
    { value: '6EME', label: '6ème' },
    { value: '5EME', label: '5ème' },
    { value: '4EME', label: '4ème' },
    { value: '3EME', label: '3ème' },
  ];
  const LEVELS_LYCEE = [
    { value: 'SECONDE', label: 'Seconde' },
    { value: 'PREMIERE', label: '1ère' },
    { value: 'TERMINALE', label: 'Terminale' },
  ];
  const SERIES_LYCEE = [
    { value: 'AUCUNE', label: 'Aucune (sans série)' },
    { value: 'S1', label: 'S1 – Maths & Sciences Physiques' },
    { value: 'S2', label: 'S2 – Sciences Naturelles' },
    { value: 'S3', label: 'S3 – Sciences et Technologies' },
    { value: 'S4', label: 'S4 – Sciences et Techn. Industrielles' },
    { value: 'L1', label: 'L1 – Lettres & Sciences Humaines' },
    { value: 'L2', label: 'L2 – Arabe & Sciences Humaines' },
    { value: 'STEG', label: 'STEG – Sciences Éco. & Gestion' },
    { value: 'G', label: 'G – Gestion' },
  ];

  const getCycleLevels = (cycleId: string) => {
    const cycle = (cycles as any[]).find((c: any) => c.id.toString() === cycleId);
    if (!cycle) return [];
    const name = cycle.name?.toUpperCase();
    if (name === 'PRIMAIRE') return LEVELS_PRIMAIRE;
    if (name === 'COLLEGE') return LEVELS_COLLEGE;
    if (name === 'LYCEE') return LEVELS_LYCEE;
    return [];
  };

  const isLycee = (cycleId: string) => {
    const cycle = (cycles as any[]).find((c: any) => c.id.toString() === cycleId);
    return cycle?.name?.toUpperCase() === 'LYCEE';
  };

  const [newClass, setNewClass] = useState({
    name: '', cycle: '', level: '', series: 'AUCUNE', capacity: '30'
  });

  const fetchData = async () => {
    try {
      const [schoolRes, subjRes, allocRes, classRes, usersRes, cycleRes, tsRes] = await Promise.all([
        api.get('core/schools/'),
        api.get('academics/subjects/'),
        api.get('academics/allocations/'),
        api.get('core/classrooms/'),
        api.get('auth/users/'),
        api.get('core/cycles/'),
        api.get('academics/timeslots/').catch(() => ({ data: [] })),
      ]);

      if (schoolRes.data.length > 0) {
        const s = schoolRes.data[0];
        setSchool(s);
        setSchoolData({ name: s.name, address: s.address, phone_number: s.phone_number, email: s.email || '', logo: null });
        if (s.logo) setLogoPreview(s.logo);
      }

      setSubjects(subjRes.data);
      setAllocations(allocRes.data);
      setClassrooms(classRes.data);
      setCycles(cycleRes.data);
      setTimeslots(tsRes.data);
      setTeachers(usersRes.data.filter((u: any) => u.role === 'ENSEIGNANT'));

      if (subjRes.data.length > 0) setNewAlloc(prev => ({ ...prev, subject: subjRes.data[0].id.toString() }));
      if (classRes.data.length > 0) setNewAlloc(prev => ({ ...prev, classroom: classRes.data[0].id.toString() }));
      const schoolTeachers = usersRes.data.filter((u: any) => u.role === 'ENSEIGNANT');
      if (schoolTeachers.length > 0) setNewAlloc(prev => ({ ...prev, teacher: schoolTeachers[0].id.toString() }));
      if (cycleRes.data.length > 0) setNewClass(prev => ({ ...prev, cycle: cycleRes.data[0].id.toString() }));

    } catch (error) {
      console.error("Erreur chargement des paramètres", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSchoolSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const data = new FormData();
    data.append('name', schoolData.name);
    data.append('address', schoolData.address);
    data.append('phone_number', schoolData.phone_number);
    data.append('email', schoolData.email);
    if (schoolData.logo) {
      data.append('logo', schoolData.logo);
    }

    try {
      const response = await api.patch(`core/schools/${school.id}/`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const currentProfile = JSON.parse(localStorage.getItem('user_profile') || '{}');
      const updatedProfile = {
        ...currentProfile,
        school_name: response.data.name,
        school_logo: response.data.logo || currentProfile.school_logo,
        school_address: response.data.address,
        school_phone: response.data.phone_number,
        school_email: response.data.email,
      };
      localStorage.setItem('user_profile', JSON.stringify(updatedProfile));
      if (setUserProfile) {
        setUserProfile(updatedProfile);
      }
      alert("Paramètres mis à jour !");
    } catch (error) {
      alert("Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSchoolData({ ...schoolData, logo: file });
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  // Subjects Management
  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('academics/subjects/', newSubject);
      setNewSubject({ name: '', code: '', description: '' });
      fetchData();
      alert("Matière ajoutée avec succès !");
    } catch (error) {
      alert("Erreur lors de l'ajout de la matière.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSubject = async (id: number) => {
    if (!confirm("Voulez-vous vraiment supprimer cette matière ? Toutes les attributions liées seront supprimées.")) return;
    try {
      await api.delete(`academics/subjects/${id}/`);
      fetchData();
    } catch (error) {
      alert("Erreur lors de la suppression.");
    }
  };

  // Allocations Management
  const handleAddAlloc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlloc.subject || !newAlloc.classroom || !newAlloc.teacher) {
      alert("Veuillez remplir tous les champs.");
      return;
    }
    setSaving(true);
    try {
      await api.post('academics/allocations/', {
        subject: parseInt(newAlloc.subject),
        classroom: parseInt(newAlloc.classroom),
        teacher: parseInt(newAlloc.teacher),
        coefficient: parseInt(newAlloc.coefficient)
      });
      fetchData();
      alert("Cours attribué avec succès !");
    } catch (error) {
      alert("Erreur: Ce cours (Matière & Classe) est peut-être déjà attribué.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAlloc = async (id: number) => {
    if (!confirm("Voulez-vous vraiment retirer cette attribution de cours ?")) return;
    try {
      await api.delete(`academics/allocations/${id}/`);
      fetchData();
    } catch (error) {
      alert("Erreur lors du retrait.");
    }
  };

  // ── Gestion des classes ──────────────────────────────────────────────────
  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClass.name || !newClass.cycle || !newClass.level) {
      alert('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    setSaving(true);
    try {
      await api.post('core/classrooms/', {
        name: newClass.name,
        cycle: parseInt(newClass.cycle),
        level: newClass.level,
        series: isLycee(newClass.cycle) ? newClass.series : 'AUCUNE',
        capacity: parseInt(newClass.capacity),
      });
      setNewClass({ name: '', cycle: newClass.cycle, level: '', series: 'AUCUNE', capacity: '30' });
      fetchData();
      alert('Classe créée avec succès !');
    } catch {
      alert('Erreur lors de la création de la classe.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClass = async (id: number) => {
    if (!confirm('Supprimer cette classe ? Toutes les données liées (inscriptions, notes...) seront perdues.')) return;
    try {
      await api.delete(`core/classrooms/${id}/`);
      fetchData();
    } catch {
      alert('Erreur lors de la suppression.');
    }
  };

  // ── Gestion des Créneaux (TimeSlots) ───────────────────────────────────
  const handleAddTimeslot = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('academics/timeslots/', newTimeslot);
      fetchData();
      alert('Créneau horaire ajouté avec succès !');
    } catch {
      alert('Erreur lors de l\'ajout du créneau. Vérifiez qu\'il n\'existe pas déjà.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTimeslot = async (id: number) => {
    if (!confirm('Voulez-vous vraiment supprimer ce créneau horaire ? Cela affectera l\'emploi du temps.')) return;
    try {
      await api.delete(`academics/timeslots/${id}/`);
      fetchData();
    } catch {
      alert('Erreur lors de la suppression.');
    }
  };

  if (loading) return <div className="p-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200">
          <SettingsIcon className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Configuration Scolaire & Paramètres</h2>
          <p className="text-sm text-gray-500">Gérez l'identité de l'établissement, les matières d'enseignement, et attribuez-les aux enseignants.</p>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-gray-200 space-x-6 mb-6 overflow-x-auto">
        {([
          { key: 'profile', label: 'Identité de l\'École' },
          { key: 'classes', label: 'Classes' },
          { key: 'timeslots', label: 'Créneaux Horaires' },
          { key: 'subjects', label: 'Matières' },
          { key: 'allocations', label: 'Attribution des Cours' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveSubTab(tab.key)}
            className={`pb-4 text-sm font-bold whitespace-nowrap transition-all relative ${activeSubTab === tab.key ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'
              }`}
          >
            {tab.label}
            {activeSubTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {activeSubTab === 'profile' && (
        <form onSubmit={handleSchoolSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Sidebar Logo */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-center">
              <label className="block text-sm font-bold text-gray-400 uppercase mb-4">Logo Officiel</label>
              <div className="relative group mx-auto w-40 h-40">
                <div className="w-full h-full rounded-3xl border-4 border-slate-50 overflow-hidden bg-slate-100 flex items-center justify-center">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <Building className="w-16 h-16 text-slate-300" />
                  )}
                </div>
                <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl cursor-pointer">
                  <Camera className="w-8 h-8 text-white" />
                  <input type="file" className="hidden" onChange={handleLogoChange} accept="image/*" />
                </label>
              </div>
              <p className="text-[10px] text-gray-400 mt-4 italic">Format PNG ou JPG. Fond transparent recommandé.</p>
            </div>
          </div>

          {/* Main Info */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Nom de l'école</label>
                  <div className="relative">
                    <Building className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                      value={schoolData.name}
                      onChange={e => setSchoolData({ ...schoolData, name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Téléphone</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                        value={schoolData.phone_number}
                        onChange={e => setSchoolData({ ...schoolData, phone_number: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Email de contact</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                        value={schoolData.email}
                        onChange={e => setSchoolData({ ...schoolData, email: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Adresse physique</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                    <textarea
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium min-h-[100px]"
                      value={schoolData.address}
                      onChange={e => setSchoolData({ ...schoolData, address: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 h-12 px-8 rounded-2xl shadow-lg shadow-blue-100">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5 mr-2" /> Enregistrer les modifications</>}
                </Button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ─── Onglet Classes ─────────────────────────────────────────────── */}
      {activeSubTab === 'classes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulaire création classe */}
          <div className="lg:col-span-1 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center">
              <Plus className="w-5 h-5 mr-2 text-blue-600" />
              Nouvelle Classe
            </h3>
            <form onSubmit={handleAddClass} className="space-y-4">
              {/* Nom */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nom de la classe</label>
                <input
                  required type="text" placeholder="ex: 6ème A"
                  className="w-full border rounded-xl p-3 outline-none focus:border-blue-500"
                  value={newClass.name}
                  onChange={e => setNewClass({ ...newClass, name: e.target.value })}
                />
              </div>
              {/* Cycle */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Cycle</label>
                <select
                  required
                  className="w-full border rounded-xl p-3 outline-none focus:border-blue-500"
                  value={newClass.cycle}
                  onChange={e => setNewClass({ ...newClass, cycle: e.target.value, level: '', series: 'AUCUNE' })}
                >
                  <option value="">Choisir un cycle...</option>
                  {(cycles as any[]).map((c: any) => (
                    <option key={c.id} value={c.id}>{c.school_name} – {c.name}</option>
                  ))}
                </select>
              </div>
              {/* Niveau */}
              {newClass.cycle && (
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Niveau *</label>
                  <select
                    required
                    className="w-full border rounded-xl p-3 outline-none focus:border-blue-500"
                    value={newClass.level}
                    onChange={e => setNewClass({ ...newClass, level: e.target.value })}
                  >
                    <option value="">Choisir le niveau...</option>
                    {getCycleLevels(newClass.cycle).map(l => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                </div>
              )}
              {/* Série (uniquement pour le Lycée) */}
              {isLycee(newClass.cycle) && (
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Série</label>
                  <select
                    className="w-full border rounded-xl p-3 outline-none focus:border-blue-500"
                    value={newClass.series}
                    onChange={e => setNewClass({ ...newClass, series: e.target.value })}
                  >
                    {SERIES_LYCEE.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              )}
              {/* Capacité */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Capacité max.</label>
                <input
                  type="number" min="1" max="100"
                  className="w-full border rounded-xl p-3 outline-none focus:border-blue-500"
                  value={newClass.capacity}
                  onChange={e => setNewClass({ ...newClass, capacity: e.target.value })}
                />
              </div>
              <Button type="submit" disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 h-12 rounded-xl font-bold">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Créer la Classe'}
              </Button>
            </form>
          </div>

          {/* Liste des classes */}
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50 bg-slate-50/30">
              <h3 className="font-bold text-slate-900">Classes Enregistrées</h3>
            </div>
            <div className="overflow-x-auto max-h-[550px]">
              <table className="w-full text-left">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Nom</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Cycle</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Niveau</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Série</th>
                    <th className="px-6 py-3 text-center text-[10px] font-bold text-slate-400 uppercase">Cap.</th>
                    <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-400 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {classrooms.length === 0 ? (
                    <tr><td colSpan={6} className="p-10 text-center text-gray-400 italic">Aucune classe enregistrée.</td></tr>
                  ) : (
                    (classrooms as any[]).map((cls: any) => (
                      <tr key={cls.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-sm text-slate-900">{cls.name}</td>
                        <td className="px-6 py-4 text-xs text-slate-500">{cls.cycle_name}</td>
                        <td className="px-6 py-4">
                          {cls.level ? (
                            <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">
                              {cls.level}
                            </span>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-6 py-4">
                          {cls.series && cls.series !== 'AUCUNE' ? (
                            <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold">
                              {cls.series}
                            </span>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-slate-600">{cls.capacity}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDeleteClass(cls.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── Onglet Créneaux Horaires ─────────────────────────────────────────────── */}
      {activeSubTab === 'timeslots' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4 h-fit">
            <h3 className="text-lg font-bold text-gray-900 flex items-center">
              <Plus className="w-5 h-5 mr-2 text-blue-600" />
              Nouveau Créneau
            </h3>
            <form onSubmit={handleAddTimeslot} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Heure de début</label>
                <input
                  required type="time"
                  className="w-full border rounded-xl p-3 outline-none focus:border-blue-500 font-bold"
                  value={newTimeslot.start_time}
                  onChange={e => setNewTimeslot({ ...newTimeslot, start_time: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Heure de fin</label>
                <input
                  required type="time"
                  className="w-full border rounded-xl p-3 outline-none focus:border-blue-500 font-bold"
                  value={newTimeslot.end_time}
                  onChange={e => setNewTimeslot({ ...newTimeslot, end_time: e.target.value })}
                />
              </div>
              <Button type="submit" disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 h-12 rounded-xl font-bold">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Ajouter le créneau'}
              </Button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50 bg-slate-50/30">
              <h3 className="font-bold text-slate-900">Créneaux Horaires Enregistrés</h3>
            </div>
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Heure de Début</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Heure de Fin</th>
                    <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-400 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {timeslots.length === 0 ? (
                    <tr><td colSpan={3} className="p-10 text-center text-gray-400 italic">Aucun créneau horaire enregistré.</td></tr>
                  ) : (
                    (timeslots as any[]).map((ts: any) => (
                      <tr key={ts.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-sm text-slate-900">{ts.start_time.substring(0, 5)}</td>
                        <td className="px-6 py-4 font-bold text-sm text-slate-900">{ts.end_time.substring(0, 5)}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDeleteTimeslot(ts.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── Onglet Créneaux Horaires ─────────────────────────────────────────────── */}
      {activeSubTab === 'timeslots' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4 h-fit">
            <h3 className="text-lg font-bold text-gray-900 flex items-center">
              <Plus className="w-5 h-5 mr-2 text-blue-600" />
              Nouveau Créneau
            </h3>
            <form onSubmit={handleAddTimeslot} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Heure de début</label>
                <input
                  required type="time"
                  className="w-full border rounded-xl p-3 outline-none focus:border-blue-500 font-bold"
                  value={newTimeslot.start_time}
                  onChange={e => setNewTimeslot({ ...newTimeslot, start_time: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Heure de fin</label>
                <input
                  required type="time"
                  className="w-full border rounded-xl p-3 outline-none focus:border-blue-500 font-bold"
                  value={newTimeslot.end_time}
                  onChange={e => setNewTimeslot({ ...newTimeslot, end_time: e.target.value })}
                />
              </div>
              <Button type="submit" disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 h-12 rounded-xl font-bold">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Ajouter le créneau'}
              </Button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50 bg-slate-50/30">
              <h3 className="font-bold text-slate-900">Créneaux Horaires Enregistrés</h3>
            </div>
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Heure de Début</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Heure de Fin</th>
                    <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-400 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {timeslots.length === 0 ? (
                    <tr><td colSpan={3} className="p-10 text-center text-gray-400 italic">Aucun créneau horaire enregistré.</td></tr>
                  ) : (
                    (timeslots as any[]).map((ts: any) => (
                      <tr key={ts.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-sm text-slate-900">{ts.start_time.substring(0, 5)}</td>
                        <td className="px-6 py-4 font-bold text-sm text-slate-900">{ts.end_time.substring(0, 5)}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDeleteTimeslot(ts.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'subjects' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulaire ajout Matière */}
          <div className="lg:col-span-1 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center">
              <Plus className="w-5 h-5 mr-2 text-blue-600" />
              Nouvelle Matière
            </h3>
            <form onSubmit={handleAddSubject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nom de la Matière</label>
                <input
                  required
                  type="text"
                  placeholder="ex: Mathématiques"
                  className="w-full border rounded-xl p-3 outline-none focus:border-blue-500"
                  value={newSubject.name}
                  onChange={e => setNewSubject({ ...newSubject, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Code Abrégé</label>
                <input
                  required
                  type="text"
                  placeholder="ex: MATHS"
                  className="w-full border rounded-xl p-3 outline-none focus:border-blue-500"
                  value={newSubject.code}
                  onChange={e => setNewSubject({ ...newSubject, code: e.target.value.toUpperCase().replace(/\s/g, '') })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Description (Optionnelle)</label>
                <textarea
                  placeholder="Informations supplémentaires..."
                  className="w-full border rounded-xl p-3 outline-none focus:border-blue-500 min-h-[80px]"
                  value={newSubject.description}
                  onChange={e => setNewSubject({ ...newSubject, description: e.target.value })}
                />
              </div>
              <Button type="submit" disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 h-12 rounded-xl font-bold">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Créer la Matière"}
              </Button>
            </form>
          </div>

          {/* Liste des Matières */}
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden overflow-x-auto">
            <div className="p-6 border-b border-slate-50 bg-slate-50/30">
              <h3 className="font-bold text-slate-900">Matières Enseignées</h3>
            </div>
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Matière</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Code</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Description</th>
                    <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {subjects.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-10 text-center text-gray-400 italic">Aucune matière enregistrée.</td>
                    </tr>
                  ) : (
                    subjects.map((sub: any) => (
                      <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-sm text-slate-900">{sub.name}</td>
                        <td className="px-6 py-4 text-xs font-mono font-bold text-blue-600">{sub.code || '---'}</td>
                        <td className="px-6 py-4 text-xs text-slate-500 truncate max-w-[200px]">{sub.description || '---'}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDeleteSubject(sub.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'allocations' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulaire Attribution */}
          <div className="lg:col-span-1 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center">
              <Plus className="w-5 h-5 mr-2 text-blue-600" />
              Attribuer un Cours
            </h3>
            <form onSubmit={handleAddAlloc} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Classe</label>
                <select
                  className="w-full border rounded-xl p-3 outline-none focus:border-blue-500"
                  value={newAlloc.classroom}
                  onChange={e => setNewAlloc({ ...newAlloc, classroom: e.target.value })}
                >
                  {classrooms.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Matière</label>
                <select
                  className="w-full border rounded-xl p-3 outline-none focus:border-blue-500"
                  value={newAlloc.subject}
                  onChange={e => setNewAlloc({ ...newAlloc, subject: e.target.value })}
                >
                  {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Enseignant</label>
                <select
                  className="w-full border rounded-xl p-3 outline-none focus:border-blue-500"
                  value={newAlloc.teacher}
                  onChange={e => setNewAlloc({ ...newAlloc, teacher: e.target.value })}
                >
                  {teachers.map((t: any) => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Coefficient</label>
                <input
                  required
                  type="number"
                  min="1"
                  className="w-full border rounded-xl p-3 outline-none focus:border-blue-500 font-bold"
                  value={newAlloc.coefficient}
                  onChange={e => setNewAlloc({ ...newAlloc, coefficient: e.target.value })}
                />
              </div>
              <Button type="submit" disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 h-12 rounded-xl font-bold">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Attribuer ce Cours"}
              </Button>
            </form>
          </div>

          {/* Liste des Attributions */}
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden overflow-x-auto">
            <div className="p-6 border-b border-slate-50 bg-slate-50/30">
              <h3 className="font-bold text-slate-900">Cours Attribués par Classe</h3>
            </div>
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Classe</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Matière</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Enseignant</th>
                    <th className="px-6 py-3 text-center text-[10px] font-bold text-slate-400 uppercase">Coef.</th>
                    <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {allocations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-10 text-center text-gray-400 italic">Aucun cours n'est encore attribué.</td>
                    </tr>
                  ) : (
                    allocations.map((all: any) => (
                      <tr key={all.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold text-slate-900">{all.classroom_name}</td>
                        <td className="px-6 py-4 text-xs font-semibold text-blue-700 bg-blue-50/50 rounded-lg inline-block m-2">{all.subject_name}</td>
                        <td className="px-6 py-4 text-xs font-medium text-slate-700">{all.teacher_name}</td>
                        <td className="px-6 py-4 text-sm font-black text-center text-slate-950">{all.coefficient}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDeleteAlloc(all.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
