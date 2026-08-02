import { useEffect, useState } from 'react';
import api from '@/api/axios';
import { 
  Users, GraduationCap, LayoutDashboard, Loader2, ArrowUpRight, ArrowDownRight, Building,
  AlertTriangle, Clock, Activity, Wallet, RefreshCw, ChevronRight, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, Cell, PieChart, Pie
} from 'recharts';
import { Link } from 'react-router-dom';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await api.get('core/stats/');
      setData(response.data);
    } catch (error) {
      console.error("Erreur stats", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
        <Button onClick={fetchStats} className="mt-4">Réessayer</Button>
      </div>
    );
  }

  const stats = data.stats;
  const cycles = data.cycles || [];
  const classes = data.classes || [];
  const recentPayments = data.recent_payments || [];
  const pointageTrend = data.pointage_trend || [];
  
  // Financial chart data (Revenue vs Expenses)
  const financeData = [
    { name: 'Recettes', Montant: stats.revenue, fill: '#10b981' },
    { name: 'Dépenses', Montant: stats.expenses, fill: '#ef4444' },
  ];

  return (
    <div className="space-y-8 pb-10">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Tableau de Bord Global</h2>
           <p className="text-slate-500 font-medium">Vue d'ensemble en temps réel de votre établissement scolaire.</p>
        </div>
        <div className="flex items-center space-x-3">
           <Button variant="outline" size="sm" onClick={fetchStats} className="h-9 px-3 rounded-lg border-slate-200">
             <RefreshCw className="w-4 h-4 mr-2" />
             Actualiser
           </Button>
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
          subtext="Inscriptions actives"
          icon={<Users className="w-5 h-5" />} 
          color="blue"
        />
        <StatCard 
          title="Enseignants" 
          value={stats.total_teachers} 
          subtext="Enseignants inscrits"
          icon={<GraduationCap className="w-5 h-5" />} 
          color="emerald"
        />
        <StatCard 
          title="Absences du Jour" 
          value={stats.today_absences} 
          subtext={stats.pending_absences > 0 ? `${stats.pending_absences} en attente` : "Aucune en attente"}
          icon={<AlertTriangle className="w-5 h-5" />} 
          color={stats.today_absences > 0 ? "rose" : "slate"}
          badge={stats.pending_absences > 0 ? "validation" : null}
          link="/attendance"
        />
        <StatCard 
          title="Pointages en attente" 
          value={stats.pending_pointages} 
          subtext={stats.pending_pointages > 0 ? `${stats.pending_pointages} pointages à valider` : "Tout est validé"}
          icon={<Clock className="w-5 h-5" />} 
          color={stats.pending_pointages > 0 ? "amber" : "slate"}
          badge={stats.pending_pointages > 0 ? "action" : null}
          link="/pointage"
        />
      </div>

      {/* First chart row (Financials vs Cycles) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Finance Comparison */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
           <div>
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Bilan Financier Global</h3>
                  <p className="text-xs text-slate-400">Comparaison entre les recettes et les dépenses enregistrées.</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 font-medium block">Solde Actuel</span>
                  <span className={`text-lg font-extrabold ${stats.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {stats.balance.toLocaleString()} FCFA
                  </span>
                </div>
             </div>
             <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={financeData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                    <Tooltip 
                      formatter={(value: any) => [`${value.toLocaleString()} FCFA`, 'Montant']}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      cursor={{fill: '#f8fafc'}}
                    />
                    <Bar dataKey="Montant" radius={[6, 6, 0, 0]} barSize={55} />
                  </BarChart>
                </ResponsiveContainer>
             </div>
           </div>

           {/* Unpaid Alert Footer */}
           <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
             <div className="flex items-center space-x-3 text-slate-600">
               <Wallet className="w-5 h-5 text-amber-500" />
               <span className="text-sm font-medium">Frais en attente de paiement : <b>{stats.unpaid_fees} allocations</b></span>
             </div>
             <Link to="/finance" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center">
               Gérer la finance <ChevronRight className="w-4 h-4 ml-1" />
             </Link>
           </div>
        </div>

        {/* Cycles Breakdown */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
           <div>
             <h3 className="text-lg font-bold text-slate-900">Élèves par Cycle</h3>
             <p className="text-xs text-slate-400 mb-6">Répartition par niveau scolaire de l'établissement.</p>
             
             {cycles.length === 0 ? (
               <div className="py-12 text-center text-slate-400 text-sm">Aucun cycle enregistré</div>
             ) : (
               <div className="space-y-4">
                 {cycles.map((c: any, index: number) => {
                   const totalVal = cycles.reduce((acc: number, cy: any) => acc + cy.students, 0);
                   const pct = totalVal > 0 ? Math.round((c.students / totalVal) * 100) : 0;
                   return (
                     <div key={c.name} className="space-y-1">
                       <div className="flex items-center justify-between text-sm">
                         <span className="font-semibold text-slate-700">{c.name}</span>
                         <span className="text-slate-500 font-medium">{c.students} élèves ({pct}%)</span>
                       </div>
                       <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                         <div 
                           className="h-full rounded-full transition-all duration-500" 
                           style={{ 
                             width: `${pct}%`, 
                             backgroundColor: COLORS[index % COLORS.length] 
                           }}
                         />
                       </div>
                       <p className="text-[11px] text-slate-400 font-medium">{c.teachers} enseignants affectés</p>
                     </div>
                   );
                 })}
               </div>
             )}
           </div>

           <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between text-xs text-slate-400">
             <span>Nombre de cycles : <b>{cycles.length}</b></span>
             <span>Année active</span>
           </div>
        </div>
      </div>

      {/* Second Row: Pointage trend vs Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Pointage wave trend */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-1">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900">Pointages Validés</h3>
            <p className="text-xs text-slate-400">Heures de cours validées sur les 7 derniers jours.</p>
          </div>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={pointageTrend}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} allowDecimals={false} />
                <Tooltip 
                  formatter={(value: any) => [value, 'Pointages validés']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="validated" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorVal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent payments table */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2 overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Transactions Récentes</h3>
                <p className="text-xs text-slate-400">Derniers encaissements effectués auprès de la scolarité.</p>
              </div>
              <Link to="/finance" className="text-xs font-bold text-blue-600 hover:underline">Voir tout</Link>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-4 py-2">Élève</th>
                    <th className="px-4 py-2">Frais</th>
                    <th className="px-4 py-2 text-right">Montant</th>
                    <th className="px-4 py-2 text-center">Méthode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {recentPayments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400">Aucun paiement récent</td>
                    </tr>
                  ) : (
                    recentPayments.map((p: any) => (
                      <tr key={p.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2.5 font-bold text-slate-800">
                          {p.student_name || 'Élève'}
                          <span className="block text-[10px] text-slate-400 font-medium">{p.classroom_name || '—'}</span>
                        </td>
                        <td className="px-4 py-2.5 font-medium text-slate-600">{p.fee_type_name || 'Frais'}</td>
                        <td className="px-4 py-2.5 text-right font-black text-slate-900">{parseFloat(p.amount_paid).toLocaleString()} F</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-600">
                            {p.payment_method}
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
      </div>

      {/* Third row: Class breakdown */}
      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50">
            <h3 className="text-lg font-bold text-slate-900">Effectifs détaillés par classe</h3>
            <p className="text-xs text-slate-400">Nombre d'élèves activement inscrits par classe.</p>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 p-6">
            {classes.length === 0 ? (
              <div className="col-span-full py-6 text-center text-slate-400 text-sm">Aucune classe configurée</div>
            ) : (
              classes.map((cl: any) => (
                <div key={cl.name} className="p-4 rounded-xl border border-slate-100 bg-slate-50/40 text-center hover:border-blue-200 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm mx-auto mb-2">
                    {cl.name.substring(0, 2)}
                  </div>
                  <span className="block text-xs font-bold text-slate-800 truncate" title={cl.name}>{cl.name}</span>
                  <span className="block text-[11px] text-slate-400 font-bold mt-1">{cl.student_count} élève{cl.student_count > 1 ? 's' : ''}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtext, icon, color, badge, link }: any) {
  const cardColors: any = {
    blue: 'border-blue-100 bg-blue-50/10 text-blue-600',
    emerald: 'border-emerald-100 bg-emerald-50/10 text-emerald-600',
    rose: 'border-rose-100 bg-rose-50/10 text-rose-600',
    amber: 'border-amber-100 bg-amber-50/10 text-amber-600',
    slate: 'border-slate-100 bg-slate-50/10 text-slate-600',
  };

  const iconColors: any = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
    amber: 'bg-amber-50 text-amber-600',
    slate: 'bg-slate-100 text-slate-600',
  };

  const CardWrapper = ({ children }: any) => {
    if (link) {
      return (
        <Link to={link} className="block group">
          <div className={`p-6 rounded-2xl shadow-sm border ${cardColors[color] || cardColors.slate} bg-white relative overflow-hidden group-hover:shadow-md group-hover:border-blue-200 transition-all cursor-pointer`}>
            {children}
          </div>
        </Link>
      );
    }
    return (
      <div className={`p-6 rounded-2xl shadow-sm border ${cardColors[color] || cardColors.slate} bg-white relative overflow-hidden`}>
        {children}
      </div>
    );
  };

  return (
    <CardWrapper>
      <div className="flex items-center justify-between">
        <div className={`p-2.5 rounded-xl ${iconColors[color] || iconColors.slate}`}>
          {icon}
        </div>
        {badge && (
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
            badge === 'validation' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
          }`}>
            Alerte
          </span>
        )}
      </div>
      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mt-4">{title}</p>
      <h3 className="text-3xl font-black text-slate-800 mt-1">{value}</h3>
      <p className="text-slate-400 text-xs mt-1 font-medium">{subtext}</p>
    </CardWrapper>
  );
}
