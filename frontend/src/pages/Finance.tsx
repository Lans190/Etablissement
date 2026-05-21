import { useEffect, useState } from 'react';
import api from '@/api/axios';
import { Wallet, Plus, Search, Loader2, FileText, ArrowUpRight, ArrowDownRight, X, ListFilter, Eye, Trash2, Tag, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Finance() {
  const [activeTab, setActiveTab] = useState<'incomes' | 'expenses' | 'fee_types'>('incomes');
  const [incomeSubTab, setIncomeSubTab] = useState<'school_fees' | 'other_incomes'>('school_fees');
  
  const [allocations, setAllocations] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]); // Recettes Générales (comme dépenses)
  const [submitting, setSubmitting] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false); // Modal Nouvelle Recette Générale
  const [showAllocModal, setShowAllocModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  const [selectedAlloc, setSelectedAlloc] = useState<any>(null);
  
  const [paymentData, setPaymentData] = useState({
    amount_paid: '',
    payment_method: 'CASH',
    transaction_id: ''
  });

  const [expenseData, setExpenseData] = useState({
    title: '',
    category: '',
    amount: '',
    description: ''
  });

  const [incomeData, setIncomeData] = useState({
    title: '',
    category: '',
    amount: '',
    description: ''
  });

  const [allocData, setAllocData] = useState({
    classroom_id: '',
    fee_type_id: '',
    due_date: new Date().toISOString().split('T')[0]
  });

  const [newFeeType, setNewFeeType] = useState({
    name: '',
    default_amount: '',
    is_monthly: true
  });

  const fetchData = async () => {
    try {
      const [allocRes, classRes, payRes, expRes, typeRes, incRes] = await Promise.all([
        api.get('finance/allocations/'),
        api.get('core/classrooms/'),
        api.get('finance/payments/'),
        api.get('finance/expenses/'),
        api.get('finance/fee-types/'),
        api.get('finance/incomes/')
      ]);
      setAllocations(allocRes.data);
      setClassrooms(classRes.data);
      setPayments(payRes.data);
      setExpenses(expRes.data);
      setFeeTypes(typeRes.data);
      setIncomes(incRes.data);
      
      if (classRes.data.length > 0 && !allocData.classroom_id) {
        setAllocData(prev => ({ ...prev, classroom_id: classRes.data[0].id.toString() }));
      }
      if (typeRes.data.length > 0 && !allocData.fee_type_id) {
        setAllocData(prev => ({ ...prev, fee_type_id: typeRes.data[0].id.toString() }));
      }
    } catch (error) {
      console.error("Erreur de chargement des données financières", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('finance/payments/', {
        fee_allocation: selectedAlloc.id,
        ...paymentData
      });
      setShowPaymentModal(false);
      setPaymentData({ amount_paid: '', payment_method: 'CASH', transaction_id: '' });
      fetchData();
      alert("Encaissement enregistré avec succès !");
    } catch (error) {
      alert("Erreur lors de l'enregistrement de l'encaissement.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('finance/expenses/', expenseData);
      setShowExpenseModal(false);
      setExpenseData({ title: '', category: '', amount: '', description: '' });
      fetchData();
      alert("Dépense enregistrée avec succès !");
    } catch (error) {
      alert("Erreur lors de la création de la dépense.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('finance/incomes/', incomeData);
      setShowIncomeModal(false);
      setIncomeData({ title: '', category: '', amount: '', description: '' });
      fetchData();
      alert("Recette manuelle enregistrée avec succès !");
    } catch (error) {
      alert("Erreur lors de la création de la recette.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignFees = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('finance/allocations/assign_to_class/', allocData);
      alert("Frais assignés avec succès à la classe !");
      setShowAllocModal(false);
      fetchData();
    } catch (error) {
      alert("Erreur lors de l'assignation.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddFeeType = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('finance/fee-types/', {
        name: newFeeType.name,
        default_amount: parseFloat(newFeeType.default_amount),
        is_monthly: newFeeType.is_monthly
      });
      setShowTypeModal(false);
      setNewFeeType({ name: '', default_amount: '', is_monthly: true });
      fetchData();
      alert("Type de Frais ajouté avec succès !");
    } catch (error) {
      alert("Erreur lors de la création.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFeeType = async (id: number) => {
    if (!confirm("Voulez-vous vraiment supprimer ce type de frais ?")) return;
    try {
      await api.delete(`finance/fee-types/${id}/`);
      fetchData();
    } catch (error) {
      alert("Erreur lors de la suppression. Ce type de frais est peut-être déjà assigné.");
    }
  };

  const downloadReceipt = async (paymentId: number) => {
    try {
      const response = await api.get(`finance/payments/${paymentId}/receipt_pdf/`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Recu_${paymentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error(error);
      alert("Erreur lors du téléchargement du reçu.");
    }
  };

  const filteredAllocations = allocations.filter((a: any) => {
    const matchesSearch = a.student_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Calculs Globaux
  const schoolFeesIncomes = payments.reduce((acc, curr: any) => acc + parseFloat(curr.amount_paid), 0);
  const otherIncomesTotal = incomes.reduce((acc, curr: any) => acc + parseFloat(curr.amount), 0);
  
  const totalIncomes = schoolFeesIncomes + otherIncomesTotal;
  const totalExpenses = expenses.reduce((acc, curr: any) => acc + parseFloat(curr.amount), 0);
  const balance = totalIncomes - totalExpenses;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
           <h2 className="text-2xl font-bold text-gray-900">Gestion Financière</h2>
           <p className="text-sm text-gray-500">Suivi des flux financiers (Recettes scolaires, Recettes diverses et Dépenses).</p>
        </div>
        <div className="flex space-x-3">
           <div className="flex bg-slate-100 p-1 rounded-xl">
              <button 
                onClick={() => setActiveTab('incomes')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'incomes' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
              >
                 Recettes
              </button>
              <button 
                onClick={() => setActiveTab('expenses')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'expenses' ? 'bg-white shadow-sm text-red-600' : 'text-slate-500'}`}
              >
                 Dépenses
              </button>
              <button 
                onClick={() => setActiveTab('fee_types')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'fee_types' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
              >
                 Types de Frais
              </button>
           </div>
           
           {activeTab === 'incomes' && (
              <>
                 <Button variant="outline" className="border-blue-200 text-blue-600" onClick={() => setShowAllocModal(true)}>
                    <ListFilter className="w-4 h-4 mr-2" />
                    Assigner Frais
                 </Button>
                 <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setShowIncomeModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nouvelle Recette
                 </Button>
              </>
           )}
           
           {activeTab === 'expenses' && (
              <Button className="bg-red-600 hover:bg-red-700" onClick={() => setShowExpenseModal(true)}>
                 <Plus className="w-4 h-4 mr-2" />
                 Nouvelle Dépense
              </Button>
           )}

           {activeTab === 'fee_types' && (
              <Button className="bg-slate-900" onClick={() => setShowTypeModal(true)}>
                 <Plus className="w-4 h-4 mr-2" />
                 Nouveau Frais
              </Button>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
           <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-50 text-green-600 rounded-lg"><ArrowUpRight /></div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total Entrées (Recettes)</span>
           </div>
           <h3 className="text-2xl font-black text-slate-900">{totalIncomes.toLocaleString()} F</h3>
           <p className="text-[10px] text-slate-400 mt-1">Scolaires: {schoolFeesIncomes.toLocaleString()} F | Diverses: {otherIncomesTotal.toLocaleString()} F</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
           <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-red-50 text-red-600 rounded-lg"><ArrowDownRight /></div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total Sorties (Dépenses)</span>
           </div>
           <h3 className="text-2xl font-black text-slate-900">{totalExpenses.toLocaleString()} F</h3>
           <p className="text-[10px] text-slate-400 mt-1">Tous types confondus</p>
        </div>
        <div className="bg-slate-900 p-6 rounded-2xl shadow-lg shadow-slate-200 text-white">
           <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/10 text-white rounded-lg"><Wallet /></div>
              <span className="text-[10px] font-bold text-white/50 uppercase">Solde Net de Caisse</span>
           </div>
           <h3 className="text-2xl font-black">{balance.toLocaleString()} F</h3>
           <p className="text-[10px] text-white/40 mt-1">Entrées - Sorties</p>
        </div>
      </div>

      {activeTab === 'incomes' && (
         <div className="space-y-6">
            {/* Sous-onglets pour séparer Frais Scolaires et Recettes Diverses */}
            <div className="flex border-b border-slate-200">
               <button 
                  onClick={() => setIncomeSubTab('school_fees')}
                  className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all ${incomeSubTab === 'school_fees' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
               >
                  Frais Scolaires des Élèves
               </button>
               <button 
                  onClick={() => setIncomeSubTab('other_incomes')}
                  className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all ${incomeSubTab === 'other_incomes' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
               >
                  Recettes Diverses (Saisies manuelles)
               </button>
            </div>

            {incomeSubTab === 'school_fees' ? (
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                     <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                        <h3 className="font-bold text-slate-900">Élèves Redevables</h3>
                        <div className="flex items-center space-x-2">
                           <Search className="w-4 h-4 text-slate-400" />
                           <input 
                              type="text" 
                              placeholder="Rechercher élève..." 
                              className="text-xs border rounded-lg px-2 py-1 outline-none"
                              value={searchTerm}
                              onChange={e => setSearchTerm(e.target.value)}
                           />
                        </div>
                     </div>
                     <div className="max-h-[500px] overflow-auto">
                        <table className="w-full text-left">
                           <thead className="bg-slate-50 sticky top-0">
                              <tr>
                                 <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Élève</th>
                                 <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Frais</th>
                                 <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Reste</th>
                                 <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-400 uppercase">Action</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-50">
                              {filteredAllocations.map((a: any) => (
                                 <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                       <div className="text-sm font-bold text-slate-900">{a.student_name}</div>
                                       <div className="text-[10px] text-slate-400">{a.classroom_name}</div>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-slate-600">{a.fee_type_name}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-red-600">{parseFloat(a.balance).toLocaleString()} F</td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                       <Button 
                                          size="sm" 
                                          variant="outline"
                                          className="text-[10px] h-8"
                                          onClick={() => { setSelectedAlloc(a); setShowDetailsModal(true); }}
                                       >
                                          <Eye className="w-3.5 h-3.5 mr-1" /> Détails
                                       </Button>
                                       <Button 
                                          size="sm" 
                                          className="text-[10px] h-8 bg-slate-900" 
                                          disabled={a.is_paid}
                                          onClick={() => { setSelectedAlloc(a); setShowPaymentModal(true); }}
                                       >
                                          Encaisser
                                       </Button>
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                     <div className="p-6 border-b border-slate-50 bg-slate-50/30">
                        <h3 className="font-bold text-slate-900">Derniers Versements Élèves</h3>
                     </div>
                     <div className="flex-1 overflow-auto max-h-[500px] divide-y divide-slate-50">
                        {payments.map((p: any) => (
                           <div key={p.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                              <div>
                                 <p className="text-sm font-bold text-slate-950">{parseFloat(p.amount_paid).toLocaleString()} F</p>
                                 <p className="text-[10px] text-slate-400 flex items-center mt-0.5">
                                    <Calendar className="w-3 h-3 mr-1" />
                                    {new Date(p.payment_date).toLocaleDateString()}
                                 </p>
                              </div>
                              <button onClick={() => downloadReceipt(p.id)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                                 <FileText className="w-4 h-4" />
                              </button>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            ) : (
               /* Recettes Diverses (Comme les Dépenses !) */
               <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
                     <h3 className="font-bold text-slate-900">Registre des Recettes Diverses</h3>
                     <span className="text-xs text-slate-400 font-bold">Total saisi : {otherIncomesTotal.toLocaleString()} F</span>
                  </div>
                  <div className="overflow-auto">
                     <table className="w-full text-left">
                        <thead className="bg-slate-50">
                           <tr>
                              <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Désignation</th>
                              <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Catégorie</th>
                              <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">Montant</th>
                              <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase text-center">Date</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                           {incomes.length === 0 ? (
                              <tr>
                                 <td colSpan={4} className="p-10 text-center text-slate-400 italic">Aucune recette diverse enregistrée pour le moment. Cliquez sur "Nouvelle Recette" pour en ajouter.</td>
                              </tr>
                           ) : (
                              incomes.map((inc: any) => (
                                 <tr key={inc.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                       <div className="font-bold text-sm text-slate-700">{inc.title}</div>
                                       {inc.description && <div className="text-[10px] text-slate-400 mt-0.5">{inc.description}</div>}
                                    </td>
                                    <td className="px-6 py-4 text-xs text-slate-500">
                                       <span className="px-2.5 py-0.5 rounded-full bg-green-50 text-green-700 font-bold text-[10px] flex items-center w-max">
                                          <Tag className="w-3 h-3 mr-1" />
                                          {inc.category || 'Recette'}
                                       </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-black text-green-600 text-right">{parseFloat(inc.amount).toLocaleString()} F</td>
                                    <td className="px-6 py-4 text-[10px] text-slate-400 text-center">{new Date(inc.date).toLocaleDateString()}</td>
                                 </tr>
                              ))
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>
            )}
         </div>
      )}

      {activeTab === 'expenses' && (
         <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50 bg-slate-50/30">
               <h3 className="font-bold text-slate-900">Journal des Dépenses (Sorties)</h3>
            </div>
            <div className="overflow-auto">
               <table className="w-full text-left">
                  <thead className="bg-slate-50">
                     <tr>
                        <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Désignation</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Catégorie</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">Montant</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase text-center">Date</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                     {expenses.length === 0 ? (
                        <tr>
                           <td colSpan={4} className="p-10 text-center text-slate-400 italic">Aucune dépense enregistrée.</td>
                        </tr>
                     ) : (
                        expenses.map((ex: any) => (
                           <tr key={ex.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4">
                                 <div className="font-bold text-sm text-slate-700">{ex.title}</div>
                                 {ex.description && <div className="text-[10px] text-slate-400 mt-0.5">{ex.description}</div>}
                              </td>
                              <td className="px-6 py-4 text-xs text-slate-500">
                                 <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 font-bold text-[10px] flex items-center w-max">
                                    <Tag className="w-3 h-3 mr-1" />
                                    {ex.category || 'Dépense'}
                                 </span>
                              </td>
                              <td className="px-6 py-4 text-sm font-black text-red-600 text-right">{parseFloat(ex.amount).toLocaleString()} F</td>
                              <td className="px-6 py-4 text-[10px] text-slate-400 text-center">{new Date(ex.date).toLocaleDateString()}</td>
                           </tr>
                        ))
                     )}
                  </tbody>
               </table>
            </div>
         </div>
      )}

      {activeTab === 'fee_types' && (
         <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
               <h3 className="font-bold text-slate-900">Types de Frais Scolaires</h3>
            </div>
            <div className="overflow-auto">
               <table className="w-full text-left">
                  <thead className="bg-slate-50">
                     <tr>
                        <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Nom du Frais</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Montant par défaut</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Périodicité</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                     {feeTypes.length === 0 ? (
                        <tr>
                           <td colSpan={4} className="p-10 text-center text-gray-400 italic">Aucun type de frais enregistré.</td>
                        </tr>
                     ) : (
                        feeTypes.map((ft: any) => (
                           <tr key={ft.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 font-bold text-sm text-slate-900">{ft.name}</td>
                              <td className="px-6 py-4 text-sm font-bold text-slate-700">{parseFloat(ft.default_amount).toLocaleString()} F</td>
                              <td className="px-6 py-4 text-xs">
                                 <span className={`px-2.5 py-0.5 rounded-full font-bold ${ft.is_monthly ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
                                    {ft.is_monthly ? 'Mensuel' : 'Unique (Inscription)'}
                                 </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                 <button 
                                    onClick={() => handleDeleteFeeType(ft.id)}
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
      )}

      {/* Modal Details / Payment History */}
      {showDetailsModal && selectedAlloc && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl animate-in zoom-in duration-200 overflow-hidden">
               <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
                  <div>
                     <h3 className="text-xl font-black text-slate-900">Détails des Paiements</h3>
                     <p className="text-xs text-slate-500 mt-1">{selectedAlloc.student_name} - {selectedAlloc.classroom_name}</p>
                  </div>
                  <button onClick={() => setShowDetailsModal(false)} className="text-slate-400 hover:text-slate-700"><X /></button>
               </div>
               
               <div className="p-6 space-y-6">
                  <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl text-center">
                     <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Montant Total</span>
                        <p className="text-lg font-black text-slate-800">{parseFloat(selectedAlloc.amount).toLocaleString()} F</p>
                     </div>
                     <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Déjà Payé</span>
                        <p className="text-lg font-black text-green-600">{parseFloat(selectedAlloc.total_paid).toLocaleString()} F</p>
                     </div>
                     <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Reste Dû</span>
                        <p className="text-lg font-black text-red-600">{parseFloat(selectedAlloc.balance).toLocaleString()} F</p>
                     </div>
                  </div>

                  <div>
                     <h4 className="font-bold text-sm text-slate-900 mb-3">Historique des versements</h4>
                     <div className="border border-slate-100 rounded-xl overflow-hidden max-h-[220px] overflow-y-auto">
                        <table className="w-full text-left text-xs">
                           <thead className="bg-slate-50">
                              <tr>
                                 <th className="p-3 text-slate-400 font-bold uppercase">Date</th>
                                 <th className="p-3 text-slate-400 font-bold uppercase">Méthode</th>
                                 <th className="p-3 text-slate-400 font-bold uppercase text-right">Montant</th>
                                 <th className="p-3 text-slate-400 font-bold uppercase text-center">Reçu</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                              {!selectedAlloc.payments || selectedAlloc.payments.length === 0 ? (
                                 <tr>
                                    <td colSpan={4} className="p-4 text-center text-slate-400 italic">Aucun versement enregistré pour cette échéance.</td>
                                 </tr>
                              ) : (
                                 selectedAlloc.payments.map((p: any) => (
                                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                       <td className="p-3 font-medium text-slate-700">{new Date(p.payment_date).toLocaleDateString()}</td>
                                       <td className="p-3"><span className="px-2 py-0.5 bg-slate-100 rounded-full font-bold">{p.payment_method}</span></td>
                                       <td className="p-3 text-right font-black text-slate-900">{parseFloat(p.amount_paid).toLocaleString()} F</td>
                                       <td className="p-3 text-center">
                                          <button onClick={() => downloadReceipt(p.id)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                             <FileText className="w-4 h-4" />
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
               
               <div className="p-6 bg-slate-50/50 border-t flex justify-end">
                  <Button onClick={() => setShowDetailsModal(false)} className="bg-slate-900">
                     Fermer
                  </Button>
               </div>
            </div>
         </div>
      )}

      {/* Modal Nouveau Type de Frais */}
      {showTypeModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200 overflow-hidden">
               <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
                  <h3 className="text-xl font-bold text-slate-900">Créer un Type de Frais</h3>
                  <button onClick={() => setShowTypeModal(false)}><X /></button>
               </div>
               <form onSubmit={handleAddFeeType} className="p-6 space-y-4">
                  <div>
                     <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nom du Frais</label>
                     <input required type="text" placeholder="ex: Frais d'Inscription" className="w-full border rounded-xl p-3 outline-none" value={newFeeType.name} onChange={e => setNewFeeType({...newFeeType, name: e.target.value})} />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Montant par défaut (F)</label>
                     <input required type="number" placeholder="ex: 50000" className="w-full border rounded-xl p-3 outline-none font-bold" value={newFeeType.default_amount} onChange={e => setNewFeeType({...newFeeType, default_amount: e.target.value})} />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Périodicité</label>
                     <select className="w-full border rounded-xl p-3 outline-none font-medium" value={newFeeType.is_monthly ? "true" : "false"} onChange={e => setNewFeeType({...newFeeType, is_monthly: e.target.value === "true"})}>
                        <option value="true">Mensuel (ex: Scolarité)</option>
                        <option value="false">Unique (ex: Inscription, Tenue)</option>
                     </select>
                  </div>
                  <Button type="submit" disabled={submitting} className="w-full bg-slate-900 h-12 rounded-xl text-lg font-bold">
                     {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Créer le Type de Frais"}
                  </Button>
               </form>
            </div>
         </div>
      )}

      {/* Modal Assign Fees */}
      {showAllocModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200 overflow-hidden">
               <div className="p-6 border-b bg-blue-50 flex justify-between items-center">
                  <h3 className="text-xl font-bold text-blue-900">Assigner des Frais</h3>
                  <button onClick={() => setShowAllocModal(false)}><X /></button>
               </div>
               <form onSubmit={handleAssignFees} className="p-6 space-y-4">
                  <div>
                     <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Classe</label>
                     <select className="w-full border rounded-xl p-3 outline-none" value={allocData.classroom_id} onChange={e => setAllocData({...allocData, classroom_id: e.target.value})}>
                        {classrooms.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Type de Frais</label>
                     {feeTypes.length === 0 ? (
                        <div className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100 font-medium">
                           Aucun type de frais configuré. 
                           <br />
                           <span className="font-bold text-amber-800">Cliquez d'abord sur "Types de Frais" &gt; "Nouveau Frais"</span> pour en ajouter.
                        </div>
                     ) : (
                        <select required className="w-full border rounded-xl p-3 outline-none" value={allocData.fee_type_id} onChange={e => setAllocData({...allocData, fee_type_id: e.target.value})}>
                           <option value="">Sélectionnez un type de frais...</option>
                           {feeTypes.map((t: any) => <option key={t.id} value={t.id}>{t.name} ({parseFloat(t.default_amount).toLocaleString()} F)</option>)}
                        </select>
                     )}
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Date d'échéance</label>
                     <input type="date" className="w-full border rounded-xl p-3 outline-none" value={allocData.due_date} onChange={e => setAllocData({...allocData, due_date: e.target.value})} />
                  </div>
                  <Button type="submit" disabled={submitting} className="w-full bg-blue-600 h-12 rounded-xl text-lg font-bold">
                     {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Assigner à toute la classe"}
                  </Button>
               </form>
            </div>
         </div>
      )}

      {/* Modal Expense (Sortie) */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200 overflow-hidden">
              <div className="p-6 border-b bg-red-50 flex justify-between items-center">
                 <h3 className="text-xl font-bold text-red-900">Enregistrer une Sortie (Dépense)</h3>
                 <button onClick={() => setShowExpenseModal(false)}><X /></button>
              </div>
              <form onSubmit={handleAddExpense} className="p-6 space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Titre / Objet</label>
                    <input required type="text" placeholder="ex: Achat de fournitures" className="w-full border rounded-xl p-3 outline-none" value={expenseData.title} onChange={e => setExpenseData({...expenseData, title: e.target.value})} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Catégorie</label>
                       <input type="text" placeholder="ex: Matériel" className="w-full border rounded-xl p-3 outline-none" value={expenseData.category} onChange={e => setExpenseData({...expenseData, category: e.target.value})} />
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Montant (F)</label>
                       <input required type="number" placeholder="ex: 15000" className="w-full border rounded-xl p-3 outline-none font-bold" value={expenseData.amount} onChange={e => setExpenseData({...expenseData, amount: e.target.value})} />
                    </div>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Description (Optionnelle)</label>
                    <textarea className="w-full border rounded-xl p-3 outline-none text-sm h-20" placeholder="Informations complémentaires..." value={expenseData.description} onChange={e => setExpenseData({...expenseData, description: e.target.value})} />
                 </div>
                 <Button type="submit" disabled={submitting} className="w-full bg-red-600 h-12 rounded-xl text-lg font-bold">
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Valider la dépense"}
                 </Button>
              </form>
           </div>
        </div>
      )}

      {/* Modal Income (Recette Diverses) */}
      {showIncomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200 overflow-hidden">
              <div className="p-6 border-b bg-green-50 flex justify-between items-center">
                 <h3 className="text-xl font-bold text-green-900 font-black">Enregistrer une Entrée (Recette)</h3>
                 <button onClick={() => setShowIncomeModal(false)}><X /></button>
              </div>
              <form onSubmit={handleAddIncome} className="p-6 space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Titre / Objet de l'entrée</label>
                    <input required type="text" placeholder="ex: Vente d'uniformes, Don, Cantine espèces" className="w-full border rounded-xl p-3 outline-none" value={incomeData.title} onChange={e => setIncomeData({...incomeData, title: e.target.value})} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Catégorie</label>
                       <input type="text" placeholder="ex: Cantine, Uniforme, Divers" className="w-full border rounded-xl p-3 outline-none" value={incomeData.category} onChange={e => setIncomeData({...incomeData, category: e.target.value})} />
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Montant Saisi (F)</label>
                       <input required type="number" placeholder="ex: 20000" className="w-full border rounded-xl p-3 outline-none font-bold text-xl text-green-600" value={incomeData.amount} onChange={e => setIncomeData({...incomeData, amount: e.target.value})} />
                    </div>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Description (Optionnelle)</label>
                    <textarea className="w-full border rounded-xl p-3 outline-none text-sm h-20" placeholder="Détails du versement..." value={incomeData.description} onChange={e => setIncomeData({...incomeData, description: e.target.value})} />
                 </div>
                 <Button type="submit" disabled={submitting} className="w-full bg-green-600 h-12 rounded-xl text-lg font-bold">
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Enregistrer la recette"}
                 </Button>
              </form>
           </div>
        </div>
      )}

      {/* Modal Payment (Encaissement Frais Élèves) */}
      {showPaymentModal && selectedAlloc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200 overflow-hidden">
              <div className="p-6 border-b bg-green-50 flex justify-between items-center">
                 <h3 className="text-xl font-bold text-green-900">Encaisser Frais</h3>
                 <button onClick={() => setShowPaymentModal(false)}><X /></button>
              </div>
              <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Montant à encaisser</label>
                    <input required type="number" className="w-full border rounded-xl p-3 outline-none font-bold text-xl" value={paymentData.amount_paid} onChange={e => setPaymentData({...paymentData, amount_paid: e.target.value})} />
                    <p className="text-[10px] text-red-500 mt-1 italic">Reste dû : {parseFloat(selectedAlloc?.balance).toLocaleString()} F</p>
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Moyen de Paiement</label>
                     <select className="w-full border rounded-xl p-3 outline-none" value={paymentData.payment_method} onChange={e => setPaymentData({...paymentData, payment_method: e.target.value})}>
                        <option value="CASH">Espèces</option>
                        <option value="WAVE">Wave</option>
                        <option value="ORANGE_MONEY">OM</option>
                     </select>
                  </div>
                  <Button type="submit" disabled={submitting} className="w-full bg-green-600 h-12 rounded-xl text-lg font-bold">
                     {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirmer l'encaissement"}
                  </Button>
               </form>
            </div>
         </div>
      )}
    </div>
  );
}
