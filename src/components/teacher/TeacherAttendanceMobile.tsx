import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  CloudOff,
  FileCheck2,
  FileText,
  Lock,
  Printer,
  RefreshCw,
  Sparkles,
  Upload,
  Wifi,
} from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';
import { enqueueOfflineAttendance } from '../../lib/offlineSync';
import { AttendanceStatus } from '../../types/database';

export const TeacherAttendanceMobile: React.FC = () => {
  const {
    state,
    referenceToday,
    recentSchoolDates,
    updateAttendance,
    computedStats,
  } = useSimulation();

  const minTeacherDateStr = '2026-10-25';
  const [selectedDate, setSelectedDate] = useState<string>(referenceToday);
  const [isOfflineSim, setIsOfflineSim] = useState<boolean>(false);
  const [pendingOfflineCount, setPendingOfflineCount] = useState<number>(0);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const isDateLockedForTeacher = useMemo(() => {
    return selectedDate < minTeacherDateStr || selectedDate > referenceToday;
  }, [selectedDate, referenceToday]);

  const dayAttendanceMap = state.attendanceByDate[selectedDate] || {};

  const handleStatusChange = async (studentId: string, newStatus: AttendanceStatus) => {
    const res = updateAttendance(selectedDate, studentId, newStatus);
    if (!res.ok) {
      setErrorBanner(res.error || 'Alteração não permitida.');
      return;
    }
    setErrorBanner(null);

    if (isOfflineSim || !navigator.onLine) {
      await enqueueOfflineAttendance({
        id: `${studentId}_${selectedDate}`,
        class_id: 'cls-7a',
        student_id: studentId,
        attendance_date: selectedDate,
        bimester: 4,
        status: newStatus,
        client_updated_at: new Date().toISOString(),
      });
      setPendingOfflineCount((c) => c + 1);
    }
  };

  const handleJustificationText = (studentId: string, text: string) => {
    updateAttendance(selectedDate, studentId, 'justified', text);
  };

  const handleSaveCall = () => {
    if (isOfflineSim) {
      setSaveFeedback(
        'Chamada guardada no celular! Assim que a internet voltar, ela será enviada automaticamente para a escola.'
      );
    } else {
      setSaveFeedback(
        `Chamada do dia ${selectedDate} salva com sucesso! Os painéis da Diretora e do Secretário Municipal já foram atualizados.`
      );
    }
    setTimeout(() => setSaveFeedback(null), 5000);
  };

  const stats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let justified = 0;
    for (const s of state.students) {
      const st = dayAttendanceMap[s.id]?.status || 'present';
      if (st === 'present') present++;
      else if (st === 'absent') absent++;
      else if (st === 'justified') justified++;
    }
    return { present, absent, justified, total: state.students.length };
  }, [state.students, dayAttendanceMap]);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Cabeçalho da Chamada da Professora */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
              Perfil: Professora Ana Paula Mendes • {state.className} ({state.schoolName})
            </span>
            <h2 className="text-lg font-bold text-slate-900 mt-1">
              Lista de Chamada Diária ({state.students.length} Alunos)
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsOfflineSim((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                isOfflineSim
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {isOfflineSim ? (
                <>
                  <CloudOff className="w-3.5 h-3.5" />
                  Sem Internet ({pendingOfflineCount} salvas no aparelho)
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5" />
                  Conectado • Salvamento Automático
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition cursor-pointer"
              title="Imprime o resumo de presenças e faltas da turma para o Conselho de Classe"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir Relatório da Turma
            </button>
          </div>
        </div>

        {/* Escolha do Dia da Aula */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label htmlFor="attendance-date" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-600" />
              Escolha o dia da chamada (professores podem alterar até 7 dias atrás):
            </label>
            <input
              id="attendance-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {recentSchoolDates.map((d) => {
              const isOld = d < minTeacherDateStr;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDate(d)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                    selectedDate === d
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : isOld
                      ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {d === referenceToday
                    ? `${d} (Hoje)`
                    : isOld
                    ? `${d} (Mais de 7 dias 🔒)`
                    : d}
                </button>
              );
            })}
          </div>
        </div>

        {(isDateLockedForTeacher || errorBanner) && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-xs text-rose-800 font-semibold">
            <Lock className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              {errorBanner ||
                `Esta chamada (${selectedDate}) tem mais de 7 dias e está fechada para alterações da professora. Caso precise corrigir, acesse o botão "Diretora (Secretaria)" no topo da página!`}
            </span>
          </div>
        )}

        {/* Contagem Rápida do Dia */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
            <span className="text-xs text-emerald-700 font-medium block">Presentes (P)</span>
            <span className="text-lg font-extrabold text-emerald-800">{stats.present}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-center">
            <span className="text-xs text-rose-700 font-medium block">Faltas (F)</span>
            <span className="text-lg font-extrabold text-rose-800">{stats.absent}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-center">
            <span className="text-xs text-amber-800 font-medium block">Faltas Justificadas (FJ)</span>
            <span className="text-lg font-extrabold text-amber-900">{stats.justified}</span>
          </div>
        </div>
      </div>

      {/* Lista de Alunos em Ordem Alfabética */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {state.students.map((student, index) => {
          const entry = dayAttendanceMap[student.id];
          const currentStatus: AttendanceStatus = entry?.status || 'present';
          const stTotals = computedStats.studentTotals[student.id];

          return (
            <div key={student.id} className="p-4 space-y-3 hover:bg-slate-50/50 transition">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 w-5">
                      {String(index + 1).padStart(2, '0')}.
                    </span>
                    <span className="font-bold text-sm text-slate-900">{student.full_name}</span>

                    {stTotals?.isNewStudent && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-violet-100 text-violet-800 border border-violet-300">
                        <Sparkles className="w-3 h-3 text-violet-600" />
                        ALUNO NOVO (destaque por mais {stTotals.newBadgeDaysRemaining} dias)
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 pl-7 mt-0.5 flex flex-wrap gap-2">
                    <span>{student.municipal_ra}</span>
                    <span>•</span>
                    <span>
                      No Bimestre: <strong>{stTotals?.presences} presenças</strong> e{' '}
                      <strong className={stTotals?.absencePercentage > 25 ? 'text-rose-600' : ''}>
                        {stTotals?.absences} faltas ({stTotals?.absencePercentage}%)
                      </strong>
                    </span>
                    {stTotals?.consecutiveStreak >= 3 && (
                      <span className="text-amber-700 font-bold">
                        • ⚠️ {stTotals.consecutiveStreak} faltas seguidas
                      </span>
                    )}
                  </div>
                </div>

                {/* Botões P / F / FJ */}
                <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 shrink-0">
                  <button
                    type="button"
                    disabled={isDateLockedForTeacher}
                    onClick={() => handleStatusChange(student.id, 'present')}
                    title="Marcar Presença"
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                      currentStatus === 'present'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    } disabled:opacity-40`}
                  >
                    P
                  </button>
                  <button
                    type="button"
                    disabled={isDateLockedForTeacher}
                    onClick={() => handleStatusChange(student.id, 'absent')}
                    title="Marcar Falta"
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                      currentStatus === 'absent'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    } disabled:opacity-40`}
                  >
                    F
                  </button>
                  <button
                    type="button"
                    disabled={isDateLockedForTeacher}
                    onClick={() => handleStatusChange(student.id, 'justified')}
                    title="Marcar Falta Justificada (com Atestado)"
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                      currentStatus === 'justified'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    } disabled:opacity-40`}
                  >
                    FJ
                  </button>
                </div>
              </div>

              {/* Campo para explicar motivo e anexar foto/PDF do atestado */}
              {currentStatus === 'justified' && (
                <div className="ml-7 p-3 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      Motivo da Falta Justificada e Atestado Médico
                    </span>
                    {entry?.attachment_name && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                        <FileCheck2 className="w-3 h-3" />
                        Arquivo anexado: {entry.attachment_name}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      disabled={isDateLockedForTeacher}
                      value={entry?.justification_text || ''}
                      onChange={(e) => handleJustificationText(student.id, e.target.value)}
                      placeholder="Escreva o motivo (ex: Atestado médico entregue pela mãe)..."
                      className="flex-1 px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs text-slate-800"
                    />
                    <label className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-semibold cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      Enviar Foto ou PDF do Atestado
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            updateAttendance(
                              selectedDate,
                              student.id,
                              'justified',
                              entry?.justification_text || 'Atestado anexado pela Professora',
                              file.name
                            );
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {saveFeedback && (
        <div className="p-3.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center gap-2 shadow-sm">
          <Check className="w-4 h-4 shrink-0" />
          {saveFeedback}
        </div>
      )}

      <button
        type="button"
        disabled={isDateLockedForTeacher}
        onClick={handleSaveCall}
        className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-sm shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
      >
        <RefreshCw className="w-4 h-4" />
        Salvar Chamada do Dia {selectedDate} ({stats.total} Alunos)
      </button>
    </div>
  );
};
