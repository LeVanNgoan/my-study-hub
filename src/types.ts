export type SemesterStatus = 'planned' | 'current' | 'completed';
export type SubjectStatus = 'planned' | 'studying' | 'completed' | 'dropped';
export type StudyNoteStatus = 'captured' | 'reviewed' | 'mastered';
export type GradeType = 'numeric' | 'pass_fail' | 'no_grade' | 'custom';

export interface Semester {
  id: string;
  number: number | null;
  name: string;
  status: SemesterStatus;
  start_date?: string | null;
  end_date?: string | null;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  semester_id: string;
  code: string;
  name: string;
  status: SubjectStatus;
  introduction?: string | null;
  my_understanding?: string | null;
  importance: number;
  importance_reason?: string | null;
  note?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lecturer {
  id: string;
  subject_id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  contact?: string | null;
  role?: string | null;
  note?: string | null;
}

export interface Material {
  id: string;
  subject_id: string;
  title: string;
  type: string;
  description?: string | null;
  importance: number;
  storage_type: 'file' | 'link';
  stored_path?: string | null;
  external_url?: string | null;
  original_filename?: string | null;
  created_at: string;
}

export interface StudyNote {
  id: string;
  subject_id: string;
  title: string;
  week?: number | null;
  slot?: number | null;
  study_date?: string | null;
  topic?: string | null;
  raw_note: string;
  summary?: string | null;
  learned?: string | null;
  unresolved?: string | null;
  mastery: number;
  status: StudyNoteStatus;
  original_filename?: string | null;
  stored_path?: string | null;
  created_at: string;
  updated_at: string;
  subject_code?: string;
  subject_name?: string;
  semester_name?: string;
}

export interface CriticalNote {
  id: string;
  subject_id: string;
  study_note_id?: string | null;
  title: string;
  content: string;
  why_it_matters?: string | null;
  importance: number;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  subject_code?: string;
  subject_name?: string;
}

export interface Report {
  id: string;
  subject_id: string;
  title: string;
  type: string;
  status: string;
  deadline?: string | null;
  description?: string | null;
  note?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportMember {
  id: string;
  report_id: string;
  name: string;
  student_number?: string | null;
  email?: string | null;
  role?: string | null;
  contribution?: string | null;
  note?: string | null;
}

export interface ReportFile {
  id: string;
  report_id: string;
  title: string;
  original_filename?: string | null;
  stored_path?: string | null;
  created_at: string;
}

export interface GradeScheme {
  id: string;
  subject_id: string;
  type: GradeType;
  passing_score?: number | null;
  target_score?: number | null;
  note?: string | null;
}

export interface GradeComponent {
  id: string;
  grade_scheme_id: string;
  name: string;
  weight?: number | null;
  max_score: number;
  score?: number | null;
  sort_order: number;
}

export interface DashboardData {
  current_semester?: Semester | null;
  semester_count: number;
  subject_count: number;
  study_note_count: number;
  material_count: number;
  critical_note_count: number;
  current_subjects: Array<Subject & {
    study_note_count: number;
    material_count: number;
    critical_note_count: number;
  }>;
  recent_notes: StudyNote[];
  need_review: StudyNote[];
}

export interface AppInfo {
  mode: 'native' | 'browser';
  data_dir: string;
}

export interface SearchResult {
  kind: 'semester' | 'subject' | 'study_note' | 'critical_note' | 'material' | 'report';
  id: string;
  subject_id?: string | null;
  title: string;
  subtitle?: string | null;
}
