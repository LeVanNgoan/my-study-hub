import React, { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { call, downloadText, fileToBase64, isNative, parseStudyNoteFilename } from './api';
import type {
  AppInfo, CriticalNote, DashboardData, GradeComponent, GradeScheme, Lecturer, Material,
  Report, ReportFile, ReportMember, SearchResult, Semester, SemesterStatus, StudyNote, StudyNoteStatus, Subject, SubjectStatus, GradeType
} from './types';
import { Badge, ConfirmButton, Empty, Field, Modal, Stars } from './ui';

type Page = 'dashboard' | 'semesters' | 'study-notes' | 'knowledge' | 'settings';
type SubjectTab = 'overview' | 'study-notes' | 'materials' | 'critical' | 'reports' | 'lecturer' | 'results';

const statusLabel: Record<string,string> = {
  planned:'Planned', current:'Current', completed:'Completed', studying:'Studying', dropped:'Dropped',
  captured:'Captured', reviewed:'Reviewed', mastered:'Mastered', planning:'Planning', in_progress:'In progress', submitted:'Submitted'
};

const statusTone = (s: string): 'neutral'|'blue'|'green'|'amber'|'red' =>
  ['current','studying','reviewed','submitted'].includes(s) ? 'blue' :
  ['completed','mastered'].includes(s) ? 'green' :
  ['planned','planning','captured'].includes(s) ? 'amber' :
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

  const nav = (p: Page) => { setPage(p); setSubjectId(null); setSemesterId(null); };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">MS</div><div><strong>My Study Hub</strong><span>Local-first</span></div></div>
        <nav>
          <NavButton active={page==='dashboard'} onClick={() => nav('dashboard')} icon="⌂">Dashboard</NavButton>
          <NavButton active={page==='semesters'} onClick={() => nav('semesters')} icon="▦">Semesters</NavButton>
          <NavButton active={page==='study-notes'} onClick={() => nav('study-notes')} icon="✎">Study Notes</NavButton>
          <NavButton active={page==='knowledge'} onClick={() => nav('knowledge')} icon="◆">Knowledge Vault</NavButton>
          <NavButton active={page==='settings'} onClick={() => nav('settings')} icon="⚙">Settings</NavButton>
        </nav>
        <div className="sidebar-foot"><span className="dot online"/> No account · Local data</div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="search-wrap">
            <span>⌕</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} onFocus={()=>search && setSearchOpen(true)} placeholder="Search subjects, notes, materials..." />
            {searchOpen && <SearchPopover results={searchResults} onSubject={goSubject} onClose={()=>setSearchOpen(false)} />}
          </div>
          <div className="mode-pill">{isNative() ? 'Desktop · SQLite' : 'Browser preview · LocalStorage'}</div>
        </header>

        <section className="content">
          {page === 'dashboard' && <Dashboard key={reloadKey} onOpenSemester={(id)=>{setSemesterId(id);setPage('semesters')}} onOpenSubject={goSubject} />}
          {page === 'semesters' && (
            subjectId ? <SubjectWorkspace subjectId={subjectId} tab={subjectTab} setTab={setSubjectTab} onBack={()=>setSubjectId(null)} reloadApp={reload} /> :
            semesterId ? <SemesterDetail semesterId={semesterId} onBack={()=>setSemesterId(null)} onSubject={goSubject} reloadApp={reload} /> :
            <Semesters key={reloadKey} onOpen={setSemesterId} reloadApp={reload} />
          )}
          {page === 'study-notes' && <GlobalStudyNotes key={reloadKey} onSubject={goSubject} reloadApp={reload} />}
          {page === 'knowledge' && <KnowledgeVault key={reloadKey} onSubject={goSubject} reloadApp={reload} />}
          {page === 'settings' && <SettingsPage reloadApp={reload} />}
        </section>
      </main>
    </div>
  );
}

function NavButton({active,onClick,icon,children}:{active:boolean;onClick:()=>void;icon:string;children:ReactNode}) {
  return <button className={`nav-btn ${active?'active':''}`} onClick={onClick}><span>{icon}</span>{children}</button>;
}

function SearchPopover({results,onSubject,onClose}:{results:SearchResult[];onSubject:(id:string)=>void;onClose:()=>void}) {
  return <div className="search-popover">
    <div className="search-title">Search results</div>
    {results.length===0 ? <div className="search-empty">Không tìm thấy dữ liệu.</div> : results.map(r => (
      <button key={`${r.kind}-${r.id}`} onClick={()=>{if(r.subject_id)onSubject(r.subject_id); else onClose();}}>
        <span className="result-kind">{r.kind.replace('_',' ')}</span><strong>{r.title}</strong>{r.subtitle && <small>{r.subtitle}</small>}
      </button>
    ))}
  </div>;
}

function Dashboard({onOpenSemester,onOpenSubject}:{onOpenSemester:(id:string)=>void;onOpenSubject:(id:string)=>void}) {
  const [data,setData] = useState<DashboardData|null>(null);
  useEffect(()=>{ call<DashboardData>('dashboard').then(setData); },[]);
  if(!data) return <div className="loading">Loading...</div>;

  return <>
    <PageHeader eyebrow="LOCAL STUDY SYSTEM" title="Dashboard" description="Một nơi để lưu lại toàn bộ quá trình học của bạn — không tài khoản, không curriculum cố định." />
    {!data.current_semester ? (
      <Empty title="Chưa có học kỳ hiện tại" description="Tạo học kỳ đầu tiên, sau đó tự thêm các môn bạn muốn quản lý." action={<button className="btn primary" onClick={()=>onOpenSemester('')}>Tạo học kỳ</button>} />
    ) : <>
      <div className="current-banner" onClick={()=>onOpenSemester(data.current_semester!.id)}>
        <div><span>CURRENT SEMESTER</span><h2>{data.current_semester.name}</h2><p>{data.current_semester.number!==null ? `Kỳ ${data.current_semester.number}` : 'Custom semester'} · {data.current_semester.description || 'Đang học'}</p></div>
        <Badge tone="blue">Current</Badge>
      </div>
      <div className="stats-grid">
        <Stat label="Semesters" value={data.semester_count}/><Stat label="Subjects" value={data.subject_count}/><Stat label="Study Notes" value={data.study_note_count}/><Stat label="Materials" value={data.material_count}/><Stat label="Critical Notes" value={data.critical_note_count}/>
      </div>
      <SectionTitle title="Current subjects" subtitle="Các môn trong học kỳ hiện tại" />
      <div className="subject-grid">
        {data.current_subjects.map(s=><button className="subject-card" key={s.id} onClick={()=>onOpenSubject(s.id)}>
          <div className="subject-card-top"><Badge tone={statusTone(s.status)}>{statusLabel[s.status]||s.status}</Badge><Stars value={s.importance} readOnly/></div>
          <strong>{s.code}</strong><h3>{s.name}</h3>
          <div className="mini-stats"><span>{s.study_note_count} notes</span><span>{s.material_count} materials</span><span>{s.critical_note_count} critical</span></div>
        </button>)}
      </div>
      <div className="two-col">
        <div><SectionTitle title="Recent study"/><div className="list-card">{data.recent_notes.length ? data.recent_notes.map(n=><NoteRow key={n.id} note={n} onClick={()=>onOpenSubject(n.subject_id)}/>) : <SmallEmpty text="Chưa có study note."/>}</div></div>
        <div><SectionTitle title="Need review"/><div className="list-card">{data.need_review.length ? data.need_review.map(n=><NoteRow key={n.id} note={n} onClick={()=>onOpenSubject(n.subject_id)} review/>) : <SmallEmpty text="Không có note cần review."/>}</div></div>
      </div>
    </>}
  </>;
}

function Stat({label,value}:{label:string;value:number}) { return <div className="stat"><strong>{value}</strong><span>{label}</span></div>; }
function NoteRow({note,onClick,review=false}:{note:StudyNote;onClick:()=>void;review?:boolean}) { return <button className="note-row" onClick={onClick}><div><strong>{note.subject_code} · {note.title}</strong><span>{note.week?`Week ${String(note.week).padStart(2,'0')}`:''}{note.slot?` · Slot ${String(note.slot).padStart(2,'0')}`:''}{note.study_date?` · ${formatDate(note.study_date)}`:''}</span></div>{review?<span className="mastery">{'★'.repeat(note.mastery)}{'☆'.repeat(5-note.mastery)}</span>:<Badge tone={statusTone(note.status)}>{statusLabel[note.status]}</Badge>}</button>; }

function Semesters({onOpen,reloadApp}:{onOpen:(id:string)=>void;reloadApp:()=>void}) {
  const [items,setItems]=useState<Semester[]>([]); const [show,setShow]=useState(false); const [edit,setEdit]=useState<Semester|null>(null);
  const load=()=>call<Semester[]>('list_semesters').then(setItems); useEffect(()=>{load()},[]);
  return <>
    <PageHeader eyebrow="MANUAL SETUP" title="Semesters" description="Bạn tự quyết định kỳ số mấy, tên gì, status gì và gồm những môn nào." action={<button className="btn primary" onClick={()=>setShow(true)}>+ Add Semester</button>}/>
    {items.length===0?<Empty title="Chưa có semester" description="Không có dữ liệu setup sẵn. Hãy tạo cấu trúc học tập theo đúng cách của bạn." action={<button className="btn primary" onClick={()=>setShow(true)}>+ Add Semester</button>}/>:<div className="semester-list">{items.map(s=><div className="semester-card" key={s.id}>
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
    <div className="form-grid"><Field label="Kỳ số mấy?"><input type="number" min="0" value={number} onChange={e=>setNumber(e.target.value)} placeholder="4"/></Field><Field label="Tên kỳ"><input required value={name} onChange={e=>setName(e.target.value)} placeholder="FALL2026"/></Field></div>
    <Field label="Status"><select value={status} onChange={e=>setStatus(e.target.value as SemesterStatus)}><option value="planned">Planned</option><option value="current">Current</option><option value="completed">Completed</option></select></Field>
    <div className="form-grid"><Field label="Start date"><input type="date" value={start} onChange={e=>setStart(e.target.value)}/></Field><Field label="End date"><input type="date" value={end} onChange={e=>setEnd(e.target.value)}/></Field></div>
    <Field label="Description / Note"><textarea rows={3} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Ghi chú về học kỳ..."/></Field>
    <FormActions onClose={onClose}/>
  </form></Modal>;
}

function SemesterDetail({semesterId,onBack,onSubject,reloadApp}:{semesterId:string;onBack:()=>void;onSubject:(id:string)=>void;reloadApp:()=>void}) {
  const [semester,setSemester]=useState<Semester|null>(null); const [subjects,setSubjects]=useState<Subject[]>([]); const [show,setShow]=useState(false);
  const load=async()=>{const sems=await call<Semester[]>('list_semesters');setSemester(sems.find(x=>x.id===semesterId)||null);setSubjects(await call<Subject[]>('list_subjects',{semesterId}));};
  useEffect(()=>{load()},[semesterId]);
  if(!semester)return <div className="loading">Loading...</div>;
  return <>
    <button className="back" onClick={onBack}>← All semesters</button>
    <PageHeader eyebrow={semester.number!==null?`TERM ${semester.number}`:'CUSTOM TERM'} title={semester.name} description={semester.description||'Quản lý các môn học trong kỳ này.'} action={<button className="btn primary" onClick={()=>setShow(true)}>+ Add Subject</button>}/>
    <div className="semester-meta"><Badge tone={statusTone(semester.status)}>{statusLabel[semester.status]}</Badge>{semester.start_date&&<span>{formatDate(semester.start_date)}</span>}{semester.end_date&&<span>→ {formatDate(semester.end_date)}</span>}</div>
    {subjects.length===0?<Empty title="Chưa có môn học" description="Subject cũng hoàn toàn do bạn tự thêm, không có dữ liệu cố định." action={<button className="btn primary" onClick={()=>setShow(true)}>+ Add Subject</button>}/>:<div className="subject-grid">{subjects.map(s=><button className="subject-card" key={s.id} onClick={()=>onSubject(s.id)}>
      <div className="subject-card-top"><Badge tone={statusTone(s.status)}>{statusLabel[s.status]}</Badge><Stars value={s.importance} readOnly/></div><strong>{s.code}</strong><h3>{s.name}</h3><p className="clamp">{s.introduction||s.my_understanding||'Chưa có introduction.'}</p>
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
    <Field label="Introduction"><textarea rows={3} value={intro} onChange={e=>setIntro(e.target.value)} placeholder="Môn này học về gì?"/></Field>
    <Field label="My Understanding"><textarea rows={3} value={understanding} onChange={e=>setUnderstanding(e.target.value)} placeholder="Sau khi học, chính bạn hiểu môn này như thế nào?"/></Field>
    <Field label="Why Important?"><textarea rows={2} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Vì sao môn này quan trọng với bạn?"/></Field>
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
    <button className="back" onClick={onBack}>← Semester</button>
    <div className="subject-hero"><div><div className="hero-meta"><Badge tone={statusTone(subject.status)}>{statusLabel[subject.status]}</Badge><Stars value={subject.importance} readOnly/></div><span className="subject-code">{subject.code}</span><h1>{subject.name}</h1>{subject.importance_reason&&<p>{subject.importance_reason}</p>}</div><button className="btn ghost" onClick={()=>setShowEdit(true)}>Edit subject</button></div>
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
    <article className="panel"><h3>Introduction</h3><p className="prewrap">{subject.introduction||'Chưa có introduction.'}</p></article>
    <article className="panel"><h3>My Understanding</h3><p className="prewrap">{subject.my_understanding||'Chưa có phần ghi lại cách bạn hiểu môn học.'}</p></article>
    <article className="panel full"><h3>Why this subject matters</h3><div className="importance-line"><Stars value={subject.importance} readOnly/><strong>{subject.importance}/5</strong></div><p className="prewrap">{subject.importance_reason||'Chưa đánh giá lý do.'}</p>{subject.note&&<><h4>Other note</h4><p className="prewrap">{subject.note}</p></>}</article>
  </div>;
}

function StudyNotesPanel({subject,reloadApp}:{subject:Subject;reloadApp:()=>void}) {
  const [items,setItems]=useState<StudyNote[]>([]); const [show,setShow]=useState(false); const [edit,setEdit]=useState<StudyNote|null>(null);
  const load=()=>call<StudyNote[]>('list_study_notes',{subjectId:subject.id}).then(setItems); useEffect(()=>{load()},[subject.id]);
  return <div>
    <SectionTitle title="Study Notes" subtitle="Lưu raw note theo từng buổi học, sau đó review và chắt lọc thành Critical Notes." action={<button className="btn primary" onClick={()=>setShow(true)}>+ Capture Study Note</button>}/>
    {items.length===0?<Empty title="Chưa có study note" description="Bạn có thể tạo thủ công hoặc import file theo quy ước WWSS-DDMMYY.txt." action={<button className="btn primary" onClick={()=>setShow(true)}>+ Capture Study Note</button>}/>:<div className="timeline">{items.map(n=><article className="timeline-item" key={n.id}>
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
    <Field label="Import note file" hint="Tên kiểu 0102-110926.txt sẽ tự hiểu Week 01 · Slot 02 · 11/09/2026."><input type="file" accept=".txt,.md,text/plain,text/markdown" onChange={e=>chooseFile(e.target.files?.[0])}/></Field>
    <div className="form-grid three"><Field label="Week"><input type="number" min="1" value={week} onChange={e=>setWeek(e.target.value)}/></Field><Field label="Slot"><input type="number" min="1" value={slot} onChange={e=>setSlot(e.target.value)}/></Field><Field label="Date"><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></Field></div>
    <Field label="Title"><input required value={title} onChange={e=>setTitle(e.target.value)} placeholder="Requirements introduction"/></Field><Field label="Topic"><input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Requirements Engineering"/></Field>
    <Field label="Raw Note"><textarea className="mono" rows={12} value={raw} onChange={e=>setRaw(e.target.value)} placeholder="Nội dung ghi trực tiếp trong buổi học..."/></Field>
    <Field label="Summary"><textarea rows={3} value={summary} onChange={e=>setSummary(e.target.value)} placeholder="Tóm tắt sau khi review..."/></Field>
    <div className="form-grid"><Field label="What I learned"><textarea rows={3} value={learned} onChange={e=>setLearned(e.target.value)}/></Field><Field label="What I don't understand"><textarea rows={3} value={unresolved} onChange={e=>setUnresolved(e.target.value)}/></Field></div>
    <div className="form-grid"><Field label="Mastery"><Stars value={mastery} onChange={setMastery}/></Field><Field label="Status"><select value={status} onChange={e=>setStatus(e.target.value as StudyNoteStatus)}><option value="captured">Captured</option><option value="reviewed">Reviewed</option><option value="mastered">Mastered</option></select></Field></div>
    <FormActions onClose={onClose}/>
  </form></Modal>;
}

function MaterialsPanel({subject,reloadApp}:{subject:Subject;reloadApp:()=>void}) {
  const [items,setItems]=useState<Material[]>([]); const [show,setShow]=useState(false);
  const load=()=>call<Material[]>('list_materials',{subjectId:subject.id}).then(setItems); useEffect(()=>{load()},[subject.id]);
  return <div><SectionTitle title="Materials" subtitle="Slide, source code, template, guide, reference hoặc link." action={<button className="btn primary" onClick={()=>setShow(true)}>+ Add Material</button>}/>
    {items.length===0?<Empty title="Chưa có material" description="Lưu file local hoặc chỉ giữ link ngoài."/>:<div className="resource-list">{items.map(m=><article className="resource" key={m.id}><div className="file-icon">{fileIcon(m.type)}</div><div className="resource-main"><div className="resource-title"><strong>{m.title}</strong><Stars value={m.importance} readOnly/></div><span>{m.type} · {m.storage_type==='file'?(m.original_filename||'Local file'):'External link'}</span>{m.description&&<p>{m.description}</p>}{m.external_url&&<a href={m.external_url} target="_blank" rel="noreferrer">Open link ↗</a>}{m.stored_path&&isNative()&&<button className="btn ghost small" onClick={()=>call('open_local_file',{path:m.stored_path})}>Open file</button>}</div><ConfirmButton onConfirm={async()=>{await call('delete_material',{id:m.id});load();reloadApp();}}>Delete</ConfirmButton></article>)}</div>}
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
  return <div><SectionTitle title="Critical Notes" subtitle="Chỉ giữ những kiến thức bạn thật sự không muốn quên." action={<button className="btn primary" onClick={()=>setShow(true)}>+ Add Critical Note</button>}/>
    {items.length===0?<Empty title="Chưa có Critical Note" description="Sau khi review Study Note, hãy chắt lọc kiến thức quan trọng sang đây."/>:<div className="knowledge-grid">{items.map(n=><article className={`knowledge-card ${n.is_pinned?'pinned':''}`} key={n.id}><div className="card-head"><div><span className="kicker">{n.is_pinned?'PINNED':'CRITICAL KNOWLEDGE'}</span><h3>{n.title}</h3></div><Stars value={n.importance} readOnly/></div><p className="prewrap">{n.content}</p>{n.why_it_matters&&<div className="why"><strong>Why it matters</strong><p>{n.why_it_matters}</p></div>}<ConfirmButton onConfirm={async()=>{await call('delete_critical_note',{id:n.id});load();reloadApp();}}>Delete</ConfirmButton></article>)}</div>}
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
  return <div><SectionTitle title="Reports / Projects" subtitle="Quản lý report, assignment, project, team member và file theo từng môn." action={<button className="btn primary" onClick={()=>setShow(true)}>+ Add Report</button>}/>
    {items.length===0?<Empty title="Chưa có report" description="Tạo report/project khi môn học phát sinh bài nhóm hoặc bài nộp."/>:<div className="report-list">{items.map(r=><article className="report-card" key={r.id}><div className="card-head"><div><Badge tone={statusTone(r.status)}>{statusLabel[r.status]||r.status}</Badge><h3>{r.title}</h3><span>{r.type}{r.deadline?` · Deadline ${formatDate(r.deadline)}`:''}</span></div><div className="card-actions"><button className="btn ghost small" onClick={()=>setExpanded(expanded===r.id?null:r.id)}>{expanded===r.id?'Close':'Open'}</button><ConfirmButton onConfirm={async()=>{await call('delete_report',{id:r.id});load();reloadApp();}}>Delete</ConfirmButton></div></div>{r.description&&<p>{r.description}</p>}{expanded===r.id&&<ReportDetail report={r}/>}</article>)}</div>}
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
  return <div><SectionTitle title="Lecturers" subtitle="Lưu thông tin giảng viên để sau này nhìn lại môn học vẫn nhớ ai đã dạy và cách làm việc của họ." action={<button className="btn primary" onClick={()=>setShow(true)}>+ Add Lecturer</button>}/>
    {items.length===0?<Empty title="Chưa có lecturer" description="Bạn có thể thêm một hoặc nhiều giảng viên cho môn này."/>:<div className="people-grid">{items.map(l=><article className="person-card" key={l.id}><div className="avatar">{initials(l.name)}</div><div><span className="kicker">{l.role||'LECTURER'}</span><h3>{l.name}</h3>{l.email&&<a href={`mailto:${l.email}`}>{l.email}</a>}{l.phone&&<p>{l.phone}</p>}{l.contact&&<p>{l.contact}</p>}{l.note&&<div className="why"><strong>My note</strong><p>{l.note}</p></div>}</div><ConfirmButton onConfirm={async()=>{await call('delete_lecturer',{id:l.id});load();}}>Delete</ConfirmButton></article>)}</div>}
    {show&&<LecturerForm subject={subject} onClose={()=>setShow(false)} onSaved={()=>{setShow(false);load()}}/>}
  </div>;
}

function LecturerForm({subject,onClose,onSaved}:{subject:Subject;onClose:()=>void;onSaved:()=>void}) {
  const [name,setName]=useState('');const [email,setEmail]=useState('');const [phone,setPhone]=useState('');const [contact,setContact]=useState('');const [role,setRole]=useState('Main Lecturer');const [note,setNote]=useState('');
  const submit=async(e:FormEvent)=>{e.preventDefault();await call('add_lecturer',{input:{subject_id:subject.id,name,email,phone,contact,role,note}});onSaved();};
  return <Modal title="Add Lecturer" onClose={onClose}><form className="form" onSubmit={submit}><Field label="Name"><input required value={name} onChange={e=>setName(e.target.value)}/></Field><div className="form-grid"><Field label="Email"><input type="email" value={email} onChange={e=>setEmail(e.target.value)}/></Field><Field label="Phone"><input value={phone} onChange={e=>setPhone(e.target.value)}/></Field></div><Field label="Role"><input value={role} onChange={e=>setRole(e.target.value)}/></Field><Field label="Contact / Office"><input value={contact} onChange={e=>setContact(e.target.value)} placeholder="Teams / Office / Campus..."/></Field><Field label="My note about lecturer"><textarea rows={4} value={note} onChange={e=>setNote(e.target.value)} placeholder="Cách giảng, cách chấm, điều cần chú ý..."/></Field><FormActions onClose={onClose}/></form></Modal>;
}

function ResultsPanel({subject}:{subject:Subject}) {
  const [scheme,setScheme]=useState<GradeScheme|null>(null);const [components,setComponents]=useState<GradeComponent[]>([]);const [showScheme,setShowScheme]=useState(false);const [showComponent,setShowComponent]=useState(false);
  const load=async()=>{const d=await call<{scheme:GradeScheme|null;components:GradeComponent[]}>('get_grade_scheme',{subjectId:subject.id});setScheme(d.scheme);setComponents(d.components);};useEffect(()=>{load()},[subject.id]);
  const weighted=useMemo(()=>{if(!scheme||scheme.type!=='numeric')return null;let totalWeight=0,earned=0;components.forEach(c=>{if(c.score!==null&&c.score!==undefined&&c.weight!==null&&c.weight!==undefined){totalWeight+=c.weight;earned+=(c.score/c.max_score)*c.weight;}});return {totalWeight,earned,current:totalWeight?earned/totalWeight*10:null};},[scheme,components]);
  return <div><SectionTitle title="Results" subtitle="Mỗi môn tự cấu hình Numeric / Pass-Fail / No Grade / Custom." action={<button className="btn primary" onClick={()=>setShowScheme(true)}>{scheme?'Edit Scheme':'Create Scheme'}</button>}/>
    {!scheme?<Empty title="Chưa có grade scheme" description="Nếu môn không có điểm, bạn vẫn có thể chọn No Grade."/>:<>
      <div className="grade-summary"><div><span>GRADE TYPE</span><strong>{scheme.type.replace('_',' ').toUpperCase()}</strong></div>{weighted&&<><div><span>RECORDED WEIGHT</span><strong>{weighted.totalWeight}%</strong></div><div><span>CURRENT SCORE</span><strong>{weighted.current?.toFixed(2)??'—'}</strong></div></>}{scheme.target_score!=null&&<div><span>TARGET</span><strong>{scheme.target_score}</strong></div>}</div>
      {scheme.type==='numeric'&&<><div className="subhead"><h3>Grade components</h3><button className="btn ghost" onClick={()=>setShowComponent(true)}>+ Component</button></div>{components.length===0?<SmallEmpty text="Chưa có component."/>:<div className="grade-table"><div className="grade-row header"><span>Component</span><span>Weight</span><span>Score</span><span>Max</span><span/></div>{components.map(c=><div className="grade-row" key={c.id}><strong>{c.name}</strong><span>{c.weight??'—'}%</span><input type="number" step="0.01" min="0" max={c.max_score} value={c.score??''} onChange={async e=>{await call('update_grade_component',{input:{id:c.id,score:e.target.value===''?null:Number(e.target.value)}});load()}}/><span>{c.max_score}</span><button className="icon-btn" onClick={async()=>{await call('delete_grade_component',{id:c.id});load()}}>×</button></div>)}</div>}</>}
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

function GlobalStudyNotes({onSubject,reloadApp}:{onSubject:(id:string)=>void;reloadApp:()=>void}) {
  const [items,setItems]=useState<StudyNote[]>([]);const [q,setQ]=useState('');const load=()=>call<StudyNote[]>('list_study_notes',{}).then(setItems);useEffect(()=>{load()},[]);
  const filtered=items.filter(n=>`${n.title} ${n.topic||''} ${n.raw_note} ${n.subject_code||''}`.toLowerCase().includes(q.toLowerCase()));
  return <><PageHeader eyebrow="ALL SUBJECTS" title="Study Notes" description="Toàn bộ lịch sử học theo từng buổi, không phụ thuộc folder."/><div className="toolbar"><input className="filter" placeholder="Filter notes..." value={q} onChange={e=>setQ(e.target.value)}/></div>{filtered.length===0?<Empty title="Không có note phù hợp"/>:<div className="list-card">{filtered.map(n=><NoteRow key={n.id} note={n} onClick={()=>onSubject(n.subject_id)}/>)}</div>}</>;
}

function KnowledgeVault({onSubject,reloadApp}:{onSubject:(id:string)=>void;reloadApp:()=>void}) {
  const [items,setItems]=useState<CriticalNote[]>([]);const [q,setQ]=useState('');const load=()=>call<CriticalNote[]>('list_critical_notes',{}).then(setItems);useEffect(()=>{load()},[]);
  const filtered=items.filter(n=>`${n.title} ${n.content} ${n.why_it_matters||''} ${n.subject_code||''}`.toLowerCase().includes(q.toLowerCase()));
  return <><PageHeader eyebrow="LONG-TERM MEMORY" title="Knowledge Vault" description="Chỉ những kiến thức quan trọng nhất bạn đã tự chắt lọc từ quá trình học."/><div className="toolbar"><input className="filter" placeholder="Search knowledge..." value={q} onChange={e=>setQ(e.target.value)}/></div>{filtered.length===0?<Empty title="Knowledge Vault đang trống"/>:<div className="knowledge-grid">{filtered.map(n=><button className={`knowledge-card clickable ${n.is_pinned?'pinned':''}`} key={n.id} onClick={()=>onSubject(n.subject_id)}><div className="card-head"><div><span className="kicker">{n.subject_code||'SUBJECT'}</span><h3>{n.title}</h3></div><Stars value={n.importance} readOnly/></div><p className="prewrap">{n.content}</p>{n.why_it_matters&&<div className="why"><strong>Why it matters</strong><p>{n.why_it_matters}</p></div>}</button>)}</div>}</>;
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
  return <><PageHeader eyebrow="LOCAL DATA" title="Settings & Backup" description="Không tài khoản. Dữ liệu của bạn nằm trên máy; vì vậy backup là chức năng quan trọng nhất."/>
    <div className="settings-grid"><article className="panel"><h3>Storage</h3><p>{info?.mode==='native'?'Native desktop + SQLite':'Browser preview + localStorage'}</p><code>{info?.data_dir||'Loading...'}</code>{isNative()&&<button className="btn ghost" onClick={()=>call('open_data_folder')}>Open data folder</button>}</article>
    <article className="panel"><h3>Backup</h3><p>{isNative()?'Tạo ZIP chứa database SQLite và toàn bộ file local.':'Xuất JSON dữ liệu preview trên browser.'}</p><button className="btn primary" onClick={backup}>Create Backup</button></article>
    <article className="panel"><h3>Restore</h3><p>Khôi phục từ backup trước đó.</p><input type="file" accept={isNative()?'.zip':'application/json,.json'} onChange={e=>restore(e.target.files?.[0])}/></article>
    <article className="panel danger-panel"><h3>Reset</h3><p>Xóa toàn bộ dữ liệu local hiện tại.</p><button className="btn danger" onClick={async()=>{if(confirm('Xóa TOÀN BỘ dữ liệu? Hành động này không thể hoàn tác nếu chưa backup.')){await call('reset_all_data');reloadApp();setMessage('All local data cleared.')}}}>Reset All Data</button></article></div>
    {message&&<div className="notice">{message}</div>}
  </>;
}

function PageHeader({eyebrow,title,description,action}:{eyebrow:string;title:string;description?:string;action?:ReactNode}) {return <div className="page-head"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{description&&<p>{description}</p>}</div>{action}</div>;}
function SectionTitle({title,subtitle,action}:{title:string;subtitle?:string;action?:ReactNode}) {return <div className="section-title"><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div>{action}</div>;}
function FormActions({onClose}:{onClose:()=>void}) {return <div className="form-actions"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" type="submit">Save</button></div>;}
function SmallEmpty({text}:{text:string}) {return <div className="small-empty">{text}</div>;}
function formatDate(s:string){const d=new Date(`${s}T00:00:00`);return Number.isNaN(d.getTime())?s:d.toLocaleDateString('vi-VN');}
function initials(name:string){return name.split(/\s+/).slice(-2).map(x=>x[0]?.toUpperCase()).join('');}
function fileIcon(type:string){const t=type.toLowerCase();if(t.includes('slide'))return '▤';if(t.includes('source'))return '</>';if(t.includes('template'))return '□';if(t.includes('guide'))return '?';if(t.includes('book'))return '▥';return '◇';}
