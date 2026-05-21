import React from 'react'; // Main App Component
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
import Bulletins from './pages/Bulletins';
import Settings from './pages/Settings';
import Layout from './components/Layout';

// Un composant simple pour protéger les routes
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('access_token');
  return token ? <>{children}</> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Routes protégées par le Layout */}
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="diary" element={<Diary />} />
          <Route path="students" element={<Students />} />
          <Route path="grades" element={<Grades />} />
          <Route path="users" element={<Users />} />
          <Route path="communications" element={<Comms />} />
          <Route path="finance" element={<Finance />} />
          <Route path="timetable" element={<Timetable />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="pointage" element={<Pointage />} />
          <Route path="resources" element={<Resources />} />
          <Route path="bulletins" element={<Bulletins />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
