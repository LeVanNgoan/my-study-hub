import React, { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { call, downloadText, fileToBase64, isNative, parseStudyNoteFilename } from './api';
import type {
  AppInfo, CriticalNote, DashboardData, GradeComponent, GradeScheme, Lecturer, Material,
  Report, ReportFile, ReportMember, SearchResult, Semester, SemesterStatus, StudyNote, StudyNoteStatus, Subject, SubjectStatus, GradeType,
  StudyProject, StudyProjectStatus, ProjectStage, ProjectStageStatus, ProjectNote, ProjectResource, ProjectResourceStatus, ProjectExperiment, ProjectExperimentStatus, ProjectKnowledge
} from './types';
import { Badge, ConfirmButton, Empty, Field, Modal, Stars } from './ui';
import { LayoutDashboard, GraduationCap, NotebookPen, BrainCircuit, Settings, BookOpen, Search, BookMarked, Files, ArrowRight, ChevronLeft, Pencil, FolderKanban, Route, FlaskConical, Lightbulb, Link2, CircleCheckBig } from 'lucide-react';

type Page = 'dashboard' | 'semesters' | 'projects' | 'study-notes' | 'knowledge' | 'settings';
type SubjectTab = 'overview' | 'study-notes' | 'materials' | 'critical' | 'reports' | 'lecturer' | 'results';
type ProjectTab = 'overview' | 'roadmap' | 'notes' | 'resources' | 'experiments' | 'knowledge';

const statusLabel: Record<string,string> = {
  planned:'Planned', current:'Current', completed:'Completed', studying:'Studying', dropped:'Dropped',
  captured:'Captured', reviewed:'Reviewed', mastered:'Mastered', planning:'Planning', in_progress:'In progress', submitted:'Submitted',
  idea:'Idea', active:'Active', paused:'Paused', saved:'Saved', reading:'Reading', running:'Running'
};

const statusTone = (s: string): 'neutral'|'blue'|'green'|'amber'|'red' =>
  ['current','studying','reviewed','submitted','active','running','reading'].includes(s) ? 'blue' :
  ['completed','mastered'].includes(s) ? 'green' :
  ['planned','planning','captured','paused','idea','saved'].includes(s) ? 'amber' :
  ['dropped'].includes(s) ? 'red' : 'neutral';

function useReload() {
  const [tick, setTick] = useState(0);
  return [tick, () => setTick(x => x + 1)] as const;
}

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [semesterId, setSemesterId] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [subjectTab, setSubjectTab] = useState<SubjectTab>('overview');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectTab, setProjectTab] = useState<ProjectTab>('overview');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [reloadKey, reload] = useReload();

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!search.trim()) { setSearchResults([]); setSearchOpen(false); return; }
      const results = await call<SearchResult[]>('search_all', { query: search });
      setSearchResults(results); setSearchOpen(true);
    }, 180);
    return () => clearTimeout(timer);
  }, [search, reloadKey]);

  const goSubject = (id: string) => {
    setSubjectId(id); setSubjectTab('overview'); setPage('semesters'); setSearchOpen(false); setSearch('');
  };

  const goProject = (id: string) => { setProjectId(id); setProjectTab('overview'); setPage('projects'); setSearchOpen(false); setSearch(''); };

  const nav = (p: Page) => { setPage(p); setSubjectId(null); setSemesterId(null); setProjectId(null); };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><BookOpen size={23} strokeWidth={2.2}/></div><div><strong>My Study Hub</strong></div></div>
        <nav>
          <NavButton active={page==='dashboard'} onClick={() => nav('dashboard')} icon={<LayoutDashboard size={18}/>}>Dashboard</NavButton>
          <NavButton active={page==='semesters'} onClick={() => nav('semesters')} icon={<GraduationCap size={18}/>}>Semesters</NavButton>
          <NavButton active={page==='projects'} onClick={() => nav('projects')} icon={<FolderKanban size={18}/>}>Study Projects</NavButton>
          <NavButton active={page==='study-notes'} onClick={() => nav('study-notes')} icon={<NotebookPen size={18}/>}>Study Notes</NavButton>
          <NavButton active={page==='knowledge'} onClick={() => nav('knowledge')} icon={<BrainCircuit size={18}/>}>Knowledge Vault</NavButton>
          <NavButton active={page==='settings'} onClick={() => nav('settings')} icon={<Settings size={18}/>}>Settings</NavButton>
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="search-wrap">
            <Search size={18}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} onFocus={()=>search && setSearchOpen(true)} placeholder="Search subjects, projects, notes, materials..." />
            {searchOpen && <SearchPopover results={searchResults} onSubject={goSubject} onProject={goProject} onClose={()=>setSearchOpen(false)} />}
          </div>
          <div className="mode-pill"><span className="mode-dot"/>{isNative() ? 'Offline ready' : 'Preview mode'}</div>
        </header>

        <section className="content">
          {page === 'dashboard' && <Dashboard key={reloadKey} onOpenSemester={(id)=>{setSemesterId(id||null);setPage('semesters')}} onOpenSubject={goSubject} onOpenProject={goProject} />}
          {page === 'semesters' && (
            subjectId ? <SubjectWorkspace subjectId={subjectId} tab={subjectTab} setTab={setSubjectTab} onBack={()=>setSubjectId(null)} reloadApp={reload} /> :
            semesterId ? <SemesterDetail semesterId={semesterId} onBack={()=>setSemesterId(null)} onSubject={goSubject} reloadApp={reload} /> :
            <Semesters key={reloadKey} onOpen={setSemesterId} reloadApp={reload} />
          )}
          {page === 'projects' && (projectId ? <StudyProjectWorkspace projectId={projectId} tab={projectTab} setTab={setProjectTab} onBack={()=>setProjectId(null)} reloadApp={reload}/> : <StudyProjects key={reloadKey} onOpen={goProject} reloadApp={reload}/>)}
          {page === 'study-notes' && <GlobalStudyNotes key={reloadKey} onSubject={goSubject} onProject={goProject} reloadApp={reload} />}
          {page === 'knowledge' && <KnowledgeVault key={reloadKey} onSubject={goSubject} onProject={goProject} reloadApp={reload} />}
          {page === 'settings' && <SettingsPage reloadApp={reload} />}
        </section>
      </main>
    </div>
  );
}

function NavButton({active,onClick,icon,children}:{active:boolean;onClick:()=>void;icon:ReactNode;children:ReactNode}) {
  return <button className={`nav-btn ${active?'active':''}`} onClick={onClick}><span className="nav-icon">{icon}</span><span>{children}</span></button>;
}

function SearchPopover({results,onSubject,onProject,onClose}:{results:SearchResult[];onSubject:(id:string)=>void;onProject:(id:string)=>void;onClose:()=>void}) {
  return <div className="search-popover">
    <div className="search-title">Search results</div>
    {results.length===0 ? <div className="search-empty">No matching results.</div> : results.map(r => (
      <button key={`${r.kind}-${r.id}`} onClick={()=>{if(r.project_id)onProject(r.project_id); else if(r.subject_id)onSubject(r.subject_id); else onClose();}}>
        <span className="result-kind">{r.kind.replace('_',' ')}</span><strong>{r.title}</strong>{r.subtitle && <small>{r.subtitle}</small>}
      </button>
    ))}
  </div>;
}

function Dashboard({onOpenSemester,onOpenSubject,onOpenProject}:{onOpenSemester:(id:string)=>void;onOpenSubject:(id:string)=>void;onOpenProject:(id:string)=>void}) {
  const [data,setData] = useState<DashboardData|null>(null);
  useEffect(()=>{ call<DashboardData>('dashboard').then(setData); },[]);
  if(!data) return <div className="loading">Loading...</div>;

  return <>
    <PageHeader title="Dashboard" />
    <MotivationalQuote />
    {data.current_semester ? <div className="current-banner" onClick={()=>onOpenSemester(data.current_semester!.id)}>
      <div className="banner-copy"><span>CURRENT SEMESTER</span><h2>{data.current_semester.name}</h2><p>{data.current_semester.number!==null ? `Semester ${data.current_semester.number}` : 'Custom semester'}{data.current_semester.description ? ` · ${data.current_semester.description}` : ''}</p><div className="banner-link">Open semester <ArrowRight size={15}/></div></div>
    </div> : <div className="dashboard-empty-strip"><div><strong>No current semester</strong><span>You can still use Study Projects independently.</span></div><button className="btn ghost" onClick={()=>onOpenSemester('')}>Create Semester</button></div>}
    <div className="stats-grid">
      <Stat label="Semesters" value={data.semester_count}/><Stat label="Subjects" value={data.subject_count}/><Stat label="Study Notes" value={data.study_note_count}/><Stat label="Materials" value={data.material_count}/><Stat label="Critical Notes" value={data.critical_note_count}/><Stat label="Study Projects" value={data.project_count}/>
    </div>
    {data.current_subjects.length>0&&<><SectionTitle title="Current subjects"/><div className="subject-grid">{data.current_subjects.map(s=><button className="subject-card" key={s.id} onClick={()=>onOpenSubject(s.id)}><div className="subject-card-top"><Badge tone={statusTone(s.status)}>{statusLabel[s.status]||s.status}</Badge><Stars value={s.importance} readOnly/></div><strong>{s.code}</strong><h3>{s.name}</h3><div className="mini-stats"><span>{s.study_note_count} notes</span><span>{s.material_count} materials</span><span>{s.critical_note_count} critical</span></div></button>)}</div></>}
    {data.active_projects.length>0&&<><SectionTitle title="Active study projects"/><div className="project-grid compact">{data.active_projects.map(p=><ProjectCard key={p.id} project={p} onClick={()=>onOpenProject(p.id)}/>)}</div></>}
    {(data.recent_notes.length>0||data.need_review.length>0)&&<div className="two-col"><div><SectionTitle title="Recent study"/><div className="list-card">{data.recent_notes.length?data.recent_notes.map(n=><NoteRow key={n.id} note={n} onClick={()=>onOpenSubject(n.subject_id)}/>):<SmallEmpty text="No study notes yet."/>}</div></div><div><SectionTitle title="Need review"/><div className="list-card">{data.need_review.length?data.need_review.map(n=><NoteRow key={n.id} note={n} onClick={()=>onOpenSubject(n.subject_id)} review/>):<SmallEmpty text="Nothing waiting for review."/>}</div></div></div>}
  </>;
}

function MotivationalQuote() {
  return <blockquote className="motivation-quote" aria-label="Motivational quote">
    <p>Everything seems impossible <span>until it’s done.</span></p>
    <footer>— Nelson Mandela —</footer>
  </blockquote>;
}

function Stat({label,value}:{label:string;value:number}) {
  const icon = label === 'Semesters' ? <GraduationCap size={20}/> : label === 'Subjects' ? <BookOpen size={20}/> : label === 'Study Notes' ? <NotebookPen size={20}/> : label === 'Materials' ? <Files size={20}/> : label === 'Study Projects' ? <FolderKanban size={20}/> : <BookMarked size={20}/>;
  return <div className="stat"><div className="stat-icon">{icon}</div><div><strong>{value}</strong><span>{label}</span></div></div>;
}
function NoteRow({note,onClick,review=false}:{note:StudyNote;onClick:()=>void;review?:boolean}) { return <button className="note-row" onClick={onClick}><div><strong>{note.subject_code} · {note.title}</strong><span>{note.week?`Week ${String(note.week).padStart(2,'0')}`:''}{note.slot?` · Slot ${String(note.slot).padStart(2,'0')}`:''}{note.study_date?` · ${formatDate(note.study_date)}`:''}</span></div>{review?<span className="mastery">{'★'.repeat(note.mastery)}{'☆'.repeat(5-note.mastery)}</span>:<Badge tone={statusTone(note.status)}>{statusLabel[note.status]}</Badge>}</button>; }

function Semesters({onOpen,reloadApp}:{onOpen:(id:string)=>void;reloadApp:()=>void}) {
  const [items,setItems]=useState<Semester[]>([]); const [show,setShow]=useState(false); const [edit,setEdit]=useState<Semester|null>(null);
  const load=()=>call<Semester[]>('list_semesters').then(setItems); useEffect(()=>{load()},[]);
  return <>
    <PageHeader title="Semesters" action={<button className="btn primary" onClick={()=>setShow(true)}>+ Add Semester</button>}/>
    {items.length===0?<Empty title="No semesters yet" description="Nothing is preconfigured. Build your study structure exactly the way you want it." action={<button className="btn primary" onClick={()=>setShow(true)}>+ Add Semester</button>}/>:<div className="semester-list">{items.map(s=><div className="semester-card" key={s.id}>
      <button className="semester-main" onClick={()=>onOpen(s.id)}><div><span className="kicker">{s.number!==null?`TERM ${s.number}`:'CUSTOM TERM'}</span><h2>{s.name}</h2><p>{s.description||'No description'}</p></div><Badge tone={statusTone(s.status)}>{statusLabel[s.status]}</Badge></button>
      <div className="row-actions"><button className="btn ghost small" onClick={()=>{setEdit(s);setShow(true)}}>Edit</button><ConfirmButton onConfirm={async()=>{await call('delete_semester',{id:s.id});load();reloadApp();}}>Delete</ConfirmButton></div>
    </div>)}</div>}
    {show&&<SemesterForm initial={edit} onClose={()=>{setShow(false);setEdit(null)}} onSaved={()=>{setShow(false);setEdit(null);load();reloadApp()}}/>}
  </>;
}

function SemesterForm({initial,onClose,onSaved}:{initial:Semester|null;onClose:()=>void;onSaved:()=>void}) {
  const [number,setNumber]=useState(initial?.number?.toString()||''); const [name,setName]=useState(initial?.name||''); const [status,setStatus]=useState<SemesterStatus>(initial?.status||'planned');
  const [start,setStart]=useState(initial?.start_date||''); const [end,setEnd]=useState(initial?.end_date||''); const [description,setDescription]=useState(initial?.description||'');
  const submit=async(e:FormEvent)=>{e.preventDefault();const input={id:initial?.id,number:number===''?null:Number(number),name,status,start_date:start||null,end_date:end||null,description};await call(initial?'update_semester':'create_semester',{input});onSaved();};
  return <Modal title={initial?'Edit Semester':'Add Semester'} onClose={onClose}><form className="form" onSubmit={submit}>
    <div className="form-grid"><Field label="Semester number"><input type="number" min="0" value={number} onChange={e=>setNumber(e.target.value)} placeholder="4"/></Field><Field label="Semester name"><input required value={name} onChange={e=>setName(e.target.value)} placeholder="FALL2026"/></Field></div>
    <Field label="Status"><select value={status} onChange={e=>setStatus(e.target.value as SemesterStatus)}><option value="planned">Planned</option><option value="current">Current</option><option value="completed">Completed</option></select></Field>
    <div className="form-grid"><Field label="Start date"><input type="date" value={start} onChange={e=>setStart(e.target.value)}/></Field><Field label="End date"><input type="date" value={end} onChange={e=>setEnd(e.target.value)}/></Field></div>
    <Field label="Description / Note"><textarea rows={3} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Add a short note about this semester..."/></Field>
    <FormActions onClose={onClose}/>
  </form></Modal>;
}

function SemesterDetail({semesterId,onBack,onSubject,reloadApp}:{semesterId:string;onBack:()=>void;onSubject:(id:string)=>void;reloadApp:()=>void}) {
  const [semester,setSemester]=useState<Semester|null>(null); const [subjects,setSubjects]=useState<Subject[]>([]); const [show,setShow]=useState(false);
  const load=async()=>{const sems=await call<Semester[]>('list_semesters');setSemester(sems.find(x=>x.id===semesterId)||null);setSubjects(await call<Subject[]>('list_subjects',{semesterId}));};
  useEffect(()=>{load()},[semesterId]);
  if(!semester)return <div className="loading">Loading...</div>;
  return <>
    <button className="back" onClick={onBack}><ChevronLeft size={16}/> All semesters</button>
    <PageHeader eyebrow={semester.number!==null?`TERM ${semester.number}`:undefined} title={semester.name} description={semester.description||undefined} action={<button className="btn primary" onClick={()=>setShow(true)}>+ Add Subject</button>}/>
    <div className="semester-meta"><Badge tone={statusTone(semester.status)}>{statusLabel[semester.status]}</Badge>{semester.start_date&&<span>{formatDate(semester.start_date)}</span>}{semester.end_date&&<span>→ {formatDate(semester.end_date)}</span>}</div>
    {subjects.length===0?<Empty title="No subjects yet" description="Subjects are fully manual too. Add only the courses you actually want to track." action={<button className="btn primary" onClick={()=>setShow(true)}>+ Add Subject</button>}/>:<div className="subject-grid">{subjects.map(s=><button className="subject-card" key={s.id} onClick={()=>onSubject(s.id)}>
      <div className="subject-card-top"><Badge tone={statusTone(s.status)}>{statusLabel[s.status]}</Badge><Stars value={s.importance} readOnly/></div><strong>{s.code}</strong><h3>{s.name}</h3><p className="clamp">{s.introduction||s.my_understanding||'No introduction yet.'}</p>
    </button>)}</div>}
    {show&&<SubjectForm semesterId={semesterId} onClose={()=>setShow(false)} onSaved={()=>{setShow(false);load();reloadApp()}}/>}
  </>;
}

function SubjectForm({semesterId,onClose,onSaved,initial}:{semesterId:string;onClose:()=>void;onSaved:()=>void;initial?:Subject|null}) {
  const [code,setCode]=useState(initial?.code||''); const [name,setName]=useState(initial?.name||''); const [status,setStatus]=useState<SubjectStatus>(initial?.status||'planned');
  const [importance,setImportance]=useState(initial?.importance||3); const [intro,setIntro]=useState(initial?.introduction||''); const [understanding,setUnderstanding]=useState(initial?.my_understanding||''); const [reason,setReason]=useState(initial?.importance_reason||''); const [note,setNote]=useState(initial?.note||'');
  const submit=async(e:FormEvent)=>{e.preventDefault();const input={id:initial?.id,semester_id:semesterId,code,name,status,importance,introduction:intro,my_understanding:understanding,importance_reason:reason,note};await call(initial?'update_subject':'create_subject',{input});onSaved();};
  return <Modal title={initial?'Edit Subject':'Add Subject'} onClose={onClose} wide><form className="form" onSubmit={submit}>
    <div className="form-grid"><Field label="Subject code"><input required value={code} onChange={e=>setCode(e.target.value)} placeholder="SWR302"/></Field><Field label="Subject name"><input required value={name} onChange={e=>setName(e.target.value)} placeholder="Software Requirements"/></Field></div>
    <div className="form-grid"><Field label="Status"><select value={status} onChange={e=>setStatus(e.target.value as SubjectStatus)}><option value="planned">Planned</option><option value="studying">Studying</option><option value="completed">Completed</option><option value="dropped">Dropped</option></select></Field><Field label="Importance"><Stars value={importance} onChange={setImportance}/></Field></div>
    <Field label="Introduction"><textarea rows={3} value={intro} onChange={e=>setIntro(e.target.value)} placeholder="What is this subject about?"/></Field>
    <Field label="My Understanding"><textarea rows={3} value={understanding} onChange={e=>setUnderstanding(e.target.value)} placeholder="How would you explain this subject in your own words?"/></Field>
    <Field label="Why Important?"><textarea rows={2} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Why is this subject important to you?"/></Field>
    <Field label="Other note"><textarea rows={2} value={note} onChange={e=>setNote(e.target.value)}/></Field>
    <FormActions onClose={onClose}/>
  </form></Modal>;
}

function SubjectWorkspace({subjectId,tab,setTab,onBack,reloadApp}:{subjectId:string;tab:SubjectTab;setTab:(t:SubjectTab)=>void;onBack:()=>void;reloadApp:()=>void}) {
  const [subject,setSubject]=useState<Subject|null>(null); const [showEdit,setShowEdit]=useState(false);
  const load=()=>call<Subject>('get_subject',{id:subjectId}).then(setSubject); useEffect(()=>{load()},[subjectId]);
  if(!subject)return <div className="loading">Loading...</div>;
  const tabs:[SubjectTab,string][]=[['overview','Overview'],['study-notes','Study Notes'],['materials','Materials'],['critical','Critical Notes'],['reports','Reports'],['lecturer','Lecturer'],['results','Results']];
  return <>
    <button className="back" onClick={onBack}><ChevronLeft size={16}/> Semester</button>
    <div className="subject-hero"><div><div className="hero-meta"><Badge tone={statusTone(subject.status)}>{statusLabel[subject.status]}</Badge><Stars value={subject.importance} readOnly/></div><span className="subject-code">{subject.code}</span><h1>{subject.name}</h1>{subject.importance_reason&&<p>{subject.importance_reason}</p>}</div><button className="btn ghost" onClick={()=>setShowEdit(true)}><Pencil size={15}/> Edit subject</button></div>
    <div className="tabs">{tabs.map(([k,label])=><button key={k} className={tab===k?'active':''} onClick={()=>setTab(k)}>{label}</button>)}</div>
    {tab==='overview'&&<SubjectOverview subject={subject}/>} 
    {tab==='study-notes'&&<StudyNotesPanel subject={subject} reloadApp={reloadApp}/>} 
    {tab==='materials'&&<MaterialsPanel subject={subject} reloadApp={reloadApp}/>} 
    {tab==='critical'&&<CriticalPanel subject={subject} reloadApp={reloadApp}/>} 
    {tab==='reports'&&<ReportsPanel subject={subject} reloadApp={reloadApp}/>} 
    {tab==='lecturer'&&<LecturerPanel subject={subject}/>} 
    {tab==='results'&&<ResultsPanel subject={subject}/>} 
    {showEdit&&<SubjectForm initial={subject} semesterId={subject.semester_id} onClose={()=>setShowEdit(false)} onSaved={()=>{setShowEdit(false);load();reloadApp()}}/>}
  </>;
}

function SubjectOverview({subject}:{subject:Subject}) {
  return <div className="overview-grid">
    <article className="panel"><h3>Introduction</h3><p className="prewrap">{subject.introduction||'No introduction yet.'}</p></article>
    <article className="panel"><h3>My Understanding</h3><p className="prewrap">{subject.my_understanding||'You have not written your own understanding yet.'}</p></article>
    <article className="panel full"><h3>Why this subject matters</h3><div className="importance-line"><Stars value={subject.importance} readOnly/><strong>{subject.importance}/5</strong></div><p className="prewrap">{subject.importance_reason||'No importance rationale yet.'}</p>{subject.note&&<><h4>Other note</h4><p className="prewrap">{subject.note}</p></>}</article>
  </div>;
}

function StudyNotesPanel({subject,reloadApp}:{subject:Subject;reloadApp:()=>void}) {
  const [items,setItems]=useState<StudyNote[]>([]); const [show,setShow]=useState(false); const [edit,setEdit]=useState<StudyNote|null>(null);
  const load=()=>call<StudyNote[]>('list_study_notes',{subjectId:subject.id}).then(setItems); useEffect(()=>{load()},[subject.id]);
  return <div>
    <SectionTitle title="Study Notes" action={<button className="btn primary" onClick={()=>setShow(true)}>+ Capture Study Note</button>}/>
    {items.length===0?<Empty title="No study notes yet" description="Create a note manually or import a file using the WWSS-DDMMYY.txt naming convention." action={<button className="btn primary" onClick={()=>setShow(true)}>+ Capture Study Note</button>}/>:<div className="timeline">{items.map(n=><article className="timeline-item" key={n.id}>
      <div className="timeline-marker"/><div className="timeline-card">
        <div className="card-head"><div><span className="kicker">{n.week?`WEEK ${String(n.week).padStart(2,'0')}`:'NO WEEK'}{n.slot?` · SLOT ${String(n.slot).padStart(2,'0')}`:''}</span><h3>{n.title}</h3><p>{n.study_date?formatDate(n.study_date):'No date'}{n.topic?` · ${n.topic}`:''}</p></div><div className="card-actions"><Badge tone={statusTone(n.status)}>{statusLabel[n.status]}</Badge><button className="btn ghost small" onClick={()=>{setEdit(n);setShow(true)}}>Edit</button><ConfirmButton onConfirm={async()=>{await call('delete_study_note',{id:n.id});load();reloadApp();}}>Delete</ConfirmButton></div></div>
        <div className="mastery-line"><span>Mastery</span><Stars value={n.mastery} readOnly/></div>
        {n.summary&&<div className="note-box"><strong>Summary</strong><p>{n.summary}</p></div>}
        <details><summary>Raw note</summary><pre>{n.raw_note}</pre></details>
        {n.original_filename&&<div className="file-line"><small className="muted">Original file: {n.original_filename}</small>{n.stored_path&&isNative()&&<button className="btn ghost small" onClick={()=>call('open_local_file',{path:n.stored_path})}>Open file</button>}</div>}
      </div>
    </article>)}</div>}
    {show&&<StudyNoteForm subject={subject} initial={edit} onClose={()=>{setShow(false);setEdit(null)}} onSaved={()=>{setShow(false);setEdit(null);load();reloadApp()}}/>}
  </div>;
}

function StudyNoteForm({subject,initial,onClose,onSaved}:{subject:Subject;initial:StudyNote|null;onClose:()=>void;onSaved:()=>void}) {
  const [title,setTitle]=useState(initial?.title||''); const [week,setWeek]=useState(initial?.week?.toString()||''); const [slot,setSlot]=useState(initial?.slot?.toString()||''); const [date,setDate]=useState(initial?.study_date||'');
  const [topic,setTopic]=useState(initial?.topic||''); const [raw,setRaw]=useState(initial?.raw_note||''); const [summary,setSummary]=useState(initial?.summary||''); const [learned,setLearned]=useState(initial?.learned||''); const [unresolved,setUnresolved]=useState(initial?.unresolved||'');
  const [mastery,setMastery]=useState(initial?.mastery||1); const [status,setStatus]=useState<StudyNoteStatus>(initial?.status||'captured'); const [filename,setFilename]=useState(initial?.original_filename||''); const [fileBase64,setFileBase64]=useState<string|null>(null);

  const chooseFile=async(file?:File)=>{if(!file)return;setFilename(file.name);const parsed=parseStudyNoteFilename(file.name);if(parsed){setWeek(String(parsed.week));setSlot(String(parsed.slot));setDate(parsed.study_date);}if(/\.(txt|md)$/i.test(file.name)){const text=await file.text();setRaw(text);if(!title)setTitle(file.name.replace(/\.[^.]+$/,''));}setFileBase64(await fileToBase64(file));};
  const submit=async(e:FormEvent)=>{e.preventDefault();const input={id:initial?.id,subject_id:subject.id,title,week:week?Number(week):null,slot:slot?Number(slot):null,study_date:date||null,topic,raw_note:raw,summary,learned,unresolved,mastery,status,original_filename:filename||null,file_base64:fileBase64};await call(initial?'update_study_note':'add_study_note',{input});onSaved();};
  return <Modal title={initial?'Edit Study Note':'Capture Study Note'} onClose={onClose} wide><form className="form" onSubmit={submit}>
    <Field label="Import note file" hint="A filename like 0102-110926.txt is parsed as Week 01 · Slot 02 · 11/09/2026."><input type="file" accept=".txt,.md,text/plain,text/markdown" onChange={e=>chooseFile(e.target.files?.[0])}/></Field>
    <div className="form-grid three"><Field label="Week"><input type="number" min="1" value={week} onChange={e=>setWeek(e.target.value)}/></Field><Field label="Slot"><input type="number" min="1" value={slot} onChange={e=>setSlot(e.target.value)}/></Field><Field label="Date"><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></Field></div>
    <Field label="Title"><input required value={title} onChange={e=>setTitle(e.target.value)} placeholder="Requirements introduction"/></Field><Field label="Topic"><input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Requirements Engineering"/></Field>
    <Field label="Raw Note"><textarea className="mono" rows={12} value={raw} onChange={e=>setRaw(e.target.value)} placeholder="Write or import your raw notes from the study session..."/></Field>
    <Field label="Summary"><textarea rows={3} value={summary} onChange={e=>setSummary(e.target.value)} placeholder="Summarize the session after reviewing it..."/></Field>
    <div className="form-grid"><Field label="What I learned"><textarea rows={3} value={learned} onChange={e=>setLearned(e.target.value)}/></Field><Field label="What I don't understand"><textarea rows={3} value={unresolved} onChange={e=>setUnresolved(e.target.value)}/></Field></div>
    <div className="form-grid"><Field label="Mastery"><Stars value={mastery} onChange={setMastery}/></Field><Field label="Status"><select value={status} onChange={e=>setStatus(e.target.value as StudyNoteStatus)}><option value="captured">Captured</option><option value="reviewed">Reviewed</option><option value="mastered">Mastered</option></select></Field></div>
    <FormActions onClose={onClose}/>
  </form></Modal>;
}

function MaterialsPanel({subject,reloadApp}:{subject:Subject;reloadApp:()=>void}) {
  const [items,setItems]=useState<Material[]>([]); const [show,setShow]=useState(false);
  const load=()=>call<Material[]>('list_materials',{subjectId:subject.id}).then(setItems); useEffect(()=>{load()},[subject.id]);
  return <div><SectionTitle title="Materials" action={<button className="btn primary" onClick={()=>setShow(true)}>+ Add Material</button>}/>
    {items.length===0?<Empty title="No materials yet" description="Store a local file or save an external link."/>:<div className="resource-list">{items.map(m=><article className="resource" key={m.id}><div className="file-icon">{fileIcon(m.type)}</div><div className="resource-main"><div className="resource-title"><strong>{m.title}</strong><Stars value={m.importance} readOnly/></div><span>{m.type} · {m.storage_type==='file'?(m.original_filename||'Local file'):'External link'}</span>{m.description&&<p>{m.description}</p>}{m.external_url&&<a href={m.external_url} target="_blank" rel="noreferrer">Open link ↗</a>}{m.stored_path&&isNative()&&<button className="btn ghost small" onClick={()=>call('open_local_file',{path:m.stored_path})}>Open file</button>}</div><ConfirmButton onConfirm={async()=>{await call('delete_material',{id:m.id});load();reloadApp();}}>Delete</ConfirmButton></article>)}</div>}
    {show&&<MaterialForm subject={subject} onClose={()=>setShow(false)} onSaved={()=>{setShow(false);load();reloadApp()}}/>}
  </div>;
}

function MaterialForm({subject,onClose,onSaved}:{subject:Subject;onClose:()=>void;onSaved:()=>void}) {
  const [title,setTitle]=useState('');const [type,setType]=useState('Slide');const [description,setDescription]=useState('');const [importance,setImportance]=useState(3);const [storage,setStorage]=useState<'file'|'link'>('file');const [url,setUrl]=useState('');const [filename,setFilename]=useState('');const [fileBase64,setFileBase64]=useState<string|null>(null);
  const submit=async(e:FormEvent)=>{e.preventDefault();await call('add_material',{input:{subject_id:subject.id,title,type,description,importance,storage_type:storage,external_url:storage==='link'?url:null,original_filename:storage==='file'?filename:null,file_base64:fileBase64}});onSaved();};
  return <Modal title="Add Material" onClose={onClose}><form className="form" onSubmit={submit}><Field label="Title"><input required value={title} onChange={e=>setTitle(e.target.value)}/></Field><div className="form-grid"><Field label="Type"><select value={type} onChange={e=>setType(e.target.value)}><option>Slide</option><option>Source Code</option><option>Template</option><option>Guide / Skill</option><option>Book</option><option>Reference</option><option>Other</option></select></Field><Field label="Importance"><Stars value={importance} onChange={setImportance}/></Field></div>
    <Field label="Storage"><select value={storage} onChange={e=>setStorage(e.target.value as 'file'|'link')}><option value="file">Local file</option><option value="link">External link</option></select></Field>
    {storage==='file'?<Field label="File"><input type="file" required onChange={async e=>{const f=e.target.files?.[0];if(f){setFilename(f.name);setFileBase64(await fileToBase64(f));if(!title)setTitle(f.name)}}}/></Field>:<Field label="URL"><input type="url" required value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://..."/></Field>}
    <Field label="Description"><textarea rows={3} value={description} onChange={e=>setDescription(e.target.value)}/></Field><FormActions onClose={onClose}/></form></Modal>;
}

function CriticalPanel({subject,reloadApp}:{subject:Subject;reloadApp:()=>void}) {
  const [items,setItems]=useState<CriticalNote[]>([]);const [show,setShow]=useState(false);const [studyNotes,setStudyNotes]=useState<StudyNote[]>([]);
  const load=async()=>{setItems(await call<CriticalNote[]>('list_critical_notes',{subjectId:subject.id}));setStudyNotes(await call<StudyNote[]>('list_study_notes',{subjectId:subject.id}));};useEffect(()=>{load()},[subject.id]);
  return <div><SectionTitle title="Critical Notes" action={<button className="btn primary" onClick={()=>setShow(true)}>+ Add Critical Note</button>}/>
    {items.length===0?<Empty title="No critical notes yet" description="After reviewing a Study Note, extract the most important knowledge here."/>:<div className="knowledge-grid">{items.map(n=><article className={`knowledge-card ${n.is_pinned?'pinned':''}`} key={n.id}><div className="card-head"><div><span className="kicker">{n.is_pinned?'PINNED':'CRITICAL KNOWLEDGE'}</span><h3>{n.title}</h3></div><Stars value={n.importance} readOnly/></div><p className="prewrap">{n.content}</p>{n.why_it_matters&&<div className="why"><strong>Why it matters</strong><p>{n.why_it_matters}</p></div>}<ConfirmButton onConfirm={async()=>{await call('delete_critical_note',{id:n.id});load();reloadApp();}}>Delete</ConfirmButton></article>)}</div>}
    {show&&<CriticalForm subject={subject} studyNotes={studyNotes} onClose={()=>setShow(false)} onSaved={()=>{setShow(false);load();reloadApp()}}/>}
  </div>;
}

function CriticalForm({subject,studyNotes,onClose,onSaved}:{subject:Subject;studyNotes:StudyNote[];onClose:()=>void;onSaved:()=>void}) {
  const [title,setTitle]=useState('');const [content,setContent]=useState('');const [why,setWhy]=useState('');const [importance,setImportance]=useState(5);const [pinned,setPinned]=useState(false);const [source,setSource]=useState('');
  const submit=async(e:FormEvent)=>{e.preventDefault();await call('add_critical_note',{input:{subject_id:subject.id,study_note_id:source||null,title,content,why_it_matters:why,importance,is_pinned:pinned}});onSaved();};
  return <Modal title="Add Critical Note" onClose={onClose}><form className="form" onSubmit={submit}><Field label="Title"><input required value={title} onChange={e=>setTitle(e.target.value)}/></Field><Field label="Knowledge"><textarea required rows={7} value={content} onChange={e=>setContent(e.target.value)}/></Field><Field label="Why it matters"><textarea rows={3} value={why} onChange={e=>setWhy(e.target.value)}/></Field><Field label="Source Study Note"><select value={source} onChange={e=>setSource(e.target.value)}><option value="">None</option>{studyNotes.map(n=><option key={n.id} value={n.id}>{n.title}</option>)}</select></Field><div className="form-grid"><Field label="Importance"><Stars value={importance} onChange={setImportance}/></Field><Field label="Pin"><label className="check"><input type="checkbox" checked={pinned} onChange={e=>setPinned(e.target.checked)}/> Keep at top</label></Field></div><FormActions onClose={onClose}/></form></Modal>;
}

function ReportsPanel({subject,reloadApp}:{subject:Subject;reloadApp:()=>void}) {
  const [items,setItems]=useState<Report[]>([]);const [show,setShow]=useState(false);const [expanded,setExpanded]=useState<string|null>(null);
  const load=()=>call<Report[]>('list_reports',{subjectId:subject.id}).then(setItems);useEffect(()=>{load()},[subject.id]);
  return <div><SectionTitle title="Reports / Projects" action={<button className="btn primary" onClick={()=>setShow(true)}>+ Add Report</button>}/>
    {items.length===0?<Empty title="No reports or projects yet" description="Create a report or project whenever the subject has a group task or submission."/>:<div className="report-list">{items.map(r=><article className="report-card" key={r.id}><div className="card-head"><div><Badge tone={statusTone(r.status)}>{statusLabel[r.status]||r.status}</Badge><h3>{r.title}</h3><span>{r.type}{r.deadline?` · Deadline ${formatDate(r.deadline)}`:''}</span></div><div className="card-actions"><button className="btn ghost small" onClick={()=>setExpanded(expanded===r.id?null:r.id)}>{expanded===r.id?'Close':'Open'}</button><ConfirmButton onConfirm={async()=>{await call('delete_report',{id:r.id});load();reloadApp();}}>Delete</ConfirmButton></div></div>{r.description&&<p>{r.description}</p>}{expanded===r.id&&<ReportDetail report={r}/>}</article>)}</div>}
    {show&&<ReportForm subject={subject} onClose={()=>setShow(false)} onSaved={()=>{setShow(false);load();reloadApp()}}/>}
  </div>;
}

function ReportForm({subject,onClose,onSaved}:{subject:Subject;onClose:()=>void;onSaved:()=>void}) {
  const [title,setTitle]=useState('');const [type,setType]=useState('Report');const [status,setStatus]=useState('planning');const [deadline,setDeadline]=useState('');const [description,setDescription]=useState('');const [note,setNote]=useState('');
  const submit=async(e:FormEvent)=>{e.preventDefault();await call('add_report',{input:{subject_id:subject.id,title,type,status,deadline:deadline||null,description,note}});onSaved();};
  return <Modal title="Add Report / Project" onClose={onClose}><form className="form" onSubmit={submit}><Field label="Title"><input required value={title} onChange={e=>setTitle(e.target.value)}/></Field><div className="form-grid"><Field label="Type"><select value={type} onChange={e=>setType(e.target.value)}><option>Report</option><option>Assignment</option><option>Project</option><option>Presentation</option><option>Research</option><option>Other</option></select></Field><Field label="Status"><select value={status} onChange={e=>setStatus(e.target.value)}><option value="planning">Planning</option><option value="in_progress">In progress</option><option value="submitted">Submitted</option><option value="completed">Completed</option></select></Field></div><Field label="Deadline"><input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)}/></Field><Field label="Description"><textarea rows={3} value={description} onChange={e=>setDescription(e.target.value)}/></Field><Field label="Note"><textarea rows={2} value={note} onChange={e=>setNote(e.target.value)}/></Field><FormActions onClose={onClose}/></form></Modal>;
}

function ReportDetail({report}:{report:Report}) {
  const [members,setMembers]=useState<ReportMember[]>([]);const [files,setFiles]=useState<ReportFile[]>([]);const [memberOpen,setMemberOpen]=useState(false);const [fileOpen,setFileOpen]=useState(false);
  const load=async()=>{setMembers(await call<ReportMember[]>('list_report_members',{reportId:report.id}));setFiles(await call<ReportFile[]>('list_report_files',{reportId:report.id}));};useEffect(()=>{load()},[report.id]);
  return <div className="report-detail"><div><div className="subhead"><h4>Team members</h4><button className="btn ghost small" onClick={()=>setMemberOpen(true)}>+ Member</button></div>{members.length?members.map(m=><div className="member-row" key={m.id}><div><strong>{m.name}</strong><span>{m.student_number||'No student number'}{m.email?` · ${m.email}`:''}</span><small>{m.role||''}{m.contribution?` · ${m.contribution}`:''}</small></div><button className="icon-btn" onClick={async()=>{await call('delete_report_member',{id:m.id});load()}}>×</button></div>):<SmallEmpty text="No team members."/>}</div>
    <div><div className="subhead"><h4>Files</h4><button className="btn ghost small" onClick={()=>setFileOpen(true)}>+ File</button></div>{files.length?files.map(f=><div className="member-row" key={f.id}><div><strong>{f.title}</strong><span>{f.original_filename}</span>{f.stored_path&&isNative()&&<button className="btn ghost small" onClick={()=>call('open_local_file',{path:f.stored_path})}>Open</button>}</div><button className="icon-btn" onClick={async()=>{await call('delete_report_file',{id:f.id});load()}}>×</button></div>):<SmallEmpty text="No files."/>}</div>
    {memberOpen&&<ReportMemberForm report={report} onClose={()=>setMemberOpen(false)} onSaved={()=>{setMemberOpen(false);load()}}/>}{fileOpen&&<ReportFileForm report={report} onClose={()=>setFileOpen(false)} onSaved={()=>{setFileOpen(false);load()}}/>}
  </div>;
}

function ReportMemberForm({report,onClose,onSaved}:{report:Report;onClose:()=>void;onSaved:()=>void}) {
  const [name,setName]=useState('');const [student,setStudent]=useState('');const [email,setEmail]=useState('');const [role,setRole]=useState('');const [contribution,setContribution]=useState('');const [note,setNote]=useState('');
  const submit=async(e:FormEvent)=>{e.preventDefault();await call('add_report_member',{input:{report_id:report.id,name,student_number:student,email,role,contribution,note}});onSaved();};
  return <Modal title="Add Team Member" onClose={onClose}><form className="form" onSubmit={submit}><Field label="Name"><input required value={name} onChange={e=>setName(e.target.value)}/></Field><div className="form-grid"><Field label="Student number"><input value={student} onChange={e=>setStudent(e.target.value)}/></Field><Field label="Email"><input type="email" value={email} onChange={e=>setEmail(e.target.value)}/></Field></div><Field label="Role"><input value={role} onChange={e=>setRole(e.target.value)} placeholder="Team Leader / Backend / ..."/></Field><Field label="Contribution"><textarea rows={2} value={contribution} onChange={e=>setContribution(e.target.value)}/></Field><Field label="Note"><textarea rows={2} value={note} onChange={e=>setNote(e.target.value)}/></Field><FormActions onClose={onClose}/></form></Modal>;
}

function ReportFileForm({report,onClose,onSaved}:{report:Report;onClose:()=>void;onSaved:()=>void}) {
  const [file,setFile]=useState<File|null>(null);const [title,setTitle]=useState('');
  const submit=async(e:FormEvent)=>{e.preventDefault();if(!file)return;await call('add_report_file',{input:{report_id:report.id,title:title||file.name,original_filename:file.name,file_base64:await fileToBase64(file)}});onSaved();};
  return <Modal title="Add Report File" onClose={onClose}><form className="form" onSubmit={submit}><Field label="File"><input required type="file" onChange={e=>{const f=e.target.files?.[0]||null;setFile(f);if(f&&!title)setTitle(f.name)}}/></Field><Field label="Title"><input value={title} onChange={e=>setTitle(e.target.value)}/></Field><FormActions onClose={onClose}/></form></Modal>;
}

function LecturerPanel({subject}:{subject:Subject}) {
  const [items,setItems]=useState<Lecturer[]>([]);const [show,setShow]=useState(false);
  const load=()=>call<Lecturer[]>('list_lecturers',{subjectId:subject.id}).then(setItems);useEffect(()=>{load()},[subject.id]);
  return <div><SectionTitle title="Lecturers" action={<button className="btn primary" onClick={()=>setShow(true)}>+ Add Lecturer</button>}/>
    {items.length===0?<Empty title="No lecturers yet" description="Add one or more lecturers for this subject."/>:<div className="people-grid">{items.map(l=><article className="person-card" key={l.id}><div className="avatar">{initials(l.name)}</div><div><span className="kicker">{l.role||'LECTURER'}</span><h3>{l.name}</h3>{l.email&&<a href={`mailto:${l.email}`}>{l.email}</a>}{l.phone&&<p>{l.phone}</p>}{l.contact&&<p>{l.contact}</p>}{l.note&&<div className="why"><strong>My note</strong><p>{l.note}</p></div>}</div><ConfirmButton onConfirm={async()=>{await call('delete_lecturer',{id:l.id});load();}}>Delete</ConfirmButton></article>)}</div>}
    {show&&<LecturerForm subject={subject} onClose={()=>setShow(false)} onSaved={()=>{setShow(false);load()}}/>}
  </div>;
}

function LecturerForm({subject,onClose,onSaved}:{subject:Subject;onClose:()=>void;onSaved:()=>void}) {
  const [name,setName]=useState('');const [email,setEmail]=useState('');const [phone,setPhone]=useState('');const [contact,setContact]=useState('');const [role,setRole]=useState('Main Lecturer');const [note,setNote]=useState('');
  const submit=async(e:FormEvent)=>{e.preventDefault();await call('add_lecturer',{input:{subject_id:subject.id,name,email,phone,contact,role,note}});onSaved();};
  return <Modal title="Add Lecturer" onClose={onClose}><form className="form" onSubmit={submit}><Field label="Name"><input required value={name} onChange={e=>setName(e.target.value)}/></Field><div className="form-grid"><Field label="Email"><input type="email" value={email} onChange={e=>setEmail(e.target.value)}/></Field><Field label="Phone"><input value={phone} onChange={e=>setPhone(e.target.value)}/></Field></div><Field label="Role"><input value={role} onChange={e=>setRole(e.target.value)}/></Field><Field label="Contact / Office"><input value={contact} onChange={e=>setContact(e.target.value)} placeholder="Teams / Office / Campus..."/></Field><Field label="My note about lecturer"><textarea rows={4} value={note} onChange={e=>setNote(e.target.value)} placeholder="Teaching style, grading habits, communication preferences, and anything worth remembering..."/></Field><FormActions onClose={onClose}/></form></Modal>;
}

function ResultsPanel({subject}:{subject:Subject}) {
  const [scheme,setScheme]=useState<GradeScheme|null>(null);const [components,setComponents]=useState<GradeComponent[]>([]);const [showScheme,setShowScheme]=useState(false);const [showComponent,setShowComponent]=useState(false);
  const load=async()=>{const d=await call<{scheme:GradeScheme|null;components:GradeComponent[]}>('get_grade_scheme',{subjectId:subject.id});setScheme(d.scheme);setComponents(d.components);};useEffect(()=>{load()},[subject.id]);
  const weighted=useMemo(()=>{if(!scheme||scheme.type!=='numeric')return null;let totalWeight=0,earned=0;components.forEach(c=>{if(c.score!==null&&c.score!==undefined&&c.weight!==null&&c.weight!==undefined){totalWeight+=c.weight;earned+=(c.score/c.max_score)*c.weight;}});return {totalWeight,earned,current:totalWeight?earned/totalWeight*10:null};},[scheme,components]);
  return <div><SectionTitle title="Results" action={<button className="btn primary" onClick={()=>setShowScheme(true)}>{scheme?'Edit Scheme':'Create Scheme'}</button>}/>
    {!scheme?<Empty title="No grade scheme yet" description="If this subject is not graded, choose No Grade."/>:<>
      <div className="grade-summary"><div><span>GRADE TYPE</span><strong>{scheme.type.replace('_',' ').toUpperCase()}</strong></div>{weighted&&<><div><span>RECORDED WEIGHT</span><strong>{weighted.totalWeight}%</strong></div><div><span>CURRENT SCORE</span><strong>{weighted.current?.toFixed(2)??'—'}</strong></div></>}{scheme.target_score!=null&&<div><span>TARGET</span><strong>{scheme.target_score}</strong></div>}</div>
      {scheme.type==='numeric'&&<><div className="subhead"><h3>Grade components</h3><button className="btn ghost" onClick={()=>setShowComponent(true)}>+ Component</button></div>{components.length===0?<SmallEmpty text="No grade components yet."/>:<div className="grade-table"><div className="grade-row header"><span>Component</span><span>Weight</span><span>Score</span><span>Max</span><span/></div>{components.map(c=><div className="grade-row" key={c.id}><strong>{c.name}</strong><span>{c.weight??'—'}%</span><input type="number" step="0.01" min="0" max={c.max_score} value={c.score??''} onChange={async e=>{await call('update_grade_component',{input:{id:c.id,score:e.target.value===''?null:Number(e.target.value)}});load()}}/><span>{c.max_score}</span><button className="icon-btn" onClick={async()=>{await call('delete_grade_component',{id:c.id});load()}}>×</button></div>)}</div>}</>}
    </>}
    {showScheme&&<GradeSchemeForm subject={subject} initial={scheme} onClose={()=>setShowScheme(false)} onSaved={()=>{setShowScheme(false);load()}}/>}{showComponent&&scheme&&<GradeComponentForm scheme={scheme} order={components.length} onClose={()=>setShowComponent(false)} onSaved={()=>{setShowComponent(false);load()}}/>}
  </div>;
}

function GradeSchemeForm({subject,initial,onClose,onSaved}:{subject:Subject;initial:GradeScheme|null;onClose:()=>void;onSaved:()=>void}) {
  const [type,setType]=useState<GradeType>(initial?.type||'numeric');const [passing,setPassing]=useState(initial?.passing_score?.toString()||'');const [target,setTarget]=useState(initial?.target_score?.toString()||'');const [note,setNote]=useState(initial?.note||'');
  const submit=async(e:FormEvent)=>{e.preventDefault();await call('save_grade_scheme',{input:{subject_id:subject.id,type,passing_score:passing===''?null:Number(passing),target_score:target===''?null:Number(target),note}});onSaved();};
  return <Modal title="Grade Scheme" onClose={onClose}><form className="form" onSubmit={submit}><Field label="Type"><select value={type} onChange={e=>setType(e.target.value as GradeType)}><option value="numeric">Numeric</option><option value="pass_fail">Pass / Fail</option><option value="no_grade">No Grade</option><option value="custom">Custom</option></select></Field><div className="form-grid"><Field label="Passing score"><input type="number" step="0.01" value={passing} onChange={e=>setPassing(e.target.value)}/></Field><Field label="Target score"><input type="number" step="0.01" value={target} onChange={e=>setTarget(e.target.value)}/></Field></div><Field label="Note"><textarea rows={3} value={note} onChange={e=>setNote(e.target.value)}/></Field><FormActions onClose={onClose}/></form></Modal>;
}

function GradeComponentForm({scheme,order,onClose,onSaved}:{scheme:GradeScheme;order:number;onClose:()=>void;onSaved:()=>void}) {
  const [name,setName]=useState('');const [weight,setWeight]=useState('');const [max,setMax]=useState('10');
  const submit=async(e:FormEvent)=>{e.preventDefault();await call('add_grade_component',{input:{grade_scheme_id:scheme.id,name,weight:weight===''?null:Number(weight),max_score:Number(max)||10,sort_order:order}});onSaved();};
  return <Modal title="Add Grade Component" onClose={onClose}><form className="form" onSubmit={submit}><Field label="Name"><input required value={name} onChange={e=>setName(e.target.value)} placeholder="Assignment / PE / FE"/></Field><div className="form-grid"><Field label="Weight %"><input type="number" min="0" max="100" step="0.01" value={weight} onChange={e=>setWeight(e.target.value)}/></Field><Field label="Max score"><input type="number" min="0.01" step="0.01" value={max} onChange={e=>setMax(e.target.value)}/></Field></div><FormActions onClose={onClose}/></form></Modal>;
}


function ProjectCard({project,onClick}:{project:StudyProject;onClick:()=>void}) {
  const total=project.stage_count||0; const done=project.completed_stage_count||0; const progress=total?Math.round(done/total*100):0;
  return <button className="project-card" onClick={onClick}>
    <div className="project-card-head"><div className="project-icon"><FolderKanban size={20}/></div><Badge tone={statusTone(project.status)}>{statusLabel[project.status]||project.status}</Badge></div>
    <h3>{project.title}</h3>{project.subtitle&&<p>{project.subtitle}</p>}
    <div className="project-progress"><div><span>Roadmap</span><strong>{done}/{total || '—'}</strong></div><div className="progress-track"><span style={{width:`${progress}%`}}/></div></div>
    <div className="mini-stats"><span>{project.note_count||0} notes</span><span>{project.resource_count||0} resources</span><span>{project.experiment_count||0} experiments</span></div>
  </button>;
}

function StudyProjects({onOpen,reloadApp}:{onOpen:(id:string)=>void;reloadApp:()=>void}) {
  const [items,setItems]=useState<StudyProject[]>([]); const [show,setShow]=useState(false);
  const load=()=>call<StudyProject[]>('list_study_projects').then(setItems); useEffect(()=>{load()},[]);
  const active=items.filter(x=>x.status==='active'); const other=items.filter(x=>x.status!=='active');
  return <><PageHeader title="Study Projects" action={<button className="btn primary" onClick={()=>setShow(true)}>+ New Project</button>}/>
    {items.length===0?<Empty title="No study projects yet" description="Create a workspace for anything you want to learn outside your semesters." action={<button className="btn primary" onClick={()=>setShow(true)}>+ New Project</button>}/>:<>
      {active.length>0&&<><SectionTitle title="Active projects"/><div className="project-grid">{active.map(p=><ProjectCard key={p.id} project={p} onClick={()=>onOpen(p.id)}/>)}</div></>}
      {other.length>0&&<><SectionTitle title="Other projects"/><div className="project-grid">{other.map(p=><ProjectCard key={p.id} project={p} onClick={()=>onOpen(p.id)}/>)}</div></>}
    </>}
    {show&&<StudyProjectForm initial={null} onClose={()=>setShow(false)} onSaved={(project)=>{setShow(false);load();reloadApp();onOpen(project.id)}}/>}
  </>;
}

function StudyProjectForm({initial,onClose,onSaved}:{initial:StudyProject|null;onClose:()=>void;onSaved:(p:StudyProject)=>void}) {
  const [title,setTitle]=useState(initial?.title||''); const [subtitle,setSubtitle]=useState(initial?.subtitle||''); const [description,setDescription]=useState(initial?.description||''); const [why,setWhy]=useState(initial?.why_learning||'');
  const [status,setStatus]=useState<StudyProjectStatus>(initial?.status||'idea'); const [importance,setImportance]=useState(initial?.importance||3); const [start,setStart]=useState(initial?.start_date||''); const [target,setTarget]=useState(initial?.target_date||'');
  const submit=async(e:FormEvent)=>{e.preventDefault();const input={id:initial?.id,title,subtitle,description,why_learning:why,status,importance,start_date:start||null,target_date:target||null};const item=await call<StudyProject>(initial?'update_study_project':'create_study_project',{input});onSaved(item)};
  return <Modal title={initial?'Edit Study Project':'New Study Project'} onClose={onClose}><form className="form" onSubmit={submit}>
    <Field label="Project title"><input required value={title} onChange={e=>setTitle(e.target.value)} placeholder="RAG"/></Field>
    <Field label="Subtitle"><input value={subtitle} onChange={e=>setSubtitle(e.target.value)} placeholder="Retrieval-Augmented Generation"/></Field>
    <Field label="Description"><textarea rows={3} value={description} onChange={e=>setDescription(e.target.value)} placeholder="What will this project cover?"/></Field>
    <Field label="Why am I learning this?"><textarea rows={3} value={why} onChange={e=>setWhy(e.target.value)}/></Field>
    <div className="form-grid"><Field label="Status"><select value={status} onChange={e=>setStatus(e.target.value as StudyProjectStatus)}><option value="idea">Idea</option><option value="active">Active</option><option value="paused">Paused</option><option value="completed">Completed</option></select></Field><Field label="Importance"><Stars value={importance} onChange={setImportance}/></Field></div>
    <div className="form-grid"><Field label="Start date"><input type="date" value={start} onChange={e=>setStart(e.target.value)}/></Field><Field label="Target date"><input type="date" value={target} onChange={e=>setTarget(e.target.value)}/></Field></div>
    <FormActions onClose={onClose}/>
  </form></Modal>;
}

function StudyProjectWorkspace({projectId,tab,setTab,onBack,reloadApp}:{projectId:string;tab:ProjectTab;setTab:(t:ProjectTab)=>void;onBack:()=>void;reloadApp:()=>void}) {
  const [project,setProject]=useState<StudyProject|null>(null); const [edit,setEdit]=useState(false);
  const load=()=>call<StudyProject>('get_study_project',{id:projectId}).then(setProject); useEffect(()=>{load()},[projectId]);
  if(!project)return <div className="loading">Loading...</div>;
  const tabs:[ProjectTab,string,ReactNode][]=[['overview','Overview',<BookOpen size={15}/>],['roadmap','Roadmap',<Route size={15}/>],['notes','Study Notes',<NotebookPen size={15}/>],['resources','Resources',<Files size={15}/>],['experiments','Experiments',<FlaskConical size={15}/>],['knowledge','Knowledge',<Lightbulb size={15}/>]];
  const total=project.stage_count||0, done=project.completed_stage_count||0, progress=total?Math.round(done/total*100):0;
  return <><button className="back" onClick={onBack}><ChevronLeft size={15}/> Study Projects</button>
    <div className="project-hero"><div><span className="kicker">SELF-DIRECTED STUDY</span><h1>{project.title}</h1><p>{project.subtitle||project.description||'Independent learning project'}</p><div className="hero-meta"><Badge tone={statusTone(project.status)}>{statusLabel[project.status]}</Badge><Stars value={project.importance} readOnly/>{project.start_date&&<span>{formatDate(project.start_date)}</span>}</div></div><div className="project-hero-progress"><strong>{progress}%</strong><span>Roadmap complete</span><div className="progress-track"><i style={{width:`${progress}%`}}/></div></div></div>
    <div className="workspace-tabs project-tabs">{tabs.map(([id,label,icon])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{icon}{label}</button>)}</div>
    <div className="workspace-body">
      {tab==='overview'&&<ProjectOverviewPanel project={project} onEdit={()=>setEdit(true)} onDelete={async()=>{await call('delete_study_project',{id:project.id});reloadApp();onBack()}}/>}
      {tab==='roadmap'&&<ProjectRoadmapPanel project={project} onChanged={()=>{load();reloadApp()}}/>}
      {tab==='notes'&&<ProjectNotesPanel project={project} reloadApp={()=>{load();reloadApp()}}/>}
      {tab==='resources'&&<ProjectResourcesPanel project={project} reloadApp={()=>{load();reloadApp()}}/>}
      {tab==='experiments'&&<ProjectExperimentsPanel project={project} reloadApp={()=>{load();reloadApp()}}/>}
      {tab==='knowledge'&&<ProjectKnowledgePanel project={project} reloadApp={()=>{load();reloadApp()}}/>}
    </div>
    {edit&&<StudyProjectForm initial={project} onClose={()=>setEdit(false)} onSaved={()=>{setEdit(false);load();reloadApp()}}/>}
  </>;
}

function ProjectOverviewPanel({project,onEdit,onDelete}:{project:StudyProject;onEdit:()=>void;onDelete:()=>void}) {
  return <div><SectionTitle title="Project overview" action={<div className="card-actions"><button className="btn ghost" onClick={onEdit}><Pencil size={14}/> Edit</button><ConfirmButton onConfirm={onDelete}>Delete</ConfirmButton></div>}/>
    <div className="overview-grid"><article className="panel"><h3>Goal</h3><p className="prewrap">{project.description||'No description yet.'}</p></article><article className="panel"><h3>Why I am learning this</h3><p className="prewrap">{project.why_learning||'No motivation note yet.'}</p></article>
    <article className="panel full"><div className="project-metrics"><div><strong>{project.stage_count||0}</strong><span>Stages</span></div><div><strong>{project.note_count||0}</strong><span>Study Notes</span></div><div><strong>{project.resource_count||0}</strong><span>Resources</span></div><div><strong>{project.experiment_count||0}</strong><span>Experiments</span></div><div><strong>{project.knowledge_count||0}</strong><span>Knowledge</span></div></div></article></div>
  </div>;
}

function ProjectRoadmapPanel({project,onChanged}:{project:StudyProject;onChanged:()=>void}) {
  const [items,setItems]=useState<ProjectStage[]>([]);const [show,setShow]=useState(false);const load=()=>call<ProjectStage[]>('list_project_stages',{projectId:project.id}).then(setItems);useEffect(()=>{load()},[project.id]);
  const cycle=async(stage:ProjectStage)=>{const next:ProjectStageStatus=stage.status==='planned'?'in_progress':stage.status==='in_progress'?'completed':'planned';await call('update_project_stage',{input:{id:stage.id,status:next}});load();onChanged();};
  return <div><SectionTitle title="Learning Roadmap" action={<button className="btn primary" onClick={()=>setShow(true)}>+ Add Stage</button>}/>{items.length===0?<Empty title="No roadmap stages yet"/>:<div className="roadmap-list">{items.map((x,i)=><div className={`roadmap-stage ${x.status}`} key={x.id}><button className="stage-check" onClick={()=>cycle(x)}>{x.status==='completed'?<CircleCheckBig size={20}/>:<span>{String(i+1).padStart(2,'0')}</span>}</button><div><strong>{x.title}</strong>{x.description&&<p>{x.description}</p>}<Badge tone={statusTone(x.status)}>{statusLabel[x.status]}</Badge></div><ConfirmButton onConfirm={async()=>{await call('delete_project_stage',{id:x.id});load();onChanged()}}>Delete</ConfirmButton></div>)}</div>}{show&&<ProjectStageForm project={project} order={items.length} onClose={()=>setShow(false)} onSaved={()=>{setShow(false);load();onChanged()}}/>}</div>;
}

function ProjectStageForm({project,order,onClose,onSaved}:{project:StudyProject;order:number;onClose:()=>void;onSaved:()=>void}) {
  const [title,setTitle]=useState('');const [description,setDescription]=useState('');const [status,setStatus]=useState<ProjectStageStatus>('planned');
  const submit=async(e:FormEvent)=>{e.preventDefault();await call('add_project_stage',{input:{project_id:project.id,title,description,status,sort_order:order}});onSaved()};
  return <Modal title="Add Roadmap Stage" onClose={onClose}><form className="form" onSubmit={submit}><Field label="Stage title"><input required value={title} onChange={e=>setTitle(e.target.value)} placeholder="Understand embeddings"/></Field><Field label="Description"><textarea rows={3} value={description} onChange={e=>setDescription(e.target.value)}/></Field><Field label="Status"><select value={status} onChange={e=>setStatus(e.target.value as ProjectStageStatus)}><option value="planned">Planned</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select></Field><FormActions onClose={onClose}/></form></Modal>;
}

function ProjectNotesPanel({project,reloadApp}:{project:StudyProject;reloadApp:()=>void}) {
  const [items,setItems]=useState<ProjectNote[]>([]);const [stages,setStages]=useState<ProjectStage[]>([]);const [show,setShow]=useState(false);const [edit,setEdit]=useState<ProjectNote|null>(null);
  const load=()=>Promise.all([call<ProjectNote[]>('list_project_notes',{projectId:project.id}),call<ProjectStage[]>('list_project_stages',{projectId:project.id})]).then(([n,s])=>{setItems(n);setStages(s)});useEffect(()=>{load()},[project.id]);
  return <div><SectionTitle title="Study Notes" action={<button className="btn primary" onClick={()=>setShow(true)}>+ Add Note</button>}/>{items.length===0?<Empty title="No project notes yet"/>:<div className="timeline">{items.map(n=><div className="timeline-item" key={n.id}><div className="timeline-marker"/><article className="timeline-card"><div className="card-head"><div><span className="kicker">{n.stage_title||'PROJECT SESSION'}</span><h3>{n.title}</h3><p>{n.study_date?formatDate(n.study_date):'No date'}{n.topic?` · ${n.topic}`:''}</p></div><div className="card-actions"><Badge tone={statusTone(n.status)}>{statusLabel[n.status]}</Badge><button className="btn ghost small" onClick={()=>{setEdit(n);setShow(true)}}>Edit</button><ConfirmButton onConfirm={async()=>{await call('delete_project_note',{id:n.id});load();reloadApp()}}>Delete</ConfirmButton></div></div>{n.summary&&<div className="note-box"><strong>Summary</strong><p>{n.summary}</p></div>}<div className="mastery-line">Mastery <Stars value={n.mastery} readOnly/></div><details><summary>Open raw note</summary><pre>{n.raw_note}</pre></details></article></div>)}</div>}{show&&<ProjectNoteForm project={project} stages={stages} initial={edit} onClose={()=>{setShow(false);setEdit(null)}} onSaved={()=>{setShow(false);setEdit(null);load();reloadApp()}}/>}</div>;
}

function ProjectNoteForm({project,stages,initial,onClose,onSaved}:{project:StudyProject;stages:ProjectStage[];initial:ProjectNote|null;onClose:()=>void;onSaved:()=>void}) {
  const [title,setTitle]=useState(initial?.title||'');const [stage,setStage]=useState(initial?.stage_id||'');const [date,setDate]=useState(initial?.study_date||new Date().toISOString().slice(0,10));const [topic,setTopic]=useState(initial?.topic||'');const [raw,setRaw]=useState(initial?.raw_note||'');const [summary,setSummary]=useState(initial?.summary||'');const [learned,setLearned]=useState(initial?.learned||'');const [unresolved,setUnresolved]=useState(initial?.unresolved||'');const [mastery,setMastery]=useState(initial?.mastery||1);const [status,setStatus]=useState<StudyNoteStatus>(initial?.status||'captured');
  const submit=async(e:FormEvent)=>{e.preventDefault();await call(initial?'update_project_note':'add_project_note',{input:{id:initial?.id,project_id:project.id,stage_id:stage||null,title,study_date:date||null,topic,raw_note:raw,summary,learned,unresolved,mastery,status}});onSaved()};
  return <Modal title={initial?'Edit Project Note':'Add Project Note'} onClose={onClose} wide><form className="form" onSubmit={submit}><div className="form-grid"><Field label="Title"><input required value={title} onChange={e=>setTitle(e.target.value)}/></Field><Field label="Roadmap stage"><select value={stage} onChange={e=>setStage(e.target.value)}><option value="">No stage</option>{stages.map(x=><option value={x.id} key={x.id}>{x.title}</option>)}</select></Field></div><div className="form-grid"><Field label="Date"><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></Field><Field label="Topic"><input value={topic} onChange={e=>setTopic(e.target.value)}/></Field></div><Field label="Raw note"><textarea rows={10} value={raw} onChange={e=>setRaw(e.target.value)}/></Field><Field label="Summary"><textarea rows={3} value={summary} onChange={e=>setSummary(e.target.value)}/></Field><div className="form-grid"><Field label="What I learned"><textarea rows={3} value={learned} onChange={e=>setLearned(e.target.value)}/></Field><Field label="Still unclear"><textarea rows={3} value={unresolved} onChange={e=>setUnresolved(e.target.value)}/></Field></div><div className="form-grid"><Field label="Mastery"><Stars value={mastery} onChange={setMastery}/></Field><Field label="Review status"><select value={status} onChange={e=>setStatus(e.target.value as StudyNoteStatus)}><option value="captured">Captured</option><option value="reviewed">Reviewed</option><option value="mastered">Mastered</option></select></Field></div><FormActions onClose={onClose}/></form></Modal>;
}

function ProjectResourcesPanel({project,reloadApp}:{project:StudyProject;reloadApp:()=>void}) {
  const [items,setItems]=useState<ProjectResource[]>([]);const [stages,setStages]=useState<ProjectStage[]>([]);const [show,setShow]=useState(false);const load=()=>Promise.all([call<ProjectResource[]>('list_project_resources',{projectId:project.id}),call<ProjectStage[]>('list_project_stages',{projectId:project.id})]).then(([r,s])=>{setItems(r);setStages(s)});useEffect(()=>{load()},[project.id]);
  return <div><SectionTitle title="Resources" action={<button className="btn primary" onClick={()=>setShow(true)}>+ Add Resource</button>}/>{items.length===0?<Empty title="No resources yet"/>:<div className="resource-list">{items.map(r=><div className="resource" key={r.id}><div className="file-icon"><Link2 size={18}/></div><div className="resource-main"><div className="resource-title"><strong>{r.title}</strong><Badge tone={statusTone(r.status)}>{statusLabel[r.status]}</Badge><Stars value={r.importance} readOnly/></div><p>{r.type}{r.description?` · ${r.description}`:''}</p></div><div className="card-actions">{r.storage_type==='link'&&r.external_url&&<button className="btn ghost small" onClick={()=>window.open(r.external_url!,'_blank')}>Open</button>}{r.storage_type==='file'&&r.stored_path&&isNative()&&<button className="btn ghost small" onClick={()=>call('open_local_file',{path:r.stored_path})}>Open</button>}<ConfirmButton onConfirm={async()=>{await call('delete_project_resource',{id:r.id});load();reloadApp()}}>Delete</ConfirmButton></div></div>)}</div>}{show&&<ProjectResourceForm project={project} stages={stages} onClose={()=>setShow(false)} onSaved={()=>{setShow(false);load();reloadApp()}}/>}</div>;
}

function ProjectResourceForm({project,stages,onClose,onSaved}:{project:StudyProject;stages:ProjectStage[];onClose:()=>void;onSaved:()=>void}) {
  const [title,setTitle]=useState('');const [type,setType]=useState('Article');const [description,setDescription]=useState('');const [importance,setImportance]=useState(3);const [status,setStatus]=useState<ProjectResourceStatus>('saved');const [storage,setStorage]=useState<'file'|'link'>('link');const [url,setUrl]=useState('');const [file,setFile]=useState<File|null>(null);const [stage,setStage]=useState('');
  const submit=async(e:FormEvent)=>{e.preventDefault();const input:any={project_id:project.id,stage_id:stage||null,title,type,description,importance,status,storage_type:storage,external_url:storage==='link'?url:null};if(storage==='file'&&file){input.original_filename=file.name;input.file_base64=await fileToBase64(file)}await call('add_project_resource',{input});onSaved()};
  return <Modal title="Add Resource" onClose={onClose}><form className="form" onSubmit={submit}><Field label="Title"><input required value={title} onChange={e=>setTitle(e.target.value)}/></Field><div className="form-grid"><Field label="Type"><select value={type} onChange={e=>setType(e.target.value)}><option>Article</option><option>Paper</option><option>Video</option><option>Book</option><option>Source Code</option><option>Documentation</option><option>Tool</option><option>Other</option></select></Field><Field label="Roadmap stage"><select value={stage} onChange={e=>setStage(e.target.value)}><option value="">No stage</option>{stages.map(x=><option value={x.id} key={x.id}>{x.title}</option>)}</select></Field></div><Field label="Description"><textarea rows={3} value={description} onChange={e=>setDescription(e.target.value)}/></Field><div className="form-grid"><Field label="Status"><select value={status} onChange={e=>setStatus(e.target.value as ProjectResourceStatus)}><option value="saved">Saved</option><option value="reading">Reading</option><option value="completed">Completed</option></select></Field><Field label="Importance"><Stars value={importance} onChange={setImportance}/></Field></div><Field label="Storage"><select value={storage} onChange={e=>setStorage(e.target.value as 'file'|'link')}><option value="link">External link</option><option value="file">Local file</option></select></Field>{storage==='link'?<Field label="URL"><input required value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://..."/></Field>:<Field label="File"><input required type="file" onChange={e=>setFile(e.target.files?.[0]||null)}/></Field>}<FormActions onClose={onClose}/></form></Modal>;
}

function ProjectExperimentsPanel({project,reloadApp}:{project:StudyProject;reloadApp:()=>void}) {
  const [items,setItems]=useState<ProjectExperiment[]>([]);const [stages,setStages]=useState<ProjectStage[]>([]);const [show,setShow]=useState(false);const [edit,setEdit]=useState<ProjectExperiment|null>(null);const load=()=>Promise.all([call<ProjectExperiment[]>('list_project_experiments',{projectId:project.id}),call<ProjectStage[]>('list_project_stages',{projectId:project.id})]).then(([e,s])=>{setItems(e);setStages(s)});useEffect(()=>{load()},[project.id]);
  return <div><SectionTitle title="Experiments" action={<button className="btn primary" onClick={()=>setShow(true)}>+ New Experiment</button>}/>{items.length===0?<Empty title="No experiments yet"/>:<div className="experiment-grid">{items.map(x=><article className="experiment-card" key={x.id}><div className="card-head"><div><span className="kicker">EXPERIMENT</span><h3>{x.title}</h3></div><div className="card-actions"><Badge tone={statusTone(x.status)}>{statusLabel[x.status]}</Badge><button className="btn ghost small" onClick={()=>{setEdit(x);setShow(true)}}>Edit</button><ConfirmButton onConfirm={async()=>{await call('delete_project_experiment',{id:x.id});load();reloadApp()}}>Delete</ConfirmButton></div></div>{x.question&&<div className="experiment-section"><strong>Question</strong><p>{x.question}</p></div>}{x.setup&&<div className="experiment-section"><strong>Setup</strong><p>{x.setup}</p></div>}{x.result&&<div className="experiment-section"><strong>Result</strong><p>{x.result}</p></div>}{x.conclusion&&<div className="experiment-conclusion"><strong>Conclusion</strong><p>{x.conclusion}</p></div>}{x.code_reference&&<code>{x.code_reference}</code>}</article>)}</div>}{show&&<ProjectExperimentForm project={project} stages={stages} initial={edit} onClose={()=>{setShow(false);setEdit(null)}} onSaved={()=>{setShow(false);setEdit(null);load();reloadApp()}}/>}</div>;
}

function ProjectExperimentForm({project,stages,initial,onClose,onSaved}:{project:StudyProject;stages:ProjectStage[];initial:ProjectExperiment|null;onClose:()=>void;onSaved:()=>void}) {
  const [title,setTitle]=useState(initial?.title||'');const [stage,setStage]=useState(initial?.stage_id||'');const [question,setQuestion]=useState(initial?.question||'');const [setup,setSetup]=useState(initial?.setup||'');const [result,setResult]=useState(initial?.result||'');const [conclusion,setConclusion]=useState(initial?.conclusion||'');const [code,setCode]=useState(initial?.code_reference||'');const [status,setStatus]=useState<ProjectExperimentStatus>(initial?.status||'planned');
  const submit=async(e:FormEvent)=>{e.preventDefault();await call(initial?'update_project_experiment':'add_project_experiment',{input:{id:initial?.id,project_id:project.id,stage_id:stage||null,title,question,setup,result,conclusion,code_reference:code,status}});onSaved()};
  return <Modal title={initial?'Edit Experiment':'New Experiment'} onClose={onClose} wide><form className="form" onSubmit={submit}><div className="form-grid"><Field label="Title"><input required value={title} onChange={e=>setTitle(e.target.value)}/></Field><Field label="Roadmap stage"><select value={stage} onChange={e=>setStage(e.target.value)}><option value="">No stage</option>{stages.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select></Field></div><Field label="Question / hypothesis"><textarea rows={3} value={question} onChange={e=>setQuestion(e.target.value)}/></Field><Field label="Setup"><textarea rows={4} value={setup} onChange={e=>setSetup(e.target.value)}/></Field><Field label="Result"><textarea rows={4} value={result} onChange={e=>setResult(e.target.value)}/></Field><Field label="Conclusion"><textarea rows={4} value={conclusion} onChange={e=>setConclusion(e.target.value)}/></Field><div className="form-grid"><Field label="Code / reference"><input value={code} onChange={e=>setCode(e.target.value)} placeholder="rag/chunk-test.py or GitHub URL"/></Field><Field label="Status"><select value={status} onChange={e=>setStatus(e.target.value as ProjectExperimentStatus)}><option value="planned">Planned</option><option value="running">Running</option><option value="completed">Completed</option></select></Field></div><FormActions onClose={onClose}/></form></Modal>;
}

function ProjectKnowledgePanel({project,reloadApp}:{project:StudyProject;reloadApp:()=>void}) {
  const [items,setItems]=useState<ProjectKnowledge[]>([]);const [notes,setNotes]=useState<ProjectNote[]>([]);const [show,setShow]=useState(false);const load=()=>Promise.all([call<ProjectKnowledge[]>('list_project_knowledge',{projectId:project.id}),call<ProjectNote[]>('list_project_notes',{projectId:project.id})]).then(([k,n])=>{setItems(k);setNotes(n)});useEffect(()=>{load()},[project.id]);
  return <div><SectionTitle title="Project Knowledge" action={<button className="btn primary" onClick={()=>setShow(true)}>+ Add Knowledge</button>}/>{items.length===0?<Empty title="No project knowledge yet"/>:<div className="knowledge-grid">{items.map(n=><article className={`knowledge-card ${n.is_pinned?'pinned':''}`} key={n.id}><div className="card-head"><div><span className="kicker">{project.title}</span><h3>{n.title}</h3></div><Stars value={n.importance} readOnly/></div><p className="prewrap">{n.content}</p>{n.why_it_matters&&<div className="why"><strong>Why it matters</strong><p>{n.why_it_matters}</p></div>}<div className="card-actions"><ConfirmButton onConfirm={async()=>{await call('delete_project_knowledge',{id:n.id});load();reloadApp()}}>Delete</ConfirmButton></div></article>)}</div>}{show&&<ProjectKnowledgeForm project={project} notes={notes} onClose={()=>setShow(false)} onSaved={()=>{setShow(false);load();reloadApp()}}/>}</div>;
}

function ProjectKnowledgeForm({project,notes,onClose,onSaved}:{project:StudyProject;notes:ProjectNote[];onClose:()=>void;onSaved:()=>void}) {
  const [title,setTitle]=useState('');const [content,setContent]=useState('');const [why,setWhy]=useState('');const [importance,setImportance]=useState(4);const [pinned,setPinned]=useState(false);const [note,setNote]=useState('');
  const submit=async(e:FormEvent)=>{e.preventDefault();await call('add_project_knowledge',{input:{project_id:project.id,project_note_id:note||null,title,content,why_it_matters:why,importance,is_pinned:pinned}});onSaved()};
  return <Modal title="Add Project Knowledge" onClose={onClose}><form className="form" onSubmit={submit}><Field label="Title"><input required value={title} onChange={e=>setTitle(e.target.value)}/></Field><Field label="Source note"><select value={note} onChange={e=>setNote(e.target.value)}><option value="">No source note</option>{notes.map(n=><option value={n.id} key={n.id}>{n.title}</option>)}</select></Field><Field label="Knowledge"><textarea required rows={6} value={content} onChange={e=>setContent(e.target.value)}/></Field><Field label="Why it matters"><textarea rows={3} value={why} onChange={e=>setWhy(e.target.value)}/></Field><div className="form-grid"><Field label="Importance"><Stars value={importance} onChange={setImportance}/></Field><Field label="Pin"><label className="check-line"><input type="checkbox" checked={pinned} onChange={e=>setPinned(e.target.checked)}/> Keep at the top</label></Field></div><FormActions onClose={onClose}/></form></Modal>;
}

function GlobalStudyNotes({onSubject,onProject,reloadApp}:{onSubject:(id:string)=>void;onProject:(id:string)=>void;reloadApp:()=>void}) {
  const [academic,setAcademic]=useState<StudyNote[]>([]);const [projects,setProjects]=useState<ProjectNote[]>([]);const [q,setQ]=useState('');
  const load=()=>Promise.all([call<StudyNote[]>('list_study_notes',{}),call<ProjectNote[]>('list_project_notes',{})]).then(([a,p])=>{setAcademic(a);setProjects(p)});useEffect(()=>{load()},[]);
  const term=q.toLowerCase();
  const a=academic.filter(n=>`${n.title} ${n.topic||''} ${n.raw_note} ${n.subject_code||''}`.toLowerCase().includes(term));
  const p=projects.filter(n=>`${n.title} ${n.topic||''} ${n.raw_note} ${n.project_title||''}`.toLowerCase().includes(term));
  return <><PageHeader title="Study Notes"/><div className="toolbar"><input className="filter" placeholder="Filter notes..." value={q} onChange={e=>setQ(e.target.value)}/></div>{a.length===0&&p.length===0?<Empty title="No matching study notes"/>:<div className="two-col"><div><SectionTitle title="Academic"/><div className="list-card">{a.length?a.map(n=><NoteRow key={n.id} note={n} onClick={()=>onSubject(n.subject_id)}/>):<SmallEmpty text="No academic notes."/>}</div></div><div><SectionTitle title="Study Projects"/><div className="list-card">{p.length?p.map(n=><button className="note-row" key={n.id} onClick={()=>onProject(n.project_id)}><div><strong>{n.project_title} · {n.title}</strong><span>{n.stage_title||'Project session'}{n.study_date?` · ${formatDate(n.study_date)}`:''}</span></div><Badge tone={statusTone(n.status)}>{statusLabel[n.status]}</Badge></button>):<SmallEmpty text="No project notes."/>}</div></div></div>}</>;
}

function KnowledgeVault({onSubject,onProject,reloadApp}:{onSubject:(id:string)=>void;onProject:(id:string)=>void;reloadApp:()=>void}) {
  const [academic,setAcademic]=useState<CriticalNote[]>([]);const [projects,setProjects]=useState<ProjectKnowledge[]>([]);const [q,setQ]=useState('');
  const load=()=>Promise.all([call<CriticalNote[]>('list_critical_notes',{}),call<ProjectKnowledge[]>('list_project_knowledge',{})]).then(([a,p])=>{setAcademic(a);setProjects(p)});useEffect(()=>{load()},[]);
  const term=q.toLowerCase();const a=academic.filter(n=>`${n.title} ${n.content} ${n.why_it_matters||''} ${n.subject_code||''}`.toLowerCase().includes(term));const p=projects.filter(n=>`${n.title} ${n.content} ${n.why_it_matters||''} ${n.project_title||''}`.toLowerCase().includes(term));
  return <><PageHeader title="Knowledge Vault"/><div className="toolbar"><input className="filter" placeholder="Search knowledge..." value={q} onChange={e=>setQ(e.target.value)}/></div>{a.length===0&&p.length===0?<Empty title="Knowledge Vault is empty"/>:<div className="knowledge-grid">{a.map(n=><button className={`knowledge-card clickable ${n.is_pinned?'pinned':''}`} key={`a-${n.id}`} onClick={()=>onSubject(n.subject_id)}><div className="card-head"><div><span className="kicker">{n.subject_code||'SUBJECT'}</span><h3>{n.title}</h3></div><Stars value={n.importance} readOnly/></div><p className="prewrap">{n.content}</p>{n.why_it_matters&&<div className="why"><strong>Why it matters</strong><p>{n.why_it_matters}</p></div>}</button>)}{p.map(n=><button className={`knowledge-card clickable project-knowledge ${n.is_pinned?'pinned':''}`} key={`p-${n.id}`} onClick={()=>onProject(n.project_id)}><div className="card-head"><div><span className="kicker">PROJECT · {n.project_title}</span><h3>{n.title}</h3></div><Stars value={n.importance} readOnly/></div><p className="prewrap">{n.content}</p>{n.why_it_matters&&<div className="why"><strong>Why it matters</strong><p>{n.why_it_matters}</p></div>}</button>)}</div>}</>;
}

function SettingsPage({reloadApp}:{reloadApp:()=>void}) {
  const [info,setInfo]=useState<AppInfo|null>(null);const [message,setMessage]=useState('');
  useEffect(()=>{call<AppInfo>('app_info').then(setInfo)},[]);
  const backup=async()=>{
    setMessage('');
    if(isNative()){
      const path=await call<string>('create_backup');
      setMessage(`Backup created: ${path}`);
    } else {
      const json=await call<string>('export_json');
      downloadText(`MyStudyHub_Backup_${new Date().toISOString().slice(0,10)}.json`,json);
      setMessage('JSON backup downloaded.');
    }
  };
  const restore=async(file?:File)=>{if(!file)return;setMessage('Restoring...');if(isNative()){const b64=await fileToBase64(file);await call('restore_backup',{base64Data:b64});}else{const text=await file.text();await call('import_json',{jsonText:text});}setMessage('Restore completed. Reloading data...');reloadApp();};
  return <><PageHeader title="Settings"/>
    <div className="settings-grid"><article className="panel"><h3>Storage</h3><p>{info?.mode==='native'?'Native desktop + SQLite':'Browser preview + localStorage'}</p><code>{info?.data_dir||'Loading...'}</code>{isNative()&&<button className="btn ghost" onClick={()=>call('open_data_folder')}>Open data folder</button>}</article>
    <article className="panel"><h3>Backup</h3><p>{isNative()?'Create a ZIP containing the SQLite database and all locally stored files.':'Export the browser preview data as JSON.'}</p><button className="btn primary" onClick={backup}>Create Backup</button></article>
    <article className="panel"><h3>Restore</h3><p>Restore your workspace from a previous backup.</p><input type="file" accept={isNative()?'.zip':'application/json,.json'} onChange={e=>restore(e.target.files?.[0])}/></article>
    <article className="panel danger-panel"><h3>Reset</h3><p>Delete all data currently stored in this local workspace.</p><button className="btn danger" onClick={async()=>{if(confirm('Delete ALL local data? This cannot be undone unless you have a backup.')){await call('reset_all_data');reloadApp();setMessage('All local data cleared.')}}}>Reset All Data</button></article></div>
    {message&&<div className="notice">{message}</div>}
  </>;
}

function PageHeader({eyebrow,title,description,action}:{eyebrow?:string;title:string;description?:string;action?:ReactNode}) {return <div className="page-head"><div>{eyebrow&&<span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1>{description&&<p>{description}</p>}</div>{action}</div>;}
function SectionTitle({title,subtitle,action}:{title:string;subtitle?:string;action?:ReactNode}) {return <div className="section-title"><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div>{action}</div>;}
function FormActions({onClose}:{onClose:()=>void}) {return <div className="form-actions"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" type="submit">Save</button></div>;}
function SmallEmpty({text}:{text:string}) {return <div className="small-empty">{text}</div>;}
function formatDate(s:string){const d=new Date(`${s}T00:00:00`);return Number.isNaN(d.getTime())?s:d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});}
function initials(name:string){return name.split(/\s+/).slice(-2).map(x=>x[0]?.toUpperCase()).join('');}
function fileIcon(type:string){const t=type.toLowerCase();if(t.includes('slide'))return '▤';if(t.includes('source'))return '</>';if(t.includes('template'))return '□';if(t.includes('guide'))return '?';if(t.includes('book'))return '▥';return '◇';}
