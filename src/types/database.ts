export type UserRole = 'teacher' | 'secretary' | 'municipal_manager';

export type AttendanceStatus = 'present' | 'absent' | 'justified';

export interface School {
  id: string;
  inep_code: string;
  name: string;
  district: string;
  total_students: number;
  attendance_rate: number;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  school_id: string | null;
}

export interface StudentRosterItem {
  student_id: string;
  municipal_ra: string;
  student_name: string;
  class_id: string;
  enrolled_at: string;
  is_new_student: boolean;
  new_badge_days_remaining: number;
  status: AttendanceStatus;
  justification_text?: string;
  attachment_url?: string;
  bimester_absences: number;
  bimester_presences: number;
}

export interface ClassRankingItem {
  id: string;
  class_name: string;
  grade_level: string;
  shift: 'Matutino' | 'Vespertino' | 'Integral';
  school_id: string;
  school_name: string;
  total_students: number;
  absence_rate: number;
  presence_rate: number;
  trend: 'up' | 'down' | 'stable';
}

export interface ConsecutiveAbsenceAlert {
  student_id: string;
  municipal_ra: string;
  student_name: string;
  guardian_name: string;
  guardian_phone: string;
  class_id: string;
  class_name: string;
  school_id: string;
  school_name: string;
  consecutive_absences: number;
  last_absence_date: string;
  active_search_status: 'Pendente' | 'Secretaria Notificada' | 'Conselho Tutelar';
}

export interface ChronicAbsenceAlert {
  student_id: string;
  municipal_ra: string;
  student_name: string;
  class_id: string;
  class_name: string;
  school_id: string;
  school_name: string;
  current_bimester: number;
  bimester_school_days: number;
  unexcused_absences: number;
  justified_absences: number;
  absence_percentage: number;
}

export interface AuditLogEntry {
  id: string;
  attendance_record_id: string;
  school_id: string;
  school_name: string;
  class_name: string;
  student_name: string;
  municipal_ra: string;
  attendance_date: string;
  changed_by_name: string;
  changed_by_role: UserRole;
  old_status: AttendanceStatus;
  new_status: AttendanceStatus;
  change_reason: string;
  changed_at: string;
}

export interface OfflineAttendancePayload {
  id: string;
  class_id: string;
  student_id: string;
  attendance_date: string;
  bimester: number;
  status: AttendanceStatus;
  justification_text?: string;
  client_updated_at: string;
}
