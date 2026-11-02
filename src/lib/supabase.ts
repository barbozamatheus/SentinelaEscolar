import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sua-instancia.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'public-anon-key-placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * Faz upload de atestado médico no Supabase Storage (Bucket: medical-certificates)
 */
export async function uploadMedicalCertificate(
  schoolId: string,
  studentId: string,
  attendanceDate: string,
  file: File
): Promise<string> {
  const extension = file.name.split('.').pop() || 'pdf';
  const filePath = `${schoolId}/${studentId}/${attendanceDate}_${Date.now()}.${extension}`;

  const { error } = await supabase.storage
    .from('medical-certificates')
    .upload(filePath, file, { upsert: false });

  if (error) {
    throw new Error(`Falha no upload do atestado: ${error.message}`);
  }

  return filePath;
}
