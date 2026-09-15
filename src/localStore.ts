import type {
  AppInfo,
  CriticalNote,
  DashboardData,
  GradeComponent,
  GradeScheme,
  Lecturer,
  Material,
  Report,
  ReportFile,
  ReportMember,
  ProjectExperiment,
  ProjectKnowledge,
  ProjectNote,
  ProjectResource,
  ProjectStage,
  SearchResult,
  Semester,
  StudyNote,
  StudyProject,
  Subject,
} from './types';

type LocalDb = {
  semesters: Semester[];
  subjects: Subject[];
  lecturers: Lecturer[];
  materials: Material[];
  study_notes: StudyNote[];
  critical_notes: CriticalNote[];
  reports: Report[];
  report_members: ReportMember[];
  report_files: ReportFile[];
  grade_schemes: GradeScheme[];
  grade_components: GradeComponent[];
  study_projects: StudyProject[];
  project_stages: ProjectStage[];
  project_notes: ProjectNote[];
  project_resources: ProjectResource[];
  project_experiments: ProjectExperiment[];
  project_knowledge: ProjectKnowledge[];
};

const KEY = 'my-study-hub-local-v2';

const emptyDb = (): LocalDb => ({
  semesters: [],
  subjects: [],
  lecturers: [],
  materials: [],
  study_notes: [],
  critical_notes: [],
  reports: [],
  report_members: [],
  report_files: [],
  grade_schemes: [],
  grade_components: [],
  study_projects: [],
  project_stages: [],
  project_notes: [],
  project_resources: [],
  project_experiments: [],
  project_knowledge: [],
});

function load(): LocalDb {
  const raw = localStorage.getItem(KEY);
  if (!raw) return emptyDb();
  try {
    return { ...emptyDb(), ...JSON.parse(raw) };
  } catch {
    return emptyDb();
  }
}

function save(db: LocalDb) {
  localStorage.setItem(KEY, JSON.stringify(db));
}

function id() {
  return crypto.randomUUID();
}

function now() {
  return new Date().toISOString();
}

function sortByCreated<T extends { created_at?: string }>(items: T[]) {
  return [...items].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
}

export async function localCommand<T>(command: string, args: Record<string, any> = {}): Promise<T> {
  const db = load();

  switch (command) {
    case 'app_info':
      return { mode: 'browser', data_dir: 'Browser localStorage (preview mode)' } as T;

    case 'open_local_file':
    case 'open_data_folder':
      return false as T;

    case 'list_semesters':
      return [...db.semesters].sort((a, b) => {
        if (a.status === 'current' && b.status !== 'current') return -1;
        if (b.status === 'current' && a.status !== 'current') return 1;
        return (b.start_date || b.created_at).localeCompare(a.start_date || a.created_at);
      }) as T;

    case 'create_semester': {
      const input = args.input;
      if (input.status === 'current') db.semesters.forEach(s => { if (s.status === 'current') s.status = 'completed'; });
      const item: Semester = {
        id: id(),
        number: input.number ?? null,
        name: input.name.trim(),
        status: input.status || 'planned',
        start_date: input.start_date || null,
        end_date: input.end_date || null,
        description: input.description || null,
        created_at: now(),
        updated_at: now(),
      };
      db.semesters.push(item); save(db); return item as T;
    }

    case 'update_semester': {
      const input = args.input;
      const item = db.semesters.find(x => x.id === input.id);
      if (!item) throw new Error('Semester not found');
      if (input.status === 'current') db.semesters.forEach(s => { if (s.id !== item.id && s.status === 'current') s.status = 'completed'; });
      Object.assign(item, input, { updated_at: now() }); save(db); return item as T;
    }

    case 'delete_semester': {
      const semesterId = args.id;
      const subjectIds = db.subjects.filter(s => s.semester_id === semesterId).map(s => s.id);
      db.semesters = db.semesters.filter(s => s.id !== semesterId);
      db.subjects = db.subjects.filter(s => s.semester_id !== semesterId);
      db.lecturers = db.lecturers.filter(x => !subjectIds.includes(x.subject_id));
      db.materials = db.materials.filter(x => !subjectIds.includes(x.subject_id));
      db.study_notes = db.study_notes.filter(x => !subjectIds.includes(x.subject_id));
      db.critical_notes = db.critical_notes.filter(x => !subjectIds.includes(x.subject_id));
      const reportIds = db.reports.filter(x => subjectIds.includes(x.subject_id)).map(x => x.id);
      db.reports = db.reports.filter(x => !subjectIds.includes(x.subject_id));
      db.report_members = db.report_members.filter(x => !reportIds.includes(x.report_id));
      db.report_files = db.report_files.filter(x => !reportIds.includes(x.report_id));
      const schemeIds = db.grade_schemes.filter(x => subjectIds.includes(x.subject_id)).map(x => x.id);
      db.grade_schemes = db.grade_schemes.filter(x => !subjectIds.includes(x.subject_id));
      db.grade_components = db.grade_components.filter(x => !schemeIds.includes(x.grade_scheme_id));
      save(db); return true as T;
    }

    case 'list_subjects': {
      const semesterId = args.semesterId ?? args.semester_id ?? null;
      const items = semesterId ? db.subjects.filter(x => x.semester_id === semesterId) : db.subjects;
      return [...items].sort((a,b) => a.code.localeCompare(b.code)) as T;
    }

    case 'get_subject': {
      const item = db.subjects.find(x => x.id === args.id);
      if (!item) throw new Error('Subject not found');
      return item as T;
    }

    case 'create_subject': {
      const input = args.input;
      const item: Subject = {
        id: id(), semester_id: input.semester_id, code: input.code.trim(), name: input.name.trim(),
        status: input.status || 'planned', introduction: input.introduction || null,
        my_understanding: input.my_understanding || null, importance: input.importance ?? 3,
        importance_reason: input.importance_reason || null, note: input.note || null,
        created_at: now(), updated_at: now(),
      };
      db.subjects.push(item); save(db); return item as T;
    }

    case 'update_subject': {
      const input = args.input;
      const item = db.subjects.find(x => x.id === input.id);
      if (!item) throw new Error('Subject not found');
      Object.assign(item, input, { updated_at: now() }); save(db); return item as T;
    }

    case 'delete_subject': {
      const subjectId = args.id;
      db.subjects = db.subjects.filter(x => x.id !== subjectId);
      db.lecturers = db.lecturers.filter(x => x.subject_id !== subjectId);
      db.materials = db.materials.filter(x => x.subject_id !== subjectId);
      db.study_notes = db.study_notes.filter(x => x.subject_id !== subjectId);
      db.critical_notes = db.critical_notes.filter(x => x.subject_id !== subjectId);
      const reportIds = db.reports.filter(x => x.subject_id === subjectId).map(x => x.id);
      db.reports = db.reports.filter(x => x.subject_id !== subjectId);
      db.report_members = db.report_members.filter(x => !reportIds.includes(x.report_id));
      db.report_files = db.report_files.filter(x => !reportIds.includes(x.report_id));
      const schemeIds = db.grade_schemes.filter(x => x.subject_id === subjectId).map(x => x.id);
      db.grade_schemes = db.grade_schemes.filter(x => x.subject_id !== subjectId);
      db.grade_components = db.grade_components.filter(x => !schemeIds.includes(x.grade_scheme_id));
      save(db); return true as T;
    }

    case 'list_lecturers':
      return db.lecturers.filter(x => x.subject_id === args.subjectId) as T;

    case 'add_lecturer': {
      const item: Lecturer = { id: id(), ...args.input };
      db.lecturers.push(item); save(db); return item as T;
    }

    case 'delete_lecturer':
      db.lecturers = db.lecturers.filter(x => x.id !== args.id); save(db); return true as T;

    case 'list_materials':
      return sortByCreated(db.materials.filter(x => x.subject_id === args.subjectId)) as T;

    case 'add_material': {
      const input = args.input;
      const item: Material = {
        id: id(), subject_id: input.subject_id, title: input.title, type: input.type || 'Other',
        description: input.description || null, importance: input.importance ?? 3,
        storage_type: input.storage_type, external_url: input.external_url || null,
        original_filename: input.original_filename || null,
        stored_path: input.original_filename ? `[browser:${input.original_filename}]` : null,
        created_at: now(),
      };
      db.materials.push(item); save(db); return item as T;
    }

    case 'delete_material':
      db.materials = db.materials.filter(x => x.id !== args.id); save(db); return true as T;

    case 'list_study_notes': {
      const subjectId = args.subjectId ?? null;
      let items = subjectId ? db.study_notes.filter(x => x.subject_id === subjectId) : db.study_notes;
      const enriched = items.map(n => {
        const s = db.subjects.find(x => x.id === n.subject_id);
        const sem = s ? db.semesters.find(x => x.id === s.semester_id) : undefined;
        return { ...n, subject_code: s?.code, subject_name: s?.name, semester_name: sem?.name };
      });
      return sortByCreated(enriched) as T;
    }

    case 'add_study_note': {
      const input = args.input;
      const item: StudyNote = {
        id: id(), subject_id: input.subject_id, title: input.title,
        week: input.week ?? null, slot: input.slot ?? null, study_date: input.study_date || null,
        topic: input.topic || null, raw_note: input.raw_note || '', summary: input.summary || null,
        learned: input.learned || null, unresolved: input.unresolved || null,
        mastery: input.mastery ?? 1, status: input.status || 'captured',
        original_filename: input.original_filename || null,
        stored_path: input.original_filename ? `[browser:${input.original_filename}]` : null,
        created_at: now(), updated_at: now(),
      };
      db.study_notes.push(item); save(db); return item as T;
    }

    case 'update_study_note': {
      const input = args.input;
      const item = db.study_notes.find(x => x.id === input.id);
      if (!item) throw new Error('Study note not found');
      Object.assign(item, input, { updated_at: now() }); save(db); return item as T;
    }

    case 'delete_study_note':
      db.study_notes = db.study_notes.filter(x => x.id !== args.id); save(db); return true as T;

    case 'list_critical_notes': {
      const subjectId = args.subjectId ?? null;
      const items = (subjectId ? db.critical_notes.filter(x => x.subject_id === subjectId) : db.critical_notes)
        .map(n => {
          const s = db.subjects.find(x => x.id === n.subject_id);
          return { ...n, subject_code: s?.code, subject_name: s?.name };
        });
      return [...items].sort((a,b) => Number(b.is_pinned)-Number(a.is_pinned) || b.importance-a.importance || b.created_at.localeCompare(a.created_at)) as T;
    }

    case 'add_critical_note': {
      const input = args.input;
      const item: CriticalNote = {
        id: id(), subject_id: input.subject_id, study_note_id: input.study_note_id || null,
        title: input.title, content: input.content, why_it_matters: input.why_it_matters || null,
        importance: input.importance ?? 3, is_pinned: !!input.is_pinned,
        created_at: now(), updated_at: now(),
      };
      db.critical_notes.push(item); save(db); return item as T;
    }

    case 'delete_critical_note':
      db.critical_notes = db.critical_notes.filter(x => x.id !== args.id); save(db); return true as T;

    case 'list_reports':
      return sortByCreated(db.reports.filter(x => x.subject_id === args.subjectId)) as T;

    case 'add_report': {
      const input = args.input;
      const item: Report = {
        id: id(), subject_id: input.subject_id, title: input.title, type: input.type || 'Report',
        status: input.status || 'planning', deadline: input.deadline || null,
        description: input.description || null, note: input.note || null,
        created_at: now(), updated_at: now(),
      };
      db.reports.push(item); save(db); return item as T;
    }

    case 'delete_report': {
      const reportId = args.id;
      db.reports = db.reports.filter(x => x.id !== reportId);
      db.report_members = db.report_members.filter(x => x.report_id !== reportId);
      db.report_files = db.report_files.filter(x => x.report_id !== reportId);
      save(db); return true as T;
    }

    case 'list_report_members':
      return db.report_members.filter(x => x.report_id === args.reportId) as T;

    case 'add_report_member': {
      const item: ReportMember = { id: id(), ...args.input };
      db.report_members.push(item); save(db); return item as T;
    }

    case 'delete_report_member':
      db.report_members = db.report_members.filter(x => x.id !== args.id); save(db); return true as T;

    case 'list_report_files':
      return sortByCreated(db.report_files.filter(x => x.report_id === args.reportId)) as T;

    case 'add_report_file': {
      const input = args.input;
      const item: ReportFile = {
        id: id(), report_id: input.report_id, title: input.title || input.original_filename || 'File',
        original_filename: input.original_filename || null,
        stored_path: input.original_filename ? `[browser:${input.original_filename}]` : null,
        created_at: now(),
      };
      db.report_files.push(item); save(db); return item as T;
    }

    case 'delete_report_file':
      db.report_files = db.report_files.filter(x => x.id !== args.id); save(db); return true as T;

    case 'get_grade_scheme': {
      const scheme = db.grade_schemes.find(x => x.subject_id === args.subjectId) || null;
      if (!scheme) return { scheme: null, components: [] } as T;
      return { scheme, components: db.grade_components.filter(x => x.grade_scheme_id === scheme.id).sort((a,b) => a.sort_order-b.sort_order) } as T;
    }

    case 'save_grade_scheme': {
      const input = args.input;
      let scheme = db.grade_schemes.find(x => x.subject_id === input.subject_id);
      if (!scheme) {
        scheme = { id: id(), subject_id: input.subject_id, type: input.type, passing_score: input.passing_score ?? null, target_score: input.target_score ?? null, note: input.note || null };
        db.grade_schemes.push(scheme);
      } else Object.assign(scheme, input);
      save(db); return scheme as T;
    }

    case 'add_grade_component': {
      const input = args.input;
      const item: GradeComponent = {
        id: id(), grade_scheme_id: input.grade_scheme_id, name: input.name,
        weight: input.weight ?? null, max_score: input.max_score ?? 10,
        score: input.score ?? null, sort_order: input.sort_order ?? db.grade_components.length,
      };
      db.grade_components.push(item); save(db); return item as T;
    }

    case 'update_grade_component': {
      const input = args.input;
      const item = db.grade_components.find(x => x.id === input.id);
      if (!item) throw new Error('Grade component not found');
      Object.assign(item, input); save(db); return item as T;
    }

    case 'delete_grade_component':
      db.grade_components = db.grade_components.filter(x => x.id !== args.id); save(db); return true as T;

    case 'list_study_projects': {
      const items = db.study_projects.map(project => ({
        ...project,
        stage_count: db.project_stages.filter(x => x.project_id === project.id).length,
        completed_stage_count: db.project_stages.filter(x => x.project_id === project.id && x.status === 'completed').length,
        note_count: db.project_notes.filter(x => x.project_id === project.id).length,
        resource_count: db.project_resources.filter(x => x.project_id === project.id).length,
        experiment_count: db.project_experiments.filter(x => x.project_id === project.id).length,
        knowledge_count: db.project_knowledge.filter(x => x.project_id === project.id).length,
      }));
      return [...items].sort((a,b) => {
        const order: Record<string, number> = { active: 0, idea: 1, paused: 2, completed: 3 };
        return (order[a.status] ?? 9) - (order[b.status] ?? 9) || b.updated_at.localeCompare(a.updated_at);
      }) as T;
    }

    case 'get_study_project': {
      const project = db.study_projects.find(x => x.id === args.id);
      if (!project) throw new Error('Study project not found');
      return {
        ...project,
        stage_count: db.project_stages.filter(x => x.project_id === project.id).length,
        completed_stage_count: db.project_stages.filter(x => x.project_id === project.id && x.status === 'completed').length,
        note_count: db.project_notes.filter(x => x.project_id === project.id).length,
        resource_count: db.project_resources.filter(x => x.project_id === project.id).length,
        experiment_count: db.project_experiments.filter(x => x.project_id === project.id).length,
        knowledge_count: db.project_knowledge.filter(x => x.project_id === project.id).length,
      } as T;
    }

    case 'create_study_project': {
      const input = args.input;
      const item: StudyProject = {
        id: id(), title: input.title.trim(), subtitle: input.subtitle || null,
        description: input.description || null, why_learning: input.why_learning || null,
        status: input.status || 'idea', importance: input.importance ?? 3,
        start_date: input.start_date || null, target_date: input.target_date || null,
        created_at: now(), updated_at: now(),
      };
      db.study_projects.push(item); save(db); return item as T;
    }

    case 'update_study_project': {
      const input = args.input;
      const item = db.study_projects.find(x => x.id === input.id);
      if (!item) throw new Error('Study project not found');
      Object.assign(item, input, { updated_at: now() }); save(db); return item as T;
    }

    case 'delete_study_project': {
      const projectId = args.id;
      db.study_projects = db.study_projects.filter(x => x.id !== projectId);
      db.project_stages = db.project_stages.filter(x => x.project_id !== projectId);
      db.project_notes = db.project_notes.filter(x => x.project_id !== projectId);
      db.project_resources = db.project_resources.filter(x => x.project_id !== projectId);
      db.project_experiments = db.project_experiments.filter(x => x.project_id !== projectId);
      db.project_knowledge = db.project_knowledge.filter(x => x.project_id !== projectId);
      save(db); return true as T;
    }

    case 'list_project_stages':
      return db.project_stages.filter(x => x.project_id === args.projectId).sort((a,b) => a.sort_order-b.sort_order || a.created_at.localeCompare(b.created_at)) as T;

    case 'add_project_stage': {
      const input = args.input;
      const item: ProjectStage = { id:id(), project_id:input.project_id, title:input.title, description:input.description||null, status:input.status||'planned', sort_order:input.sort_order??0, created_at:now(), updated_at:now() };
      db.project_stages.push(item); save(db); return item as T;
    }

    case 'update_project_stage': {
      const input = args.input; const item = db.project_stages.find(x => x.id === input.id);
      if (!item) throw new Error('Project stage not found'); Object.assign(item,input,{updated_at:now()}); save(db); return item as T;
    }

    case 'delete_project_stage':
      db.project_stages = db.project_stages.filter(x => x.id !== args.id); save(db); return true as T;

    case 'list_project_notes': {
      const projectId = args.projectId ?? null;
      const items = (projectId ? db.project_notes.filter(x => x.project_id === projectId) : db.project_notes).map(n => ({
        ...n,
        project_title: db.study_projects.find(x => x.id === n.project_id)?.title,
        stage_title: n.stage_id ? db.project_stages.find(x => x.id === n.stage_id)?.title || null : null,
      }));
      return [...items].sort((a,b) => (b.study_date||b.created_at).localeCompare(a.study_date||a.created_at)) as T;
    }

    case 'add_project_note': {
      const input = args.input;
      const item: ProjectNote = { id:id(), project_id:input.project_id, stage_id:input.stage_id||null, title:input.title, study_date:input.study_date||null, topic:input.topic||null, raw_note:input.raw_note||'', summary:input.summary||null, learned:input.learned||null, unresolved:input.unresolved||null, mastery:input.mastery??1, status:input.status||'captured', created_at:now(), updated_at:now() };
      db.project_notes.push(item); save(db); return item as T;
    }

    case 'update_project_note': {
      const input = args.input; const item = db.project_notes.find(x => x.id === input.id);
      if (!item) throw new Error('Project note not found'); Object.assign(item,input,{updated_at:now()}); save(db); return item as T;
    }

    case 'delete_project_note':
      db.project_notes = db.project_notes.filter(x => x.id !== args.id); db.project_knowledge.forEach(x => { if (x.project_note_id === args.id) x.project_note_id = null; }); save(db); return true as T;

    case 'list_project_resources':
      return sortByCreated(db.project_resources.filter(x => x.project_id === args.projectId)) as T;

    case 'add_project_resource': {
      const input = args.input;
      const item: ProjectResource = { id:id(), project_id:input.project_id, stage_id:input.stage_id||null, title:input.title, type:input.type||'Other', description:input.description||null, importance:input.importance??3, status:input.status||'saved', storage_type:input.storage_type, stored_path:input.original_filename?`[browser:${input.original_filename}]`:null, external_url:input.external_url||null, original_filename:input.original_filename||null, created_at:now() };
      db.project_resources.push(item); save(db); return item as T;
    }

    case 'delete_project_resource':
      db.project_resources = db.project_resources.filter(x => x.id !== args.id); save(db); return true as T;

    case 'list_project_experiments':
      return sortByCreated(db.project_experiments.filter(x => x.project_id === args.projectId)) as T;

    case 'add_project_experiment': {
      const input = args.input;
      const item: ProjectExperiment = { id:id(), project_id:input.project_id, stage_id:input.stage_id||null, title:input.title, question:input.question||null, setup:input.setup||null, result:input.result||null, conclusion:input.conclusion||null, code_reference:input.code_reference||null, status:input.status||'planned', created_at:now(), updated_at:now() };
      db.project_experiments.push(item); save(db); return item as T;
    }

    case 'update_project_experiment': {
      const input = args.input; const item = db.project_experiments.find(x => x.id === input.id);
      if (!item) throw new Error('Experiment not found'); Object.assign(item,input,{updated_at:now()}); save(db); return item as T;
    }

    case 'delete_project_experiment':
      db.project_experiments = db.project_experiments.filter(x => x.id !== args.id); save(db); return true as T;

    case 'list_project_knowledge': {
      const projectId = args.projectId ?? null;
      const items = (projectId ? db.project_knowledge.filter(x => x.project_id === projectId) : db.project_knowledge).map(n => ({ ...n, project_title: db.study_projects.find(x => x.id === n.project_id)?.title }));
      return [...items].sort((a,b) => Number(b.is_pinned)-Number(a.is_pinned) || b.importance-a.importance || b.created_at.localeCompare(a.created_at)) as T;
    }

    case 'add_project_knowledge': {
      const input = args.input;
      const item: ProjectKnowledge = { id:id(), project_id:input.project_id, project_note_id:input.project_note_id||null, title:input.title, content:input.content, why_it_matters:input.why_it_matters||null, importance:input.importance??3, is_pinned:!!input.is_pinned, created_at:now(), updated_at:now() };
      db.project_knowledge.push(item); save(db); return item as T;
    }

    case 'delete_project_knowledge':
      db.project_knowledge = db.project_knowledge.filter(x => x.id !== args.id); save(db); return true as T;

    case 'dashboard': {
      const current = db.semesters.find(x => x.status === 'current') || null;
      const currentSubjects = current ? db.subjects.filter(x => x.semester_id === current.id) : [];
      const enhanced = currentSubjects.map(s => ({
        ...s,
        study_note_count: db.study_notes.filter(n => n.subject_id === s.id).length,
        material_count: db.materials.filter(n => n.subject_id === s.id).length,
        critical_note_count: db.critical_notes.filter(n => n.subject_id === s.id).length,
      }));
      const allNotes = (await localCommand<StudyNote[]>('list_study_notes'));
      const result: DashboardData = {
        current_semester: current,
        semester_count: db.semesters.length,
        subject_count: db.subjects.length,
        study_note_count: db.study_notes.length,
        material_count: db.materials.length,
        critical_note_count: db.critical_notes.length,
        project_count: db.study_projects.length,
        active_projects: db.study_projects.filter(p => p.status === 'active').map(project => {
          const stages = db.project_stages.filter(x => x.project_id === project.id);
          return { ...project, stage_count: stages.length, completed_stage_count: stages.filter(x => x.status === 'completed').length, note_count: db.project_notes.filter(x => x.project_id === project.id).length, resource_count: db.project_resources.filter(x => x.project_id === project.id).length, experiment_count: db.project_experiments.filter(x => x.project_id === project.id).length, knowledge_count: db.project_knowledge.filter(x => x.project_id === project.id).length };
        }).slice(0,4),
        current_subjects: enhanced,
        recent_notes: allNotes.slice(0, 6),
        need_review: allNotes.filter(n => n.status !== 'mastered' || n.mastery < 4).slice(0, 6),
      };
      return result as T;
    }

    case 'search_all': {
      const q = String(args.query || '').trim().toLowerCase();
      if (!q) return [] as T;
      const out: SearchResult[] = [];
      db.semesters.forEach(x => { if (`${x.name} ${x.description||''}`.toLowerCase().includes(q)) out.push({kind:'semester',id:x.id,title:x.name,subtitle:x.status}); });
      db.subjects.forEach(x => { if (`${x.code} ${x.name} ${x.introduction||''} ${x.my_understanding||''}`.toLowerCase().includes(q)) out.push({kind:'subject',id:x.id,subject_id:x.id,title:`${x.code} — ${x.name}`,subtitle:x.status}); });
      db.study_notes.forEach(x => { if (`${x.title} ${x.topic||''} ${x.raw_note} ${x.summary||''}`.toLowerCase().includes(q)) out.push({kind:'study_note',id:x.id,subject_id:x.subject_id,title:x.title,subtitle:x.topic||'Study note'}); });
      db.critical_notes.forEach(x => { if (`${x.title} ${x.content} ${x.why_it_matters||''}`.toLowerCase().includes(q)) out.push({kind:'critical_note',id:x.id,subject_id:x.subject_id,title:x.title,subtitle:'Critical note'}); });
      db.materials.forEach(x => { if (`${x.title} ${x.type} ${x.description||''}`.toLowerCase().includes(q)) out.push({kind:'material',id:x.id,subject_id:x.subject_id,title:x.title,subtitle:x.type}); });
      db.reports.forEach(x => { if (`${x.title} ${x.description||''} ${x.note||''}`.toLowerCase().includes(q)) out.push({kind:'report',id:x.id,subject_id:x.subject_id,title:x.title,subtitle:x.type}); });
      db.study_projects.forEach(x => { if (`${x.title} ${x.subtitle||''} ${x.description||''} ${x.why_learning||''}`.toLowerCase().includes(q)) out.push({kind:'study_project',id:x.id,project_id:x.id,title:x.title,subtitle:x.subtitle||x.status}); });
      db.project_notes.forEach(x => { if (`${x.title} ${x.topic||''} ${x.raw_note} ${x.summary||''}`.toLowerCase().includes(q)) out.push({kind:'project_note',id:x.id,project_id:x.project_id,title:x.title,subtitle:'Project note'}); });
      db.project_knowledge.forEach(x => { if (`${x.title} ${x.content} ${x.why_it_matters||''}`.toLowerCase().includes(q)) out.push({kind:'project_knowledge',id:x.id,project_id:x.project_id,title:x.title,subtitle:'Project knowledge'}); });
      db.project_resources.forEach(x => { if (`${x.title} ${x.type} ${x.description||''}`.toLowerCase().includes(q)) out.push({kind:'project_resource',id:x.id,project_id:x.project_id,title:x.title,subtitle:x.type}); });
      db.project_experiments.forEach(x => { if (`${x.title} ${x.question||''} ${x.setup||''} ${x.result||''} ${x.conclusion||''}`.toLowerCase().includes(q)) out.push({kind:'project_experiment',id:x.id,project_id:x.project_id,title:x.title,subtitle:'Experiment'}); });
      return out.slice(0, 50) as T;
    }

    case 'export_json': {
      const payload = JSON.stringify({ version: 3, exported_at: now(), data: db }, null, 2);
      return payload as T;
    }

    case 'import_json': {
      const parsed = JSON.parse(args.jsonText);
      const next = parsed.data || parsed;
      localStorage.setItem(KEY, JSON.stringify({ ...emptyDb(), ...next }));
      return true as T;
    }

    case 'reset_all_data':
      localStorage.removeItem(KEY); return true as T;

    default:
      throw new Error(`Unsupported browser command: ${command}`);
  }
}
