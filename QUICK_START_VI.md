# Chạy My Study Hub Local v2 trên Windows

## 1. Chạy giao diện nhanh để test

Cần Node.js 20+.

```powershell
npm install
npm run dev
```

Mở:

```text
http://localhost:1420
```

Ở chế độ này app dùng `localStorage` của trình duyệt, không cần login hay database server.

## 2. Chạy app desktop thật

Cài thêm:

- Rust (rustup)
- Microsoft C++ Build Tools / Visual Studio Build Tools
- WebView2 Runtime (Windows 11 thường đã có)

Sau đó:

```powershell
npm install
npm run tauri dev
```

App desktop sẽ sử dụng **SQLite local** và copy file vào thư mục dữ liệu riêng của My Study Hub.

## 3. Build file cài đặt Windows

```powershell
npm run tauri build
```

File build nằm trong:

```text
src-tauri\target\release\bundle\
```

## 4. Cách bắt đầu sử dụng

App không có dữ liệu setup sẵn.

1. Mở `Semesters`.
2. Chọn `Add Semester`.
3. Nhập ví dụ `4 / FALL2026 / Current` nếu bạn muốn.
4. Mở kỳ vừa tạo và `Add Subject`.
5. Từng môn tự quản lý:
   - Overview
   - Study Notes
   - Materials
   - Critical Notes
   - Reports + Team
   - Lecturer
   - Results

## 5. Study Note

Có thể nhập tay hoặc chọn file TXT/MD.

Tên file:

```text
0102-110926.txt
```

sẽ tự điền:

```text
Week 01
Slot 02
Date 11/09/2026
```

File gốc vẫn được giữ trong local storage của app ở desktop mode.

## 6. Backup

Vào:

```text
Settings → Create Backup
```

Desktop mode tạo file ZIP chứa:

- `studyhub.db`
- toàn bộ folder `files/`

Restore cũng thực hiện trong Settings.
