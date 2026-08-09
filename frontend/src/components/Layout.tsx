import { useEffect, useState } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, LogOut, UserCog, MessageSquare, Wallet, Award, 
  UserCheck, Clock, FolderOpen, FileText, Calendar as CalendarIcon, BookOpen, 
  Menu, X, Bell, Sparkles, CheckCheck
} from 'lucide-react';

import api from '@/api/axios';

interface UserProfile {
  id: number;
  first_name: string;
  last_name: string;
  role: string;
  school_name?: string;
  school_logo?: string;
}

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // State pour le centre de notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsNotifOpen(false);
  }, [location.pathname]);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('core/notifications/');
      setNotifications(res.data);
    } catch {
      // Ignore if not setup
    }
  };

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
    fetchNotifications();

    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.post('core/notifications/mark_all_as_read/');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  // ── Règles de visibilité par rôle ──────────────────────────────────────
  const role = userProfile?.role || '';
  const canSeeDashboard = ['ADMIN', 'DIRECTION'].includes(role);
  const canSeeGrades = ['ADMIN', 'DIRECTION', 'ENSEIGNANT', 'ELEVE', 'PARENT'].includes(role);
  const canSeeFinance = ['ADMIN', 'DIRECTION', 'COMPTABLE'].includes(role);
  const isStaff = ['ADMIN', 'DIRECTION'].includes(role);
  const canSeePointage = ['ADMIN', 'DIRECTION', 'ENSEIGNANT'].includes(role);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* Overlay mobile menu */}
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

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {canSeeDashboard && (
            <Link to="/dashboard" className={`flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive('/dashboard') ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
              <LayoutDashboard className="w-5 h-5 mr-3" />
              Tableau de Bord
            </Link>
          )}

          {['ADMIN', 'DIRECTION'].includes(role) && (
            <Link to="/ai-assistant" className={`flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive('/ai-assistant') ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
              <Sparkles className="w-5 h-5 mr-3 text-amber-300 animate-pulse" />
              Assistant IA Grok
            </Link>
          )}
          
          <Link to="/timetable" className={`flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive('/timetable') ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
            <CalendarIcon className="w-5 h-5 mr-3" />
            {userProfile?.role === 'ELEVE' ? 'Mon Emploi du Temps' : 'Emploi du Temps'}
          </Link>

          <Link to="/calendar" className={`flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive('/calendar') ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
            <CalendarIcon className="w-5 h-5 mr-3 text-emerald-400" />
            Calendrier Scolaire
          </Link>

          <Link to="/resources" className={`flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive('/resources') ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
            <FolderOpen className="w-5 h-5 mr-3" />
            Bibliothèque Numérique
          </Link>

          <Link to="/diary" className={`flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive('/diary') ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
            <BookOpen className="w-5 h-5 mr-3" />
            {userProfile?.role === 'ELEVE' ? 'Mon Cahier de Texte' : 'Cahier de Texte'}
          </Link>

          {['ADMIN', 'DIRECTION', 'ENSEIGNANT'].includes(role) && (
            <Link to="/courses" className={`flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive('/courses') ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
              <BookOpen className="w-5 h-5 mr-3 text-blue-400" />
              {role === 'ENSEIGNANT' ? 'Mes Cours' : 'Attribution des Cours'}
            </Link>
          )}

          {canSeePointage && (
            <Link to="/pointage" className={`flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive('/pointage') ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
              <Clock className="w-5 h-5 mr-3" />
              {role === 'ENSEIGNANT' ? 'Mon Pointage & Heures' : 'Pointage Enseignants'}
            </Link>
          )}
          
          {canSeeGrades && (
            <Link to="/grades" className={`flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive('/grades') ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
              <Award className="w-5 h-5 mr-3" />
              {['ELEVE', 'PARENT'].includes(userProfile?.role || '') ? 'Mes Notes' : 'Saisie des Notes'}
            </Link>
          )}

          <Link to="/bulletins" className={`flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive('/bulletins') ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
            <FileText className="w-5 h-5 mr-3" />
            {['ELEVE', 'PARENT'].includes(userProfile?.role || '') ? 'Mes Bulletins' : 'Bulletins Officiels'}
          </Link>

          {['ADMIN', 'DIRECTION', 'ENSEIGNANT'].includes(role) && (
            <Link to="/attendance" className={`flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive('/attendance') ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
              <UserCheck className="w-5 h-5 mr-3 text-emerald-400" />
              Appel &amp; Présences Élèves
            </Link>
          )}

          {canSeeFinance && (
            <Link to="/finance" className={`flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive('/finance') ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
              <Wallet className="w-5 h-5 mr-3 text-amber-400" />
              {role === 'ENSEIGNANT' ? 'Mon Salaire & Fiches de Paie' : 'Finance & Paie RH'}
            </Link>
          )}

          {isStaff && (
            <>
              <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Administration</div>
              <Link to="/students" className={`flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive('/students') ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                <Users className="w-5 h-5 mr-3" />
                Élèves & Parents
              </Link>
              <Link to="/users" className={`flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive('/users') ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                <UserCog className="w-5 h-5 mr-3" />
                Gestion des Comptes
              </Link>
              <Link to="/communications" className={`flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive('/communications') ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                <MessageSquare className="w-5 h-5 mr-3" />
                Communication SMS
              </Link>
              <Link to="/settings" className={`flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive('/settings') ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                <UserCog className="w-5 h-5 mr-3" />
                Configuration & Écoles
              </Link>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="mb-3 px-2">
            <p className="text-[11px] text-slate-400">Connecté :</p>
            <p className="text-sm font-semibold truncate text-slate-100">{userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : 'Chargement...'}</p>
            <span className="inline-block px-2 py-0.5 bg-blue-900/60 text-blue-300 rounded-md text-[10px] font-bold uppercase mt-1">
              {role}
            </span>
          </div>
          <button onClick={handleLogout} className="flex items-center w-full px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
            <LogOut className="w-4 h-4 mr-2 text-red-400" />
            Déconnexion
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Topbar */}
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-4 md:px-8 border-b border-slate-100">
           <div className="flex items-center">
             <button 
               className="md:hidden mr-4 p-2 -ml-2 text-slate-500 hover:text-slate-700 rounded-xl hover:bg-slate-100"
               onClick={() => setIsMobileMenuOpen(true)}
             >
               <Menu className="w-6 h-6" />
             </button>
             <span className="text-slate-400 text-xs font-extrabold tracking-widest uppercase">{location.pathname.substring(1).replace('-', ' ') || 'DASHBOARD'}</span>
           </div>

           {/* Notifications Bell */}
           <div className="relative">
             <button
               onClick={() => setIsNotifOpen(!isNotifOpen)}
               className="relative p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
             >
               <Bell className="w-5 h-5" />
               {unreadCount > 0 && (
                 <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white rounded-full text-[10px] font-extrabold flex items-center justify-center animate-bounce shadow">
                   {unreadCount}
                 </span>
               )}
             </button>

             {/* Notifications Drawer Dropdown */}
             {isNotifOpen && (
               <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-3xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95">
                 <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                   <div className="flex items-center space-x-2">
                     <Bell className="w-4 h-4 text-blue-400" />
                     <span className="font-bold text-sm">Centre de Notifications</span>
                   </div>
                   {unreadCount > 0 && (
                     <button
                       onClick={handleMarkAllRead}
                       className="text-[11px] font-bold text-blue-300 hover:text-white flex items-center"
                     >
                       <CheckCheck className="w-3.5 h-3.5 mr-1" /> Tout lire
                     </button>
                   )}
                 </div>

                 <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                   {notifications.length === 0 ? (
                     <div className="p-8 text-center text-slate-400 text-xs italic">
                       Aucune notification pour le moment.
                     </div>
                   ) : (
                     notifications.slice(0, 8).map(n => (
                       <div 
                         key={n.id} 
                         className={`p-4 transition-colors ${n.is_read ? 'bg-white' : 'bg-blue-50/60'}`}
                       >
                         <div className="flex items-center justify-between mb-1">
                           <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                             {n.type}
                           </span>
                           <span className="text-[10px] text-slate-400">
                             {new Date(n.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                           </span>
                         </div>
                         <h4 className="text-xs font-bold text-slate-900">{n.title}</h4>
                         <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
                       </div>
                     ))
                   )}
                 </div>
               </div>
             )}
           </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50">
          <Outlet context={{ userProfile, setUserProfile }} />
        </main>
      </div>
    </div>
  );
}
