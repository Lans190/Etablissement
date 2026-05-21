import { useEffect, useState } from 'react';
import api from '@/api/axios';
import { FileText, Plus, Award, X, Download, RefreshCw, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Grades() {
  const [assessments, setAssessments] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [terms, setTerms] = useState([]);
  const [reportCards, setReportCards] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [selectedAssessment, setSelectedAssessment] = useState<any>(null);
  const [students, setStudents] = useState([]);
  const [studentGrades, setStudentGrades] = useState<any>({});

  const [formData, setFormData] = useState({
    title: '',
    term: '',
    allocation: '',
    type: 'DEVOIR',
    date: new Date().toISOString().split('T')[0],
    max_score: 20,
    weight: 1,
  });

  const [genData, setGenData] = useState({
    classroom_id: '',
    term_id: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [assRes, allocRes, termRes, rcRes, classRes] = await Promise.all([
        api.get('evaluations/assessments/'),
        api.get('academics/allocations/'),
        api.get('evaluations/terms/'),
        api.get('evaluations/report-cards/'),
        api.get('core/classrooms/')
      ]);
      setAssessments(assRes.data);
      setAllocations(allocRes.data);
      setTerms(termRes.data);
      setReportCards(rcRes.data);
      setClassrooms(classRes.data);
    } catch (error) {
      console.error("Erreur lors du chargement des données", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('evaluations/assessments/', formData);
      setShowModal(false);
      fetchData();
    } catch (error) {
      alert("Erreur lors de la création.");
    } finally {
      setSubmitting(false);
    }
  };

  const openGradeEntry = async (assessment: any) => {
    setSelectedAssessment(assessment);
    setLoading(true);
    try {
      const studentsRes = await api.get(`students/enrollments/?classroom=${assessment.classroom_id}`);
      setStudents(studentsRes.data);
      const gradesRes = await api.get(`evaluations/grades/?assessment=${assessment.id}`);
      const gradesMap: any = {};
      gradesRes.data.forEach((g: any) => {
        gradesMap[g.enrollment] = { score: g.score, comments: g.comments || '' };
      });
      setStudentGrades(gradesMap);
      setShowGradeModal(true);
    } catch (error) {
      console.error("Erreur", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGrades = async () => {
    setSubmitting(true);
    try {
      const gradesToSave = Object.keys(studentGrades).map(id => ({
        enrollment_id: id,
        score: studentGrades[id].score,
        comments: studentGrades[id].comments
      }));
      await api.post('evaluations/grades/bulk-save/', {
        assessment_id: selectedAssessment.id,
        grades: gradesToSave
      });
      setShowGradeModal(false);
      fetchData();
    } catch (error) {
      alert("Erreur de sauvegarde.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateReports = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('evaluations/report-cards/generate-reports/', genData);
      alert("Bulletins initialisés ! Vous pouvez maintenant les télécharger.");
      setShowGenerateModal(false);
      fetchData();
    } catch (error) {
      alert("Erreur de génération.");
    } finally {
      setSubmitting(false);
    }
  };

  const downloadPDF = async (id: number, name: string) => {
    try {
      const response = await api.get(`evaluations/report-cards/${id}/pdf/`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Bulletin_${name}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert("Erreur lors du téléchargement.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Notes & Bulletins</h2>
        <div className="flex space-x-3">
           <Button onClick={() => setShowGenerateModal(true)} variant="outline" className="border-yellow-500 text-yellow-700 hover:bg-yellow-50">
             <RefreshCw className="w-4 h-4 mr-2" />
             Lancer la clôture
           </Button>
           <Button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700">
             <Plus className="w-4 h-4 mr-2" />
             Nouvelle Évaluation
           </Button>
        </div>
      </div>

      {/* Modal Générer Bulletins */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4">
            <h3 className="text-xl font-bold">Clôture du Trimestre</h3>
            <p className="text-sm text-gray-500">Sélectionnez la classe et la période pour initialiser les bulletins.</p>
            <form onSubmit={handleGenerateReports} className="space-y-4">
               <div>
                  <label className="block text-sm font-medium">Classe</label>
                  <select required className="mt-1 w-full border rounded-md p-2 outline-none" value={genData.classroom_id} onChange={e => setGenData({...genData, classroom_id: e.target.value})}>
                     <option value="">Sélectionnez une classe...</option>
                     {classrooms.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
               </div>
               <div>
                  <label className="block text-sm font-medium">Période</label>
                  <select required className="mt-1 w-full border rounded-md p-2 outline-none" value={genData.term_id} onChange={e => setGenData({...genData, term_id: e.target.value})}>
                     <option value="">Sélectionnez la période...</option>
                     {terms.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
               </div>
               <div className="flex space-x-2">
                  <Button type="button" variant="ghost" onClick={() => setShowGenerateModal(false)} className="flex-1">Annuler</Button>
                  <Button type="submit" className="flex-1 bg-slate-900" disabled={submitting}>Générer</Button>
               </div>
            </form>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Nouvelle Évaluation</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleCreateAssessment} className="p-6 space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Titre de l'évaluation</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Devoir de Mathématiques n°1"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-blue-500 outline-none"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Période</label>
                    <select required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none" value={formData.term} onChange={(e) => setFormData({...formData, term: e.target.value})}>
                      <option value="">Sélectionnez...</option>
                      {terms.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <select className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none" value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}>
                      <option value="DEVOIR">Devoir</option>
                      <option value="COMPOSITION">Composition</option>
                      <option value="EXAMEN">Examen</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cours</label>
                  <select required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none" value={formData.allocation} onChange={(e) => setFormData({...formData, allocation: e.target.value})}>
                    <option value="">Sélectionnez...</option>
                    {allocations.map((alloc: any) => <option key={alloc.id} value={alloc.id}>{alloc.subject_name} - {alloc.classroom_name}</option>)}
                  </select>
                </div>
              </div>
              <div className="pt-4 flex space-x-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowModal(false)}>Annuler</Button>
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={submitting}>
                   {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Créer"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showGradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-xl font-bold">{selectedAssessment?.title}</h3>
              <button onClick={() => setShowGradeModal(false)} className="bg-white p-2 rounded-full shadow-sm"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold uppercase">Élève</th>
                    <th className="px-6 py-3 text-left text-xs font-bold uppercase w-32">Note</th>
                    <th className="px-6 py-3 text-left text-xs font-bold uppercase">Appréciation</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {students.map((student: any) => (
                    <tr key={student.id}>
                      <td className="px-6 py-4">{student.student_name}</td>
                      <td className="px-6 py-4">
                        <input type="number" step="0.25" className="w-24 px-3 py-1.5 border rounded-md text-center font-bold" value={studentGrades[student.id]?.score ?? ''} onChange={e => setStudentGrades({...studentGrades, [student.id]: {...studentGrades[student.id], score: e.target.value}})} />
                      </td>
                      <td className="px-6 py-4">
                        <input type="text" className="w-full px-3 py-1.5 border rounded-md italic" value={studentGrades[student.id]?.comments ?? ''} onChange={e => setStudentGrades({...studentGrades, [student.id]: {...studentGrades[student.id], comments: e.target.value}})} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-6 border-t bg-slate-50 flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowGradeModal(false)}>Annuler</Button>
              <Button onClick={handleSaveGrades} className="bg-green-600 hover:bg-green-700 text-white" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Enregistrer
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white shadow-sm rounded-xl border border-gray-100 flex flex-col overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-blue-500" />
              Saisie des Notes
            </h3>
          </div>
          <div className="p-0 flex-1 overflow-auto max-h-[500px]">
            {loading ? (
                <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
            ) : (
                <ul className="divide-y divide-gray-100">
                {assessments.map((ass: any) => (
                    <li key={ass.id} className="p-4 hover:bg-blue-50 cursor-pointer group" onClick={() => openGradeEntry(ass)}>
                    <div className="flex justify-between items-center">
                        <div>
                        <h4 className="font-bold text-gray-900 text-sm">{ass.title}</h4>
                        <p className="text-xs text-gray-500">{ass.subject_name} — {ass.classroom_name}</p>
                        </div>
                        <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100">Saisir</Button>
                    </div>
                    </li>
                ))}
                </ul>
            )}
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-xl border border-gray-100 flex flex-col overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900 flex items-center">
              <Award className="w-5 h-5 mr-2 text-yellow-500" />
              Bulletins Générés
            </h3>
          </div>
          <div className="p-0 flex-1 overflow-auto max-h-[500px]">
            {reportCards.length === 0 ? (
              <div className="p-10 text-center text-gray-400 italic">Aucun bulletin généré.</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {reportCards.map((rc: any) => (
                  <li key={rc.id} className="p-4 hover:bg-slate-50 flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900 text-sm">{rc.enrollment_name || "Élève"}</h4>
                      <p className="text-[10px] text-gray-500">{rc.term_name}</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-8 text-blue-600 border-blue-200 hover:bg-blue-50"
                      onClick={() => downloadPDF(rc.id, rc.enrollment_name || "Eleve")}
                    >
                      <Download className="w-3 h-3 mr-2" />
                      PDF
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
