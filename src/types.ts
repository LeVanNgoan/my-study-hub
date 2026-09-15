export type SemesterStatus = 'planned' | 'current' | 'completed';
export type SubjectStatus = 'planned' | 'studying' | 'completed' | 'dropped';
export type StudyNoteStatus = 'captured' | 'reviewed' | 'mastered';
export type GradeType = 'numeric' | 'pass_fail' | 'no_grade' | 'custom';
export type StudyProjectStatus = 'idea' | 'active' | 'paused' | 'completed';
export type ProjectStageStatus = 'planned' | 'in_progress' | 'completed';
export type ProjectResourceStatus = 'saved' | 'reading' | 'completed';
export type ProjectExperimentStatus = 'planned' | 'running' | 'completed';

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


export interface StudyProject {
  id: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  why_learning?: string | null;
  status: StudyProjectStatus;
  importance: number;
  start_date?: string | null;
  target_date?: string | null;
  created_at: string;
  updated_at: string;
  stage_count?: number;
  completed_stage_count?: number;
  note_count?: number;
  resource_count?: number;
  experiment_count?: number;
  knowledge_count?: number;
}

export interface ProjectStage {
  id: string;
  project_id: string;
  title: string;
  description?: string | null;
  status: ProjectStageStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectNote {
  id: string;
  project_id: string;
  stage_id?: string | null;
  title: string;
  study_date?: string | null;
  topic?: string | null;
  raw_note: string;
  summary?: string | null;
  learned?: string | null;
  unresolved?: string | null;
  mastery: number;
  status: StudyNoteStatus;
  created_at: string;
  updated_at: string;
  project_title?: string;
  stage_title?: string | null;
}

export interface ProjectResource {
  id: string;
  project_id: string;
  stage_id?: string | null;
  title: string;
  type: string;
  description?: string | null;
  importance: number;
  status: ProjectResourceStatus;
  storage_type: 'file' | 'link';
  stored_path?: string | null;
  external_url?: string | null;
  original_filename?: string | null;
  created_at: string;
}

export interface ProjectExperiment {
  id: string;
  project_id: string;
  stage_id?: string | null;
  title: string;
  question?: string | null;
  setup?: string | null;
  result?: string | null;
  conclusion?: string | null;
  code_reference?: string | null;
  status: ProjectExperimentStatus;
  created_at: string;
  updated_at: string;
}

export interface ProjectKnowledge {
  id: string;
  project_id: string;
  project_note_id?: string | null;
  title: string;
  content: string;
  why_it_matters?: string | null;
  importance: number;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  project_title?: string;
}

export interface DashboardData {
  current_semester?: Semester | null;
  semester_count: number;
  subject_count: number;
  study_note_count: number;
  material_count: number;
  critical_note_count: number;
  project_count: number;
  active_projects: StudyProject[];
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
  kind: 'semester' | 'subject' | 'study_note' | 'critical_note' | 'material' | 'report' | 'study_project' | 'project_note' | 'project_knowledge' | 'project_resource' | 'project_experiment';
  id: string;
  subject_id?: string | null;
  project_id?: string | null;
  title: string;
  subtitle?: string | null;
}
