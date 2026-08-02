import { useEffect, useState } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut, UserCog, MessageSquare, Wallet, Award, UserCheck, Clock, FolderOpen, FileText, Calendar, BookOpen, Menu, X, CalendarDays, Brain } from 'lucide-react';

import api from '@/api/axios';

interface UserProfile {
  id: number;
  first_name: string;
  last_name: string;
  role: string;
  school_name?: string;
  school_logo?: string;
}

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const cachedProfile = localStorage.getItem('user_profile');
    if (cachedProfile) {
      try {
        setUserProfile(JSON.parse(cachedProfile));
      } catch (error) {
        console.error('Profil local invalide', error);
      }
    }

    const fetchProfile = async () => {
      try {
        const response = await api.get('auth/me/');
        setUserProfile(response.data);
        localStorage.setItem('user_profile', JSON.stringify(response.data));
      } catch (error) {
        console.error("Erreur lors de la récupération du profil", error);
        if (!cachedProfile) {
          handleLogout();
        }
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

  // ── Règles de visibilité par rôle ──────────────────────────────────────
  const role = userProfile?.role || '';

  // Tableau de bord : ADMIN et DIRECTION uniquement
  const canSeeDashboard = ['ADMIN', 'DIRECTION'].includes(role);

  // Notes & bulletins : tout le monde sauf COMPTABLE
  const canSeeGrades = ['ADMIN', 'DIRECTION', 'ENSEIGNANT', 'ELEVE', 'PARENT'].includes(role);

  // Finance : ADMIN, DIRECTION et COMPTABLE uniquement (PAS enseignant/parent/élève)
  const canSeeFinance = ['ADMIN', 'DIRECTION', 'COMPTABLE'].includes(role);

  // Administration (gestion utilisateurs, élèves, SMS, paramètres)
  const isStaff = ['ADMIN', 'DIRECTION'].includes(role);

  // Pointage : ADMIN et ENSEIGNANT uniquement
  const canSeePointage = ['ADMIN', 'DIRECTION', 'ENSEIGNANT'].includes(role);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Overlay pour mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white shadow-xl flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 flex items-center justify-between px-4 font-bold text-xl border-b border-slate-800">
          <div className="flex items-center space-x-3 px-2 flex-1 min-w-0">
            {userProfile?.school_logo ? (
              <img 
                src={userProfile.school_logo} 
                alt="Logo" 
                className="w-8 h-8 object-contain rounded bg-white p-0.5 flex-shrink-0" 
              />
            ) : (
              <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white text-sm font-black flex-shrink-0">
                S
              </div>
            )}
            <span className="truncate text-sm font-bold text-slate-100" title={userProfile?.school_name || 'SeneSchool'}>
              {userProfile?.school_name || 'SeneSchool'}
            </span>
          </div>
          <button 
            className="md:hidden text-slate-400 hover:text-white"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
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

          <Link to="/calendar" className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/calendar') ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
            <CalendarDays className="w-5 h-5 mr-3 text-sky-400" />
            Calendrier Scolaire
          </Link>


          <Link to="/resources" className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/resources') ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
            <FolderOpen className="w-5 h-5 mr-3" />
            Bibliothèque Numérique
          </Link>

          <Link to="/diary" className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/diary') ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
            <BookOpen className="w-5 h-5 mr-3" />
            {userProfile?.role === 'ELEVE' ? 'Mon Cahier de Texte' : 'Cahier de Texte'}
          </Link>

          {['ADMIN', 'DIRECTION', 'ENSEIGNANT'].includes(role) && (
            <Link to="/courses" className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/courses') ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
              <BookOpen className="w-5 h-5 mr-3 text-blue-400" />
              {role === 'ENSEIGNANT' ? 'Mes Cours' : 'Attribution des Cours'}
            </Link>
          )}

          {canSeePointage && (
            <Link to="/pointage" className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/pointage') ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
              <Clock className="w-5 h-5 mr-3" />
              {role === 'ENSEIGNANT' ? 'Mon Pointage' : 'Pointage Heures'}
            </Link>
          )}
          
          {canSeeGrades && (
            <Link to="/grades" className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/grades') ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
              <Award className="w-5 h-5 mr-3" />
              {['ELEVE', 'PARENT'].includes(userProfile?.role || '') ? 'Mes Notes' : 'Saisie des Notes'}
            </Link>
          )}

          <Link to="/bulletins" className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/bulletins') ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
            <FileText className="w-5 h-5 mr-3" />
            {['ELEVE', 'PARENT'].includes(userProfile?.role || '') ? 'Mes Bulletins' : 'Bulletins Officiels'}
          </Link>

          {canSeeFinance && (
            <Link to="/finance" className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/finance') ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
              <Wallet className="w-5 h-5 mr-3" />
              Finance &amp; Scolarité
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
              <Link to="/ai-assistant" className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/ai-assistant') ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                <Brain className="w-5 h-5 mr-3 text-indigo-400" />
                Assistant IA Grok
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
            <p className="text-xs text-slate-400">Connecté en tant que :</p>
            <p className="text-sm font-semibold truncate">{userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : 'Chargement...'}</p>
            <p className="text-xs text-blue-400 capitalize">{role}</p>
          </div>
          <button onClick={handleLogout} className="flex items-center w-full px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
          </button>
        </div>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        <header className="h-16 bg-white shadow-sm flex items-center px-4 md:px-8">
           <button 
             className="md:hidden mr-4 p-2 -ml-2 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100"
             onClick={() => setIsMobileMenuOpen(true)}
           >
             <Menu className="w-6 h-6" />
           </button>
           <div className="flex items-center">
              <span className="text-slate-400 text-sm font-medium">{location.pathname.substring(1).toUpperCase()}</span>
           </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50">
          <Outlet context={{ userProfile, setUserProfile }} />
        </main>
      </div>
    </div>
  );
}

