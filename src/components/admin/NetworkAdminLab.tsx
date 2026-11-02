import React, { useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Play,
  RotateCcw,
  School,
  Shield,
  Sparkles,
  UserCheck,
  Users,
} from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';

export const NetworkAdminLab: React.FC = () => {
  const {
    personas,
    setActivePersonaId,
    state,
    computedStats,
    resetScenarioToDefault,
  } = useSimulation();
  const [resetBanner, setResetBanner] = useState(false);

  const handleReset = () => {
    resetScenarioToDefault();
    setResetBanner(true);
    setTimeout(() => setResetBanner(false), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Banner de Apresentação da Rede Municipal */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-sm border border-indigo-500/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-semibold">
            <School className="w-3.5 h-3.5" />
            Ambiente de Demonstração Interativa • Dados Salvos Automaticamente
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Apresentação do Sistema — Controle de Frequência e Combate à Evasão
          </h1>
          <p className="text-sm text-slate-300 max-w-3xl">
            Aqui você pode experimentar o sistema como ele funciona no dia a dia da rede municipal: temos <strong>1 Secretário Municipal</strong>, <strong>1 Diretora de Escola</strong>, <strong>1 Professora</strong> e uma sala de aula (<strong>7º Ano A</strong>) com <strong>{state.students.length} alunos</strong>. Tudo o que for marcado na chamada atualiza na mesma hora o painel do Secretário e da Diretora!
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Reiniciar Demonstração (15 Alunos)
          </button>
        </div>
      </div>

      {resetBanner && (
        <div className="p-3.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4" />
          Demonstração reiniciada com sucesso! Os 15 alunos e as chamadas voltaram ao estado inicial.
        </div>
      )}

      {/* Escolha de Perfil com Linguagem Simples */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
          1. Escolha qual visão você deseja abrir agora:
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {personas
            .filter((p) => p.id !== 'network_admin')
            .map((persona) => (
              <div
                key={persona.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between gap-4 hover:border-indigo-400 transition"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Perfil: {persona.friendlyRoleLabel}
                    </span>
                    <Shield className="w-4 h-4 text-slate-400" />
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900">{persona.name}</h3>
                  <p className="text-xs font-semibold text-indigo-600">{persona.title}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {persona.permissionsSummary}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActivePersonaId(persona.id)}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  Entrar como {persona.name.split(' ')[0]} {persona.name.split(' ')[1]}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
        </div>
      </div>

      {/* Passo a Passo Simples para Demonstração */}
      <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-indigo-600" />
          Sugestão de Passo a Passo para Demonstrar o Sistema:
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-slate-700">
          <div className="bg-white p-3.5 rounded-xl border border-indigo-100">
            <strong className="text-indigo-900 block mb-1">
              1º Passo: Fazer a Chamada (Professora)
            </strong>
            Clique em <strong>Professora</strong>. Veja os 15 alunos em ordem alfabética e o aviso nos <strong>Alunos Novos</strong>. Mude o aluno <em>Davi Lucca</em> de Falta (F) para Presente (P) e veja o alerta dele sumir imediatamente no painel do Secretário!
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-indigo-100">
            <strong className="text-indigo-900 block mb-1">
              2º Passo: Limite de 7 Dias para Alterar
            </strong>
            Ainda na visão da <strong>Professora</strong>, clique na data antiga <code>15/10/2026</code>. O sistema mostrará que a professora não pode mudar chamadas antigas. Depois, entre como <strong>Diretora Helena</strong> e faça a correção normalmente!
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-indigo-100">
            <strong className="text-indigo-900 block mb-1">
              3º Passo: Matricular Alunos e Ver Histórico
            </strong>
            Na visão da <strong>Diretora Helena</strong>, cadastre um aluno novo na turma e role a página para ver o <strong>Histórico Oficial de Alterações</strong>, que mostra quem mudou cada chamada, quando e por quê.
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-indigo-100">
            <strong className="text-indigo-900 block mb-1">
              4º Passo: Painel do Secretário Municipal
            </strong>
            Entre como <strong>Secretário Municipal</strong> para ver a presença de toda a rede, as turmas com menos faltas e as duas listas de alerta de alunos que precisam de acompanhamento da escola.
          </div>
        </div>
      </div>

      {/* Resumo da Turma de 15 Alunos */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-100 text-slate-800">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Resumo da Sala de Aula: {state.className} ({state.schoolName})
              </h2>
              <p className="text-xs text-slate-500">
                Total: <strong>{state.students.length} alunos matriculados</strong> • 4º Bimestre ({state.bimesterSchoolDays} aulas dadas) • Presença média da turma:{' '}
                <strong>{computedStats.overallPresenceRate}%</strong>
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Nº</th>
                <th className="py-3 px-4">Nº de Matrícula</th>
                <th className="py-3 px-4">Nome do Aluno</th>
                <th className="py-3 px-4">Data de Entrada na Turma</th>
                <th className="py-3 px-4">Faltas Seguidas</th>
                <th className="py-3 px-4">Total de Faltas no Bimestre</th>
                <th className="py-3 px-4">Situação do Aluno</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {state.students.map((stu, idx) => {
                const st = computedStats.studentTotals[stu.id];
                const isAlert1 = st.consecutiveStreak >= 3;
                const isAlert2 = st.absencePercentage > 25;

                return (
                  <tr key={stu.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-bold text-slate-400">
                      {String(idx + 1).padStart(2, '0')}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{stu.municipal_ra}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{stu.full_name}</td>
                    <td className="py-3 px-4">
                      {st.isNewStudent ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-violet-100 text-violet-800 border border-violet-300">
                          <Sparkles className="w-3 h-3" />
                          ALUNO NOVO (destaque por mais {st.newBadgeDaysRemaining} dias)
                        </span>
                      ) : (
                        <span className="text-slate-500">Desde o início do ano</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-bold ${
                          isAlert1 ? 'text-amber-700' : 'text-slate-600'
                        }`}
                      >
                        {st.consecutiveStreak} {st.consecutiveStreak === 1 ? 'falta' : 'faltas'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-bold ${
                          isAlert2 ? 'text-rose-600' : 'text-slate-700'
                        }`}
                      >
                        {st.absences} faltas ({st.absencePercentage}%)
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1.5">
                        {isAlert1 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold text-[11px]">
                            <AlertTriangle className="w-3 h-3" />
                            Atenção: 3 ou + faltas seguidas
                          </span>
                        )}
                        {isAlert2 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-[11px]">
                            <AlertOctagon className="w-3 h-3" />
                            Crítico: Acima de 25% de faltas
                          </span>
                        )}
                        {!isAlert1 && !isAlert2 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold text-[11px]">
                            <CheckCircle2 className="w-3 h-3" />
                            Frequência Normal
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
