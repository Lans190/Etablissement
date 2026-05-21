import { useEffect, useState } from 'react';
import api from '@/api/axios';
import { 
  Users, GraduationCap, LayoutDashboard, Wallet, TrendingUp, 
  ChevronRight, Calendar, Bell, Loader2, ArrowUpRight, ArrowDownRight, Building
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('core/stats/');
        setData(response.data);
      } catch (error) {
        console.error("Erreur stats", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-10 text-center text-slate-500">
        <LayoutDashboard className="w-12 h-12 mx-auto mb-4 opacity-20" />
        <p>Impossible de charger les statistiques.</p>
        <Button onClick={() => window.location.reload()} className="mt-4">Réessayer</Button>
      </div>
    );
  }

  const stats = data.stats;
  const cycles = data.cycles || [];
  const classes = data.classes || [];
  const recentPayments = data.recent_payments || [];
  
  // Données pour le graphique financier (Entrées vs Sorties)
  const financeData = [
    { name: 'Entrées (Recettes)', value: stats.revenue, fill: '#10b981' },
    { name: 'Sorties (Dépenses)', value: stats.expenses, fill: '#ef4444' },
  ];

  return (
    <div className="space-y-8 pb-10">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Tableau de Bord Global</h2>
           <p className="text-slate-500 font-medium">Vue d'ensemble de l'établissement SeneSchool.</p>
        </div>
        <div className="flex items-center space-x-3">
           <div className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg shadow-blue-200">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
           </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Élèves Totaux" 
          value={stats.total_students} 
          icon={<Users className="w-6 h-6" />} 
          color="blue"
        />
        <StatCard 
          title="Enseignants" 
          value={stats.total_teachers} 
          icon={<GraduationCap className="w-6 h-6" />} 
          color="emerald"
        />
        <StatCard 
          title="Recettes" 
          value={`${stats.revenue.toLocaleString()} F`} 
          icon={<ArrowUpRight className="w-6 h-6" />} 
          color="indigo"
        />
        <StatCard 
          title="Dépenses" 
          value={`${stats.expenses.toLocaleString()} F`} 
          icon={<ArrowDownRight className="w-6 h-6" />} 
          color="rose"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Finance Comparison */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-slate-900">Bilan Financier Global</h3>
              <div className="text-sm font-bold text-slate-500">Solde : <span className={stats.balance >= 0 ? 'text-green-600' : 'text-red-600'}>{stats.balance.toLocaleString()} FCFA</span></div>
           </div>
           <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financeData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    cursor={{fill: '#f8fafc'}}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={60} />
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Students by Cycle Pie */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
           <h3 className="text-lg font-bold text-slate-900 mb-6">Élèves par Cycle</h3>
           <div className="flex-1 min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={cycles}
                    nameKey="name"
                    dataKey="students"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                  >
                    {cycles.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
           </div>
           <div className="space-y-3 mt-4">
              {cycles.map((c: any, index: number) => (
                <div key={c.name} className="flex items-center justify-between text-xs">
                   <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full mr-2" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                      <span className="text-slate-600 font-medium">{c.name}</span>
                   </div>
                   <div className="flex space-x-4">
                      <span className="text-slate-400">P: {c.teachers} profs</span>
                      <span className="font-bold text-slate-900">{c.students} éléves</span>
                   </div>
                </div>
              ))}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Students by Class Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
             <div className="p-6 border-b border-slate-50">
                <h3 className="text-lg font-bold text-slate-900">Répartition par Classe</h3>
             </div>
             <div className="max-h-[300px] overflow-y-auto">
                <table className="w-full text-left">
                   <thead className="bg-slate-50 sticky top-0">
                      <tr>
                         <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Classe</th>
                         <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">Effectif</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                      {classes.map((cl: any) => (
                         <tr key={cl.name} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-3 text-sm font-medium text-slate-700">{cl.name}</td>
                            <td className="px-6 py-3 text-sm font-bold text-slate-900 text-right">{cl.student_count}</td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>

          {/* Quick Stats Summary */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
             <h3 className="text-lg font-bold text-slate-900 mb-6">Récapitulatif Académique</h3>
             <div className="space-y-6">
                <div className="flex items-center p-4 bg-blue-50 rounded-2xl">
                   <div className="p-3 bg-blue-600 text-white rounded-xl mr-4"><GraduationCap /></div>
                   <div>
                      <p className="text-xs font-bold text-blue-600 uppercase">Total Enseignants</p>
                      <p className="text-xl font-black text-blue-900">{stats.total_teachers}</p>
                   </div>
                </div>
                <div className="flex items-center p-4 bg-emerald-50 rounded-2xl">
                   <div className="p-3 bg-emerald-600 text-white rounded-xl mr-4"><Building /></div>
                   <div>
                      <p className="text-xs font-bold text-emerald-600 uppercase">Total Classes</p>
                      <p className="text-xl font-black text-emerald-900">{stats.total_classes}</p>
                   </div>
                </div>
                <div className="flex items-center p-4 bg-amber-50 rounded-2xl">
                   <div className="p-3 bg-amber-600 text-white rounded-xl mr-4"><Users /></div>
                   <div>
                      <p className="text-xs font-bold text-amber-600 uppercase">Élèves Inscrits</p>
                      <p className="text-xl font-black text-amber-900">{stats.total_students}</p>
                   </div>
                </div>
             </div>
          </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: any) {
  const colors: any = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    rose: 'bg-rose-50 text-rose-600'
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-shadow">
      <div className={`p-3 rounded-xl inline-block mb-4 ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-slate-500 text-sm font-medium">{title}</p>
      <h3 className="text-2xl font-black text-slate-900 mt-1">{value}</h3>
    </div>
  );
}
