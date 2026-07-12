import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import api from '@/api/axios';
import { GraduationCap, Loader2 } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [waking, setWaking] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setWaking(false);
    
    try {
      const response = await api.post('auth/login/', {
        username,
        password
      });
      
      localStorage.setItem('access_token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
      
      // Récupérer le profil pour connaître le rôle et rediriger
      const profile = await api.get('auth/me/');
      const role = profile.data.role;
      if (['ADMIN', 'DIRECTION'].includes(role)) {
        navigate('/dashboard');
      } else if (role === 'ENSEIGNANT') {
        navigate('/pointage');
      } else if (role === 'ELEVE') {
        navigate('/grades');
      } else if (role === 'PARENT') {
        navigate('/grades');
      } else {
        navigate('/timetable');
      }
    } catch (err: any) {
      // Erreur réseau = le backend se réveille (Render sleep)
      if (!err.response) {
        setWaking(true);
        setError('');
        // Réessayer automatiquement après 6 secondes
        setTimeout(() => {
          setWaking(false);
          setLoading(false);
        }, 6000);
        return;
      }
      // Mauvais identifiants
      setError(err.response?.data?.detail || "Identifiants incorrects. Vérifiez votre nom d'utilisateur et mot de passe.");
    } finally {
      if (!waking) setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-6 sm:p-10 shadow-lg">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <GraduationCap className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">SeneSchool</h2>
          <p className="mt-2 text-sm text-gray-600">Connectez-vous à votre espace</p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {waking && (
            <div className="rounded-md bg-yellow-50 p-4 text-sm text-yellow-700 border border-yellow-200 flex items-center space-x-2">
              <svg className="animate-spin h-4 w-4 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              <span>⚡ Le serveur se réveille, veuillez patienter quelques secondes et réessayer...</span>
            </div>
          )}
          {error && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label className="sr-only" htmlFor="username">Identifiant ou Email</label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className="relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                placeholder="Nom d'utilisateur ou Email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label className="sr-only" htmlFor="password">Mot de passe</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700" 
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Vous n'avez pas de compte ?{' '}
            <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
              Inscrire votre établissement
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
