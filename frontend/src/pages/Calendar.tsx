import React, { useEffect, useState, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '@/api/axios';
import {
  ChevronLeft, ChevronRight, Plus, Trash2, X, Loader2,
  Calendar as CalendarIcon, BookOpen, Sun, Users, GraduationCap, Briefcase, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const EVENT_TYPES = [
  { value: 'EXAM',     label: 'Examen',               color: '#ef4444', icon: '📝' },
  { value: 'VACATION', label: 'Vacances scolaires',   color: '#f59e0b', icon: '🏖️' },
  { value: 'HOLIDAY',  label: 'Jour férié',           color: '#10b981', icon: '🎉' },
  { value: 'REUNION',  label: 'Réunion',              color: '#3b82f6', icon: '🤝' },
  { value: 'ACTIVITY', label: 'Activité scolaire',    color: '#8b5cf6', icon: '🎭' },
  { value: 'CONSEIL',  label: 'Conseil de classe',    color: '#06b6d4', icon: '📋' },
  { value: 'PARENTS',  label: 'Réunion parents-profs',color: '#ec4899', icon: '👨‍👩‍👧' },
  { value: 'OTHER',    label: 'Autre',                color: '#64748b', icon: '📌' },
];

const getEventMeta = (type: string) =>
  EVENT_TYPES.find(e => e.value === type) || EVENT_TYPES[EVENT_TYPES.length - 1];

const MONTHS_FR = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre'
];
const DAYS_FR = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

export default function Calendar() {
  const { userProfile } = (useOutletContext<any>() || {}) as any;
  const isAdmin = ['ADMIN', 'DIRECTION'].includes(userProfile?.role);

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState<any[]>([]);
  const [showDayPanel, setShowDayPanel] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [form, setForm] = useState({
    title: '',
    event_type: 'OTHER',
    start_date: '',
    end_date: '',
    description: '',
    color: '#3b82f6',
  });

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`core/events/?year=${year}&month=${month + 1}`);
      setEvents(res.data);
    } catch (e) {
      console.error('Erreur chargement calendrier', e);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Recalculate days for the grid
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = lastDay.getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.start_date <= dateStr && e.end_date >= dateStr);
  };

  const handleDayClick = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
    setSelectedDayEvents(getEventsForDay(day));
    setShowDayPanel(true);
  };

  const openCreateModal = (date?: string) => {
    const d = date || `${year}-${String(month + 1).padStart(2, '0')}-01`;
    setForm({ title: '', event_type: 'OTHER', start_date: d, end_date: d, description: '', color: '#3b82f6' });
    setError('');
    setShowModal(true);
  };

  const handleTypeChange = (type: string) => {
    const meta = getEventMeta(type);
    setForm(f => ({ ...f, event_type: type, color: meta.color }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.title || !form.start_date || !form.end_date) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    if (form.end_date < form.start_date) {
      setError('La date de fin ne peut pas être avant la date de début.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('core/events/', form);
      setShowModal(false);
      await fetchEvents();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors de la création.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`core/events/${id}/`);
      setDeleteId(null);
      setShowDayPanel(false);
      await fetchEvents();
    } catch {
      alert('Erreur lors de la suppression.');
    }
  };

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Calendrier Scolaire</h2>
          <p className="text-slate-500 font-medium mt-1">Gérez les événements, examens, vacances et réunions.</p>
        </div>
        {isAdmin && (
          <Button onClick={() => openCreateModal()} className="bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-100">
            <Plus className="w-4 h-4 mr-2" />Ajouter un événement
          </Button>
        )}
      </div>

      {/* Légende */}
      <div className="flex flex-wrap gap-2">
        {EVENT_TYPES.map(t => (
          <span key={t.value} className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-white border border-slate-100 shadow-sm">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
            {t.icon} {t.label}
          </span>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <ChevronLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div className="text-center">
            <h3 className="text-xl font-black text-slate-900">{MONTHS_FR[month]}</h3>
            <p className="text-sm text-slate-400 font-medium">{year}</p>
          </div>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <ChevronRight className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-slate-100">
          {DAYS_FR.map(d => (
            <div key={d} className="py-2 text-center text-[11px] font-black text-slate-400 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Grid cells */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              if (!day) return <div key={idx} className="min-h-[100px] bg-slate-50/40 border-b border-r border-slate-50" />;

              const dayEvents = getEventsForDay(day);
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isToday = dateStr === todayStr;

              return (
                <div
                  key={idx}
                  onClick={() => handleDayClick(day)}
                  className={`min-h-[100px] p-2 border-b border-r border-slate-50 cursor-pointer transition-colors hover:bg-blue-50/50 ${isToday ? 'bg-blue-50' : ''}`}
                >
                  <span className={`inline-flex w-7 h-7 items-center justify-center rounded-full text-sm font-bold mb-1 ${isToday ? 'bg-blue-600 text-white' : 'text-slate-700'}`}>
                    {day}
                  </span>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map(ev => {
                      const meta = getEventMeta(ev.event_type);
                      return (
                        <div
                          key={ev.id}
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-md truncate text-white"
                          style={{ backgroundColor: ev.color || meta.color }}
                          title={ev.title}
                        >
                          {meta.icon} {ev.title}
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] font-bold text-slate-400">+{dayEvents.length - 3} autres</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Day events panel */}
      {showDayPanel && selectedDate && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-slate-800">
              Événements du {new Date(selectedDate + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            <div className="flex gap-2">
              {isAdmin && (
                <Button onClick={() => openCreateModal(selectedDate)} className="bg-blue-600 hover:bg-blue-700 rounded-xl text-xs px-3 py-1.5">
                  <Plus className="w-3.5 h-3.5 mr-1" />Ajouter
                </Button>
              )}
              <button onClick={() => setShowDayPanel(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
          {selectedDayEvents.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6">Aucun événement ce jour-là.</p>
          ) : (
            <div className="space-y-3">
              {selectedDayEvents.map(ev => {
                const meta = getEventMeta(ev.event_type);
                return (
                  <div key={ev.id} className="flex items-start gap-4 p-4 rounded-xl border" style={{ borderLeftColor: ev.color || meta.color, borderLeftWidth: 4 }}>
                    <div className="text-2xl flex-shrink-0">{meta.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900">{ev.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{meta.label} · {ev.start_date} → {ev.end_date}</p>
                      {ev.description && <p className="text-sm text-slate-600 mt-1">{ev.description}</p>}
                    </div>
                    {isAdmin && (
                      deleteId === ev.id ? (
                        <div className="flex gap-2 flex-shrink-0">
                          <button onClick={() => handleDelete(ev.id)} className="text-xs font-bold text-rose-600 border border-rose-200 px-2 py-1 rounded-lg hover:bg-rose-50">Confirmer</button>
                          <button onClick={() => setDeleteId(null)} className="text-xs font-bold text-slate-500 border px-2 py-1 rounded-lg hover:bg-slate-50">Annuler</button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteId(ev.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors flex-shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create Event Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
                Nouvel événement
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-2.5 rounded-xl">{error}</div>}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Titre *</label>
                <input required className="w-full border rounded-xl p-3 text-sm bg-slate-50 outline-none focus:border-blue-500" placeholder="Ex: Examens du 1er trimestre" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Type d'événement *</label>
                <div className="grid grid-cols-2 gap-2">
                  {EVENT_TYPES.map(t => (
                    <button key={t.value} type="button"
                      onClick={() => handleTypeChange(t.value)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${form.event_type === t.value ? 'border-2 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                      style={form.event_type === t.value ? { backgroundColor: t.color, borderColor: t.color } : {}}
                    >
                      <span>{t.icon}</span> {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Date de début *</label>
                  <input required type="date" className="w-full border rounded-xl p-3 text-sm bg-slate-50 outline-none focus:border-blue-500" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value, end_date: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Date de fin *</label>
                  <input required type="date" min={form.start_date} className="w-full border rounded-xl p-3 text-sm bg-slate-50 outline-none focus:border-blue-500" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Description (optionnel)</label>
                <textarea rows={2} className="w-full border rounded-xl p-3 text-sm bg-slate-50 outline-none focus:border-blue-500 resize-none" placeholder="Détails supplémentaires..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="ghost" className="flex-1 rounded-xl" onClick={() => setShowModal(false)}>Annuler</Button>
                <Button type="submit" disabled={submitting} className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-100">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Créer l'événement
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
