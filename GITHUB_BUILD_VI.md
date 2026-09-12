# Build My Study Hub `.exe` bằng GitHub Actions

Bạn **không cần cài Rust/Tauri trên máy để build**. GitHub runner Windows sẽ build giúp.

## Cách nhanh nhất

### 1. Tạo repository GitHub

Tạo một repository mới, ví dụ:

`my-study-hub`

Có thể để **Private** nếu đây là app cá nhân.

### 2. Push project này lên repository

Mở PowerShell trong thư mục project:

```powershell
git init
git add .
git commit -m "Initial My Study Hub local app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/my-study-hub.git
git push -u origin main
```

Nếu repository đã có Git thì chỉ cần:

```powershell
git add .
git commit -m "Add GitHub Windows build"
git push
```

## 3. GitHub tự build

Project có workflow:

`.github/workflows/build-windows.yml`

Mỗi lần push lên `main`, GitHub Actions sẽ tự build.

Hoặc chạy thủ công:

1. Mở repository trên GitHub.
2. Chọn **Actions**.
3. Chọn **Build Windows EXE**.
4. Chọn **Run workflow**.
5. Chờ job xanh `✓`.

## 4. Tải `.exe`

Trong trang của workflow run:

1. Kéo xuống **Artifacts**.
2. Tải `My-Study-Hub-Windows-...`.
3. Giải nén ZIP artifact.

Artifact chứa tối thiểu:

- `...-setup.exe` — **bản nên dùng**, installer NSIS của Windows.
- `my-study-hub-local.exe` — binary build trực tiếp, chủ yếu để test.

Nên cài bằng file `*-setup.exe`.

---

# Tạo bản Release chính thức trên GitHub

Project còn có:

`.github/workflows/release-windows.yml`

Khi muốn phát hành một phiên bản, tạo tag:

```powershell
git tag v2.0.0
git push origin v2.0.0
```

GitHub Actions sẽ:

1. Build Windows app.
2. Build NSIS setup `.exe`.
3. Tự tạo **GitHub Release**.
4. Gắn `.exe` vào Release để tải trực tiếp.

Lần sau tăng version, ví dụ:

```powershell
git tag v2.0.1
git push origin v2.0.1
```

> Lưu ý: version trong `src-tauri/tauri.conf.json` và tag nên đồng bộ khi bạn phát hành phiên bản mới.

---

# Nếu Actions không hiện

Kiểm tra repository có file:

```text
.github/
└── workflows/
    ├── build-windows.yml
    └── release-windows.yml
```

Vào **Settings → Actions → General** và đảm bảo GitHub Actions được phép chạy cho repository.

---

# Windows SmartScreen

Bản `.exe` build từ GitHub Actions chưa có certificate code-signing thương mại. Vì vậy Windows có thể báo ứng dụng chưa được nhận diện / publisher chưa xác minh.

Đây không phải lỗi build. Nếu muốn phân phối rộng rãi mà không gặp cảnh báo này, bước sau là thêm **Windows code signing certificate** vào GitHub Secrets.
