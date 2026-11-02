import React, { useMemo, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Award,
  Building2,
  Calendar,
  CheckCircle2,
  Download,
  Eye,
  Filter,
  Minus,
  Phone,
  Search,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';
import {
  MUNICIPAL_SCHOOLS,
  NETWORK_ATTENDANCE_SERIES,
  TOP_CLASSES_LOWEST_ABSENCES,
} from '../../data/mockMunicipalData';

export const ManagerDashboard: React.FC = () => {
  const { state, computedStats } = useSimulation();
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('all');
  const [selectedBimester, setSelectedBimester] = useState<string>('4');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const dynamicSchools = useMemo(() => {
    return MUNICIPAL_SCHOOLS.map((school) =>
      school.id === 'sch-1'
        ? {
            ...school,
            attendance_rate: computedStats.overallPresenceRate,
          }
        : school
    );
  }, [computedStats.overallPresenceRate]);

  const chartSeries = useMemo(() => {
    const base = NETWORK_ATTENDANCE_SERIES[selectedSchoolId] || NETWORK_ATTENDANCE_SERIES.all;
    return base.map((pt, idx) =>
      idx === base.length - 1
        ? { ...pt, rate: computedStats.overallPresenceRate }
        : pt
    );
  }, [selectedSchoolId, computedStats.overallPresenceRate]);

  const dynamicTopClasses = useMemo(() => {
    const absenceRate7A = Number((100 - computedStats.overallPresenceRate).toFixed(1));
    const liveClass7A = {
      id: 'cls-7a-live',
      class_name: `${state.className} (Turma de Demonstração)`,
      grade_level: 'Ensino Fundamental II',
      shift: 'Matutino' as const,
      school_id: 'sch-1',
      school_name: state.schoolName,
      total_students: state.students.length,
      absence_rate: absenceRate7A,
      presence_rate: computedStats.overallPresenceRate,
      trend: (computedStats.overallPresenceRate >= 90 ? 'up' : 'down') as 'up' | 'down' | 'stable',
    };

    return [liveClass7A, ...TOP_CLASSES_LOWEST_ABSENCES].sort(
      (a, b) => a.absence_rate - b.absence_rate
    );
  }, [state.className, state.schoolName, state.students.length, computedStats.overallPresenceRate]);

  const summaryMetrics = useMemo(() => {
    const schools =
      selectedSchoolId === 'all'
        ? dynamicSchools
        : dynamicSchools.filter((s) => s.id === selectedSchoolId);

    const totalStudents = schools.reduce((acc, s) => acc + s.total_students, 0);
    const avgAttendance =
      schools.reduce((acc, s) => acc + s.attendance_rate, 0) / (schools.length || 1);

    const consecutiveAlerts = computedStats.consecutiveAbsenceAlerts.filter(
      (a) => selectedSchoolId === 'all' || a.school_id === selectedSchoolId
    );

    const chronicAlerts = computedStats.chronicAbsenceAlerts.filter(
      (a) => selectedSchoolId === 'all' || a.school_id === selectedSchoolId
    );

    return {
      totalStudents,
      schoolsCount: schools.length,
      avgAttendance: avgAttendance.toFixed(1),
      consecutiveCount: consecutiveAlerts.length,
      chronicCount: chronicAlerts.length,
    };
  }, [selectedSchoolId, dynamicSchools, computedStats]);

  const filteredTopClasses = useMemo(() => {
    return dynamicTopClasses.filter(
      (cls) =>
        (selectedSchoolId === 'all' || cls.school_id === selectedSchoolId) &&
        (searchTerm.trim() === '' ||
          cls.class_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cls.school_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [dynamicTopClasses, selectedSchoolId, searchTerm]);

  const filteredConsecutiveAlerts = useMemo(() => {
    return computedStats.consecutiveAbsenceAlerts.filter(
      (item) =>
        (selectedSchoolId === 'all' || item.school_id === selectedSchoolId) &&
        (searchTerm.trim() === '' ||
          item.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.municipal_ra.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.class_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [computedStats.consecutiveAbsenceAlerts, selectedSchoolId, searchTerm]);

  const filteredChronicAlerts = useMemo(() => {
    return computedStats.chronicAbsenceAlerts.filter(
      (item) =>
        (selectedSchoolId === 'all' || item.school_id === selectedSchoolId) &&
        (searchTerm.trim() === '' ||
          item.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.municipal_ra.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.class_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [computedStats.chronicAbsenceAlerts, selectedSchoolId, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Secretário Municipal */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Eye className="w-3.5 h-3.5" />
              Perfil: Secretário Municipal • Dr. Roberto Almeida (Apenas Visualização)
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              Atualização Automática em Tempo Real
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Painel Geral da Rede Municipal — Frequência e Combate à Evasão
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Os números e alertas abaixo são atualizados automaticamente assim que a <strong>Professora Ana Paula</strong> ou a <strong>Diretora Helena</strong> registram a chamada na escola.
          </p>
        </div>

        {/* Filtros de Escola e Bimestre */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              aria-label="Filtrar por Escola"
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              className="pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Todas as Escolas da Rede (4)</option>
              {dynamicSchools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              aria-label="Selecionar Bimestre"
              value={selectedBimester}
              onChange={(e) => setSelectedBimester(e.target.value)}
              className="pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="4">4º Bimestre • 2026 (Atual)</option>
              <option value="3">3º Bimestre • 2026 (Encerrado)</option>
              <option value="2">2º Bimestre • 2026 (Encerrado)</option>
              <option value="1">1º Bimestre • 2026 (Encerrado)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Imprimir Relatório
          </button>
        </div>
      </div>

      {/* Resumo em 4 Cartões Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Presença da Turma (7º Ano A)
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">
                {computedStats.overallPresenceRate}%
              </span>
              <span className="inline-flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                Média da Rede: {summaryMetrics.avgAttendance}%
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Meta esperada pelo Município: <strong className="text-slate-700">90,0%</strong>
            </p>
          </div>
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Alunos Acompanhados
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">
                {state.students.length} alunos
              </span>
              <span className="text-xs font-medium text-slate-500">no {state.className}</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Total na rede municipal: {summaryMetrics.totalStudents.toLocaleString('pt-BR')} alunos
            </p>
          </div>
          <div className="p-3 rounded-xl bg-sky-50 text-sky-600">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-xs flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
              Alerta 1 • 3 ou + Faltas Seguidas
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-amber-600">
                {summaryMetrics.consecutiveCount}
              </span>
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                Entrar em Contato
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Alunos que faltaram às últimas 3 ou mais aulas seguidas
            </p>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-xs flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-700">
              Alerta 2 • Mais de 25% de Faltas
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-rose-600">
                {summaryMetrics.chronicCount}
              </span>
              <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                Risco de Reprovação
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Passaram do limite máximo de 25% de faltas no {selectedBimester}º Bimestre
            </p>
          </div>
          <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
            <AlertOctagon className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Gráfico de Presença da Rede + Ranking de Turmas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Taxa de Presença por Semana ({selectedBimester}º Bimestre)
                </h2>
                <p className="text-xs text-slate-500">
                  A última barra (Sem 8) muda automaticamente conforme as chamadas são feitas
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium">
                <span className="flex items-center gap-1.5 text-slate-700">
                  <span className="w-3 h-3 rounded-xs bg-indigo-600 inline-block" />
                  Presença Registrada (%)
                </span>
                <span className="flex items-center gap-1.5 text-slate-500">
                  <span className="w-4 border-t-2 border-dashed border-amber-500 inline-block" />
                  Meta de 90%
                </span>
              </div>
            </div>

            <div className="relative h-64 pt-6 pb-2 px-2">
              <div
                className="absolute left-0 right-0 border-t-2 border-dashed border-amber-400 z-10 flex items-center justify-end pr-2 pointer-events-none"
                style={{ bottom: `${((90 - 75) / 25) * 100}%` }}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200 -mt-5">
                  Meta 90%
                </span>
              </div>

              <div className="h-full grid grid-cols-8 gap-3 items-end">
                {chartSeries.map((point) => {
                  const heightPercent = Math.max(
                    12,
                    Math.min(100, ((point.rate - 75) / 25) * 100)
                  );
                  const isBelowTarget = point.rate < point.target;

                  return (
                    <div
                      key={point.weekLabel}
                      className="h-full flex flex-col items-center justify-end group"
                    >
                      <span
                        className={`text-xs font-bold mb-1.5 transition ${
                          isBelowTarget
                            ? 'text-amber-600'
                            : 'text-slate-700 group-hover:text-indigo-600'
                        }`}
                      >
                        {point.rate.toFixed(1)}%
                      </span>
                      <div className="w-full h-44 bg-slate-100 rounded-t-xl relative flex items-end overflow-hidden">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full rounded-t-xl transition-all duration-300 ${
                            isBelowTarget
                              ? 'bg-gradient-to-t from-amber-500 to-amber-400 group-hover:from-amber-600 group-hover:to-amber-500'
                              : 'bg-gradient-to-t from-indigo-600 to-indigo-500 group-hover:from-indigo-700 group-hover:to-indigo-600'
                          }`}
                          title={`${point.period}: ${point.rate}% de presença`}
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-700 mt-2">
                        {point.weekLabel}
                      </span>
                      <span className="text-[10px] text-slate-400 hidden sm:inline">
                        {point.period.split(' - ')[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Presença Média por Escola (Clique para filtrar)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {dynamicSchools.map((school) => (
                <button
                  key={school.id}
                  type="button"
                  onClick={() =>
                    setSelectedSchoolId((prev) => (prev === school.id ? 'all' : school.id))
                  }
                  className={`text-left p-3 rounded-xl border transition cursor-pointer ${
                    selectedSchoolId === school.id
                      ? 'border-indigo-500 bg-indigo-50/50'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                    <span className="truncate pr-2">{school.name}</span>
                    <span
                      className={
                        school.attendance_rate >= 90 ? 'text-emerald-600' : 'text-amber-600'
                      }
                    >
                      {school.attendance_rate}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        school.attendance_rate >= 90 ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${school.attendance_rate}%` }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Ranking de Turmas com Menor Índice de Faltas */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Turmas com Menos Faltas na Rede
                </h2>
                <p className="text-xs text-slate-500">
                  Inclui o <strong>7º Ano A</strong> atualizado em tempo real
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 flex-1">
            {filteredTopClasses.slice(0, 6).map((item, idx) => (
              <div
                key={item.id}
                className={`p-3.5 rounded-xl border transition flex items-center justify-between gap-3 ${
                  item.id === 'cls-7a-live'
                    ? 'border-indigo-300 bg-indigo-50/40'
                    : 'border-slate-200/80 hover:border-slate-300 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                      idx === 0
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : idx === 1
                        ? 'bg-slate-200 text-slate-700 border border-slate-300'
                        : idx === 2
                        ? 'bg-orange-100 text-orange-800 border border-orange-200'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    {idx + 1}º
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{item.class_name}</span>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                        {item.shift}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {item.school_name} • {item.total_students} alunos
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-sm font-extrabold text-emerald-600">
                      {item.absence_rate.toFixed(1)}% faltas
                    </span>
                    {item.trend === 'up' && (
                      <ArrowUpRight className="w-4 h-4 text-emerald-500" aria-label="Assiduidade subindo" />
                    )}
                    {item.trend === 'down' && (
                      <ArrowDownRight className="w-4 h-4 text-amber-500" aria-label="Leve queda recente" />
                    )}
                    {item.trend === 'stable' && (
                      <Minus className="w-3.5 h-3.5 text-slate-400" aria-label="Estável" />
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Presença: <strong>{item.presence_rate.toFixed(1)}%</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Barra de Pesquisa de Alunos em Alerta */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 text-white p-4 rounded-2xl">
        <div className="flex items-center gap-2.5">
          <Filter className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-semibold">
            Acompanhamento de Alunos com Muitas Faltas (Busca Ativa Escolar)
          </span>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar aluno por nome, matrícula ou turma..."
            className="w-full pl-9 pr-4 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
      </div>

      {/* As 2 Listas de Alerta de Evasão */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* LISTA DE ALERTA 1: 3 ou mais faltas seguidas */}
        <div className="bg-white rounded-2xl border border-amber-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-5 bg-amber-50/70 border-b border-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-xs">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    Alerta 1: Alunos com 3 ou mais Faltas Seguidas
                  </h2>
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-200/80 text-amber-900">
                    {filteredConsecutiveAlerts.length} alunos
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Alunos que faltaram aos últimos dias de aula seguidos e precisam de contato com a família
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100 flex-1">
            {filteredConsecutiveAlerts.map((student) => (
              <div
                key={student.student_id}
                className="p-4 hover:bg-amber-50/20 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">
                      {student.student_name}
                    </span>
                    <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                      {student.municipal_ra}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    {student.school_name} • <strong className="text-slate-800">{student.class_name}</strong>
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-0.5">
                    <span className="inline-flex items-center gap-1 text-slate-700">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {student.guardian_name}: <strong>{student.guardian_phone}</strong>
                    </span>
                    <span>• Última falta: {student.last_absence_date}</span>
                  </div>
                </div>

                <div className="flex sm:flex-col items-start sm:items-end justify-between gap-2 shrink-0">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                    {student.consecutive_absences} faltas seguidas
                  </span>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      student.active_search_status === 'Conselho Tutelar'
                        ? 'bg-rose-100 text-rose-800'
                        : student.active_search_status === 'Secretaria Notificada'
                        ? 'bg-sky-100 text-sky-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    Acompanhamento: {student.active_search_status}
                  </span>
                </div>
              </div>
            ))}

            {filteredConsecutiveAlerts.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-500 flex flex-col items-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                Nenhum aluno com 3 ou mais faltas seguidas neste momento.
              </div>
            )}
          </div>
        </div>

        {/* LISTA DE ALERTA 2: Mais de 25% de faltas no Bimestre */}
        <div className="bg-white rounded-2xl border border-rose-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-5 bg-rose-50/70 border-b border-rose-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-600 text-white shadow-xs">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    Alerta 2: Mais de 25% de Faltas no Bimestre
                  </h2>
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-rose-200/80 text-rose-900">
                    {filteredChronicAlerts.length} alunos
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Alunos que ultrapassaram o limite máximo de 25% de faltas no {selectedBimester}º Bimestre ({state.bimesterSchoolDays} aulas dadas)
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100 flex-1">
            {filteredChronicAlerts.map((student) => (
              <div
                key={student.student_id}
                className="p-4 hover:bg-rose-50/20 transition flex flex-col gap-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">
                        {student.student_name}
                      </span>
                      <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                        {student.municipal_ra}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium mt-0.5">
                      {student.school_name} • <strong className="text-slate-800">{student.class_name}</strong>
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                      {student.absence_percentage.toFixed(1)}% de faltas no bimestre
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>
                      <strong>{student.unexcused_absences}</strong> faltas sem justificativa em{' '}
                      <strong>{student.bimester_school_days}</strong> aulas ({student.justified_absences}{' '}
                      faltas justificadas com atestado)
                    </span>
                    <span className="font-semibold text-rose-700">Limite Máximo: 25%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full relative overflow-hidden border border-slate-200">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-rose-600 rounded-full"
                      style={{ width: `${Math.min(100, student.absence_percentage * 2)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}

            {filteredChronicAlerts.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-500 flex flex-col items-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                Nenhum aluno acima do limite de 25% de faltas neste momento.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
