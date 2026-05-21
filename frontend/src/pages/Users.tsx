import { useEffect, useState } from 'react';
import api from '@/api/axios';
import { UserPlus, Shield, GraduationCap, Users as UsersIcon, UserCog, X, Loader2, Upload, FileText, CheckCircle2, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    first_name: '',
    last_name: '',
    email: '',
    role: 'ELEVE',
    phone_number: '',
    cni_number: '',
    children: [] as number[]
  });

  const [cniScanFile, setCniScanFile] = useState<File | null>(null);
  const [cniScanPreview, setCniScanPreview] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('auth/users/');
      setUsers(response.data);
    } catch (error) {
      console.error("Erreur lors du chargement des utilisateurs", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = new FormData();
    payload.append('username', formData.username);
    if (formData.password) payload.append('password', formData.password);
    payload.append('first_name', formData.first_name);
    payload.append('last_name', formData.last_name);
    payload.append('email', formData.email);
    payload.append('role', formData.role);
    payload.append('phone_number', formData.phone_number);
    payload.append('cni_number', formData.cni_number);

    // Only send children IDs that are valid ELEVE users (defensive programming)
    const validStudentIds = new Set(users.filter((u: any) => u.role === 'ELEVE').map((u: any) => u.id));
    formData.children
      .filter(childId => validStudentIds.has(childId))
      .forEach(childId => {
        payload.append('children', childId.toString());
      });

    if (cniScanFile) {
      payload.append('cni_scan', cniScanFile);
    }

    try {
      if (editingUser) {
        await api.patch(`auth/users/${editingUser.id}/`, payload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post('auth/users/', payload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      setShowModal(false);
      setEditingUser(null);
      setCniScanFile(null);
      setCniScanPreview(null);
      setFormData({
        username: '',
        password: '',
        first_name: '',
        last_name: '',
        email: '',
        role: 'ELEVE',
        phone_number: '',
        cni_number: '',
        children: []
      });
      fetchUsers();
      alert("Compte enregistré avec succès !");
    } catch (error: any) {
      const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : "Erreur lors de l'enregistrement.";
      alert("Erreur : " + errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (user: any) => {
    setEditingUser(user);
    // Only keep children IDs that belong to actual ELEVE users (prevent corrupt data)
    const validStudentIds = users
      .filter((u: any) => u.role === 'ELEVE')
      .map((u: any) => u.id);
    const safeChildren = (user.children || []).filter((id: number) => validStudentIds.includes(id));
    setFormData({
      username: user.username,
      password: '',
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email || '',
      role: user.role,
      phone_number: user.phone_number || '',
      cni_number: user.cni_number || '',
      children: safeChildren
    });
    setCniScanFile(null);
    setCniScanPreview(user.cni_scan || null);
    setShowModal(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCniScanFile(file);
      setCniScanPreview(URL.createObjectURL(file));
    }
  };

  const handleChildSelect = (childId: number) => {
    setFormData(prev => {
      const isSelected = prev.children.includes(childId);
      const updated = isSelected 
        ? prev.children.filter(id => id !== childId)
        : [...prev.children, childId];
      return { ...prev, children: updated };
    });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN': return <Shield className="w-5 h-5 text-red-500" />;
      case 'DIRECTION': return <UserCog className="w-5 h-5 text-purple-500" />;
      case 'ENSEIGNANT': return <GraduationCap className="w-5 h-5 text-blue-500" />;
      case 'ELEVE': return <UsersIcon className="w-5 h-5 text-green-500" />;
      case 'PARENT': return <UsersIcon className="w-5 h-5 text-orange-500" />;
      default: return <UsersIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const studentsList = users.filter((u: any) => u.role === 'ELEVE');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestion des Comptes & Liaison Parents</h2>
          <p className="text-sm text-gray-500 mt-1">Créez des accès, associez les parents aux élèves, et stockez les pièces d'identité.</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700">
          <UserPlus className="w-4 h-4 mr-2" />
          Nouvel Utilisateur
        </Button>
      </div>

      {/* Modal de création */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg my-8 overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-slate-50">
              <div>
                 <h3 className="text-xl font-black text-gray-900">{editingUser ? "Éditer l'utilisateur" : "Ajouter un utilisateur"}</h3>
                 <p className="text-xs text-gray-500 mt-1">Veuillez renseigner toutes les informations requises.</p>
              </div>
              <button onClick={() => { setShowModal(false); setEditingUser(null); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSaveUser} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Rôle de l'utilisateur</label>
                  <select 
                    className="w-full border-none bg-slate-100 rounded-2xl p-3.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                  >
                    <option value="ELEVE">Élève</option>
                    <option value="ENSEIGNANT">Enseignant</option>
                    <option value="PARENT">Parent</option>
                    <option value="DIRECTION">Direction / Admin École</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Prénom</label>
                  <input
                    type="text"
                    required
                    className="w-full border-none bg-slate-100 rounded-2xl p-3.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.first_name}
                    onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Nom</label>
                  <input
                    type="text"
                    required
                    className="w-full border-none bg-slate-100 rounded-2xl p-3.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.last_name}
                    onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                  />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Identifiant de connexion (Username)</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: fode"
                    className="w-full border-none bg-slate-100 rounded-2xl p-3.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value.toLowerCase().replace(/\s/g, '')})}
                  />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">{editingUser ? "Nouveau mot de passe (optionnel)" : "Mot de passe provisoire"}</label>
                  <input
                    type="password"
                    required={!editingUser}
                    className="w-full border-none bg-slate-100 rounded-2xl p-3.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                </div>

                <div className="col-span-2 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Téléphone</label>
                    <input
                      type="text"
                      className="w-full border-none bg-slate-100 rounded-2xl p-3.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.phone_number}
                      onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Numéro de CNI</label>
                    <input
                      type="text"
                      placeholder="ex: 1755199800122"
                      className="w-full border-none bg-slate-100 rounded-2xl p-3.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.cni_number}
                      onChange={(e) => setFormData({...formData, cni_number: e.target.value})}
                    />
                  </div>
                </div>

                {/* Scan CNI */}
                <div className="col-span-2">
                   <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Scan / Photo CNI (Pièce d'Identité)</label>
                   <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100/50 transition-colors cursor-pointer relative">
                     {cniScanPreview ? (
                        <div className="flex flex-col items-center space-y-2 w-full">
                           {cniScanPreview.startsWith('http') || cniScanPreview.startsWith('blob:') ? (
                              <img src={cniScanPreview} alt="Scan CNI" className="h-32 object-contain rounded-lg border border-slate-100" />
                           ) : (
                              <FileText className="w-10 h-10 text-blue-600" />
                           )}
                           <span className="text-xs text-blue-600 font-bold flex items-center">
                             <CheckCircle2 className="w-4 h-4 mr-1 text-green-500" /> 
                             Document CNI chargé
                           </span>
                        </div>
                     ) : (
                        <div className="text-center py-2">
                           <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                           <p className="text-xs font-bold text-slate-500">Cliquez pour importer un scan (Image ou PDF)</p>
                        </div>
                     )}
                     <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} accept="image/*,application/pdf" />
                   </div>
                </div>

                {/* Liaison Parents-Enfants */}
                {formData.role === 'PARENT' && (
                  <div className="col-span-2 bg-slate-50 p-4 rounded-2xl">
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Sélectionner ses Enfants (Élèves)</label>
                     {studentsList.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">Aucun élève encore créé dans la base.</p>
                     ) : (
                        <div className="grid grid-cols-2 gap-2 max-h-[150px] overflow-y-auto pr-2">
                           {studentsList.map((stud: any) => {
                              const isChecked = formData.children.includes(stud.id);
                              return (
                                 <button
                                    key={stud.id}
                                    type="button"
                                    onClick={() => handleChildSelect(stud.id)}
                                    className={`flex items-center text-left p-2.5 rounded-xl border text-xs font-bold transition-all ${isChecked ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white hover:bg-slate-100 text-slate-700'}`}
                                 >
                                    <span className={`w-4 h-4 rounded-full border mr-2 flex items-center justify-center ${isChecked ? 'bg-white border-white text-blue-600' : 'border-slate-300'}`}>
                                       {isChecked && "✓"}
                                    </span>
                                    {stud.first_name} {stud.last_name}
                                 </button>
                              );
                           })}
                        </div>
                     )}
                  </div>
                )}
              </div>

              <div className="pt-4 flex space-x-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1 rounded-2xl h-12"
                  onClick={() => setShowModal(false)}
                >
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-2xl h-12"
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingUser ? "Enregistrer" : "Créer le compte")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white shadow-sm rounded-3xl border border-slate-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 text-left">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                Utilisateur
              </th>
              <th scope="col" className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                Rôle
              </th>
              <th scope="col" className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                Liaisons / Famille
              </th>
              <th scope="col" className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                Pièce d'Identité CNI
              </th>
              <th scope="col" className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                Contact
              </th>
              <th scope="col" className="relative px-6 py-4">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                  Aucun compte enregistré.
                </td>
              </tr>
            ) : (
              users.map((user: any) => {
                 // Check family relations
                 const isParent = user.role === 'PARENT';
                 const familyLabel = isParent 
                    ? `${user.children?.length || 0} enfant(s)` 
                    : user.parents?.length > 0 
                       ? "Rattaché aux parents" 
                       : "Aucune liaison";

                 return (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-slate-100 rounded-2xl flex items-center justify-center shadow-inner">
                            {getRoleIcon(user.role)}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-bold text-slate-900">{user.first_name} {user.last_name}</div>
                            <div className="text-xs text-slate-400 font-mono">@{user.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-[10px] leading-5 font-black rounded-full uppercase tracking-wider ${isParent ? 'bg-orange-50 text-orange-700' : user.role === 'ELEVE' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                         <div className="text-xs text-slate-700 font-bold">{familyLabel}</div>
                         {isParent && user.children?.length > 0 && (
                            <div className="text-[9px] text-slate-400 truncate max-w-[150px]">
                               IDs: {user.children.join(', ')}
                            </div>
                         )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                         <div className="flex items-center space-x-2">
                            <CreditCard className="w-4 h-4 text-slate-400" />
                            <span className="text-xs font-bold text-slate-700">{user.cni_number || "Non saisie"}</span>
                            {user.cni_scan && (
                               <a href={user.cni_scan} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded hover:underline">
                                  Voir Scan
                                </a>
                            )}
                         </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-medium">
                        {user.phone_number || "---"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          onClick={() => openEditModal(user)}
                          className="text-blue-600 hover:text-blue-900 font-bold hover:underline"
                        >
                          Éditer
                        </button>
                      </td>
                    </tr>
                 );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
