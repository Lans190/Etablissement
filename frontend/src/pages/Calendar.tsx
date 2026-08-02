import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '@/api/axios';
import { 
  Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, Filter, 
  Trash2, Edit, X, Clock, HelpCircle, Loader2, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EventType {
  id: number;
  title: string;
  event_type: 'EXAM' | 'VACATION' | 'REUNION' | 'HOLIDAY' | 'ACTIVITY';
  event_type_display: string;
  start_date: string;
  end_date: string;
  description: string;
  color: string;
}

const EVENT_TYPES = [
  { value: 'EXAM', label: 'Examen', color: '#ef4444' },
  { value: 'VACATION', label: 'Vacances', color: '#3b82f6' },
  { value: 'REUNION', label: 'Réunion', color: '#8b5cf6' },
  { value: 'HOLIDAY', label: 'Jour Férié', color: '#f59e0b' },
  { value: 'ACTIVITY', label: 'Activité Scolaire', color: '#10b981' },
];

export default function CalendarPage() {
  const { userProfile } = useOutletContext<any>() || {};
  const isAdmin = ['ADMIN', 'DIRECTION'].includes(userProfile?.role);

  const [events, setEvents] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventType | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');

  // Form Fields
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState('ACTIVITY');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [eventColor, setEventColor] = useState('#10b981');
  const [saving, setSaving] = useState(false);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await api.get('core/events/');
      setEvents(res.data);
    } catch (error) {
      console.error("Erreur de chargement des événements", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Update color suggestion when event type changes
  useEffect(() => {
    const selected = EVENT_TYPES.find(t => t.value === eventType);
    if (selected) {
      setEventColor(selected.color);
    }
  }, [eventType]);

  // Calendar Helper functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    // 0 = Sunday, 1 = Monday, etc. Adjust so Monday is 0
    let day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const openAddModal = (dateStr?: string) => {
    setEditingEvent(null);
    setTitle('');
    setEventType('ACTIVITY');
    setStartDate(dateStr || new Date().toISOString().split('T')[0]);
    setEndDate(dateStr || new Date().toISOString().split('T')[0]);
    setDescription('');
    setEventColor('#10b981');
    setShowModal(true);
  };

  const openEditModal = (event: EventType) => {
    setEditingEvent(event);
    setTitle(event.title);
    setEventType(event.event_type);
    setStartDate(event.start_date);
    setEndDate(event.end_date);
    setDescription(event.description || '');
    setEventColor(event.color || '#3b82f6');
    setShowModal(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startDate || !endDate) {
      alert("Veuillez remplir les champs obligatoires.");
      return;
    }

    setSaving(true);
    const payload = {
      title,
      event_type: eventType,
      start_date: startDate,
      end_date: endDate,
      description,
      color: eventColor,
    };

    try {
      if (editingEvent) {
        await api.patch(`core/events/${editingEvent.id}/`, payload);
        alert("Événement mis à jour !");
      } else {
        await api.post('core/events/', payload);
        alert("Événement créé !");
      }
      setShowModal(false);
      fetchEvents();
    } catch (error) {
      console.error(error);
      alert("Erreur lors de la sauvegarde de l'événement.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (id: number) => {
    if (!confirm("Voulez-vous vraiment supprimer cet événement ?")) return;
    try {
      await api.delete(`core/events/${id}/`);
      fetchEvents();
      setShowModal(false);
      alert("Événement supprimé !");
    } catch (error) {
      alert("Erreur lors de la suppression.");
    }
  };

  // Filter events
  const filteredEvents = events.filter(e => {
    if (filterType === 'ALL') return true;
    return e.event_type === filterType;
  });

  // Check if date has events
  const getEventsForDate = (day: number) => {
    const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const checkDateStr = checkDate.toISOString().split('T')[0];

    return filteredEvents.filter(e => {
      const start = e.start_date;
      const end = e.end_date;
      return checkDateStr >= start && checkDateStr <= end;
    });
  };

  // Render Calendar Grid
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDayIndex = getFirstDayOfMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const calendarDays = [];
  // Empty spaces for previous month's offset
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push(<div key={`empty-${i}`} className="bg-slate-50/50 min-h-[90px] border-b border-r border-slate-100"></div>);
  }

  // Active days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dayEvents = getEventsForDate(day);
    const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().split('T')[0];

    calendarDays.push(
      <div 
        key={`day-${day}`} 
        className={`min-h-[100px] p-2 border-b border-r border-slate-100 flex flex-col justify-between hover:bg-slate-50/60 transition-colors group relative ${
          isToday ? 'bg-blue-50/20' : 'bg-white'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full ${
            isToday ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700'
          }`}>
            {day}
          </span>
          {isAdmin && (
            <button 
              onClick={() => openAddModal(dateStr)} 
              className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 p-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded text-[10px] font-bold text-slate-500 transition-opacity"
            >
              +
            </button>
          )}
        </div>

        <div className="space-y-1 mt-2 overflow-y-auto max-h-[70px] custom-scrollbar flex-1">
          {dayEvents.map(e => (
            <div 
              key={e.id}
              onClick={() => openEditModal(e)}
              className="text-[10px] font-bold px-1.5 py-0.5 rounded truncate text-white cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
              style={{ backgroundColor: e.color || '#3b82f6' }}
              title={e.title}
            >
              {e.title}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Calculate grid empty trailing blocks to complete grid cells divisible by 7
  const totalSlots = calendarDays.length;
  const remainingSlots = totalSlots % 7 === 0 ? 0 : 7 - (totalSlots % 7);
  for (let i = 0; i < remainingSlots; i++) {
    calendarDays.push(<div key={`empty-end-${i}`} className="bg-slate-50/50 min-h-[90px] border-b border-r border-slate-100"></div>);
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center">
            <CalendarIcon className="w-8 h-8 mr-3 text-blue-600" />
            Calendrier Scolaire
          </h2>
          <p className="text-slate-500 font-medium">Gérez l'agenda, les congés, les examens et les réunions officielles.</p>
        </div>
        {isAdmin && (
          <Button onClick={() => openAddModal()} className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100">
            <Plus className="w-4 h-4 mr-2" />
            Nouvel Événement
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Sidebar Controls */}
        <div className="space-y-6 lg:col-span-1">
          {/* Calendar Selector */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-700 flex items-center uppercase tracking-wider">
              <Filter className="w-4 h-4 mr-2 text-slate-400" />
              Filtres d'affichage
            </h3>
            
            <div className="space-y-2">
              <button 
                onClick={() => setFilterType('ALL')}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center ${
                  filterType === 'ALL' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 mr-2"></span>
                Tous les événements
              </button>
              {EVENT_TYPES.map(type => (
                <button 
                  key={type.value}
                  onClick={() => setFilterType(type.value)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center ${
                    filterType === type.value ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: type.color }}></span>
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Legend / Info */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-sm">
            <h3 className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-3">Légende</h3>
            <div className="space-y-2.5 text-xs">
              <p className="text-slate-300">Sélectionnez ou cliquez sur un événement pour le modifier (Administrateurs uniquement).</p>
              <div className="h-px bg-slate-800 my-2"></div>
              <p className="flex items-center text-slate-300">
                <Clock className="w-3.5 h-3.5 mr-2 text-blue-400" />
                Synchronisé avec l'administration
              </p>
            </div>
          </div>
        </div>

        {/* Calendar Grid Container */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden lg:col-span-3">
          {/* Calendar Header Control */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h3 className="font-extrabold text-lg text-slate-800 capitalize">
              {monthName}
            </h3>
            <div className="flex items-center space-x-1">
              <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
                Aujourd'hui
              </button>
              <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days of Week Row */}
          <div className="grid grid-cols-7 text-center bg-slate-50 border-b border-slate-100 py-2.5 font-bold text-[10px] text-slate-400 uppercase tracking-widest">
            <div>Lun</div>
            <div>Mar</div>
            <div>Mer</div>
            <div>Jeu</div>
            <div>Ven</div>
            <div>Sam</div>
            <div>Dim</div>
          </div>

          {/* Monthly Days Grid */}
          <div className="grid grid-cols-7 border-l border-slate-100">
            {loading ? (
              <div className="col-span-7 py-32 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                <p className="text-xs text-slate-400 mt-2 font-medium">Chargement du calendrier...</p>
              </div>
            ) : (
              calendarDays
            )}
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b flex justify-between items-center">
              <h3 className="text-base font-black text-slate-800 flex items-center">
                <CalendarIcon className="w-5 h-5 mr-2 text-blue-600" />
                {editingEvent ? "Modifier l'événement" : "Nouvel événement scolaire"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Titre de l'événement *</label>
                <input 
                  type="text"
                  placeholder="Ex: Examens Semestriels"
                  className="w-full border rounded-xl p-3 outline-none focus:border-blue-500 text-sm bg-slate-50 font-medium text-slate-800"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  disabled={!isAdmin && !!editingEvent}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type *</label>
                  <select
                    className="w-full border rounded-xl p-3 outline-none focus:border-blue-500 text-sm bg-slate-50 font-semibold text-slate-700"
                    value={eventType}
                    onChange={e => setEventType(e.target.value)}
                    disabled={!isAdmin && !!editingEvent}
                  >
                    {EVENT_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Couleur</label>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="color"
                      className="w-10 h-10 border p-0 rounded-lg overflow-hidden cursor-pointer"
                      value={eventColor}
                      onChange={e => setEventColor(e.target.value)}
                      disabled={!isAdmin && !!editingEvent}
                    />
                    <span className="text-xs text-slate-400 font-bold uppercase">{eventColor}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date Début *</label>
                  <input 
                    type="date"
                    className="w-full border rounded-xl p-3 outline-none focus:border-blue-500 text-sm bg-slate-50 font-medium text-slate-800"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    disabled={!isAdmin && !!editingEvent}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date Fin *</label>
                  <input 
                    type="date"
                    className="w-full border rounded-xl p-3 outline-none focus:border-blue-500 text-sm bg-slate-50 font-medium text-slate-800"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    disabled={!isAdmin && !!editingEvent}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                <textarea 
                  placeholder="Informations supplémentaires pour les parents et enseignants..."
                  className="w-full border rounded-xl p-3 outline-none focus:border-blue-500 text-sm bg-slate-50 text-slate-800"
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  disabled={!isAdmin && !!editingEvent}
                />
              </div>

              {isAdmin ? (
                <div className="flex pt-4 space-x-3">
                  {editingEvent && (
                    <Button 
                      type="button" 
                      variant="destructive"
                      className="rounded-xl flex-shrink-0"
                      onClick={() => handleDeleteEvent(editingEvent.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="flex-1 rounded-xl"
                    onClick={() => setShowModal(false)}
                  >
                    Annuler
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={saving}
                    className="flex-grow bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-100"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Enregistrer
                  </Button>
                </div>
              ) : (
                <div className="pt-2 text-center flex justify-end">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="rounded-xl px-6 border"
                    onClick={() => setShowModal(false)}
                  >
                    Fermer
                  </Button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
