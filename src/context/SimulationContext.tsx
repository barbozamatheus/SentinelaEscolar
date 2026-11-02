import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  AttendanceStatus,
  AuditLogEntry,
  ChronicAbsenceAlert,
  ConsecutiveAbsenceAlert,
} from '../types/database';

export type ActivePersonaId =
  | 'network_admin'
  | 'municipal_secretary'
  | 'school_director'
  | 'teacher_ana';

export interface PersonaProfile {
  id: ActivePersonaId;
  name: string;
  title: string;
  rbacRole: 'municipal_manager' | 'secretary' | 'teacher';
  friendlyRoleLabel: string;
  schoolName: string;
  permissionsSummary: string;
}

export interface SimulatedStudent {
  id: string;
  municipal_ra: string;
  full_name: string;
  guardian_name: string;
  guardian_phone: string;
  enrolled_at: string;
  class_id: string;
  class_name: string;
  school_id: string;
  school_name: string;
  prior_bimester_presences: number;
  prior_bimester_absences: number;
  prior_bimester_justified: number;
  active_search_status: 'Normal' | 'Pendente' | 'Secretaria Notificada' | 'Conselho Tutelar';
}

export interface DailyAttendanceEntry {
  status: AttendanceStatus;
  justification_text?: string;
  attachment_name?: string;
  updated_by_name: string;
  updated_by_role: 'teacher' | 'secretary';
  updated_at: string;
}

export type AttendanceByDateMap = Record<string, Record<string, DailyAttendanceEntry>>;

interface SimulationState {
  schoolName: string;
  className: string;
  bimesterSchoolDays: number;
  students: SimulatedStudent[];
  attendanceByDate: AttendanceByDateMap;
  auditLogs: AuditLogEntry[];
}

interface SimulationContextValue {
  activePersona: PersonaProfile;
  setActivePersonaId: (id: ActivePersonaId) => void;
  personas: PersonaProfile[];
  state: SimulationState;
  referenceToday: string;
  recentSchoolDates: string[];
  updateAttendance: (
    date: string,
    studentId: string,
    newStatus: AttendanceStatus,
    reasonOrJustification?: string,
    attachmentName?: string
  ) => { ok: boolean; error?: string };
  saveFullDayCall: (date: string) => void;
  addStudent: (input: {
    full_name: string;
    guardian_name: string;
    guardian_phone: string;
    enrolled_at?: string;
  }) => void;
  removeStudent: (studentId: string) => void;
  importCsvStudents: (csvText: string) => { imported: number };
  updateActiveSearchStatus: (
    studentId: string,
    status: SimulatedStudent['active_search_status']
  ) => void;
  resetScenarioToDefault: () => void;
  computedStats: {
    overallPresenceRate: number;
    consecutiveAbsenceAlerts: ConsecutiveAbsenceAlert[];
    chronicAbsenceAlerts: ChronicAbsenceAlert[];
    studentTotals: Record<
      string,
      {
        presences: number;
        absences: number;
        justified: number;
        consecutiveStreak: number;
        lastAbsenceDate: string;
        absencePercentage: number;
        isNewStudent: boolean;
        newBadgeDaysRemaining: number;
      }
    >;
  };
}

const STORAGE_KEY = 'sentinela_escolar_cenario_15_alunos_v1';
export const REFERENCE_TODAY = '2026-11-01';

export const RECENT_SCHOOL_DATES = [
  '2026-10-15',
  '2026-10-27',
  '2026-10-28',
  '2026-10-29',
  '2026-10-30',
  '2026-11-01',
];

export const PERSONAS: PersonaProfile[] = [
  {
    id: 'municipal_secretary',
    name: 'Dr. Roberto Almeida',
    title: 'Secretário Municipal de Educação',
    rbacRole: 'municipal_manager',
    friendlyRoleLabel: 'Gestão Municipal',
    schoolName: 'Toda a Rede Municipal',
    permissionsSummary:
      'Acompanha os gráficos de presença de todas as escolas, as turmas mais assíduas e a lista de alunos com muitas faltas.',
  },
  {
    id: 'teacher_ana',
    name: 'Profa. Ana Paula Mendes',
    title: 'Professora — Turma 7º Ano A',
    rbacRole: 'teacher',
    friendlyRoleLabel: 'Professora da Turma',
    schoolName: 'EMEF Prof. Darcy Ribeiro',
    permissionsSummary:
      'Faz a chamada diária pelo celular ou computador, anexa atestados médicos, corrige chamadas dos últimos 7 dias e imprime o relatório da turma.',
  },
  {
    id: 'school_director',
    name: 'Diretora Helena Vasconcelos',
    title: 'Diretora e Secretaria da Escola',
    rbacRole: 'secretary',
    friendlyRoleLabel: 'Direção / Secretaria',
    schoolName: 'EMEF Prof. Darcy Ribeiro',
    permissionsSummary:
      'Matricula alunos novos, corrige chamadas de qualquer data antiga (mesmo após 7 dias) e consulta o histórico de alterações.',
  },
  {
    id: 'network_admin',
    name: 'Apresentação do Sistema',
    title: 'Visão Geral da Demonstração',
    rbacRole: 'municipal_manager',
    friendlyRoleLabel: 'Guia de Demonstração',
    schoolName: 'Rede Municipal de Ensino',
    permissionsSummary:
      'Tela inicial para alternar entre os perfis do Secretário, da Diretora e da Professora e visualizar a turma de 15 alunos.',
  },
];

function buildInitial15StudentsScenario(): SimulationState {
  const students: SimulatedStudent[] = [
    {
      id: 'stu-01',
      municipal_ra: 'Matrícula 2026-0001',
      full_name: 'Alice Ferreira da Silva',
      guardian_name: 'Fernanda Silva (Mãe)',
      guardian_phone: '(11) 98801-1001',
      enrolled_at: '2026-02-10',
      class_id: 'cls-7a',
      class_name: '7º Ano A',
      school_id: 'sch-1',
      school_name: 'EMEF Prof. Darcy Ribeiro',
      prior_bimester_presences: 33,
      prior_bimester_absences: 1,
      prior_bimester_justified: 0,
      active_search_status: 'Normal',
    },
    {
      id: 'stu-02',
      municipal_ra: 'Matrícula 2026-0002',
      full_name: 'Arthur Miguel Pereira Souza',
      guardian_name: 'Paulo Souza (Pai)',
      guardian_phone: '(11) 98801-1002',
      enrolled_at: '2026-10-29',
      class_id: 'cls-7a',
      class_name: '7º Ano A',
      school_id: 'sch-1',
      school_name: 'EMEF Prof. Darcy Ribeiro',
      prior_bimester_presences: 34,
      prior_bimester_absences: 0,
      prior_bimester_justified: 0,
      active_search_status: 'Normal',
    },
    {
      id: 'stu-03',
      municipal_ra: 'Matrícula 2026-0003',
      full_name: 'Beatriz Rodrigues Barbosa',
      guardian_name: 'Camila Barbosa (Mãe)',
      guardian_phone: '(11) 98801-1003',
      enrolled_at: '2026-02-10',
      class_id: 'cls-7a',
      class_name: '7º Ano A',
      school_id: 'sch-1',
      school_name: 'EMEF Prof. Darcy Ribeiro',
      prior_bimester_presences: 32,
      prior_bimester_absences: 2,
      prior_bimester_justified: 0,
      active_search_status: 'Normal',
    },
    {
      id: 'stu-04',
      municipal_ra: 'Matrícula 2026-0004',
      full_name: 'Bernardo Alves Costa',
      guardian_name: 'Roberto Costa (Pai)',
      guardian_phone: '(11) 98801-1004',
      enrolled_at: '2026-02-10',
      class_id: 'cls-7a',
      class_name: '7º Ano A',
      school_id: 'sch-1',
      school_name: 'EMEF Prof. Darcy Ribeiro',
      prior_bimester_presences: 34,
      prior_bimester_absences: 0,
      prior_bimester_justified: 0,
      active_search_status: 'Normal',
    },
    {
      id: 'stu-05',
      municipal_ra: 'Matrícula 2026-0005',
      full_name: 'Cauã Henrique Oliveira Santos',
      guardian_name: 'Luciana Oliveira (Mãe)',
      guardian_phone: '(11) 98741-2209',
      enrolled_at: '2026-02-10',
      class_id: 'cls-7a',
      class_name: '7º Ano A',
      school_id: 'sch-1',
      school_name: 'EMEF Prof. Darcy Ribeiro',
      prior_bimester_presences: 23,
      prior_bimester_absences: 11,
      prior_bimester_justified: 0,
      active_search_status: 'Conselho Tutelar',
    },
    {
      id: 'stu-06',
      municipal_ra: 'Matrícula 2026-0006',
      full_name: 'Davi Lucca Ribeiro de Souza',
      guardian_name: 'Helena Ribeiro (Avó)',
      guardian_phone: '(11) 98211-9087',
      enrolled_at: '2026-02-10',
      class_id: 'cls-7a',
      class_name: '7º Ano A',
      school_id: 'sch-1',
      school_name: 'EMEF Prof. Darcy Ribeiro',
      prior_bimester_presences: 31,
      prior_bimester_absences: 3,
      prior_bimester_justified: 0,
      active_search_status: 'Pendente',
    },
    {
      id: 'stu-07',
      municipal_ra: 'Matrícula 2026-0007',
      full_name: 'Enzo Gabriel Gomes Castro',
      guardian_name: 'Tatiane Castro (Mãe)',
      guardian_phone: '(11) 98801-1007',
      enrolled_at: '2026-02-10',
      class_id: 'cls-7a',
      class_name: '7º Ano A',
      school_id: 'sch-1',
      school_name: 'EMEF Prof. Darcy Ribeiro',
      prior_bimester_presences: 32,
      prior_bimester_absences: 1,
      prior_bimester_justified: 1,
      active_search_status: 'Normal',
    },
    {
      id: 'stu-08',
      municipal_ra: 'Matrícula 2026-0008',
      full_name: 'Gabrielly Martins Rocha',
      guardian_name: 'Vanessa Rocha (Mãe)',
      guardian_phone: '(11) 98801-1008',
      enrolled_at: '2026-02-10',
      class_id: 'cls-7a',
      class_name: '7º Ano A',
      school_id: 'sch-1',
      school_name: 'EMEF Prof. Darcy Ribeiro',
      prior_bimester_presences: 22,
      prior_bimester_absences: 11,
      prior_bimester_justified: 1,
      active_search_status: 'Secretaria Notificada',
    },
    {
      id: 'stu-09',
      municipal_ra: 'Matrícula 2026-0009',
      full_name: 'Helena Cristina Araújo',
      guardian_name: 'Marcos Araújo (Pai)',
      guardian_phone: '(11) 98801-1009',
      enrolled_at: '2026-10-27',
      class_id: 'cls-7a',
      class_name: '7º Ano A',
      school_id: 'sch-1',
      school_name: 'EMEF Prof. Darcy Ribeiro',
      prior_bimester_presences: 33,
      prior_bimester_absences: 1,
      prior_bimester_justified: 0,
      active_search_status: 'Normal',
    },
    {
      id: 'stu-10',
      municipal_ra: 'Matrícula 2026-0010',
      full_name: 'Isabella Fernandes Melo',
      guardian_name: 'Renata Melo (Mãe)',
      guardian_phone: '(11) 98801-1010',
      enrolled_at: '2026-02-10',
      class_id: 'cls-7a',
      class_name: '7º Ano A',
      school_id: 'sch-1',
      school_name: 'EMEF Prof. Darcy Ribeiro',
      prior_bimester_presences: 34,
      prior_bimester_absences: 0,
      prior_bimester_justified: 0,
      active_search_status: 'Normal',
    },
    {
      id: 'stu-11',
      municipal_ra: 'Matrícula 2026-0011',
      full_name: 'João Pedro Almeida Nascimento',
      guardian_name: 'Carlos Nascimento (Pai)',
      guardian_phone: '(11) 98801-1011',
      enrolled_at: '2026-02-10',
      class_id: 'cls-7a',
      class_name: '7º Ano A',
      school_id: 'sch-1',
      school_name: 'EMEF Prof. Darcy Ribeiro',
      prior_bimester_presences: 31,
      prior_bimester_absences: 3,
      prior_bimester_justified: 0,
      active_search_status: 'Normal',
    },
    {
      id: 'stu-12',
      municipal_ra: 'Matrícula 2026-0012',
      full_name: 'Laura Beatriz Cavalcanti',
      guardian_name: 'Juliana Cavalcanti (Mãe)',
      guardian_phone: '(11) 98801-1012',
      enrolled_at: '2026-02-10',
      class_id: 'cls-7a',
      class_name: '7º Ano A',
      school_id: 'sch-1',
      school_name: 'EMEF Prof. Darcy Ribeiro',
      prior_bimester_presences: 33,
      prior_bimester_absences: 1,
      prior_bimester_justified: 0,
      active_search_status: 'Normal',
    },
    {
      id: 'stu-13',
      municipal_ra: 'Matrícula 2026-0013',
      full_name: 'Lucas Gabriel Moreira Cardoso',
      guardian_name: 'Sérgio Cardoso (Pai)',
      guardian_phone: '(11) 98801-1013',
      enrolled_at: '2026-02-10',
      class_id: 'cls-7a',
      class_name: '7º Ano A',
      school_id: 'sch-1',
      school_name: 'EMEF Prof. Darcy Ribeiro',
      prior_bimester_presences: 32,
      prior_bimester_absences: 2,
      prior_bimester_justified: 0,
      active_search_status: 'Normal',
    },
    {
      id: 'stu-14',
      municipal_ra: 'Matrícula 2026-0014',
      full_name: 'Matheus Henrique Carvalho',
      guardian_name: 'Adriana Carvalho (Mãe)',
      guardian_phone: '(11) 98801-1014',
      enrolled_at: '2026-02-10',
      class_id: 'cls-7a',
      class_name: '7º Ano A',
      school_id: 'sch-1',
      school_name: 'EMEF Prof. Darcy Ribeiro',
      prior_bimester_presences: 34,
      prior_bimester_absences: 0,
      prior_bimester_justified: 0,
      active_search_status: 'Normal',
    },
    {
      id: 'stu-15',
      municipal_ra: 'Matrícula 2026-0015',
      full_name: 'Yasmin Vitória Ferreira Lima',
      guardian_name: 'Marcos Lima (Pai)',
      guardian_phone: '(11) 99104-5531',
      enrolled_at: '2026-02-10',
      class_id: 'cls-7a',
      class_name: '7º Ano A',
      school_id: 'sch-1',
      school_name: 'EMEF Prof. Darcy Ribeiro',
      prior_bimester_presences: 24,
      prior_bimester_absences: 9,
      prior_bimester_justified: 1,
      active_search_status: 'Secretaria Notificada',
    },
  ];

  const attendanceByDate: AttendanceByDateMap = {};

  for (const date of RECENT_SCHOOL_DATES) {
    attendanceByDate[date] = {};
    for (const stu of students) {
      let status: AttendanceStatus = 'present';
      let justification_text: string | undefined;
      let attachment_name: string | undefined;

      if (
        stu.id === 'stu-05' &&
        ['2026-10-28', '2026-10-29', '2026-10-30', '2026-11-01'].includes(date)
      ) {
        status = 'absent';
      }

      if (stu.id === 'stu-06' && ['2026-10-29', '2026-10-30', '2026-11-01'].includes(date)) {
        status = 'absent';
      }

      if (stu.id === 'stu-15' && ['2026-10-29', '2026-10-30', '2026-11-01'].includes(date)) {
        status = 'absent';
      }

      if (stu.id === 'stu-08' && ['2026-10-27', '2026-10-28'].includes(date)) {
        status = 'absent';
      }

      if (stu.id === 'stu-07' && date === '2026-11-01') {
        status = 'justified';
        justification_text = 'Atestado odontológico entregue na escola (Posto de Saúde Centro)';
        attachment_name = 'atestado_enzo_01_11.pdf';
      }

      attendanceByDate[date][stu.id] = {
        status,
        justification_text,
        attachment_name,
        updated_by_name: 'Profa. Ana Paula Mendes',
        updated_by_role: 'teacher',
        updated_at: `${date}T10:00:00Z`,
      };
    }
  }

  const initialAuditLogs: AuditLogEntry[] = [
    {
      id: 'aud-init-1',
      attendance_record_id: 'rec-stu-07-2026-11-01',
      school_id: 'sch-1',
      school_name: 'EMEF Prof. Darcy Ribeiro',
      class_name: '7º Ano A',
      student_name: 'Enzo Gabriel Gomes Castro',
      municipal_ra: 'Matrícula 2026-0007',
      attendance_date: '2026-11-01',
      changed_by_name: 'Profa. Ana Paula Mendes',
      changed_by_role: 'teacher',
      old_status: 'absent',
      new_status: 'justified',
      change_reason: 'Atestado odontológico entregue pela família (dentro do prazo de 7 dias)',
      changed_at: '2026-11-01T10:15:00Z',
    },
    {
      id: 'aud-init-2',
      attendance_record_id: 'rec-stu-03-2026-10-15',
      school_id: 'sch-1',
      school_name: 'EMEF Prof. Darcy Ribeiro',
      class_name: '7º Ano A',
      student_name: 'Beatriz Rodrigues Barbosa',
      municipal_ra: 'Matrícula 2026-0003',
      attendance_date: '2026-10-15',
      changed_by_name: 'Diretora Helena Vasconcelos',
      changed_by_role: 'secretary',
      old_status: 'absent',
      new_status: 'present',
      change_reason: 'Correção autorizada pela Direção (chamada com mais de 7 dias)',
      changed_at: '2026-10-30T15:40:00Z',
    },
  ];

  return {
    schoolName: 'EMEF Prof. Darcy Ribeiro',
    className: '7º Ano A',
    bimesterSchoolDays: 40,
    students,
    attendanceByDate,
    auditLogs: initialAuditLogs,
  };
}

const SimulationContext = createContext<SimulationContextValue | null>(null);

export const SimulationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activePersonaId, setActivePersonaId] = useState<ActivePersonaId>('network_admin');

  const [state, setState] = useState<SimulationState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw) as SimulationState;
      }
    } catch {
      // Fallback para o cenário padrão
    }
    return buildInitial15StudentsScenario();
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }
  }, [state]);

  const activePersona = useMemo(
    () => PERSONAS.find((p) => p.id === activePersonaId) || PERSONAS[0],
    [activePersonaId]
  );

  const getDaysDiffFromToday = (dateStr: string): number => {
    const ref = new Date(`${REFERENCE_TODAY}T12:00:00Z`).getTime();
    const target = new Date(`${dateStr}T12:00:00Z`).getTime();
    return Math.round((ref - target) / (1000 * 60 * 60 * 24));
  };

  const updateAttendance = (
    date: string,
    studentId: string,
    newStatus: AttendanceStatus,
    reasonOrJustification?: string,
    attachmentName?: string
  ): { ok: boolean; error?: string } => {
    const daysDiff = getDaysDiffFromToday(date);

    if (activePersona.rbacRole === 'teacher' && (daysDiff > 7 || daysDiff < 0)) {
      return {
        ok: false,
        error:
          'Alteração não permitida: Professores só podem alterar chamadas dos últimos 7 dias. Para datas mais antigas, peça a correção à Diretora ou Secretaria da escola.',
      };
    }

    if (activePersona.rbacRole === 'municipal_manager') {
      return {
        ok: false,
        error: 'O perfil do Secretário Municipal é apenas para consulta de relatórios.',
      };
    }

    setState((prev) => {
      const dayMap = prev.attendanceByDate[date] || {};
      const existing = dayMap[studentId];
      const oldStatus: AttendanceStatus = existing ? existing.status : 'present';
      const student = prev.students.find((s) => s.id === studentId);

      const updatedEntry: DailyAttendanceEntry = {
        status: newStatus,
        justification_text:
          newStatus === 'justified'
            ? reasonOrJustification ?? existing?.justification_text ?? 'Atestado médico apresentado'
            : undefined,
        attachment_name:
          newStatus === 'justified'
            ? attachmentName ?? existing?.attachment_name ?? 'atestado_medico.pdf'
            : undefined,
        updated_by_name: activePersona.name,
        updated_by_role: activePersona.rbacRole === 'secretary' ? 'secretary' : 'teacher',
        updated_at: new Date().toISOString(),
      };

      const nextAuditLogs = [...prev.auditLogs];
      if (oldStatus !== newStatus && student) {
        nextAuditLogs.unshift({
          id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          attendance_record_id: `rec-${studentId}-${date}`,
          school_id: student.school_id,
          school_name: student.school_name,
          class_name: student.class_name,
          student_name: student.full_name,
          municipal_ra: student.municipal_ra,
          attendance_date: date,
          changed_by_name: activePersona.name,
          changed_by_role: activePersona.rbacRole,
          old_status: oldStatus,
          new_status: newStatus,
          change_reason:
            reasonOrJustification ||
            (activePersona.rbacRole === 'secretary'
              ? `Correção realizada pela Direção/Secretaria da escola (referente ao dia ${date})`
              : `Alteração de chamada feita pela Professora dentro do prazo de 7 dias`),
          changed_at: new Date().toISOString(),
        });
      }

      return {
        ...prev,
        attendanceByDate: {
          ...prev.attendanceByDate,
          [date]: {
            ...dayMap,
            [studentId]: updatedEntry,
          },
        },
        auditLogs: nextAuditLogs,
      };
    });

    return { ok: true };
  };

  const saveFullDayCall = (_date: string) => {};

  const addStudent = (input: {
    full_name: string;
    guardian_name: string;
    guardian_phone: string;
    enrolled_at?: string;
  }) => {
    setState((prev) => {
      const nextNum = prev.students.length + 1;
      const newId = `stu-${Date.now()}`;
      const newStudent: SimulatedStudent = {
        id: newId,
        municipal_ra: `Matrícula 2026-${String(nextNum).padStart(4, '0')}`,
        full_name: input.full_name.trim(),
        guardian_name: input.guardian_name.trim() || 'Responsável Familiar',
        guardian_phone: input.guardian_phone.trim() || '(11) 99999-0000',
        enrolled_at: input.enrolled_at || REFERENCE_TODAY,
        class_id: 'cls-7a',
        class_name: prev.className,
        school_id: 'sch-1',
        school_name: prev.schoolName,
        prior_bimester_presences: 34,
        prior_bimester_absences: 0,
        prior_bimester_justified: 0,
        active_search_status: 'Normal',
      };

      const nextAttendance = { ...prev.attendanceByDate };
      for (const d of RECENT_SCHOOL_DATES) {
        nextAttendance[d] = {
          ...(nextAttendance[d] || {}),
          [newId]: {
            status: 'present',
            updated_by_name: activePersona.name,
            updated_by_role: 'secretary',
            updated_at: new Date().toISOString(),
          },
        };
      }

      const sorted = [...prev.students, newStudent].sort((a, b) =>
        a.full_name.localeCompare(b.full_name, 'pt-BR')
      );

      return {
        ...prev,
        students: sorted,
        attendanceByDate: nextAttendance,
      };
    });
  };

  const removeStudent = (studentId: string) => {
    setState((prev) => ({
      ...prev,
      students: prev.students.filter((s) => s.id !== studentId),
    }));
  };

  const importCsvStudents = (csvText: string): { imported: number } => {
    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.toLowerCase().startsWith('municipal_ra'));

    let count = 0;
    for (const line of lines) {
      const parts = line.split(',').map((p) => p.trim());
      if (parts.length >= 2) {
        const fullName = parts[1] || parts[0];
        const guardianName = parts[2] || 'Responsável (Cadastrado via Planilha)';
        const guardianPhone = parts[3] || '(11) 98888-7777';
        addStudent({
          full_name: fullName,
          guardian_name: guardianName,
          guardian_phone: guardianPhone,
          enrolled_at: REFERENCE_TODAY,
        });
        count++;
      }
    }
    return { imported: count };
  };

  const updateActiveSearchStatus = (
    studentId: string,
    status: SimulatedStudent['active_search_status']
  ) => {
    setState((prev) => ({
      ...prev,
      students: prev.students.map((s) =>
        s.id === studentId ? { ...s, active_search_status: status } : s
      ),
    }));
  };

  const resetScenarioToDefault = () => {
    const fresh = buildInitial15StudentsScenario();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    setState(fresh);
  };

  const computedStats = useMemo(() => {
    const studentTotals: SimulationContextValue['computedStats']['studentTotals'] = {};
    const consecutiveAbsenceAlerts: ConsecutiveAbsenceAlert[] = [];
    const chronicAbsenceAlerts: ChronicAbsenceAlert[] = [];

    let totalPresencesSum = 0;
    let totalClassesSum = 0;

    const datesDesc = [...RECENT_SCHOOL_DATES].sort((a, b) => b.localeCompare(a));

    for (const stu of state.students) {
      let recentP = 0;
      let recentF = 0;
      let recentFJ = 0;

      for (const d of RECENT_SCHOOL_DATES) {
        const st = state.attendanceByDate[d]?.[stu.id]?.status || 'present';
        if (st === 'present') recentP++;
        else if (st === 'absent') recentF++;
        else if (st === 'justified') recentFJ++;
      }

      let consecutiveStreak = 0;
      let lastAbsenceDate = REFERENCE_TODAY;
      for (const d of datesDesc) {
        const st = state.attendanceByDate[d]?.[stu.id]?.status || 'present';
        if (st === 'absent') {
          if (consecutiveStreak === 0) lastAbsenceDate = d;
          consecutiveStreak++;
        } else {
          break;
        }
      }

      const presences = stu.prior_bimester_presences + recentP;
      const absences = stu.prior_bimester_absences + recentF;
      const justified = stu.prior_bimester_justified + recentFJ;
      const absencePercentage = Number(((absences / state.bimesterSchoolDays) * 100).toFixed(1));

      const enrolledDiffDays = Math.max(0, getDaysDiffFromToday(stu.enrolled_at));
      const isNewStudent = enrolledDiffDays <= 7;
      const newBadgeDaysRemaining = Math.max(0, 7 - enrolledDiffDays);

      studentTotals[stu.id] = {
        presences,
        absences,
        justified,
        consecutiveStreak,
        lastAbsenceDate,
        absencePercentage,
        isNewStudent,
        newBadgeDaysRemaining,
      };

      totalPresencesSum += presences + justified;
      totalClassesSum += state.bimesterSchoolDays;

      if (consecutiveStreak >= 3) {
        consecutiveAbsenceAlerts.push({
          student_id: stu.id,
          municipal_ra: stu.municipal_ra,
          student_name: stu.full_name,
          guardian_name: stu.guardian_name,
          guardian_phone: stu.guardian_phone,
          class_id: stu.class_id,
          class_name: stu.class_name,
          school_id: stu.school_id,
          school_name: stu.school_name,
          consecutive_absences: consecutiveStreak,
          last_absence_date: lastAbsenceDate,
          active_search_status:
            stu.active_search_status === 'Normal' ? 'Pendente' : stu.active_search_status,
        });
      }

      if (absencePercentage > 25) {
        chronicAbsenceAlerts.push({
          student_id: stu.id,
          municipal_ra: stu.municipal_ra,
          student_name: stu.full_name,
          class_id: stu.class_id,
          class_name: stu.class_name,
          school_id: stu.school_id,
          school_name: stu.school_name,
          current_bimester: 4,
          bimester_school_days: state.bimesterSchoolDays,
          unexcused_absences: absences,
          justified_absences: justified,
          absence_percentage: absencePercentage,
        });
      }
    }

    consecutiveAbsenceAlerts.sort((a, b) => b.consecutive_absences - a.consecutive_absences);
    chronicAbsenceAlerts.sort((a, b) => b.absence_percentage - a.absence_percentage);

    const overallPresenceRate =
      totalClassesSum > 0 ? Number(((totalPresencesSum / totalClassesSum) * 100).toFixed(1)) : 100;

    return {
      overallPresenceRate,
      consecutiveAbsenceAlerts,
      chronicAbsenceAlerts,
      studentTotals,
    };
  }, [state]);

  return (
    <SimulationContext.Provider
      value={{
        activePersona,
        setActivePersonaId,
        personas: PERSONAS,
        state,
        referenceToday: REFERENCE_TODAY,
        recentSchoolDates: RECENT_SCHOOL_DATES,
        updateAttendance,
        saveFullDayCall,
        addStudent,
        removeStudent,
        importCsvStudents,
        updateActiveSearchStatus,
        resetScenarioToDefault,
        computedStats,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
};

export function useSimulation(): SimulationContextValue {
  const ctx = useContext(SimulationContext);
  if (!ctx) {
    throw new Error('useSimulation deve ser usado dentro de SimulationProvider');
  }
  return ctx;
}
