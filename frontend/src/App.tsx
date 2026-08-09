import React, { useEffect } from 'react'; // Main App Component
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Diary from './pages/Diary';
import Students from './pages/Students';
import Grades from './pages/Grades';
import Users from './pages/Users';
import Register from './pages/Register';
import Comms from '@/pages/Comms';
import Finance from './pages/Finance';
import Timetable from './pages/Timetable';
import Attendance from './pages/Attendance';
import Pointage from './pages/Pointage';
import Resources from './pages/Resources';
import Courses from './pages/Courses';
import Bulletins from './pages/Bulletins';
import Settings from './pages/Settings';
import Calendar from './pages/Calendar';
import AIAssistant from './pages/AIAssistant';
import Layout from './components/Layout';

// Garde de route simple (authentification)
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('access_token');
  return token ? <>{children}</> : <Navigate to="/login" replace />;
};

// Garde de route par rôle : redirige si le rôle n'est pas autorisé
const RoleRoute = ({
  children,
  allowed,
  redirectTo = '/diary',
}: {
  children: React.ReactNode;
  allowed: string[];
  redirectTo?: string;
}) => {
  const profile = JSON.parse(localStorage.getItem('user_profile') || '{}');
  return allowed.includes(profile?.role) ? <>{children}</> : <Navigate to={redirectTo} replace />;
};

function App() {
  // Keep-alive : ping le backend Render toutes les 14 min pour éviter le "sleep"
  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/';
    const keepAlive = () => {
      fetch(`${API_URL}ping/`).catch(() => {});
    };
    keepAlive(); // Ping immédiatement au chargement
    const interval = setInterval(keepAlive, 14 * 60 * 1000); // Toutes les 14 minutes
    return () => clearInterval(interval);
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Routes protégées par le Layout */}
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />

          {/* Tableau de bord : ADMIN & DIRECTION uniquement */}
          <Route path="dashboard" element={
            <RoleRoute allowed={['ADMIN', 'DIRECTION']}>
              <Dashboard />
            </RoleRoute>
          } />

          <Route path="ai-assistant" element={<AIAssistant />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="diary" element={<Diary />} />
          <Route path="students" element={<Students />} />
          <Route path="grades" element={<Grades />} />
          <Route path="users" element={<Users />} />
          <Route path="communications" element={<Comms />} />

          {/* Finance : ADMIN, DIRECTION et COMPTABLE uniquement */}
          <Route path="finance" element={
            <RoleRoute allowed={['ADMIN', 'DIRECTION', 'COMPTABLE']}>
              <Finance />
            </RoleRoute>
          } />

          <Route path="timetable" element={<Timetable />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="pointage" element={<Pointage />} />
          <Route path="resources" element={<Resources />} />
          <Route path="courses" element={<Courses />} />
          <Route path="bulletins" element={<Bulletins />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}


export default App;
