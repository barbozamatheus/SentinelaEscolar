import React from 'react';
import {
  BarChart3,
  ClipboardCheck,
  GraduationCap,
  Home,
  Shield,
  Smartphone,
  Wifi,
} from 'lucide-react';
import { NetworkAdminLab } from './components/admin/NetworkAdminLab';
import { ManagerDashboard } from './components/dashboard/ManagerDashboard';
import { TeacherAttendanceMobile } from './components/teacher/TeacherAttendanceMobile';
import { SecretaryPanel } from './components/secretary/SecretaryPanel';
import { SimulationProvider, useSimulation } from './context/SimulationContext';

const AppShell: React.FC = () => {
  const { activePersona, setActivePersonaId, state } = useSimulation();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Barra Superior com Troca Fácil de Perfis */}
      <header className="sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-xs shrink-0">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight">
                  Sentinela Escolar
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  <Wifi className="w-3 h-3" />
                  Demonstração ({state.students.length} Alunos)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Visualizando como: <strong className="text-white">{activePersona.name}</strong> ({activePersona.title})
              </p>
            </div>
          </div>

          {/* Botões para Alternar entre as Visões */}
          <nav
            aria-label="Alternar Visão do Sistema"
            className="flex flex-wrap items-center gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700"
          >
            <button
              type="button"
              onClick={() => setActivePersonaId('network_admin')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activePersona.id === 'network_admin'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Início (Resumo da Turma)</span>
            </button>

            <button
              type="button"
              onClick={() => setActivePersonaId('municipal_secretary')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activePersona.id === 'municipal_secretary'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Secretário Municipal</span>
            </button>

            <button
              type="button"
              onClick={() => setActivePersonaId('school_director')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activePersona.id === 'school_director'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>Diretora (Secretaria)</span>
            </button>

            <button
              type="button"
              onClick={() => setActivePersonaId('teacher_ana')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activePersona.id === 'teacher_ana'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Professora ({state.students.length} Alunos)</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activePersona.id === 'network_admin' && <NetworkAdminLab />}
        {activePersona.id === 'municipal_secretary' && <ManagerDashboard />}
        {activePersona.id === 'school_director' && <SecretaryPanel />}
        {activePersona.id === 'teacher_ana' && <TeacherAttendanceMobile />}
      </main>

      {/* Rodapé Institucional */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-indigo-600" />
            <span>
              Sentinela Escolar • Sistema de Controle de Frequência e Acompanhamento Escolar
            </span>
          </div>
          <span>Secretaria Municipal de Educação • Ano Letivo 2026</span>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <SimulationProvider>
      <AppShell />
    </SimulationProvider>
  );
};

export default App;
