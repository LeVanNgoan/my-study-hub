use base64::{engine::general_purpose::STANDARD as B64, Engine as _};
use chrono::Local;
use rusqlite::{params, Connection, OptionalExtension, Params};
use serde_json::{json, Value};
use std::{
  fs::{self, File},
  io::{Cursor, Read, Write},
  path::{Path, PathBuf},
  process::Command,
};
use tauri::{AppHandle, Manager};
use zip::{write::SimpleFileOptions, ZipArchive, ZipWriter};

const DB_FILE: &str = "studyhub.db";

fn app_dir(app: &AppHandle) -> Result<PathBuf, String> {
  let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
  fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
  Ok(dir)
}

fn db_path(app: &AppHandle) -> Result<PathBuf, String> {
  Ok(app_dir(app)?.join(DB_FILE))
}

fn conn(app: &AppHandle) -> Result<Connection, String> {
  let c = Connection::open(db_path(app)?).map_err(|e| e.to_string())?;
  c.pragma_update(None, "foreign_keys", "ON").map_err(|e| e.to_string())?;
  Ok(c)
}

fn now() -> String { Local::now().to_rfc3339() }
fn uuid() -> String { uuid::Uuid::new_v4().to_string() }

fn text(v: &Value, key: &str) -> String {
  v.get(key).and_then(Value::as_str).unwrap_or("").to_string()
}
fn opt_text(v: &Value, key: &str) -> Option<String> {
  v.get(key).and_then(Value::as_str).filter(|s| !s.is_empty()).map(|s| s.to_string())
}
fn opt_i64(v: &Value, key: &str) -> Option<i64> { v.get(key).and_then(Value::as_i64) }
fn opt_f64(v: &Value, key: &str) -> Option<f64> { v.get(key).and_then(Value::as_f64) }
fn boolv(v: &Value, key: &str) -> bool { v.get(key).and_then(Value::as_bool).unwrap_or(false) }

fn query_json_list<P: Params>(c: &Connection, sql: &str, p: P) -> Result<Vec<Value>, String> {
  let mut stmt = c.prepare(sql).map_err(|e| e.to_string())?;
  let rows = stmt.query_map(p, |r| r.get::<_, String>(0)).map_err(|e| e.to_string())?;
  let mut out = Vec::new();
  for row in rows {
    let raw = row.map_err(|e| e.to_string())?;
    out.push(serde_json::from_str(&raw).map_err(|e| e.to_string())?);
  }
  Ok(out)
}

fn query_json_one<P: Params>(c: &Connection, sql: &str, p: P) -> Result<Option<Value>, String> {
  let raw: Option<String> = c.query_row(sql, p, |r| r.get(0)).optional().map_err(|e| e.to_string())?;
  raw.map(|s| serde_json::from_str(&s).map_err(|e| e.to_string())).transpose()
}

fn init_db(app: &AppHandle) -> Result<(), String> {
  let c = conn(app)?;
  c.execute_batch(r#"
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS semesters (
      id TEXT PRIMARY KEY,
      number INTEGER,
      name TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('planned','current','completed')),
      start_date TEXT,
      end_date TEXT,
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS uq_current_semester ON semesters(status) WHERE status='current';

    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      semester_id TEXT NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('planned','studying','completed','dropped')),
      introduction TEXT,
      my_understanding TEXT,
      importance INTEGER NOT NULL DEFAULT 3 CHECK(importance BETWEEN 1 AND 5),
      importance_reason TEXT,
      note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_subjects_semester ON subjects(semester_id);

    CREATE TABLE IF NOT EXISTS lecturers (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      contact TEXT,
      role TEXT,
      note TEXT
    );

    CREATE TABLE IF NOT EXISTS materials (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      importance INTEGER NOT NULL DEFAULT 3 CHECK(importance BETWEEN 1 AND 5),
      storage_type TEXT NOT NULL CHECK(storage_type IN ('file','link')),
      stored_path TEXT,
      external_url TEXT,
      original_filename TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS study_notes (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      week INTEGER,
      slot INTEGER,
      study_date TEXT,
      topic TEXT,
      raw_note TEXT NOT NULL DEFAULT '',
      summary TEXT,
      learned TEXT,
      unresolved TEXT,
      mastery INTEGER NOT NULL DEFAULT 1 CHECK(mastery BETWEEN 1 AND 5),
      status TEXT NOT NULL DEFAULT 'captured' CHECK(status IN ('captured','reviewed','mastered')),
      original_filename TEXT,
      stored_path TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_study_notes_subject ON study_notes(subject_id);
    CREATE INDEX IF NOT EXISTS idx_study_notes_date ON study_notes(study_date);

    CREATE TABLE IF NOT EXISTS critical_notes (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      study_note_id TEXT REFERENCES study_notes(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      why_it_matters TEXT,
      importance INTEGER NOT NULL DEFAULT 3 CHECK(importance BETWEEN 1 AND 5),
      is_pinned INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      deadline TEXT,
      description TEXT,
      note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS report_members (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      student_number TEXT,
      email TEXT,
      role TEXT,
      contribution TEXT,
      note TEXT
    );

    CREATE TABLE IF NOT EXISTS report_files (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      original_filename TEXT,
      stored_path TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS grade_schemes (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL UNIQUE REFERENCES subjects(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK(type IN ('numeric','pass_fail','no_grade','custom')),
      passing_score REAL,
      target_score REAL,
      note TEXT
    );

    CREATE TABLE IF NOT EXISTS grade_components (
      id TEXT PRIMARY KEY,
      grade_scheme_id TEXT NOT NULL REFERENCES grade_schemes(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      weight REAL,
      max_score REAL NOT NULL DEFAULT 10,
      score REAL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
  "#).map_err(|e| e.to_string())?;
  Ok(())
}

fn safe_name(s: &str) -> String {
  let out: String = s.chars().map(|c| if c.is_ascii_alphanumeric() || matches!(c,'-'|'_'|'.') { c } else { '_' }).collect();
  if out.is_empty() { "file".into() } else { out }
}

fn subject_file_dir(app: &AppHandle, subject_id: &str, category: &str) -> Result<PathBuf, String> {
  let c = conn(app)?;
  let (semester, code): (String,String) = c.query_row(
    "SELECT se.name, s.code FROM subjects s JOIN semesters se ON se.id=s.semester_id WHERE s.id=?1",
    [subject_id], |r| Ok((r.get(0)?,r.get(1)?))
  ).map_err(|e| e.to_string())?;
  let dir = app_dir(app)?.join("files").join(safe_name(&semester)).join(safe_name(&code)).join(safe_name(category));
  fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
  Ok(dir)
}

fn save_base64_file(app: &AppHandle, subject_id: &str, category: &str, filename: &str, data: &str) -> Result<String, String> {
  let bytes = B64.decode(data).map_err(|e| e.to_string())?;
  let dir = subject_file_dir(app, subject_id, category)?;
  let mut path = dir.join(safe_name(filename));
  if path.exists() {
    let stem = Path::new(filename).file_stem().and_then(|x| x.to_str()).unwrap_or("file");
    let ext = Path::new(filename).extension().and_then(|x| x.to_str()).unwrap_or("");
    let suffix = Local::now().format("%Y%m%d_%H%M%S");
    let name = if ext.is_empty() { format!("{}_{}",safe_name(stem),suffix) } else { format!("{}_{}.{}",safe_name(stem),suffix,safe_name(ext)) };
    path = dir.join(name);
  }
  fs::write(&path, bytes).map_err(|e| e.to_string())?;
  Ok(path.to_string_lossy().to_string())
}


fn launch_path(path: &Path) -> Result<(), String> {
  #[cfg(target_os = "windows")]
  { Command::new("cmd").args(["/C", "start", ""]).arg(path).spawn().map_err(|e| e.to_string())?; }
  #[cfg(target_os = "macos")]
  { Command::new("open").arg(path).spawn().map_err(|e| e.to_string())?; }
  #[cfg(all(unix, not(target_os = "macos")))]
  { Command::new("xdg-open").arg(path).spawn().map_err(|e| e.to_string())?; }
  Ok(())
}

#[tauri::command]
fn open_local_file(app: AppHandle, path: String) -> Result<bool, String> {
  let root = app_dir(&app)?.join("files");
  let target = PathBuf::from(&path);
  let canon_root = root.canonicalize().map_err(|_| "Local files folder does not exist yet".to_string())?;
  let canon_target = target.canonicalize().map_err(|e| e.to_string())?;
  if !canon_target.starts_with(&canon_root) { return Err("Refusing to open a file outside My Study Hub storage".into()); }
  launch_path(&canon_target)?;
  Ok(true)
}

#[tauri::command]
fn open_data_folder(app: AppHandle) -> Result<bool, String> {
  let dir = app_dir(&app)?;
  launch_path(&dir)?;
  Ok(true)
}

#[tauri::command]
fn app_info(app: AppHandle) -> Result<Value,String> {
  Ok(json!({"mode":"native","data_dir":app_dir(&app)?.to_string_lossy()}))
}

#[tauri::command]
fn list_semesters(app: AppHandle) -> Result<Vec<Value>,String> {
  let c=conn(&app)?;
  query_json_list(&c,"SELECT json_object('id',id,'number',number,'name',name,'status',status,'start_date',start_date,'end_date',end_date,'description',description,'created_at',created_at,'updated_at',updated_at) FROM semesters ORDER BY CASE status WHEN 'current' THEN 0 WHEN 'planned' THEN 1 ELSE 2 END, COALESCE(start_date,created_at) DESC",[])
}

#[tauri::command]
fn create_semester(app: AppHandle,input:Value)->Result<Value,String>{
  let c=conn(&app)?; let id=uuid(); let ts=now(); let status=text(&input,"status");
  if status=="current" { c.execute("UPDATE semesters SET status='completed',updated_at=?1 WHERE status='current'",[&ts]).map_err(|e|e.to_string())?; }
  c.execute("INSERT INTO semesters(id,number,name,status,start_date,end_date,description,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?8)",params![id,opt_i64(&input,"number"),text(&input,"name"),status,opt_text(&input,"start_date"),opt_text(&input,"end_date"),opt_text(&input,"description"),ts]).map_err(|e|e.to_string())?;
  get_semester(&c,&id)?.ok_or("Failed to create semester".into())
}

fn get_semester(c:&Connection,id:&str)->Result<Option<Value>,String>{
  query_json_one(c,"SELECT json_object('id',id,'number',number,'name',name,'status',status,'start_date',start_date,'end_date',end_date,'description',description,'created_at',created_at,'updated_at',updated_at) FROM semesters WHERE id=?1",[id])
}

#[tauri::command]
fn update_semester(app:AppHandle,input:Value)->Result<Value,String>{
  let c=conn(&app)?; let id=text(&input,"id"); let status=text(&input,"status"); let ts=now();
  if status=="current" { c.execute("UPDATE semesters SET status='completed',updated_at=?1 WHERE status='current' AND id<>?2",params![ts,id]).map_err(|e|e.to_string())?; }
  c.execute("UPDATE semesters SET number=?2,name=?3,status=?4,start_date=?5,end_date=?6,description=?7,updated_at=?8 WHERE id=?1",params![id,opt_i64(&input,"number"),text(&input,"name"),status,opt_text(&input,"start_date"),opt_text(&input,"end_date"),opt_text(&input,"description"),ts]).map_err(|e|e.to_string())?;
  get_semester(&c,&id)?.ok_or("Semester not found".into())
}

#[tauri::command]
fn delete_semester(app:AppHandle,id:String)->Result<bool,String>{ conn(&app)?.execute("DELETE FROM semesters WHERE id=?1",[id]).map_err(|e|e.to_string())?;Ok(true) }

#[tauri::command]
fn list_subjects(app:AppHandle,semester_id:Option<String>)->Result<Vec<Value>,String>{
  let c=conn(&app)?;
  if let Some(id)=semester_id {query_json_list(&c,"SELECT json_object('id',id,'semester_id',semester_id,'code',code,'name',name,'status',status,'introduction',introduction,'my_understanding',my_understanding,'importance',importance,'importance_reason',importance_reason,'note',note,'created_at',created_at,'updated_at',updated_at) FROM subjects WHERE semester_id=?1 ORDER BY code",[id])}
  else {query_json_list(&c,"SELECT json_object('id',id,'semester_id',semester_id,'code',code,'name',name,'status',status,'introduction',introduction,'my_understanding',my_understanding,'importance',importance,'importance_reason',importance_reason,'note',note,'created_at',created_at,'updated_at',updated_at) FROM subjects ORDER BY code",[])}
}

#[tauri::command]
fn get_subject(app:AppHandle,id:String)->Result<Value,String>{ let c=conn(&app)?; get_subject_row(&c,&id)?.ok_or("Subject not found".into()) }
fn get_subject_row(c:&Connection,id:&str)->Result<Option<Value>,String>{query_json_one(c,"SELECT json_object('id',id,'semester_id',semester_id,'code',code,'name',name,'status',status,'introduction',introduction,'my_understanding',my_understanding,'importance',importance,'importance_reason',importance_reason,'note',note,'created_at',created_at,'updated_at',updated_at) FROM subjects WHERE id=?1",[id])}

#[tauri::command]
fn create_subject(app:AppHandle,input:Value)->Result<Value,String>{
  let c=conn(&app)?;let id=uuid();let ts=now();
  c.execute("INSERT INTO subjects(id,semester_id,code,name,status,introduction,my_understanding,importance,importance_reason,note,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?11)",params![id,text(&input,"semester_id"),text(&input,"code"),text(&input,"name"),text(&input,"status"),opt_text(&input,"introduction"),opt_text(&input,"my_understanding"),opt_i64(&input,"importance").unwrap_or(3),opt_text(&input,"importance_reason"),opt_text(&input,"note"),ts]).map_err(|e|e.to_string())?;
  get_subject_row(&c,&id)?.ok_or("Failed to create subject".into())
}

#[tauri::command]
fn update_subject(app:AppHandle,input:Value)->Result<Value,String>{
  let c=conn(&app)?;let id=text(&input,"id");let ts=now();
  c.execute("UPDATE subjects SET code=?2,name=?3,status=?4,introduction=?5,my_understanding=?6,importance=?7,importance_reason=?8,note=?9,updated_at=?10 WHERE id=?1",params![id,text(&input,"code"),text(&input,"name"),text(&input,"status"),opt_text(&input,"introduction"),opt_text(&input,"my_understanding"),opt_i64(&input,"importance").unwrap_or(3),opt_text(&input,"importance_reason"),opt_text(&input,"note"),ts]).map_err(|e|e.to_string())?;
  get_subject_row(&c,&id)?.ok_or("Subject not found".into())
}

#[tauri::command]
fn delete_subject(app:AppHandle,id:String)->Result<bool,String>{conn(&app)?.execute("DELETE FROM subjects WHERE id=?1",[id]).map_err(|e|e.to_string())?;Ok(true)}

#[tauri::command]
fn list_lecturers(app:AppHandle,subject_id:String)->Result<Vec<Value>,String>{let c=conn(&app)?;query_json_list(&c,"SELECT json_object('id',id,'subject_id',subject_id,'name',name,'email',email,'phone',phone,'contact',contact,'role',role,'note',note) FROM lecturers WHERE subject_id=?1 ORDER BY name",[subject_id])}

#[tauri::command]
fn add_lecturer(app:AppHandle,input:Value)->Result<Value,String>{let c=conn(&app)?;let id=uuid();c.execute("INSERT INTO lecturers(id,subject_id,name,email,phone,contact,role,note) VALUES(?1,?2,?3,?4,?5,?6,?7,?8)",params![id,text(&input,"subject_id"),text(&input,"name"),opt_text(&input,"email"),opt_text(&input,"phone"),opt_text(&input,"contact"),opt_text(&input,"role"),opt_text(&input,"note")]).map_err(|e|e.to_string())?;query_json_one(&c,"SELECT json_object('id',id,'subject_id',subject_id,'name',name,'email',email,'phone',phone,'contact',contact,'role',role,'note',note) FROM lecturers WHERE id=?1",[id])?.ok_or("Failed".into())}

#[tauri::command]
fn delete_lecturer(app:AppHandle,id:String)->Result<bool,String>{conn(&app)?.execute("DELETE FROM lecturers WHERE id=?1",[id]).map_err(|e|e.to_string())?;Ok(true)}

#[tauri::command]
fn list_materials(app:AppHandle,subject_id:String)->Result<Vec<Value>,String>{let c=conn(&app)?;query_json_list(&c,"SELECT json_object('id',id,'subject_id',subject_id,'title',title,'type',type,'description',description,'importance',importance,'storage_type',storage_type,'stored_path',stored_path,'external_url',external_url,'original_filename',original_filename,'created_at',created_at) FROM materials WHERE subject_id=?1 ORDER BY created_at DESC",[subject_id])}

#[tauri::command]
fn add_material(app:AppHandle,input:Value)->Result<Value,String>{
  let c=conn(&app)?;let id=uuid();let subject_id=text(&input,"subject_id");let storage=text(&input,"storage_type");let filename=opt_text(&input,"original_filename");
  let stored=if storage=="file" { match (filename.clone(),opt_text(&input,"file_base64")){(Some(f),Some(b))=>Some(save_base64_file(&app,&subject_id,"materials",&f,&b)?),_=>None}} else {None};
  c.execute("INSERT INTO materials(id,subject_id,title,type,description,importance,storage_type,stored_path,external_url,original_filename,created_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)",params![id,subject_id,text(&input,"title"),text(&input,"type"),opt_text(&input,"description"),opt_i64(&input,"importance").unwrap_or(3),storage,stored,opt_text(&input,"external_url"),filename,now()]).map_err(|e|e.to_string())?;
  query_json_one(&c,"SELECT json_object('id',id,'subject_id',subject_id,'title',title,'type',type,'description',description,'importance',importance,'storage_type',storage_type,'stored_path',stored_path,'external_url',external_url,'original_filename',original_filename,'created_at',created_at) FROM materials WHERE id=?1",[id])?.ok_or("Failed".into())
}

#[tauri::command]
fn delete_material(app:AppHandle,id:String)->Result<bool,String>{let c=conn(&app)?;let path:Option<String>=c.query_row("SELECT stored_path FROM materials WHERE id=?1",[&id],|r|r.get(0)).optional().map_err(|e|e.to_string())?.flatten();c.execute("DELETE FROM materials WHERE id=?1",[id]).map_err(|e|e.to_string())?;if let Some(p)=path{let _=fs::remove_file(p);}Ok(true)}

#[tauri::command]
fn list_study_notes(app:AppHandle,subject_id:Option<String>)->Result<Vec<Value>,String>{let c=conn(&app)?;let base="SELECT json_object('id',n.id,'subject_id',n.subject_id,'title',n.title,'week',n.week,'slot',n.slot,'study_date',n.study_date,'topic',n.topic,'raw_note',n.raw_note,'summary',n.summary,'learned',n.learned,'unresolved',n.unresolved,'mastery',n.mastery,'status',n.status,'original_filename',n.original_filename,'stored_path',n.stored_path,'created_at',n.created_at,'updated_at',n.updated_at,'subject_code',s.code,'subject_name',s.name,'semester_name',se.name) FROM study_notes n JOIN subjects s ON s.id=n.subject_id JOIN semesters se ON se.id=s.semester_id";if let Some(id)=subject_id{query_json_list(&c,&format!("{} WHERE n.subject_id=?1 ORDER BY COALESCE(n.study_date,n.created_at) DESC,n.created_at DESC",base),[id])}else{query_json_list(&c,&format!("{} ORDER BY COALESCE(n.study_date,n.created_at) DESC,n.created_at DESC",base),[])}}

#[tauri::command]
fn add_study_note(app:AppHandle,input:Value)->Result<Value,String>{
  let c=conn(&app)?;let id=uuid();let subject_id=text(&input,"subject_id");let filename=opt_text(&input,"original_filename");let stored=match(filename.clone(),opt_text(&input,"file_base64")){(Some(f),Some(b))=>Some(save_base64_file(&app,&subject_id,"study-notes",&f,&b)?),_=>None};let ts=now();
  c.execute("INSERT INTO study_notes(id,subject_id,title,week,slot,study_date,topic,raw_note,summary,learned,unresolved,mastery,status,original_filename,stored_path,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?16)",params![id,subject_id,text(&input,"title"),opt_i64(&input,"week"),opt_i64(&input,"slot"),opt_text(&input,"study_date"),opt_text(&input,"topic"),text(&input,"raw_note"),opt_text(&input,"summary"),opt_text(&input,"learned"),opt_text(&input,"unresolved"),opt_i64(&input,"mastery").unwrap_or(1),text(&input,"status"),filename,stored,ts]).map_err(|e|e.to_string())?;
  get_note(&c,&id)?.ok_or("Failed".into())
}

fn get_note(c:&Connection,id:&str)->Result<Option<Value>,String>{query_json_one(c,"SELECT json_object('id',id,'subject_id',subject_id,'title',title,'week',week,'slot',slot,'study_date',study_date,'topic',topic,'raw_note',raw_note,'summary',summary,'learned',learned,'unresolved',unresolved,'mastery',mastery,'status',status,'original_filename',original_filename,'stored_path',stored_path,'created_at',created_at,'updated_at',updated_at) FROM study_notes WHERE id=?1",[id])}

#[tauri::command]
fn update_study_note(app:AppHandle,input:Value)->Result<Value,String>{let c=conn(&app)?;let id=text(&input,"id");c.execute("UPDATE study_notes SET title=?2,week=?3,slot=?4,study_date=?5,topic=?6,raw_note=?7,summary=?8,learned=?9,unresolved=?10,mastery=?11,status=?12,updated_at=?13 WHERE id=?1",params![id,text(&input,"title"),opt_i64(&input,"week"),opt_i64(&input,"slot"),opt_text(&input,"study_date"),opt_text(&input,"topic"),text(&input,"raw_note"),opt_text(&input,"summary"),opt_text(&input,"learned"),opt_text(&input,"unresolved"),opt_i64(&input,"mastery").unwrap_or(1),text(&input,"status"),now()]).map_err(|e|e.to_string())?;get_note(&c,&id)?.ok_or("Not found".into())}

#[tauri::command]
fn delete_study_note(app:AppHandle,id:String)->Result<bool,String>{let c=conn(&app)?;let path:Option<String>=c.query_row("SELECT stored_path FROM study_notes WHERE id=?1",[&id],|r|r.get(0)).optional().map_err(|e|e.to_string())?.flatten();c.execute("DELETE FROM study_notes WHERE id=?1",[id]).map_err(|e|e.to_string())?;if let Some(p)=path{let _=fs::remove_file(p);}Ok(true)}

#[tauri::command]
fn list_critical_notes(app:AppHandle,subject_id:Option<String>)->Result<Vec<Value>,String>{let c=conn(&app)?;let base="SELECT json_object('id',n.id,'subject_id',n.subject_id,'study_note_id',n.study_note_id,'title',n.title,'content',n.content,'why_it_matters',n.why_it_matters,'importance',n.importance,'is_pinned',CASE n.is_pinned WHEN 1 THEN json('true') ELSE json('false') END,'created_at',n.created_at,'updated_at',n.updated_at,'subject_code',s.code,'subject_name',s.name) FROM critical_notes n JOIN subjects s ON s.id=n.subject_id";if let Some(id)=subject_id{query_json_list(&c,&format!("{} WHERE n.subject_id=?1 ORDER BY n.is_pinned DESC,n.importance DESC,n.created_at DESC",base),[id])}else{query_json_list(&c,&format!("{} ORDER BY n.is_pinned DESC,n.importance DESC,n.created_at DESC",base),[])}}

#[tauri::command]
fn add_critical_note(app:AppHandle,input:Value)->Result<Value,String>{let c=conn(&app)?;let id=uuid();let ts=now();c.execute("INSERT INTO critical_notes(id,subject_id,study_note_id,title,content,why_it_matters,importance,is_pinned,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?9)",params![id,text(&input,"subject_id"),opt_text(&input,"study_note_id"),text(&input,"title"),text(&input,"content"),opt_text(&input,"why_it_matters"),opt_i64(&input,"importance").unwrap_or(3),if boolv(&input,"is_pinned"){1}else{0},ts]).map_err(|e|e.to_string())?;query_json_one(&c,"SELECT json_object('id',id,'subject_id',subject_id,'study_note_id',study_note_id,'title',title,'content',content,'why_it_matters',why_it_matters,'importance',importance,'is_pinned',CASE is_pinned WHEN 1 THEN json('true') ELSE json('false') END,'created_at',created_at,'updated_at',updated_at) FROM critical_notes WHERE id=?1",[id])?.ok_or("Failed".into())}

#[tauri::command]
fn delete_critical_note(app:AppHandle,id:String)->Result<bool,String>{conn(&app)?.execute("DELETE FROM critical_notes WHERE id=?1",[id]).map_err(|e|e.to_string())?;Ok(true)}

#[tauri::command]
fn list_reports(app:AppHandle,subject_id:String)->Result<Vec<Value>,String>{let c=conn(&app)?;query_json_list(&c,"SELECT json_object('id',id,'subject_id',subject_id,'title',title,'type',type,'status',status,'deadline',deadline,'description',description,'note',note,'created_at',created_at,'updated_at',updated_at) FROM reports WHERE subject_id=?1 ORDER BY created_at DESC",[subject_id])}

#[tauri::command]
fn add_report(app:AppHandle,input:Value)->Result<Value,String>{let c=conn(&app)?;let id=uuid();let ts=now();c.execute("INSERT INTO reports(id,subject_id,title,type,status,deadline,description,note,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?9)",params![id,text(&input,"subject_id"),text(&input,"title"),text(&input,"type"),text(&input,"status"),opt_text(&input,"deadline"),opt_text(&input,"description"),opt_text(&input,"note"),ts]).map_err(|e|e.to_string())?;query_json_one(&c,"SELECT json_object('id',id,'subject_id',subject_id,'title',title,'type',type,'status',status,'deadline',deadline,'description',description,'note',note,'created_at',created_at,'updated_at',updated_at) FROM reports WHERE id=?1",[id])?.ok_or("Failed".into())}

#[tauri::command]
fn delete_report(app:AppHandle,id:String)->Result<bool,String>{conn(&app)?.execute("DELETE FROM reports WHERE id=?1",[id]).map_err(|e|e.to_string())?;Ok(true)}

#[tauri::command]
fn list_report_members(app:AppHandle,report_id:String)->Result<Vec<Value>,String>{let c=conn(&app)?;query_json_list(&c,"SELECT json_object('id',id,'report_id',report_id,'name',name,'student_number',student_number,'email',email,'role',role,'contribution',contribution,'note',note) FROM report_members WHERE report_id=?1 ORDER BY name",[report_id])}

#[tauri::command]
fn add_report_member(app:AppHandle,input:Value)->Result<Value,String>{let c=conn(&app)?;let id=uuid();c.execute("INSERT INTO report_members(id,report_id,name,student_number,email,role,contribution,note) VALUES(?1,?2,?3,?4,?5,?6,?7,?8)",params![id,text(&input,"report_id"),text(&input,"name"),opt_text(&input,"student_number"),opt_text(&input,"email"),opt_text(&input,"role"),opt_text(&input,"contribution"),opt_text(&input,"note")]).map_err(|e|e.to_string())?;query_json_one(&c,"SELECT json_object('id',id,'report_id',report_id,'name',name,'student_number',student_number,'email',email,'role',role,'contribution',contribution,'note',note) FROM report_members WHERE id=?1",[id])?.ok_or("Failed".into())}

#[tauri::command]
fn delete_report_member(app:AppHandle,id:String)->Result<bool,String>{conn(&app)?.execute("DELETE FROM report_members WHERE id=?1",[id]).map_err(|e|e.to_string())?;Ok(true)}

#[tauri::command]
fn list_report_files(app:AppHandle,report_id:String)->Result<Vec<Value>,String>{let c=conn(&app)?;query_json_list(&c,"SELECT json_object('id',id,'report_id',report_id,'title',title,'original_filename',original_filename,'stored_path',stored_path,'created_at',created_at) FROM report_files WHERE report_id=?1 ORDER BY created_at DESC",[report_id])}

#[tauri::command]
fn add_report_file(app:AppHandle,input:Value)->Result<Value,String>{
  let c=conn(&app)?;let id=uuid();let report_id=text(&input,"report_id");let subject_id:String=c.query_row("SELECT subject_id FROM reports WHERE id=?1",[&report_id],|r|r.get(0)).map_err(|e|e.to_string())?;let filename=text(&input,"original_filename");let stored=save_base64_file(&app,&subject_id,"reports",&filename,&text(&input,"file_base64"))?;
  c.execute("INSERT INTO report_files(id,report_id,title,original_filename,stored_path,created_at) VALUES(?1,?2,?3,?4,?5,?6)",params![id,report_id,text(&input,"title"),filename,stored,now()]).map_err(|e|e.to_string())?;query_json_one(&c,"SELECT json_object('id',id,'report_id',report_id,'title',title,'original_filename',original_filename,'stored_path',stored_path,'created_at',created_at) FROM report_files WHERE id=?1",[id])?.ok_or("Failed".into())
}

#[tauri::command]
fn delete_report_file(app:AppHandle,id:String)->Result<bool,String>{let c=conn(&app)?;let path:Option<String>=c.query_row("SELECT stored_path FROM report_files WHERE id=?1",[&id],|r|r.get(0)).optional().map_err(|e|e.to_string())?.flatten();c.execute("DELETE FROM report_files WHERE id=?1",[id]).map_err(|e|e.to_string())?;if let Some(p)=path{let _=fs::remove_file(p);}Ok(true)}

#[tauri::command]
fn get_grade_scheme(app:AppHandle,subject_id:String)->Result<Value,String>{let c=conn(&app)?;let scheme=query_json_one(&c,"SELECT json_object('id',id,'subject_id',subject_id,'type',type,'passing_score',passing_score,'target_score',target_score,'note',note) FROM grade_schemes WHERE subject_id=?1",[&subject_id])?;let components=if let Some(ref s)=scheme{let sid=s.get("id").and_then(Value::as_str).unwrap_or("");query_json_list(&c,"SELECT json_object('id',id,'grade_scheme_id',grade_scheme_id,'name',name,'weight',weight,'max_score',max_score,'score',score,'sort_order',sort_order) FROM grade_components WHERE grade_scheme_id=?1 ORDER BY sort_order,name",[sid])?}else{vec![]};Ok(json!({"scheme":scheme,"components":components}))}

#[tauri::command]
fn save_grade_scheme(app:AppHandle,input:Value)->Result<Value,String>{let c=conn(&app)?;let subject_id=text(&input,"subject_id");let existing:Option<String>=c.query_row("SELECT id FROM grade_schemes WHERE subject_id=?1",[&subject_id],|r|r.get(0)).optional().map_err(|e|e.to_string())?;let id=existing.unwrap_or_else(uuid);c.execute("INSERT INTO grade_schemes(id,subject_id,type,passing_score,target_score,note) VALUES(?1,?2,?3,?4,?5,?6) ON CONFLICT(subject_id) DO UPDATE SET type=excluded.type,passing_score=excluded.passing_score,target_score=excluded.target_score,note=excluded.note",params![id,subject_id,text(&input,"type"),opt_f64(&input,"passing_score"),opt_f64(&input,"target_score"),opt_text(&input,"note")]).map_err(|e|e.to_string())?;query_json_one(&c,"SELECT json_object('id',id,'subject_id',subject_id,'type',type,'passing_score',passing_score,'target_score',target_score,'note',note) FROM grade_schemes WHERE subject_id=?1",[text(&input,"subject_id")])?.ok_or("Failed".into())}

#[tauri::command]
fn add_grade_component(app:AppHandle,input:Value)->Result<Value,String>{let c=conn(&app)?;let id=uuid();c.execute("INSERT INTO grade_components(id,grade_scheme_id,name,weight,max_score,score,sort_order) VALUES(?1,?2,?3,?4,?5,?6,?7)",params![id,text(&input,"grade_scheme_id"),text(&input,"name"),opt_f64(&input,"weight"),opt_f64(&input,"max_score").unwrap_or(10.0),opt_f64(&input,"score"),opt_i64(&input,"sort_order").unwrap_or(0)]).map_err(|e|e.to_string())?;query_json_one(&c,"SELECT json_object('id',id,'grade_scheme_id',grade_scheme_id,'name',name,'weight',weight,'max_score',max_score,'score',score,'sort_order',sort_order) FROM grade_components WHERE id=?1",[id])?.ok_or("Failed".into())}

#[tauri::command]
fn update_grade_component(app:AppHandle,input:Value)->Result<Value,String>{let c=conn(&app)?;let id=text(&input,"id");if input.get("score").is_some(){c.execute("UPDATE grade_components SET score=?2 WHERE id=?1",params![id,opt_f64(&input,"score")]).map_err(|e|e.to_string())?;}query_json_one(&c,"SELECT json_object('id',id,'grade_scheme_id',grade_scheme_id,'name',name,'weight',weight,'max_score',max_score,'score',score,'sort_order',sort_order) FROM grade_components WHERE id=?1",[id])?.ok_or("Not found".into())}

#[tauri::command]
fn delete_grade_component(app:AppHandle,id:String)->Result<bool,String>{conn(&app)?.execute("DELETE FROM grade_components WHERE id=?1",[id]).map_err(|e|e.to_string())?;Ok(true)}

#[tauri::command]
fn dashboard(app:AppHandle)->Result<Value,String>{
  let c=conn(&app)?;
  let current=query_json_one(&c,"SELECT json_object('id',id,'number',number,'name',name,'status',status,'start_date',start_date,'end_date',end_date,'description',description,'created_at',created_at,'updated_at',updated_at) FROM semesters WHERE status='current' LIMIT 1",[])?;
  let current_subjects=if let Some(ref sem)=current{let sid=sem.get("id").and_then(Value::as_str).unwrap_or("");query_json_list(&c,"SELECT json_object('id',s.id,'semester_id',s.semester_id,'code',s.code,'name',s.name,'status',s.status,'introduction',s.introduction,'my_understanding',s.my_understanding,'importance',s.importance,'importance_reason',s.importance_reason,'note',s.note,'created_at',s.created_at,'updated_at',s.updated_at,'study_note_count',(SELECT count(*) FROM study_notes n WHERE n.subject_id=s.id),'material_count',(SELECT count(*) FROM materials m WHERE m.subject_id=s.id),'critical_note_count',(SELECT count(*) FROM critical_notes k WHERE k.subject_id=s.id)) FROM subjects s WHERE s.semester_id=?1 ORDER BY s.code",[sid])?}else{vec![]};
  let recent=query_json_list(&c,"SELECT json_object('id',n.id,'subject_id',n.subject_id,'title',n.title,'week',n.week,'slot',n.slot,'study_date',n.study_date,'topic',n.topic,'raw_note',n.raw_note,'summary',n.summary,'learned',n.learned,'unresolved',n.unresolved,'mastery',n.mastery,'status',n.status,'original_filename',n.original_filename,'stored_path',n.stored_path,'created_at',n.created_at,'updated_at',n.updated_at,'subject_code',s.code,'subject_name',s.name,'semester_name',se.name) FROM study_notes n JOIN subjects s ON s.id=n.subject_id JOIN semesters se ON se.id=s.semester_id ORDER BY COALESCE(n.study_date,n.created_at) DESC LIMIT 6",[])?;
  let review=query_json_list(&c,"SELECT json_object('id',n.id,'subject_id',n.subject_id,'title',n.title,'week',n.week,'slot',n.slot,'study_date',n.study_date,'topic',n.topic,'raw_note',n.raw_note,'summary',n.summary,'learned',n.learned,'unresolved',n.unresolved,'mastery',n.mastery,'status',n.status,'original_filename',n.original_filename,'stored_path',n.stored_path,'created_at',n.created_at,'updated_at',n.updated_at,'subject_code',s.code,'subject_name',s.name,'semester_name',se.name) FROM study_notes n JOIN subjects s ON s.id=n.subject_id JOIN semesters se ON se.id=s.semester_id WHERE n.status<>'mastered' OR n.mastery<4 ORDER BY COALESCE(n.study_date,n.created_at) DESC LIMIT 6",[])?;
  let count=|table:&str|->Result<i64,String>{c.query_row(&format!("SELECT count(*) FROM {}",table),[],|r|r.get(0)).map_err(|e|e.to_string())};
  Ok(json!({"current_semester":current,"semester_count":count("semesters")?,"subject_count":count("subjects")?,"study_note_count":count("study_notes")?,"material_count":count("materials")?,"critical_note_count":count("critical_notes")?,"current_subjects":current_subjects,"recent_notes":recent,"need_review":review}))
}

#[tauri::command]
fn search_all(app:AppHandle,query:String)->Result<Vec<Value>,String>{
  let c=conn(&app)?;let q=format!("%{}%",query.to_lowercase());
  let sql=r#"
    SELECT json_object('kind','semester','id',id,'subject_id',NULL,'title',name,'subtitle',status) FROM semesters WHERE lower(name||' '||coalesce(description,'')) LIKE ?1
    UNION ALL SELECT json_object('kind','subject','id',id,'subject_id',id,'title',code||' — '||name,'subtitle',status) FROM subjects WHERE lower(code||' '||name||' '||coalesce(introduction,'')||' '||coalesce(my_understanding,'')) LIKE ?1
    UNION ALL SELECT json_object('kind','study_note','id',id,'subject_id',subject_id,'title',title,'subtitle',coalesce(topic,'Study note')) FROM study_notes WHERE lower(title||' '||coalesce(topic,'')||' '||raw_note||' '||coalesce(summary,'')) LIKE ?1
    UNION ALL SELECT json_object('kind','critical_note','id',id,'subject_id',subject_id,'title',title,'subtitle','Critical note') FROM critical_notes WHERE lower(title||' '||content||' '||coalesce(why_it_matters,'')) LIKE ?1
    UNION ALL SELECT json_object('kind','material','id',id,'subject_id',subject_id,'title',title,'subtitle',type) FROM materials WHERE lower(title||' '||type||' '||coalesce(description,'')) LIKE ?1
    UNION ALL SELECT json_object('kind','report','id',id,'subject_id',subject_id,'title',title,'subtitle',type) FROM reports WHERE lower(title||' '||coalesce(description,'')||' '||coalesce(note,'')) LIKE ?1
    LIMIT 50
  "#;
  query_json_list(&c,sql,[q])
}

fn add_dir_to_zip(zip:&mut ZipWriter<File>,dir:&Path,base:&Path)->Result<(),String>{
  if !dir.exists(){return Ok(());} let opts=SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);
  for entry in fs::read_dir(dir).map_err(|e|e.to_string())?{let entry=entry.map_err(|e|e.to_string())?;let path=entry.path();let rel=path.strip_prefix(base).map_err(|e|e.to_string())?;let name=rel.to_string_lossy().replace('\\',"/");if path.is_dir(){zip.add_directory(format!("{}/",name),opts).map_err(|e|e.to_string())?;add_dir_to_zip(zip,&path,base)?;}else{zip.start_file(name,opts).map_err(|e|e.to_string())?;let mut f=File::open(&path).map_err(|e|e.to_string())?;let mut buf=Vec::new();f.read_to_end(&mut buf).map_err(|e|e.to_string())?;zip.write_all(&buf).map_err(|e|e.to_string())?;}}
  Ok(())
}

#[tauri::command]
fn create_backup(app:AppHandle)->Result<String,String>{
  let dir=app_dir(&app)?;let backups=dir.join("backups");fs::create_dir_all(&backups).map_err(|e|e.to_string())?;let name=format!("MyStudyHub_Backup_{}.zip",Local::now().format("%Y%m%d_%H%M%S"));let out=backups.join(name);let file=File::create(&out).map_err(|e|e.to_string())?;let mut zip=ZipWriter::new(file);let opts=SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);
  let db=db_path(&app)?;if db.exists(){zip.start_file(DB_FILE,opts).map_err(|e|e.to_string())?;let mut f=File::open(db).map_err(|e|e.to_string())?;let mut buf=Vec::new();f.read_to_end(&mut buf).map_err(|e|e.to_string())?;zip.write_all(&buf).map_err(|e|e.to_string())?;}
  add_dir_to_zip(&mut zip,&dir.join("files"),&dir)?;zip.finish().map_err(|e|e.to_string())?;Ok(out.to_string_lossy().to_string())
}

#[tauri::command]
fn restore_backup(app:AppHandle,base64_data:String)->Result<bool,String>{
  let bytes=B64.decode(base64_data).map_err(|e|e.to_string())?;let dir=app_dir(&app)?;let mut archive=ZipArchive::new(Cursor::new(bytes)).map_err(|e|e.to_string())?;
  let old_db=dir.join(DB_FILE);if old_db.exists(){fs::remove_file(&old_db).map_err(|e|e.to_string())?;}let files_dir=dir.join("files");if files_dir.exists(){fs::remove_dir_all(&files_dir).map_err(|e|e.to_string())?;}
  for i in 0..archive.len(){let mut f=archive.by_index(i).map_err(|e|e.to_string())?;let enclosed=f.enclosed_name().ok_or("Unsafe backup path")?.to_path_buf();if !(enclosed==Path::new(DB_FILE)||enclosed.starts_with("files")){continue;}let out=dir.join(&enclosed);if f.is_dir(){fs::create_dir_all(&out).map_err(|e|e.to_string())?;}else{if let Some(parent)=out.parent(){fs::create_dir_all(parent).map_err(|e|e.to_string())?;}let mut target=File::create(&out).map_err(|e|e.to_string())?;std::io::copy(&mut f,&mut target).map_err(|e|e.to_string())?;}}
  init_db(&app)?;Ok(true)
}

#[tauri::command]
fn reset_all_data(app:AppHandle)->Result<bool,String>{let dir=app_dir(&app)?;let db=dir.join(DB_FILE);if db.exists(){fs::remove_file(db).map_err(|e|e.to_string())?;}let files=dir.join("files");if files.exists(){fs::remove_dir_all(files).map_err(|e|e.to_string())?;}init_db(&app)?;Ok(true)}

pub fn run(){
  tauri::Builder::default()
    .setup(|app|{init_db(app.handle()).map_err(|e|std::io::Error::new(std::io::ErrorKind::Other,e))?;Ok(())})
    .invoke_handler(tauri::generate_handler![
      app_info,open_local_file,open_data_folder,list_semesters,create_semester,update_semester,delete_semester,
      list_subjects,get_subject,create_subject,update_subject,delete_subject,
      list_lecturers,add_lecturer,delete_lecturer,
      list_materials,add_material,delete_material,
      list_study_notes,add_study_note,update_study_note,delete_study_note,
      list_critical_notes,add_critical_note,delete_critical_note,
      list_reports,add_report,delete_report,list_report_members,add_report_member,delete_report_member,list_report_files,add_report_file,delete_report_file,
      get_grade_scheme,save_grade_scheme,add_grade_component,update_grade_component,delete_grade_component,
      dashboard,search_all,create_backup,restore_backup,reset_all_data
    ])
    .run(tauri::generate_context!())
    .expect("error while running My Study Hub");
}
