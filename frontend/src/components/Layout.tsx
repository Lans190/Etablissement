import { useEffect, useState } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, BookOpen, LogOut, UserCog, MessageSquare, Wallet, Award, Calendar, UserCheck, Clock, FolderOpen, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/api/axios';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('auth/me/');
        setUserProfile(response.data);
        localStorage.setItem('user_profile', JSON.stringify(response.data));
      } catch (error) {
        console.error("Erreur lors de la récupération du profil", error);
        handleLogout();
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const canSeeDashboard = userProfile?.role === 'ADMIN' || userProfile?.role === 'DIRECTION';
  const canSeeGrades = ['ADMIN', 'DIRECTION', 'ENSEIGNANT', 'ELEVE', 'PARENT'].includes(userProfile?.role);
  const canSeeFinance = ['ADMIN', 'DIRECTION', 'COMPTABLE', 'PARENT'].includes(userProfile?.role);
  const isStaff = ['ADMIN', 'DIRECTION'].includes(userProfile?.role);

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-64 bg-slate-900 text-white shadow-xl flex flex-col">
        <div className="h-16 flex items-center justify-center font-bold text-xl border-b border-slate-800">
          <span className="text-blue-500 mr-2">Sene</span>School
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          
          {canSeeDashboard && (
            <Link to="/dashboard" className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/dashboard') ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
              <LayoutDashboard className="w-5 h-5 mr-3" />
              Tableau de Bord
            </Link>
          )}
          
          <Link to="/timetable" className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/timetable') ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
            <Calendar className="w-5 h-5 mr-3" />
            {userProfile?.role === 'ELEVE' ? 'Mon Emploi du Temps' : 'Emploi du Temps'}
          </Link>

          <Link to="/resources" className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/resources') ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
            <FolderOpen className="w-5 h-5 mr-3" />
            Bibliothèque Numérique
          </Link>

          <Link to="/diary" className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/diary') ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
            <BookOpen className="w-5 h-5 mr-3" />
            {userProfile?.role === 'ELEVE' ? 'Mon Cahier de Texte' : 'Cahier de Texte'}
          </Link>

          {['ADMIN', 'DIRECTION', 'ENSEIGNANT'].includes(userProfile?.role) && (
            <Link to="/pointage" className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/pointage') ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
              <Clock className="w-5 h-5 mr-3" />
              {userProfile?.role === 'ENSEIGNANT' ? 'Mon Pointage' : 'Pointage Heures'}
            </Link>
          )}
          
          {canSeeGrades && (
            <Link to="/grades" className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/grades') ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
              <Award className="w-5 h-5 mr-3" />
              {['ELEVE', 'PARENT'].includes(userProfile?.role) ? 'Mes Notes' : 'Saisie des Notes'}
            </Link>
          )}

          <Link to="/bulletins" className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/bulletins') ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
            <FileText className="w-5 h-5 mr-3" />
            {['ELEVE', 'PARENT'].includes(userProfile?.role) ? 'Mes Bulletins' : 'Bulletins Officiels'}
          </Link>

          {canSeeFinance && (
            <Link to="/finance" className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/finance') ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
              <Wallet className="w-5 h-5 mr-3" />
              {userProfile?.role === 'PARENT' ? 'Paiements Scolarité' : 'Finance & Scolarité'}
            </Link>
          )}

          {isStaff && (
            <>
              <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Administration</div>
              <Link to="/students" className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/students') ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                <Users className="w-5 h-5 mr-3" />
                Élèves & Parents
              </Link>
              <Link to="/attendance" className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/attendance') ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                <UserCheck className="w-5 h-5 mr-3" />
                Appel & Présences
              </Link>
              <Link to="/users" className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/users') ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                <UserCog className="w-5 h-5 mr-3" />
                Gestion des Comptes
              </Link>
              <Link to="/communications" className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/communications') ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                <MessageSquare className="w-5 h-5 mr-3" />
                Communication SMS
              </Link>
              <Link to="/settings" className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/settings') ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                <UserCog className="w-5 h-5 mr-3" />
                Paramètres
              </Link>
            </>
          )}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className="mb-4 px-2">
            <p className="text-xs text-slate-400">Connecté en tant que:</p>
            <p className="text-sm font-semibold truncate">{userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : 'Chargement...'}</p>
            <p className="text-xs text-blue-400">{userProfile?.role}</p>
          </div>
          <button onClick={handleLogout} className="flex items-center w-full px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
          </button>
        </div>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-8">
           <div className="flex items-center">
              <span className="text-slate-400 text-sm">{location.pathname.substring(1).toUpperCase()}</span>
           </div>
        </header>
        <main className="flex-1 overflow-y-auto p-8 bg-slate-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
