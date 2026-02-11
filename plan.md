Product Requirements Document (PRD)
Sistem Manajemen SDM Multimedia (Express.js Backend)
Informasi Dokumen
Detail
Nama Proyek
Multimedia (Integration Module)
Versi
2.0 Technical Design
Status
Ready for Development
Tujuan Utama
Mengintegrasikan manajemen kinerja profesional santri dengan kedisiplinan asrama melalui sistem gamifikasi berbasis data, dengan dukungan **Dynamic Role-Based Access Control (RBAC)**.


User Roles & Permissions (Dynamic RBAC)
Sistem menggunakan pendekatan *Granular Permissions* di mana "Admin" adalah role statis, tetapi "Member" biasa bisa mendapatkan *privilege* tambahan.

A. Super Admin (Fixed Role)
Akses: Root Access.
Tanggung Jawab: Mengelola sistem secara keseluruhan, termasuk memberikan/mencabut privilege anggota lain.

B. Member (Base Role)
Akses: Limited Write & Read Own Data.
Privilege Tambahan (Dapat diberikan oleh Admin):
- `TASK_VERIFIER`: Berhak memvalidasi/menolak tugas anggota lain.
- `DISCIPLINE_OFFICER`: Berhak input pelanggaran/poin asrama (menggantikan fungsi statis Kepala Kamar jika diperlukan).
- `INVENTORY_MANAGER`: Berhak mengelola peminjaman aset.

C. Kepala Kamar (External Stakeholder)
Akses: Restricted Dashboard.
Fungsi: Input data kedisiplinan (Pondok Record) untuk anggota kamarnya saja.


Technical Architecture (Express.js Stack)
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript (Recommended) / JavaScript
- **Database**: PostgreSQL / MySQL
- **ORM**: Prisma / Sequelize / TypeORM
- **Validation**: Zod / Joi
- **Scheduling**: node-cron
- **Auth**: JWT (Access Token 15m + Refresh Token 7d + HttpOnly Cookie)


Database Schema Design (Relational)

1. Table `users` (Central Identity)
Menyimpan kredensial login dan profil dasar.
| Column | Type | Attributes | Description |
|---|---|---|---|
| `id` | UUID | PK |  |
| `username` | VARCHAR(50) | UNIQUE, NOT NULL |  |
| `password` | VARCHAR(255) | NOT NULL | Hashed (Argon2/Bcrypt) |
| `role` | ENUM | NOT NULL | 'ADMIN', 'MEMBER', 'EXTERNAL' |
| `created_at` | TIMESTAMP | DEFAULT NOW() |  |

2. Table `members` (Member Profile Extension)
Detail khusus anggota multimedia. `users.id` 1:1 `members.user_id`.
| Column | Type | Attributes | Description |
|---|---|---|---|
| `id` | UUID | PK |  |
| `user_id` | UUID | FK -> users.id | Relasi ke akun login |
| `full_name` | VARCHAR(150) | NOT NULL |  |
| `division` | VARCHAR(50) | NOT NULL | Video, Design, Web, dll |
| `status` | ENUM | DEFAULT 'ACTIVE' | ACTIVE, VACUUM, SP1, SP2, ALUMNI |
| `current_grade` | CHAR(1) | NULLABLE | A, B, C, D, E |
| `dorm_id` | UUID | FK -> master_dorms | Asrama |
| `class_id` | UUID | FK -> master_classes | Kelas |
| `join_date` | DATE | NOT NULL |  |

3. Table `permissions` (Dynamic Privileges)
Menyimpan hak akses tambahan yang diberikan ke member.
| Column | Type | Attributes | Description |
|---|---|---|---|
| `id` | UUID | PK |  |
| `user_id` | UUID | FK -> users.id | User yang dapat hak |
| `permission_key` | VARCHAR(50) | NOT NULL | 'TASK_VERIFIER', 'INVENTORY_MGR' |
| `granted_by` | UUID | FK -> users.id | Admin yang memberi hak |
| `granted_at` | TIMESTAMP | DEFAULT NOW() |  |

4. Table `tasks` (Task Management)
| Column | Type | Attributes | Description |
|---|---|---|---|
| `id` | UUID | PK |  |
| `member_id` | UUID | FK -> members.id | Pemilik tugas |
| `title` | VARCHAR(200) | NOT NULL |  |
| `frequency` | ENUM | NOT NULL | DAILY, WEEKLY, MONTHLY |
| `deadline` | TIMESTAMP | NOT NULL |  |
| `status` | ENUM | DEFAULT 'PENDING' | PENDING, REVIEW, COMPLETED, REJECTED |
| `constraints` | TEXT | REQUIRED | "Kendala" |
| `solutions` | TEXT | REQUIRED | "Solusi" |
| `proof_link` | TEXT | NULLABLE |  |
| `verified_by` | UUID | FK -> users.id | User (Admin/Delegated) yang memvalidasi |
| `verified_at` | TIMESTAMP | NULLABLE |  |

5. Table `boarding_records` (Discipline)
| Column | Type | Attributes | Description |
|---|---|---|---|
| `id` | UUID | PK |  |
| `member_id` | UUID | FK -> members.id |  |
| `period_month` | DATE | NOT NULL | Format: YYYY-MM-01 |
| `discipline_score` | INT | Check (0-100) | Nilai kedisiplinan |
| `input_by` | UUID | FK -> users.id | Kepala Kamar / Discipline Officer |

6. Table `audit_logs` (Security)
Mencatat setiap perubahan penting (ganti role, validasi tugas, ubah nilai).
| Column | Type | Attributes | Description |
|---|---|---|---|
| `id` | UUID | PK |  |
| `actor_id` | UUID | FK -> users.id | Pelaku aksi |
| `action` | VARCHAR(50) | NOT NULL | 'GRANT_PERMISSION', 'VERIFY_TASK' |
| `target_table` | VARCHAR(50) | NOT NULL |  |
| `target_id` | UUID | NOT NULL | ID data yang diubah |
| `details` | JSONB | NULLABLE | Snapshot data before/after |
| `created_at` | TIMESTAMP | DEFAULT NOW() |  |


Application Flow (AppFlow)

1. Authentication Flow
- User Login (Username/Pass) -> Server Validasi -> Generate Access Token (15m) & Refresh Token (Cookie, 7d).
- Middleware `authMiddleware` mengecek token di setiap request protected.
- Middleware `permissionMiddleware('KEY')` mengecek apakah user punya row di tabel `permissions` untuk rute spesifik.

2. Task Lifecycle Flow
- **Create**: Member input tugas (Status: PENDING).
- **Submit**: Member melengkapi kendala & solusi (Status: REVIEW).
- **Verification**:
  - Admin atau Member dengan privilege `TASK_VERIFIER` melihat list "Need Review".
  - Verifier klik "Approve" -> Status: COMPLETED.
  - Verifier klik "Reject" -> Input alasan -> Status: REJECTED (Member harus revisi).

3. Monthly Grading Automation (Cron)
- **Trigger**: Tanggal 1 setiap bulan, pukul 00:00.
- **Process 1 (Fetch Data)**: Ambil rata-rata skor tugas bulan lalu & skor asrama terakhir.
- **Process 2 (Calculate)**: Hitung `FinalScore = (Task * 0.6) + (Dorm * 0.4)`.
- **Process 3 (Rule Check)**:
  - Jika `status == SP`, max score = 50.
  - Tentukan Grade (A/B/C/D/E) berdasarkan range.
- **Process 4 (Update)**: Update kolom `current_grade` di tabel `members`.


Security Notes
- Password wajib di-hash menggunakan **Argon2** atau **Bcrypt**.
- API Rate Limiting wajib dipasang untuk mencegah brute-force login.
- Input validasi menggunakan **Zod** schema di level controller.

Integrasi Data Statis vs Dinamis
Penting untuk membedakan penyimpanan data agar sistem skalabel.
Data Statis: Disimpan di tabel members (Nama, Tanggal Join, Alamat Asal). Data ini jarang berubah.
Data Dinamis: Data seperti Kelas dan Kamar Asrama disimpan sebagai Foreign Key yang merujuk ke tabel Master (master_dorms, master_classes).
Alasan: Santri sering pindah kamar/naik kelas. Jika hardcode string, data akan berantakan (typo) dan sulit dilacak historinya.
History Tracking: Saat dorm_id berubah, sistem backend harus mencatat perubahan tersebut di tabel log (boarding_history) untuk keperluan audit.

JSON Response Example
Berikut adalah standar respon API yang akan dikonsumsi oleh Frontend (Dashboard Anggota & Kepala Kamar).
Endpoint: GET /api/members/{id}/performance-summary

{
  "member_id": "550e8400-e29b-41d4-a716-446655440000",
  "full_name": "Ahmad Fulan",
  "status": "ACTIVE",
  "current_grade": "A",
  "data_period": "January 2026",
  "performance_metrics": {
    "multimedia_score": 95,
    "pondok_score": 88,
    "final_calculated_score": 92.2
  },
  "privileges_granted": {
    "night_leave_quota": 7,
    "asset_borrowing_allowed": true,
    "internet_access_level": "UNLIMITED"
  },
  "active_tasks": [
    {
      "task_id": "task-101",
      "title": "Edit Video Kajian Ahad Legi",
      "deadline": "2026-01-28T23:59:00Z",
      "status": "IN_PROGRESS",
      "constraints": "Render laptop lambat",
      "solutions": "Menggunakan PC kantor"
    }
  ],
  "boarding_info": {
    "dorm_name": "Asrama Al-Ghazali",
    "room_leader": "Ustadz Budi",
    "liabilities": "Lunas SPP"
  }
}
