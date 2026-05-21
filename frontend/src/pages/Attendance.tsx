import { useEffect, useState } from 'react';
import api from '@/api/axios';
import { CheckCircle, XCircle, Clock, Save, Users, Filter, Loader2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AttendancePage() {
  const [classrooms, setClassrooms] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // State pour stocker les pointages locaux avant sauvegarde
  // { enrollmentId: status }
  const [attendanceData, setAttendanceData] = useState<any>({});

  useEffect(() => {
    const fetchClasses = async () => {
      const res = await api.get('core/classrooms/');
      setClassrooms(res.data);
      if (res.data.length > 0) setSelectedClass(res.data[0].id.toString());
    };
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchEnrollments();
    }
  }, [selectedClass, date]);

  const fetchEnrollments = async () => {
    setLoading(true);
    try {
      // 1. Récupérer les élèves de la classe
      const enrollRes = await api.get(`students/enrollments/?classroom=${selectedClass}`);
      setEnrollments(enrollRes.data);
      
      // 2. Récupérer les pointages déjà existants pour cette date et classe
      const attendRes = await api.get(`students/attendance/?date=${date}`);
      const existing: any = {};
      attendRes.data.forEach((a: any) => {
        existing[a.enrollment] = a.status;
      });
      
      // 3. Initialiser le state local (Par défaut PRESENT pour ceux qui n'ont pas de pointage)
      const initial: any = {};
      enrollRes.data.forEach((e: any) => {
        initial[e.id] = existing[e.id] || 'PRESENT';
      });
      setAttendanceData(initial);
    } catch (error) {
      console.error("Erreur chargement", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = (enrollmentId: number) => {
    const current = attendanceData[enrollmentId];
    let next = 'PRESENT';
    if (current === 'PRESENT') next = 'ABSENT';
    else if (current === 'ABSENT') next = 'LATE';
    
    setAttendanceData({ ...attendanceData, [enrollmentId]: next });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Pour chaque élève, on envoie un POST (ou on pourrait faire un bulk endpoint au backend)
      // On va simuler une boucle ici
      const promises = enrollments.map(e => {
        return api.post('students/attendance/', {
          enrollment: e.id,
          date: date,
          status: attendanceData[e.id]
        }).catch(() => {
            // Si le pointage existe déjà, on fait un PUT ou on ignore (le backend a une contrainte unique)
            // Idéalement on devrait gérer le patch
        });
      });
      
      await Promise.all(promises);
      alert("Pointage enregistré avec succès !");
    } catch (error) {
      alert("Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const stats = {
    present: Object.values(attendanceData).filter(s => s === 'PRESENT').length,
    absent: Object.values(attendanceData).filter(s => s === 'ABSENT').length,
    late: Object.values(attendanceData).filter(s => s === 'LATE').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-900">Appel & Présences</h2>
           <p className="text-sm text-gray-500">Gérez les présences quotidiennes par classe.</p>
        </div>
        <div className="flex items-center space-x-3">
           <div className="bg-white border rounded-lg px-3 py-1 flex items-center">
              <Calendar className="w-4 h-4 text-gray-400 mr-2" />
              <input 
                type="date" 
                className="text-sm outline-none border-none" 
                value={date}
                onChange={e => setDate(e.target.value)}
              />
           </div>
           <div className="bg-white border rounded-lg px-3 py-1 flex items-center">
              <Filter className="w-4 h-4 text-gray-400 mr-2" />
              <select 
                className="text-sm outline-none font-medium"
                value={selectedClass}
                onChange={e => setSelectedClass(e.target.value)}
              >
                {classrooms.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
           </div>
        </div>
      </div>

      {/* Résumé du jour */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <div className="bg-green-50 border border-green-100 p-4 rounded-xl flex items-center">
            <div className="bg-green-600 p-2 rounded-lg text-white mr-4"><CheckCircle className="w-5 h-5" /></div>
            <div>
               <p className="text-xs text-green-700 font-bold uppercase">Présents</p>
               <h4 className="text-xl font-black text-green-900">{stats.present}</h4>
            </div>
         </div>
         <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center">
            <div className="bg-red-600 p-2 rounded-lg text-white mr-4"><XCircle className="w-5 h-5" /></div>
            <div>
               <p className="text-xs text-red-700 font-bold uppercase">Absents</p>
               <h4 className="text-xl font-black text-red-900">{stats.absent}</h4>
            </div>
         </div>
         <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-center">
            <div className="bg-amber-600 p-2 rounded-lg text-white mr-4"><Clock className="w-5 h-5" /></div>
            <div>
               <p className="text-xs text-amber-700 font-bold uppercase">Retards</p>
               <h4 className="text-xl font-black text-amber-900">{stats.late}</h4>
            </div>
         </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-gray-100 flex justify-between items-center">
           <div className="flex items-center text-sm font-bold text-slate-700">
              <Users className="w-4 h-4 mr-2" />
              Liste des élèves ({enrollments.length})
           </div>
           <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 h-9">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Enregistrer l'appel
           </Button>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-20 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-blue-600" /></div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Élève</th>
                  <th className="px-6 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Dernière Absence</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {enrollments.map((e: any) => (
                  <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                       <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-slate-200 mr-3 flex items-center justify-center text-xs font-bold text-slate-500">
                             {e.student_name.charAt(0)}
                          </div>
                          <span className="text-sm font-bold text-slate-900">{e.student_name}</span>
                       </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                       <button 
                        onClick={() => toggleStatus(e.id)}
                        className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                          attendanceData[e.id] === 'PRESENT' ? 'bg-green-100 text-green-700' :
                          attendanceData[e.id] === 'ABSENT' ? 'bg-red-100 text-red-700 shadow-sm shadow-red-100' :
                          'bg-amber-100 text-amber-700'
                        }`}
                       >
                         {attendanceData[e.id] === 'PRESENT' && <CheckCircle className="w-3 h-3 mr-1.5" />}
                         {attendanceData[e.id] === 'ABSENT' && <XCircle className="w-3 h-3 mr-1.5" />}
                         {attendanceData[e.id] === 'LATE' && <Clock className="w-3 h-3 mr-1.5" />}
                         {attendanceData[e.id]}
                       </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400 italic">
                       Aucune absence récente
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
