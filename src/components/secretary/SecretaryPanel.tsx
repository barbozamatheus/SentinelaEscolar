import React, { useState } from 'react';
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  FileSpreadsheet,
  History,
  ShieldCheck,
  Trash2,
  UploadCloud,
  UserPlus,
} from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';
import { AttendanceStatus } from '../../types/database';

const STATUS_LABELS: Record<AttendanceStatus, { label: string; style: string }> = {
  present: {
    label: 'Presente (P)',
    style: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  absent: {
    label: 'Falta (F)',
    style: 'bg-rose-100 text-rose-800 border-rose-300',
  },
  justified: {
    label: 'Falta Justificada (FJ)',
    style: 'bg-amber-100 text-amber-900 border-amber-300',
  },
};

export const SecretaryPanel: React.FC = () => {
  const {
    state,
    recentSchoolDates,
    updateAttendance,
    addStudent,
    removeStudent,
    importCsvStudents,
  } = useSimulation();

  const [rectifyDate, setRectifyDate] = useState<string>('2026-10-15');
  const [rectifyReason, setRectifyReason] = useState<string>(
    'Correção autorizada pela Diretora Helena (chamada com mais de 7 dias)'
  );

  const [newStudentName, setNewStudentName] = useState<string>('');
  const [newGuardianName, setNewGuardianName] = useState<string>('');
  const [newGuardianPhone, setNewGuardianPhone] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const handleManualAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;
    addStudent({
      full_name: newStudentName,
      guardian_name: newGuardianName || 'Responsável Familiar',
      guardian_phone: newGuardianPhone || '(11) 98877-6655',
    });
    setNewStudentName('');
    setNewGuardianName('');
    setNewGuardianPhone('');
    setFeedbackMsg(
      `Aluno(a) "${newStudentName}" matriculado(a) no 7º Ano A! Na chamada da Professora, ele(a) já aparece com o aviso de "ALUNO NOVO" durante 7 dias.`
    );
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  const handleSimulateCsvBatch = () => {
    const sampleCsv = [
      'municipal_ra,full_name,guardian_name,guardian_phone',
      'Matrícula 2026-0091,Pedro Henrique Santana,Cláudia Santana (Mãe),(11) 97711-2233',
      'Matrícula 2026-0092,Sofia Vitória Alencar,Marcos Alencar (Pai),(11) 97722-3344',
    ].join('\n');
    const { imported } = importCsvStudents(sampleCsv);
    setFeedbackMsg(
      `${imported} novos alunos foram adicionados à turma pela planilha! Confira na aba da Professora os novos avisos de "ALUNO NOVO".`
    );
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const { imported } = importCsvStudents(text);
      setFeedbackMsg(`${imported} alunos adicionados a partir da planilha "${file.name}"!`);
      setTimeout(() => setFeedbackMsg(null), 5000);
    };
    reader.readAsText(file, 'utf-8');
  };

  const dayMap = state.attendanceByDate[rectifyDate] || {};

  return (
    <div className="space-y-6">
      {/* Cabeçalho Diretora / Secretaria da Escola */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            Perfil: Diretora Helena Vasconcelos (Secretaria da Escola) • {state.schoolName}
          </span>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Administração da Escola, Correção de Chamadas Antigas e Histórico de Alterações
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Aqui a direção e a secretaria podem matricular alunos novos no <strong>{state.className}</strong>, corrigir chamadas antigas (mesmo após o prazo de 7 dias dos professores) e consultar quem fez cada alteração.
          </p>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-4 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {feedbackMsg}
        </div>
      )}

      {/* Correção de Chamadas Antigas + Matrícula de Alunos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Correção de Chamadas Antigas */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Corrigir Chamada de Qualquer Data ({state.className})
              </h3>
              <p className="text-xs text-slate-500">
                Chamadas com mais de 7 dias (como <code>2026-10-15</code>) ficam bloqueadas para a professora, mas podem ser corrigidas aqui pela Diretora ou Secretaria.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Dia da Chamada que Deseja Corrigir:
              </label>
              <select
                value={rectifyDate}
                onChange={(e) => setRectifyDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
              >
                {recentSchoolDates.map((d) => (
                  <option key={d} value={d}>
                    {d === '2026-10-15' ? `${d} (Há mais de 7 dias — Liberado p/ Secretaria)` : d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Motivo da Correção:
              </label>
              <input
                type="text"
                value={rectifyReason}
                onChange={(e) => setRectifyReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800"
              />
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
            {state.students.map((stu, idx) => {
              const st: AttendanceStatus = dayMap[stu.id]?.status || 'present';
              return (
                <div
                  key={stu.id}
                  className="p-3 flex items-center justify-between gap-2 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-400 mr-1.5">
                      {String(idx + 1).padStart(2, '0')}.
                    </span>
                    <span className="text-xs font-bold text-slate-900">{stu.full_name}</span>
                    <span className="text-[11px] text-slate-400 ml-2">
                      ({stu.municipal_ra})
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
                      {(['present', 'absent', 'justified'] as AttendanceStatus[]).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() =>
                            updateAttendance(rectifyDate, stu.id, opt, rectifyReason)
                          }
                          className={`px-2.5 py-1 rounded-md text-[11px] font-extrabold transition cursor-pointer ${
                            st === opt
                              ? opt === 'present'
                                ? 'bg-emerald-600 text-white'
                                : opt === 'absent'
                                ? 'bg-rose-600 text-white'
                                : 'bg-amber-500 text-white'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {opt === 'present' ? 'P' : opt === 'absent' ? 'F' : 'FJ'}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeStudent(stu.id)}
                      title="Remover aluno da turma"
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Matrícula Individual ou por Planilha */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-5">
          <form onSubmit={handleManualAddStudent} className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Matricular Aluno Novo no {state.className}
                </h3>
                <p className="text-xs text-slate-500">
                  O aluno aparecerá com destaque de <strong>ALUNO NOVO</strong> por 7 dias na chamada da professora
                </p>
              </div>
            </div>

            <input
              type="text"
              required
              value={newStudentName}
              onChange={(e) => setNewStudentName(e.target.value)}
              placeholder="Nome completo do aluno (ex: Bruno Henrique Dias)"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={newGuardianName}
                onChange={(e) => setNewGuardianName(e.target.value)}
                placeholder="Nome da Mãe/Pai/Responsável"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
              <input
                type="text"
                value={newGuardianPhone}
                onChange={(e) => setNewGuardianPhone(e.target.value)}
                placeholder="Telefone (11) 99999-0000"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer"
            >
              + Matricular Aluno na Turma
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Cadastrar Vários Alunos por Planilha
              </span>
              <button
                type="button"
                onClick={handleSimulateCsvBatch}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
              >
                Testar Envio de Planilha (2 Alunos)
              </button>
            </div>

            <label className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition bg-slate-50/60">
              <UploadCloud className="w-6 h-6 text-indigo-500 mb-1" />
              <span className="text-xs font-semibold text-slate-700">
                Clique para enviar uma planilha de alunos (.CSV) ou use o botão de teste acima
              </span>
              <input type="file" accept=".csv" onChange={handleCsvFileUpload} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* Histórico Oficial de Alterações nas Chamadas */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-900 text-white">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Histórico Oficial de Alterações nas Chamadas
              </h3>
              <p className="text-xs text-slate-500">
                Total de <strong>{state.auditLogs.length} alterações registradas</strong>. Para segurança da escola, toda vez que uma chamada é alterada, o sistema guarda quem mudou, quando e o que estava marcado antes.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            Histórico Protegido (Não pode ser apagado)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">Data e Hora da Alteração</th>
                <th className="py-3.5 px-4">Aluno / Turma</th>
                <th className="py-3.5 px-4">Dia da Aula</th>
                <th className="py-3.5 px-4">O que Mudou na Chamada</th>
                <th className="py-3.5 px-4">Quem Fez a Alteração</th>
                <th className="py-3.5 px-4">Motivo Informado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {state.auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                    {new Date(log.changed_at).toLocaleString('pt-BR')}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{log.student_name}</div>
                    <div className="text-slate-500">
                      {log.class_name} • {log.municipal_ra}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-700 whitespace-nowrap">
                    {log.attendance_date}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded border font-semibold ${
                          STATUS_LABELS[log.old_status].style
                        }`}
                      >
                        Era: {STATUS_LABELS[log.old_status].label}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      <span
                        className={`px-2 py-0.5 rounded border font-semibold ${
                          STATUS_LABELS[log.new_status].style
                        }`}
                      >
                        Ficou: {STATUS_LABELS[log.new_status].label}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-800">{log.changed_by_name}</div>
                    <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                      {log.changed_by_role === 'secretary' ? 'Diretora / Secretaria' : 'Professora'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 max-w-xs">{log.change_reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
