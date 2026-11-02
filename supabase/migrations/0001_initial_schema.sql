-- ============================================================================
-- SISTEMA MUNICIPAL DE CONTROLE DE FREQUÊNCIA ESCOLAR E GESTÃO DE EVASÃO
-- Banco de Dados: Supabase (PostgreSQL 15+)
-- Inclui: DDL Core, Triggers de Auditoria Imutável, Janela Retroativa de 7 Dias,
--         Views Analíticas de Evasão e Políticas completas de RLS (3 Roles).
-- ============================================================================

-- 1. EXTENSÕES E ENUMS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('teacher', 'secretary', 'municipal_manager');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'justified');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 2. TABELAS CORE DO MODELO DE DADOS
-- ============================================================================

-- 2.1 Unidades Escolares da Rede Municipal
CREATE TABLE IF NOT EXISTS public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inep_code VARCHAR(8) UNIQUE NOT NULL,
  name TEXT NOT NULL,
  district TEXT NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.2 Perfis de Usuários (Vinculados ao Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role public.user_role NOT NULL,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL, -- NULL permitido para municipal_manager
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_school_required_for_local_roles CHECK (
    (role = 'municipal_manager') OR (school_id IS NOT NULL)
  )
);

-- 2.3 Alunos (ID único municipal para rastrear transferências entre escolas)
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  municipal_ra VARCHAR(30) UNIQUE NOT NULL, -- Código único na rede municipal (acompanha transferências)
  full_name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  guardian_name TEXT,
  guardian_phone VARCHAR(20),
  current_school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.4 Turmas (Vinculadas às Unidades Escolares)
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,               -- Ex: "7º Ano A"
  grade_level VARCHAR(50) NOT NULL,        -- Ex: "Ensino Fundamental II - 7º Ano"
  shift VARCHAR(20) NOT NULL,              -- Ex: "Matutino", "Vespertino", "Integral"
  academic_year SMALLINT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  current_bimester SMALLINT NOT NULL DEFAULT 1 CHECK (current_bimester BETWEEN 1 AND 4),
  bimester_school_days SMALLINT NOT NULL DEFAULT 50 CHECK (bimester_school_days > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (school_id, name, academic_year)
);

-- 2.5 Matrículas na Turma (student <> class)
-- O campo `enrolled_at` controla o badge "Aluno Novo" durante os primeiros 7 dias na turma
CREATE TABLE IF NOT EXISTS public.class_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  transferred_from_class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  UNIQUE (student_id, class_id)
);

-- 2.6 Vínculo Professor <> Turma/Disciplina
CREATE TABLE IF NOT EXISTS public.teacher_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject VARCHAR(100) NOT NULL,           -- Ex: "Matemática", "Língua Portuguesa", "Polivalente"
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (teacher_id, class_id, subject)
);

-- 2.7 Registros de Chamada (Frequência Diária)
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  recorded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  attendance_date DATE NOT NULL,
  bimester SMALLINT NOT NULL DEFAULT 1 CHECK (bimester BETWEEN 1 AND 4),
  status public.attendance_status NOT NULL DEFAULT 'present',
  synced_from_offline BOOLEAN NOT NULL DEFAULT FALSE,
  client_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (class_id, student_id, attendance_date)
);

-- 2.8 Justificativas de Faltas (com URL do atestado no Supabase Storage)
CREATE TABLE IF NOT EXISTS public.justifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_record_id UUID NOT NULL UNIQUE REFERENCES public.attendance_records(id) ON DELETE CASCADE,
  reason_text TEXT NOT NULL,
  attachment_url TEXT,                     -- Caminho/URL do arquivo no bucket 'medical-certificates'
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.9 Trilha de Auditoria Imutável (Focada em edições pós-registro original de chamadas)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_record_id UUID NOT NULL REFERENCES public.attendance_records(id) ON DELETE RESTRICT,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  attendance_date DATE NOT NULL,
  changed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  changed_by_role public.user_role NOT NULL,
  old_status public.attendance_status NOT NULL,
  new_status public.attendance_status NOT NULL,
  change_reason TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance em consultas analíticas e RLS
CREATE INDEX IF NOT EXISTS idx_profiles_school_role ON public.profiles(school_id, role);
CREATE INDEX IF NOT EXISTS idx_students_school ON public.students(current_school_id);
CREATE INDEX IF NOT EXISTS idx_students_full_name ON public.students(full_name);
CREATE INDEX IF NOT EXISTS idx_classes_school ON public.classes(school_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class_active ON public.class_enrollments(class_id, is_active);
CREATE INDEX IF NOT EXISTS idx_teacher_classes_teacher ON public.teacher_classes(teacher_id, class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON public.attendance_records(class_id, attendance_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON public.attendance_records(student_id, attendance_date DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_school_date ON public.audit_logs(school_id, changed_at DESC);

-- ============================================================================
-- 3. FUNÇÕES AUXILIARES DE AUTENTICAÇÃO E RBAC (SECURITY DEFINER)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_school_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_teacher_of_class(p_class_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teacher_classes tc
    WHERE tc.class_id = p_class_id
      AND tc.teacher_id = auth.uid()
  );
$$;

-- ============================================================================
-- 4. REGRAS DE NEGÓCIO VIA TRIGGERS (LIMITE DE 7 DIAS + AUDITORIA IMUTÁVEL)
-- ============================================================================

-- 4.1 Validação de janela retroativa máxima de 7 dias para Professores
-- A Secretaria Escolar pode editar qualquer chamada sem limite de tempo.
CREATE OR REPLACE FUNCTION public.fn_enforce_attendance_time_window()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role;
BEGIN
  v_role := public.get_my_role();

  IF v_role = 'teacher' THEN
    IF NEW.attendance_date < (CURRENT_DATE - INTERVAL '7 days') THEN
      RAISE EXCEPTION 'Operação bloqueada: Professores só podem lançar ou editar chamadas retroativamente em até 7 dias corridos. Solicite a alteração à Secretaria Escolar.';
    END IF;
    IF NEW.attendance_date > CURRENT_DATE THEN
      RAISE EXCEPTION 'Operação bloqueada: Não é permitido registrar chamada em data futura.';
    END IF;
  END IF;

  NEW.updated_at := NOW();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_attendance_time_window ON public.attendance_records;
CREATE TRIGGER trg_enforce_attendance_time_window
BEFORE INSERT OR UPDATE ON public.attendance_records
FOR EACH ROW
EXECUTE FUNCTION public.fn_enforce_attendance_time_window();

-- 4.2 Gravação Automática e Imutável no Audit Log quando uma chamada é editada
CREATE OR REPLACE FUNCTION public.fn_audit_attendance_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school_id UUID;
  v_role public.user_role;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT c.school_id INTO v_school_id
    FROM public.classes c
    WHERE c.id = NEW.class_id;

    v_role := COALESCE(public.get_my_role(), 'teacher');

    INSERT INTO public.audit_logs (
      attendance_record_id,
      school_id,
      class_id,
      student_id,
      attendance_date,
      changed_by,
      changed_by_role,
      old_status,
      new_status,
      changed_at
    ) VALUES (
      NEW.id,
      v_school_id,
      NEW.class_id,
      NEW.student_id,
      NEW.attendance_date,
       COALESCE(auth.uid(), NEW.updated_by, NEW.recorded_by),
      v_role,
      OLD.status,
      NEW.status,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_attendance_update ON public.attendance_records;
CREATE TRIGGER trg_audit_attendance_update
AFTER UPDATE ON public.attendance_records
FOR EACH ROW
EXECUTE FUNCTION public.fn_audit_attendance_update();

-- Bloqueia qualquer tentativa de UPDATE ou DELETE na tabela audit_logs (Imutabilidade)
CREATE OR REPLACE FUNCTION public.fn_prevent_audit_log_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs é uma tabela imutável (append-only). Alterações ou exclusões são estritamente proibidas.';
END;
$$;

DROP TRIGGER IF EXISTS trg_immutable_audit_logs ON public.audit_logs;
CREATE TRIGGER trg_immutable_audit_logs
BEFORE UPDATE OR DELETE ON public.audit_logs
FOR EACH ROW
EXECUTE FUNCTION public.fn_prevent_audit_log_tampering();

-- ============================================================================
-- 5. VIEWS PARA CHAMADA (BADGE 7 DIAS) E ALERTAS DO GESTOR MUNICIPAL
-- ============================================================================

-- 5.1 View de Alunos Enturmados com cálculo automático de "Aluno Novo (<= 7 dias)"
CREATE OR REPLACE VIEW public.vw_class_roster AS
SELECT
  ce.id AS enrollment_id,
  ce.class_id,
  c.school_id,
  s.id AS student_id,
  s.municipal_ra,
  s.full_name AS student_name,
  ce.enrolled_at,
  (ce.enrolled_at >= (NOW() - INTERVAL '7 days')) AS is_new_student,
  GREATEST(0, 7 - EXTRACT(DAY FROM (NOW() - ce.enrolled_at))::INT) AS new_badge_days_remaining
FROM public.class_enrollments ce
JOIN public.students s ON s.id = ce.student_id
JOIN public.classes c ON c.id = ce.class_id
WHERE ce.is_active = TRUE
ORDER BY s.full_name ASC;

-- 5.2 View Alerta 1: Alunos com 3 ou mais faltas consecutivas nos últimos registros
CREATE OR REPLACE VIEW public.vw_alert_consecutive_absences AS
WITH ordered_attendance AS (
  SELECT
    ar.student_id,
    ar.class_id,
    ar.attendance_date,
    ar.status,
    ROW_NUMBER() OVER (PARTITION BY ar.student_id, ar.class_id ORDER BY ar.attendance_date DESC) AS rn_desc
  FROM public.attendance_records ar
),
recent_streak AS (
  SELECT
    student_id,
    class_id,
    COUNT(*) FILTER (WHERE status = 'absent') AS consecutive_absences,
    MAX(attendance_date) AS last_absence_date
  FROM ordered_attendance
  WHERE rn_desc <= 5
    AND NOT EXISTS (
      SELECT 1 FROM ordered_attendance oa2
      WHERE oa2.student_id = ordered_attendance.student_id
        AND oa2.class_id = ordered_attendance.class_id
        AND oa2.rn_desc < ordered_attendance.rn_desc
        AND oa2.status <> 'absent'
    )
  GROUP BY student_id, class_id
)
SELECT
  rs.student_id,
  s.municipal_ra,
  s.full_name AS student_name,
  s.guardian_phone,
  c.id AS class_id,
  c.name AS class_name,
  sc.id AS school_id,
  sc.name AS school_name,
  rs.consecutive_absences,
  rs.last_absence_date
FROM recent_streak rs
JOIN public.students s ON s.id = rs.student_id
JOIN public.classes c ON c.id = rs.class_id
JOIN public.schools sc ON sc.id = c.school_id
WHERE rs.consecutive_absences >= 3;

-- 5.3 View Alerta 2: Alunos com mais de 25% de faltas no Bimestre atual
CREATE OR REPLACE VIEW public.vw_alert_bimester_chronic_absence AS
SELECT
  s.id AS student_id,
  s.municipal_ra,
  s.full_name AS student_name,
  c.id AS class_id,
  c.name AS class_name,
  sc.id AS school_id,
  sc.name AS school_name,
  c.current_bimester,
  c.bimester_school_days,
  COUNT(*) FILTER (WHERE ar.status = 'absent') AS unexcused_absences,
  COUNT(*) FILTER (WHERE ar.status = 'justified') AS justified_absences,
  ROUND(
    (COUNT(*) FILTER (WHERE ar.status = 'absent')::NUMERIC / NULLIF(c.bimester_school_days, 0)) * 100,
    1
  ) AS absence_percentage
FROM public.attendance_records ar
JOIN public.students s ON s.id = ar.student_id
JOIN public.classes c ON c.id = ar.class_id AND ar.bimester = c.current_bimester
JOIN public.schools sc ON sc.id = c.school_id
GROUP BY s.id, s.municipal_ra, s.full_name, c.id, c.name, sc.id, sc.name, c.current_bimester, c.bimester_school_days
HAVING (COUNT(*) FILTER (WHERE ar.status = 'absent')::NUMERIC / NULLIF(c.bimester_school_days, 0)) > 0.25;

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS) CONTEMPLANDO AS 3 ROLES
-- ============================================================================

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.justifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 6.1 SCHOOLS
-- Gestor: visualiza todas as escolas da rede.
-- Secretaria e Professor: visualizam apenas a sua unidade escolar.
-- ----------------------------------------------------------------------------
CREATE POLICY "schools_select_policy" ON public.schools
FOR SELECT TO authenticated
USING (
  public.get_my_role() = 'municipal_manager'
  OR id = public.get_my_school_id()
);

-- ----------------------------------------------------------------------------
-- 6.2 PROFILES
-- Gestor: leitura global.
-- Secretaria: lê perfis da sua escola (para vincular professores).
-- Usuário comum: lê o próprio perfil.
-- ----------------------------------------------------------------------------
CREATE POLICY "profiles_select_policy" ON public.profiles
FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR public.get_my_role() = 'municipal_manager'
  OR (public.get_my_role() = 'secretary' AND school_id = public.get_my_school_id())
);

-- ----------------------------------------------------------------------------
-- 6.3 CLASSES (Turmas)
-- Gestor: leitura global.
-- Secretaria: CRUD completo nas turmas da sua escola.
-- Professor: visualiza apenas as turmas às quais está vinculado.
-- ----------------------------------------------------------------------------
CREATE POLICY "classes_select_policy" ON public.classes
FOR SELECT TO authenticated
USING (
  public.get_my_role() = 'municipal_manager'
  OR (public.get_my_role() = 'secretary' AND school_id = public.get_my_school_id())
  OR (public.get_my_role() = 'teacher' AND public.is_teacher_of_class(id))
);

CREATE POLICY "classes_secretary_manage_policy" ON public.classes
FOR ALL TO authenticated
USING (
  public.get_my_role() = 'secretary' AND school_id = public.get_my_school_id()
)
WITH CHECK (
  public.get_my_role() = 'secretary' AND school_id = public.get_my_school_id()
);

-- ----------------------------------------------------------------------------
-- 6.4 STUDENTS (Alunos)
-- Gestor: leitura global de toda a rede.
-- Secretaria: CRUD manual e via importação CSV apenas na sua escola.
-- Professor: visualiza apenas os alunos matriculados nas suas turmas.
-- ----------------------------------------------------------------------------
CREATE POLICY "students_select_policy" ON public.students
FOR SELECT TO authenticated
USING (
  public.get_my_role() = 'municipal_manager'
  OR (public.get_my_role() = 'secretary' AND current_school_id = public.get_my_school_id())
  OR (
    public.get_my_role() = 'teacher'
    AND EXISTS (
      SELECT 1
      FROM public.class_enrollments ce
      JOIN public.teacher_classes tc ON tc.class_id = ce.class_id
      WHERE ce.student_id = public.students.id
        AND tc.teacher_id = auth.uid()
    )
  )
);

CREATE POLICY "students_secretary_insert_policy" ON public.students
FOR INSERT TO authenticated
WITH CHECK (
  public.get_my_role() = 'secretary'
  AND current_school_id = public.get_my_school_id()
);

CREATE POLICY "students_secretary_update_policy" ON public.students
FOR UPDATE TO authenticated
USING (
  public.get_my_role() = 'secretary'
  AND current_school_id = public.get_my_school_id()
)
WITH CHECK (
  public.get_my_role() = 'secretary'
  AND current_school_id = public.get_my_school_id()
);

CREATE POLICY "students_secretary_delete_policy" ON public.students
FOR DELETE TO authenticated
USING (
  public.get_my_role() = 'secretary'
  AND current_school_id = public.get_my_school_id()
);

-- ----------------------------------------------------------------------------
-- 6.5 CLASS_ENROLLMENTS (Enturmação)
-- Gestor: leitura global.
-- Secretaria: CRUD nas turmas da sua escola.
-- Professor: leitura das matrículas das suas turmas.
-- ----------------------------------------------------------------------------
CREATE POLICY "enrollments_select_policy" ON public.class_enrollments
FOR SELECT TO authenticated
USING (
  public.get_my_role() = 'municipal_manager'
  OR (
    public.get_my_role() = 'secretary'
    AND EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_id AND c.school_id = public.get_my_school_id()
    )
  )
  OR (
    public.get_my_role() = 'teacher'
    AND public.is_teacher_of_class(class_id)
  )
);

CREATE POLICY "enrollments_secretary_manage_policy" ON public.class_enrollments
FOR ALL TO authenticated
USING (
  public.get_my_role() = 'secretary'
  AND EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = class_id AND c.school_id = public.get_my_school_id()
  )
)
WITH CHECK (
  public.get_my_role() = 'secretary'
  AND EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = class_id AND c.school_id = public.get_my_school_id()
  )
);

-- ----------------------------------------------------------------------------
-- 6.6 TEACHER_CLASSES (Alocação de Professores)
-- Gestor: leitura global.
-- Secretaria: gerencia vínculos de professores nas turmas da sua escola.
-- Professor: visualiza seus próprios vínculos.
-- ----------------------------------------------------------------------------
CREATE POLICY "teacher_classes_select_policy" ON public.teacher_classes
FOR SELECT TO authenticated
USING (
  public.get_my_role() = 'municipal_manager'
  OR teacher_id = auth.uid()
  OR (
    public.get_my_role() = 'secretary'
    AND EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_id AND c.school_id = public.get_my_school_id()
    )
  )
);

CREATE POLICY "teacher_classes_secretary_manage_policy" ON public.teacher_classes
FOR ALL TO authenticated
USING (
  public.get_my_role() = 'secretary'
  AND EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = class_id AND c.school_id = public.get_my_school_id()
  )
)
WITH CHECK (
  public.get_my_role() = 'secretary'
  AND EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = class_id AND c.school_id = public.get_my_school_id()
  )
);

-- ----------------------------------------------------------------------------
-- 6.7 ATTENDANCE_RECORDS (Registros de Chamada)
-- Gestor: apenas leitura global (relatórios/dashboard).
-- Professor: leitura das suas turmas; INSERT e UPDATE limitados a 7 dias retroativos.
-- Secretaria: leitura, INSERT e UPDATE em qualquer chamada da sua escola SEM limite de tempo.
-- ----------------------------------------------------------------------------
CREATE POLICY "attendance_select_policy" ON public.attendance_records
FOR SELECT TO authenticated
USING (
  public.get_my_role() = 'municipal_manager'
  OR (
    public.get_my_role() = 'secretary'
    AND EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_id AND c.school_id = public.get_my_school_id()
    )
  )
  OR (
    public.get_my_role() = 'teacher'
    AND public.is_teacher_of_class(class_id)
  )
);

-- Professor: lança chamada nas suas turmas dentro da janela de 7 dias
CREATE POLICY "attendance_teacher_insert_policy" ON public.attendance_records
FOR INSERT TO authenticated
WITH CHECK (
  public.get_my_role() = 'teacher'
  AND public.is_teacher_of_class(class_id)
  AND attendance_date >= (CURRENT_DATE - INTERVAL '7 days')
  AND attendance_date <= CURRENT_DATE
);

-- Professor: edita chamada retroativamente até 7 dias
CREATE POLICY "attendance_teacher_update_policy" ON public.attendance_records
FOR UPDATE TO authenticated
USING (
  public.get_my_role() = 'teacher'
  AND public.is_teacher_of_class(class_id)
  AND attendance_date >= (CURRENT_DATE - INTERVAL '7 days')
)
WITH CHECK (
  public.get_my_role() = 'teacher'
  AND public.is_teacher_of_class(class_id)
  AND attendance_date >= (CURRENT_DATE - INTERVAL '7 days')
  AND attendance_date <= CURRENT_DATE
);

-- Secretaria: insere ou edita qualquer chamada da sua escola sem limite de tempo
CREATE POLICY "attendance_secretary_insert_policy" ON public.attendance_records
FOR INSERT TO authenticated
WITH CHECK (
  public.get_my_role() = 'secretary'
  AND EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = class_id AND c.school_id = public.get_my_school_id()
  )
);

CREATE POLICY "attendance_secretary_update_policy" ON public.attendance_records
FOR UPDATE TO authenticated
USING (
  public.get_my_role() = 'secretary'
  AND EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = class_id AND c.school_id = public.get_my_school_id()
  )
)
WITH CHECK (
  public.get_my_role() = 'secretary'
  AND EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = class_id AND c.school_id = public.get_my_school_id()
  )
);

-- ----------------------------------------------------------------------------
-- 6.8 JUSTIFICATIONS (Faltas Justificadas + Atestados)
-- ----------------------------------------------------------------------------
CREATE POLICY "justifications_select_policy" ON public.justifications
FOR SELECT TO authenticated
USING (
  public.get_my_role() = 'municipal_manager'
  OR EXISTS (
    SELECT 1
    FROM public.attendance_records ar
    JOIN public.classes c ON c.id = ar.class_id
    WHERE ar.id = attendance_record_id
      AND (
        (public.get_my_role() = 'secretary' AND c.school_id = public.get_my_school_id())
        OR (public.get_my_role() = 'teacher' AND public.is_teacher_of_class(c.id))
      )
  )
);

CREATE POLICY "justifications_insert_policy" ON public.justifications
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.attendance_records ar
    JOIN public.classes c ON c.id = ar.class_id
    WHERE ar.id = attendance_record_id
      AND (
        (public.get_my_role() = 'secretary' AND c.school_id = public.get_my_school_id())
        OR (
          public.get_my_role() = 'teacher'
          AND public.is_teacher_of_class(c.id)
          AND ar.attendance_date >= (CURRENT_DATE - INTERVAL '7 days')
        )
      )
  )
);

-- ----------------------------------------------------------------------------
-- 6.9 AUDIT_LOGS (Trilha de Auditoria Imutável)
-- Secretaria visualiza logs da sua unidade escolar; Gestor visualiza toda a rede.
-- Nenhuma policy de UPDATE ou DELETE existe (além do bloqueio via Trigger).
-- ----------------------------------------------------------------------------
CREATE POLICY "audit_logs_select_policy" ON public.audit_logs
FOR SELECT TO authenticated
USING (
  public.get_my_role() = 'municipal_manager'
  OR (
    public.get_my_role() = 'secretary'
    AND school_id = public.get_my_school_id()
  )
);

-- ============================================================================
-- 7. SUPABASE STORAGE BUCKET PARA ATESTADOS MÉDICOS
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'medical-certificates',
  'medical-certificates',
   FALSE,
  5242880, -- 5MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "storage_medical_certs_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'medical-certificates'
  AND public.get_my_role() IN ('teacher', 'secretary')
);

CREATE POLICY "storage_medical_certs_select" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'medical-certificates'
  AND public.get_my_role() IN ('teacher', 'secretary', 'municipal_manager')
);
