import { useEffect, useState } from 'react';
import api from '@/api/axios';
import { Calendar, Plus, Trash2, Filter, Loader2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DAYS = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI'];

type Timeslot = {
  id: number;
  start_time: string;
  end_time: string;
};

type Classroom = {
  id: number;
  name: string;
};

type TimetableEntry = {
  id: number;
  day: string;
  timeslot: number;
  subject_name: string;
  teacher_name: string;
};

export default function Timetable() {
  const [userProfile] = useState(() =>
    JSON.parse(localStorage.getItem('user_profile') || '{}')
  );

  const isAdmin = ['ADMIN', 'DIRECTION'].includes(userProfile?.role);

  const [timeslots, setTimeslots] = useState<Timeslot[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedClass, setSelectedClass] = useState('');

  const fetchData = async () => {
    setLoading(true);

    try {
      const [tsRes, classRes] = await Promise.all([
        api.get('academics/timeslots/'),
        api.get('core/classrooms/')
      ]);

      setTimeslots(tsRes.data);
      setClassrooms(classRes.data);

      const cid = selectedClass || classRes.data?.[0]?.id;

      if (cid) {
        if (!selectedClass) setSelectedClass(cid.toString());

        const entryRes = await api.get(
          `academics/timetable/?classroom=${cid}`
        );

        setEntries(entryRes.data);
      }
    } catch (error) {
      console.error('Erreur timetable', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedClass]);

  const getEntry = (day: string, timeslotId: number) => {
    return entries.find(
      (e) => e.day === day && e.timeslot === timeslotId
    );
  };

  const deleteEntry = async (id: number) => {
    if (confirm('Supprimer ce cours ?')) {
      await api.delete(`academics/timetable/${id}/`);
      fetchData();
    }
  };

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          Emploi du Temps
        </h2>

        <div className="flex space-x-3">
          <div className="flex items-center bg-white border rounded-lg px-3 py-1">
            <Filter className="w-4 h-4 text-gray-400 mr-2" />

            <select
              className="text-sm outline-none bg-transparent font-medium"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">

          <table className="min-w-full border-collapse">

            <thead>
              <tr className="bg-slate-50 border-b border-gray-200">
                <th className="p-4 w-32">Horaires</th>
                {DAYS.map((day) => (
                  <th key={day} className="p-4">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {timeslots.map((ts) => (
                <tr key={ts.id} className="h-24">

                  <td className="p-4 bg-slate-50/30">
                    <div className="flex items-center text-xs font-bold">
                      <Clock className="w-3 h-3 mr-1 text-blue-500" />
                      {ts.start_time.substring(0, 5)} - {ts.end_time.substring(0, 5)}
                    </div>
                  </td>

                  {DAYS.map((day) => {
                    const entry = getEntry(day, ts.id);

                    return (
                      <td key={`${day}-${ts.id}`} className="p-2">

                        {entry ? (
                          <div className="p-3 bg-blue-50 border rounded-lg relative">
                            <div className="font-bold text-xs">
                              {entry.subject_name}
                            </div>

                            <div className="text-[10px]">
                              {entry.teacher_name}
                            </div>

                            {isAdmin && (
                              <button
                                onClick={() => deleteEntry(entry.id)}
                                className="absolute top-1 right-1 text-red-500"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="h-full border-dashed border-2 flex items-center justify-center">
                            {isAdmin && <Plus className="w-4 h-4 text-gray-300" />}
                          </div>
                        )}

                      </td>
                    );
                  })}

                </tr>
              ))}
            </tbody>

          </table>

          {loading && (
            <div className="p-10 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
            </div>
          )}

        </div>
      </div>

    </div>
  );
}