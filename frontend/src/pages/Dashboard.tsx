import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import api from '@/api/axios';
import {
  Users, GraduationCap, LayoutDashboard, Loader2, ArrowUpRight, ArrowDownRight,
  Building, AlertTriangle, Clock, CheckCircle, RefreshCw, TrendingUp,
  UserX, Bell, CreditCard, BookOpen
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Dashboard() {
  const { userProfile } = useOutletContext<any>() || {};
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const response = await api.get('core/stats/');
      setData(response.data);
    } catch (error) {
      console.error('Erreur stats', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60000); // refresh auto toutes les minutes
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-3 text-slate-500 font-medium">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-10 text-center text-slate-500">
        <LayoutDashboard className="w-12 h-12 mx-auto mb-4 opacity-20" />
        <p>Impossible de charger les statistiques.</p>
        <button onClick={fetchStats} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold">
          Réessayer
        </button>
      </div>
    );
  }

  const stats = data.stats;
  const cycles = data.cycles || [];
  const classes = data.classes || [];
  const pointageTrend = data.pointage_trend || [];

  const financeData = [
    { name: 'Recettes', value: stats.revenue, fill: '#10b981' },
    { name: 'Dépenses', value: stats.expenses, fill: '#ef4444' },
  ];

  const schoolName = userProfile?.school_name || 'SeneSchool';

  return (
    <div className="space-y-8 pb-10">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Tableau de Bord</h2>
          <p className="text-slate-500 font-medium mt-1">Vue d'ensemble de <span className="text-blue-600 font-bold">{schoolName}</span></p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchStats} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors" title="Actualiser">
            <RefreshCw className="w-4 h-4 text-slate-500" />
          </button>
          <div className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-blue-200">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
      </div>

      {/* Alertes actives */}
      {(stats.pending_absences > 0 || stats.pending_pointages > 0 || stats.unpaid_fees > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.pending_absences > 0 && (
            <Link to="/attendance" className="flex items-center gap-3 bg-rose-50 border border-rose-100 rounded-2xl px-5 py-4 hover:bg-rose-100 transition-colors group">
              <div className="p-2 bg-rose-500 rounded-xl text-white flex-shrink-0">
                <UserX className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-rose-600 uppercase">Absences en attente</p>
                <p className="text-xl font-black text-rose-900">{stats.pending_absences}</p>
              </div>
              <Bell className="w-4 h-4 text-rose-400 ml-auto animate-pulse" />
            </Link>
          )}
          {stats.pending_pointages > 0 && (
            <Link to="/pointage" className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 hover:bg-amber-100 transition-colors">
              <div className="p-2 bg-amber-500 rounded-xl text-white flex-shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-600 uppercase">Pointages à valider</p>
                <p className="text-xl font-black text-amber-900">{stats.pending_pointages}</p>
              </div>
              <Bell className="w-4 h-4 text-amber-400 ml-auto animate-pulse" />
            </Link>
          )}
          {stats.unpaid_fees > 0 && (
            <Link to="/finance" className="flex items-center gap-3 bg-violet-50 border border-violet-100 rounded-2xl px-5 py-4 hover:bg-violet-100 transition-colors">
              <div className="p-2 bg-violet-500 rounded-xl text-white flex-shrink-0">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-violet-600 uppercase">Frais impayés</p>
                <p className="text-xl font-black text-violet-900">{stats.unpaid_fees}</p>
              </div>
              <Bell className="w-4 h-4 text-violet-400 ml-auto animate-pulse" />
            </Link>
          )}
        </div>
      )}

      {/* Stats KPIs principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Élèves Totaux" value={stats.total_students} icon={<Users className="w-6 h-6" />} color="blue" link="/students" />
        <StatCard title="Enseignants" value={stats.total_teachers} icon={<GraduationCap className="w-6 h-6" />} color="emerald" link="/users" />
        <StatCard title="Recettes" value={`${(stats.revenue || 0).toLocaleString()} F`} icon={<ArrowUpRight className="w-6 h-6" />} color="indigo" link="/finance" />
        <StatCard title="Dépenses" value={`${(stats.expenses || 0).toLocaleString()} F`} icon={<ArrowDownRight className="w-6 h-6" />} color="rose" link="/finance" />
      </div>

      {/* Stats secondaires du jour */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <MiniCard label="Absences aujourd'hui" value={stats.today_absences ?? 0} color="rose" icon={<UserX className="w-5 h-5" />} />
        <MiniCard label="Pointages validés" value={(stats.pending_pointages ?? 0) === 0 ? '✓ Tous' : `${stats.pending_pointages} en attente`} color="amber" icon={<Clock className="w-5 h-5" />} isText={(stats.pending_pointages ?? 0) === 0} />
        <MiniCard label="Solde financier" value={`${(stats.balance || 0).toLocaleString()} F`} color={stats.balance >= 0 ? 'emerald' : 'rose'} icon={<TrendingUp className="w-5 h-5" />} isText />
        <MiniCard label="Classes actives" value={stats.total_classes ?? 0} color="blue" icon={<Building className="w-5 h-5" />} />
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Bilan financier */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h3 className="text-lg font-bold text-slate-900">Bilan Financier Global</h3>
            <div className="text-sm font-bold text-slate-500">
              Solde : <span className={stats.balance >= 0 ? 'text-green-600' : 'text-red-600'}>{(stats.balance || 0).toLocaleString()} FCFA</span>
            </div>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financeData} barSize={60}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {financeData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Répartition par cycle */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Élèves par Cycle</h3>
          {cycles.length > 0 ? (
            <>
              <div className="flex-1 min-h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={cycles} nameKey="name" dataKey="students" innerRadius={55} outerRadius={75} paddingAngle={4}>
                      {cycles.map((_c: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-2">
                {cycles.map((c: any, index: number) => (
                  <div key={c.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-slate-600 font-medium">{c.name}</span>
                    </div>
                    <span className="font-black text-slate-900">{c.students} élèves</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              <div className="text-center">
                <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p>Aucune donnée disponible</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tendance pointages (7 jours) + Répartition classes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Tendance pointages */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Pointages Validés — 7 Derniers Jours</h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pointageTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Line type="monotone" dataKey="validated" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: '#3b82f6', r: 4 }} name="Pointages validés" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Classes + Absences rapides */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Répartition par Classe</h3>
            <Link to="/students" className="text-xs font-bold text-blue-600 hover:underline">Voir tout →</Link>
          </div>
          <div className="max-h-[280px] overflow-y-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Classe</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">Effectif</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {classes.length === 0 ? (
                  <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-400 text-sm">Aucune classe configurée</td></tr>
                ) : (
                  classes.map((cl: any) => (
                    <tr key={cl.name} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 text-sm font-medium text-slate-700">{cl.name}</td>
                      <td className="px-6 py-3 text-sm font-black text-slate-900 text-right">{cl.student_count}</td>
                      <td className="px-6 py-3 text-right">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${cl.student_count > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                          {cl.student_count > 0 ? <><CheckCircle className="w-3 h-3" />Active</> : 'Vide'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Liens rapides */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Accès Rapide</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { to: '/attendance', icon: <UserX className="w-5 h-5" />, label: 'Absences', badge: stats.today_absences },
            { to: '/pointage', icon: <Clock className="w-5 h-5" />, label: 'Pointage', badge: stats.pending_pointages },
            { to: '/courses', icon: <BookOpen className="w-5 h-5" />, label: 'Cours', badge: null },
            { to: '/finance', icon: <CreditCard className="w-5 h-5" />, label: 'Finance', badge: stats.unpaid_fees },
          ].map(({ to, icon, label, badge }) => (
            <Link key={to} to={to} className="flex items-center gap-3 bg-white/10 hover:bg-white/20 rounded-xl px-4 py-3 transition-colors relative">
              <div className="text-blue-400">{icon}</div>
              <span className="text-sm font-bold">{label}</span>
              {badge != null && badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {badge}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, link }: any) {
  const colorMap: any = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-600' },
  };
  const c = colorMap[color] || colorMap.blue;

  const inner = (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all group cursor-pointer">
      <div className={`p-3 rounded-xl inline-block mb-4 ${c.bg} ${c.text}`}>{icon}</div>
      <p className="text-slate-500 text-sm font-medium">{title}</p>
      <h3 className="text-2xl font-black text-slate-900 mt-1">{value}</h3>
    </div>
  );

  return link ? <Link to={link}>{inner}</Link> : inner;
}

function MiniCard({ label, value, color, icon, isText = false }: any) {
  const colorMap: any = {
    blue: 'bg-blue-600',
    emerald: 'bg-emerald-600',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    violet: 'bg-violet-600',
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
      <div className={`p-2.5 rounded-xl text-white flex-shrink-0 ${colorMap[color] || colorMap.blue}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-slate-400 uppercase truncate">{label}</p>
        <p className={`font-black mt-0.5 ${isText ? 'text-base text-slate-800' : 'text-xl text-slate-900'}`}>{value}</p>
      </div>
    </div>
  );
}
