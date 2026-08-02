import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '@/api/axios';
import { 
  CheckCircle, XCircle, Clock, Save, Users, Filter, Loader2,
  FileText, Award, AlertTriangle, Check, Edit2, BookOpen, RefreshCw 
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AttendancePage() {
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [absences, setAbsences] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [loading, setLoading] = useState(false);
  const [loadingAbsences, setLoadingAbsences] = useState(false);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  
  // Tabs: 'TAKE_ATTENDANCE' (make call), 'REGISTER' (admin view)
  const [activeTab, setActiveTab] = useState<'TAKE_ATTENDANCE' | 'REGISTER'>('TAKE_ATTENDANCE');

  // User Profile
  const { userProfile } = useOutletContext<any>() || {};
  const isAdmin = ['ADMIN', 'DIRECTION'].includes(userProfile?.role);

  // Take Attendance State: { enrollmentId: { status, motive, comment } }
  const [attendanceData, setAttendanceData] = useState<Record<number, { status: string; motive: string; comment: string }>>({});

  // Admin Filters
  const [filterClass, setFilterClass] = useState('ALL');
  const [filterStudent, setFilterStudent] = useState('ALL');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Edit Absence Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAbsence, setSelectedAbsence] = useState<any>(null);
  const [editMotive, setEditMotive] = useState('');
  const [editObservation, setEditObservation] = useState('');
  const [editComment, setEditComment] = useState('');

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [cRes, sRes] = await Promise.all([
          api.get('core/classrooms/'),
          api.get('academics/subjects/')
        ]);
        setClassrooms(cRes.data);
        setSubjects(sRes.data);
        if (cRes.data.length > 0) {
          setSelectedClass(cRes.data[0].id.toString());
        }
        if (sRes.data.length > 0) {
          setSelectedSubject(sRes.data[0].id.toString());
        }
      } catch (error) {
        console.error("Erreur de chargement initial", error);
      }
    };
    fetchInitialData();
  }, []);

  // Fetch Enrollments for Take Attendance Tab
  useEffect(() => {
    if (selectedClass && activeTab === 'TAKE_ATTENDANCE') {
      fetchEnrollments();
    }
  }, [selectedClass, date, selectedSubject, activeTab]);

  // Fetch Absences Registry for Admin Tab
  useEffect(() => {
    if (activeTab === 'REGISTER') {
      fetchAbsencesRegistry();
    }
  }, [activeTab, filterClass, filterStudent, filterStartDate, filterEndDate]);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await api.get('students/attendance/summary/?date=' + date);
        setSummary(res.data);
      } catch (error) {
        console.error('Erreur de résumé absences', error);
      }
    };

    fetchSummary();
    const interval = window.setInterval(fetchSummary, 15000);
    return () => window.clearInterval(interval);
  }, [date]);

  const fetchEnrollments = async () => {
    setLoading(true);
    try {
      // 1. Fetch classroom students
      const enrollRes = await api.get(`students/enrollments/?classroom=${selectedClass}`);
      setEnrollments(enrollRes.data);
      
      // 2. Fetch existing attendances for class, date & subject
      const attendRes = await api.get(`students/attendance/?date=${date}&classroom=${selectedClass}`);
      
      // Filter attendances that match this specific subject
      const existing: Record<number, any> = {};
      attendRes.data.forEach((a: any) => {
        if (!selectedSubject || a.subject?.toString() === selectedSubject) {
          existing[a.enrollment] = a;
        }
      });
      
      // 3. Initialize attendanceData
      const initial: Record<number, { status: string; motive: string; comment: string }> = {};
      enrollRes.data.forEach((e: any) => {
        const exist = existing[e.id];
        initial[e.id] = {
          status: exist ? exist.status : 'PRESENT',
          motive: exist ? (exist.motive || '') : '',
          comment: exist ? (exist.comment || '') : ''
        };
      });
      setAttendanceData(initial);
    } catch (error) {
      console.error("Erreur de chargement des inscriptions", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAbsencesRegistry = async () => {
    setLoadingAbsences(true);
    try {
      let url = 'students/attendance/';
      const params: string[] = [];
      if (filterClass !== 'ALL') params.push(`classroom=${filterClass}`);
      
      const res = await api.get(`${url}?${params.join('&')}`);
      // Filter out PRESENT status, only keep ABSENT and LATE records
      let filtered = res.data.filter((a: any) => a.status === 'ABSENT' || a.status === 'LATE');
      
      // Filter by Student
      if (filterStudent !== 'ALL') {
        filtered = filtered.filter((a: any) => a.enrollment_student?.toString() === filterStudent || a.student_name?.toLowerCase().includes(filterStudent.toLowerCase()));
      }
      
      // Filter by start and end dates
      if (filterStartDate) {
        filtered = filtered.filter((a: any) => a.date >= filterStartDate);
      }
      if (filterEndDate) {
        filtered = filtered.filter((a: any) => a.date <= filterEndDate);
      }

      setAbsences(filtered);

      // Populate students list for the filter
      const uniqueStudentsMap: Record<string, string> = {};
      res.data.forEach((a: any) => {
        uniqueStudentsMap[a.student_name] = a.student_name;
      });
      setAllStudents(Object.values(uniqueStudentsMap));
    } catch (error) {
      console.error("Erreur de chargement du registre", error);
    } finally {
      setLoadingAbsences(false);
    }
  };

  const updateAttendanceField = (enrollmentId: number, field: string, value: any) => {
    setAttendanceData(prev => ({
      ...prev,
      [enrollmentId]: {
        ...prev[enrollmentId],
        [field]: value
      }
    }));
  };

  const handleSaveAttendance = async () => {
    setSaving(true);
    try {
      const promises = enrollments.map(async (e) => {
        const dataForStudent = attendanceData[e.id];
        
        // Fetch if already exists to do PUT or POST
        const existingRes = await api.get(`students/attendance/?date=${date}&classroom=${selectedClass}`);
        const existingRecord = existingRes.data.find((a: any) => a.enrollment === e.id && (!selectedSubject || a.subject?.toString() === selectedSubject));

        const payload: any = {
          enrollment: e.id,
          date: date,
          status: dataForStudent.status,
          subject: selectedSubject ? parseInt(selectedSubject) : null,
          motive: dataForStudent.status !== 'PRESENT' ? dataForStudent.motive : null,
          comment: dataForStudent.status !== 'PRESENT' ? dataForStudent.comment : null
        };

        if (existingRecord) {
          return api.patch(`students/attendance/${existingRecord.id}/`, payload);
        } else {
          return api.post('students/attendance/', payload);
        }
      });
      
      await Promise.all(promises);
      alert("Appel enregistré avec succès !");
      fetchEnrollments();
    } catch (error) {
      console.error(error);
      alert("Une erreur est survenue lors de l'enregistrement de l'appel.");
    } finally {
      setSaving(false);
    }
  };

  const handleValidateAbsence = async (id: number, currentVal: boolean) => {
    try {
      await api.patch(`students/attendance/${id}/validate/`, { is_validated: !currentVal });
      fetchAbsencesRegistry();
      alert(`Absence ${!currentVal ? 'validée' : 'dé-validée'} avec succès.`);
    } catch (error) {
      alert("Erreur de validation de l'absence.");
    }
  };

  const handleOpenEditModal = (absence: any) => {
    setSelectedAbsence(absence);
    setEditMotive(absence.motive || 'AUTRE');
    setEditComment(absence.comment || '');
    setEditObservation(absence.observation || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAbsence) return;
    setSaving(true);
    try {
      await api.patch(`students/attendance/${selectedAbsence.id}/`, {
        motive: editMotive,
        comment: editComment,
        observation: editObservation
      });
      setShowEditModal(false);
      setSelectedAbsence(null);
      fetchAbsencesRegistry();
      alert("Absence mise à jour avec succès !");
    } catch (error) {
      alert("Erreur lors de la mise à jour.");
    } finally {
      setSaving(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      let params = [];
      if (filterClass !== 'ALL') params.push(`classroom=${filterClass}`);
      if (filterStartDate) params.push(`start_date=${filterStartDate}`);
      if (filterEndDate) params.push(`end_date=${filterEndDate}`);
      
      const response = await api.get(`students/attendance/export_pdf/?${params.join('&')}`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `rapport_absences_${new Date().toISOString().split('T')[0]}.pdf`;
      link.click();
    } catch (error) {
      console.error(error);
      alert("Erreur lors de l'export du PDF.");
    }
  };

  // Simple statistics calculations
  const totalStudentsChecked = enrollments.length;
  const presentsCount = Object.values(attendanceData).filter(x => x.status === 'PRESENT').length;
  const absencesCount = Object.values(attendanceData).filter(x => x.status === 'ABSENT').length;
  const latesCount = Object.values(attendanceData).filter(x => x.status === 'LATE').length;
  const globalPresenceRate = totalStudentsChecked > 0 ? Math.round((presentsCount / totalStudentsChecked) * 100) : 100;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Gestion des Absences</h2>
          <p className="text-slate-500 font-medium">Gérez l'appel quotidien et suivez l'assiduité des élèves.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setActiveTab('TAKE_ATTENDANCE')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'TAKE_ATTENDANCE'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                : 'bg-white border text-slate-600 hover:bg-slate-50'
            }`}
          >
            Faire l'appel
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('REGISTER')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'REGISTER'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                  : 'bg-white border text-slate-600 hover:bg-slate-50'
              }`}
            >
              Registre (Admin)
            </button>
          )}
        </div>
      </div>

      {activeTab === 'TAKE_ATTENDANCE' ? (
        // --- TAKE ATTENDANCE TAB ---
        <div className="space-y-6">
          {/* Quick Config Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Classe</label>
                <select
                  className="w-full border rounded-xl p-2.5 outline-none focus:border-blue-500 text-sm bg-slate-50 font-semibold text-slate-700"
                  value={selectedClass}
                  onChange={e => setSelectedClass(e.target.value)}
                >
                  {classrooms.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Date d'appel</label>
                <input
                  type="date"
                  className="w-full border rounded-xl p-2.5 outline-none focus:border-blue-500 text-sm bg-slate-50 text-slate-700 font-semibold"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Matière (Cours)</label>
                <select
                  className="w-full border rounded-xl p-2.5 outline-none focus:border-blue-500 text-sm bg-slate-50 font-semibold text-slate-700"
                  value={selectedSubject}
                  onChange={e => setSelectedSubject(e.target.value)}
                >
                  <option value="">Séance générale (Pas de matière)</option>
                  {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            
            <div className="flex items-end justify-end pt-4 md:pt-0">
              <Button onClick={handleSaveAttendance} disabled={saving || enrollments.length === 0} className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100 px-6">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Enregistrer l'appel
              </Button>
            </div>
          </div>

          {/* Quick Stats Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-600 font-bold uppercase">Présents</p>
                <h4 className="text-2xl font-black text-emerald-900 mt-1">{presentsCount}</h4>
              </div>
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>

            <div className="bg-rose-50 border border-rose-100 p-5 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs text-rose-600 font-bold uppercase">Absents</p>
                <h4 className="text-2xl font-black text-rose-900 mt-1">{absencesCount}</h4>
              </div>
              <XCircle className="w-8 h-8 text-rose-600" />
            </div>

            <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-600 font-bold uppercase">Retards</p>
                <h4 className="text-2xl font-black text-amber-900 mt-1">{latesCount}</h4>
              </div>
              <Clock className="w-8 h-8 text-amber-600" />
            </div>

            <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 font-bold uppercase">Présence</p>
                <h4 className="text-2xl font-black text-blue-900 mt-1">{globalPresenceRate}%</h4>
              </div>
              <Award className="w-8 h-8 text-blue-600" />
            </div>

            <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600 font-bold uppercase">Absences en attente</p>
                <h4 className="text-2xl font-black text-slate-900 mt-1">{summary?.pending_absences ?? 0}</h4>
              </div>
              <AlertTriangle className="w-8 h-8 text-slate-600" />
            </div>
          </div>

          {/* Student Appel Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex justify-between items-center">
              <span className="text-sm font-bold text-slate-700 flex items-center">
                <Users className="w-4 h-4 mr-2 text-slate-400" />
                Liste de classe ({enrollments.length} élèves inscrits)
              </span>
            </div>
            
            {loading ? (
              <div className="p-20 text-center">
                <Loader2 className="w-10 h-10 animate-spin mx-auto text-blue-600" />
                <p className="text-slate-400 mt-2 text-sm font-medium">Chargement des élèves...</p>
              </div>
            ) : enrollments.length === 0 ? (
              <div className="p-16 text-center text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-bold">Aucun élève inscrit dans cette classe</p>
                <p className="text-xs">Ajoutez des inscriptions d'élèves pour cette classe dans les paramètres.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {enrollments.map((e: any) => {
                  const studentData = attendanceData[e.id] || { status: 'PRESENT', motive: '', comment: '' };
                  
                  return (
                    <div key={e.id} className="p-5 hover:bg-slate-50/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Student Identity */}
                      <div className="flex items-center space-x-3 min-w-[200px]">
                        <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                          {e.student_name?.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900">{e.student_name}</div>
                          <div className="text-xs text-slate-400 font-semibold">{e.student_matricule || 'Sans matricule'}</div>
                        </div>
                      </div>

                      {/* Status Buttons */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateAttendanceField(e.id, 'status', 'PRESENT')}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                            studentData.status === 'PRESENT'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-white text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          ✔ Présent
                        </button>
                        
                        <button
                          onClick={() => updateAttendanceField(e.id, 'status', 'ABSENT')}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                            studentData.status === 'ABSENT'
                              ? 'bg-rose-50 text-rose-700 border-rose-200 shadow-sm'
                              : 'bg-white text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          ✖ Absent
                        </button>

                        <button
                          onClick={() => updateAttendanceField(e.id, 'status', 'LATE')}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                            studentData.status === 'LATE'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-white text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          ⏱ Retard
                        </button>
                      </div>

                      {/* Absence / Late Details Form */}
                      {studentData.status !== 'PRESENT' && (
                        <div className="flex flex-col sm:flex-row gap-2 flex-1 max-w-xl md:ml-4">
                          <select
                            className="border rounded-xl p-2 text-xs bg-slate-50 outline-none focus:border-blue-500"
                            value={studentData.motive}
                            onChange={(event) => updateAttendanceField(e.id, 'motive', event.target.value)}
                          >
                            <option value="">Motif non défini</option>
                            <option value="MALADIE">Maladie</option>
                            <option value="JUSTIFIEE">Absence justifiée</option>
                            <option value="NON_JUSTIFIEE">Absence non justifiée</option>
                            <option value="AUTRE">Autre motif</option>
                          </select>
                          
                          <input
                            type="text"
                            placeholder="Commentaire de l'enseignant..."
                            className="border rounded-xl p-2 text-xs bg-slate-50 flex-1 outline-none focus:border-blue-500"
                            value={studentData.comment}
                            onChange={(event) => updateAttendanceField(e.id, 'comment', event.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        // --- ADMIN REGISTRY TAB ---
        <div className="space-y-6">
          {/* Summary card */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-2xl text-white shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-blue-100">Centre de suivi</p>
                <h3 className="text-xl font-black mt-1">Tableau de bord des absences</h3>
                <p className="text-sm text-blue-100 mt-2">Validation administrative, suivi des classes concernées et notifications automatiques.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white/10 rounded-xl px-3 py-2">
                  <div className="text-xs uppercase text-blue-100">Taux de présence</div>
                  <div className="font-black text-lg">{summary?.attendance_rate ?? 0}%</div>
                </div>
                <div className="bg-white/10 rounded-xl px-3 py-2">
                  <div className="text-xs uppercase text-blue-100">Classes impactées</div>
                  <div className="font-black text-lg">{summary?.classes_affected?.length ?? 0}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-sm font-bold text-slate-700 flex items-center">
                <Filter className="w-4 h-4 mr-2 text-slate-400" />
                Filtrer et exporter les rapports d'absences
              </span>
              <Button onClick={handleExportPDF} className="bg-blue-600 hover:bg-blue-700 text-xs shadow-md shadow-blue-100 flex items-center">
                <FileText className="w-3.5 h-3.5 mr-2" />
                Générer Rapport PDF
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Classe</label>
                <select
                  className="w-full border rounded-xl p-2.5 outline-none focus:border-blue-500 text-sm bg-slate-50"
                  value={filterClass}
                  onChange={e => setFilterClass(e.target.value)}
                >
                  <option value="ALL">Toutes les classes</option>
                  {classrooms.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Élève</label>
                <select
                  className="w-full border rounded-xl p-2.5 outline-none focus:border-blue-500 text-sm bg-slate-50"
                  value={filterStudent}
                  onChange={e => setFilterStudent(e.target.value)}
                >
                  <option value="ALL">Tous les élèves</option>
                  {allStudents.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Date Début</label>
                <input
                  type="date"
                  className="w-full border rounded-xl p-2.5 outline-none focus:border-blue-500 text-sm bg-slate-50"
                  value={filterStartDate}
                  onChange={e => setFilterStartDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Date Fin</label>
                <input
                  type="date"
                  className="w-full border rounded-xl p-2.5 outline-none focus:border-blue-500 text-sm bg-slate-50"
                  value={filterEndDate}
                  onChange={e => setFilterEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Table list of absences */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2 text-rose-500" />
                Absences et retards signalés ({absences.length})
              </span>
              <button onClick={fetchAbsencesRegistry} className="p-2 hover:bg-slate-100 rounded-full transition-all">
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>

            <div className="overflow-x-auto">
              {loadingAbsences ? (
                <div className="p-20 text-center">
                  <Loader2 className="w-10 h-10 animate-spin mx-auto text-blue-600" />
                </div>
              ) : absences.length === 0 ? (
                <div className="p-16 text-center text-slate-400">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-20 text-emerald-600" />
                  <p className="font-bold">Aucune absence ou retard signalé</p>
                  <p className="text-xs">Félicitations, assiduité parfaite sur ces critères !</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/60 border-b">
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase">Date / Heure</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase">Élève</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase">Classe / Cours</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase">Déclaré par</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase">Motif / Commentaire</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase">Validation Admin</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {absences.map((a: any) => {
                      const motifLabel: Record<string, string> = {
                        'MALADIE': 'Maladie',
                        'JUSTIFIEE': 'Justifiée',
                        'NON_JUSTIFIEE': 'Non justifiée',
                        'AUTRE': 'Autre motif'
                      };
                      
                      const declTime = a.created_at ? new Date(a.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-';
                      
                      return (
                        <tr key={a.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-bold text-slate-900">{a.date}</div>
                            <div className="text-xs text-slate-400">Déclaré à {declTime}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-800">
                            {a.student_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-bold text-slate-900">{a.classroom_name}</div>
                            <div className="text-xs text-slate-500 font-semibold">{a.subject_name || 'Cours Général'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-600 text-xs">
                            {a.recorded_by_name || 'Inconnu'}
                          </td>
                          <td className="px-6 py-4 max-w-[220px]">
                            <div className="flex items-center space-x-2">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                a.status === 'ABSENT' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                              }`}>
                                {a.status === 'ABSENT' ? 'Absent' : 'Retard'}
                              </span>
                              {a.motive && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                  {motifLabel[a.motive] || a.motive}
                                </span>
                              )}
                            </div>
                            {(a.comment || a.observation) && (
                              <div className="text-xs text-slate-400 mt-1 flex flex-col space-y-0.5">
                                {a.comment && <p className="italic">"Prof: {a.comment}"</p>}
                                {a.observation && <p className="italic text-blue-600">"Admin: {a.observation}"</p>}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => handleValidateAbsence(a.id, a.is_validated)}
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                                a.is_validated 
                                  ? 'bg-green-50 text-green-700 border-green-200' 
                                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <Check className="w-3 h-3 mr-1" />
                              {a.is_validated ? 'Validé' : 'Non Validé'}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <button
                              onClick={() => handleOpenEditModal(a)}
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-all inline-block"
                              title="Modifier / Ajouter observation"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Absence / Observation Modal */}
      {showEditModal && selectedAbsence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-800 flex items-center">
                <BookOpen className="w-5 h-5 mr-2 text-blue-600" />
                Traiter l'absence de {selectedAbsence.student_name}
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>
            
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Motif d'absence</label>
                <select
                  className="w-full border rounded-xl p-3 outline-none focus:border-blue-500 text-sm bg-slate-50"
                  value={editMotive}
                  onChange={e => setEditMotive(e.target.value)}
                >
                  <option value="MALADIE">Maladie</option>
                  <option value="JUSTIFIEE">Absence justifiée</option>
                  <option value="NON_JUSTIFIEE">Absence non justifiée</option>
                  <option value="AUTRE">Autre motif</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Commentaire Enseignant</label>
                <textarea
                  className="w-full border rounded-xl p-3 outline-none focus:border-blue-500 text-sm bg-slate-50"
                  rows={2}
                  value={editComment}
                  onChange={e => setEditComment(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Observation Administrateur</label>
                <textarea
                  className="w-full border rounded-xl p-3 outline-none focus:border-blue-500 text-sm bg-slate-50"
                  placeholder="Ex: Certificat médical fourni..."
                  rows={3}
                  value={editObservation}
                  onChange={e => setEditObservation(e.target.value)}
                />
              </div>

              <div className="flex pt-4 space-x-3">
                <Button type="button" variant="ghost" className="flex-1 rounded-xl" onClick={() => setShowEditModal(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
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
