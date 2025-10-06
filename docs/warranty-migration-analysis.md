# Analisis Pembaruan Manajemen Garansi

## Ringkasan Struktur Skema Terbaru
- Tabel `transactions` sekarang menyimpan informasi garansi seperti durasi dan tanggal mulai/berakhir untuk mendukung pengecekan masa berlaku klaim.【F:shared/schema.ts†L249-L253】
- Tabel `service_tickets` juga memiliki kolom garansi baru agar service ticket bisa dilacak masa garansinya.【F:shared/schema.ts†L289-L292】
- Dibuat tabel baru `warranty_claims` lengkap dengan relasi ke transaksi/service ticket asal, status proses, serta kolom catatan admin.【F:shared/schema.ts†L317-L349】

## Ketergantungan Logika Aplikasi
- Backend mengharapkan tabel `warranty_claims` tersedia untuk melakukan query, membuat klaim, dan memperbarui status. Tanpa tabel ini operasi garansi akan gagal saat melakukan `SELECT`/`INSERT`/`UPDATE`.【F:server/storage.ts†L2880-L3053】
- Antarmuka pengguna menampilkan data garansi dari kolom baru pada transaksi dan service ticket, sehingga data tersebut harus tersedia di database untuk menghindari tampilan kosong atau error logika bisnis.【F:client/src/pages/warranty.tsx†L195-L260】

## Kondisi Basis Data Saat Ini
- Skrip basis data yang lama (`laptoppos_database.sql`) masih mendefinisikan `transactions` tanpa kolom garansi baru, sehingga instalasi yang memakai skrip ini belum memiliki struktur terbaru.【F:laptoppos_database.sql†L232-L248】
- Struktur `service_tickets` dalam skrip lama juga belum menambahkan kolom garansi, sehingga data garansi service tidak bisa tersimpan.【F:laptoppos_database.sql†L319-L340】
- Query backend saat ini mengharapkan kolom JSON `claimed_items` ketika membaca klaim garansi, namun kolom tersebut tidak ada pada dump SQL lama sehingga memicu error `column wc.claimed_items does not exist` seperti yang muncul di log produksi.【F:server/storage.ts†L2897-L2929】【F:laptoppos_database.sql†L1-L360】

## Dampak Error Kolom `claimed_items`
- Tanpa kolom `claimed_items`, endpoint `GET /api/warranty-claims` gagal karena select statement pada storage layer selalu merujuk ke kolom ini untuk memuat detail item yang diklaim.【F:server/storage.ts†L2897-L2929】
- Absennya kolom tersebut juga mengakibatkan UI tidak bisa menampilkan rincian item klaim karena skema Drizzle mendefinisikannya sebagai bagian dari model `warrantyClaims`.【F:shared/schema.ts†L336-L349】

## Rekomendasi Penanganan
1. **Sinkronkan struktur database melalui workflow Drizzle** yang sudah digunakan sehari-hari:
   - Jalankan `npx drizzle-kit push` (atau skrip `npm run db:push` yang menjadi alias resmi di repo) terhadap environment target agar definisi `jsonb("claimed_items")` dari skema Drizzle benar-benar tertulis di database.【F:package.json†L7-L12】【F:shared/schema.ts†L333-L349】
   - Bila Anda mengandalkan folder migrasi, pastikan ada file migrasi yang menambahkan kolom `claimed_items` dan jalankan `npx drizzle-kit migrate` sampai statusnya "Nothing to migrate" sebelum mencoba ulang API.【F:drizzle.config.ts†L1-L15】
   - Opsi manual `ALTER TABLE warranty_claims ADD COLUMN claimed_items jsonb` tetap relevan untuk patch cepat di produksi ketika tidak memungkinkan menjalankan pipeline Drizzle penuh. Jalankan perintah ini pada setiap database yang melayani tenant (termasuk tenant "utama"/default) agar seluruh instance memiliki kolom yang sama sebelum API garansi dipakai kembali.
2. **Otomatisasikan eksekusi Drizzle untuk seluruh tenant** supaya tidak perlu lagi menjalankan perintah manual satu per satu:
   - Gunakan skrip `npm run db:push:tenants` yang akan membaca daftar tenant dari tabel `clients`, mengekstrak `DATABASE_URL` masing-masing melalui konfigurasi `settings`, lalu menjalankan `drizzle-kit push --force` untuk setiap tenant secara berurutan. Skrip ini juga bisa diberi opsi `--migrate` atau filter `--tenant=subdomain1,subdomain2` bila perlu.【F:server/scripts/run-tenant-drizzle.ts†L1-L206】【F:package.json†L7-L13】
   - Sertakan skrip tersebut pada pipeline provisioning tenant baru sehingga setiap tenant yang baru dibuat otomatis menjalankan migrasi garansi sebelum go-live.
   - Untuk tenant eksisting, jalankan skrip loop sekali sehingga seluruh basis data menerima kolom `claimed_items` secara serentak, kemudian jadwalkan eksekusi rutin (mis. lewat cron/CI) bila daftar tenant bersifat dinamis.
3. Setelah kolom tersedia, verifikasi endpoint garansi (mis. `GET /api/warranty-claims`) untuk memastikan error 500 tidak lagi muncul dan UI bisa memuat daftar klaim.
4. Bila terdapat data klaim existing sebelum kolom baru, tentukan nilai default (misalnya `[]`) agar histori klaim tetap konsisten dan tidak memicu error parsing di frontend.

## Kesimpulan & Rekomendasi
Karena terdapat tabel baru dan kolom tambahan yang dibutuhkan oleh logika backend serta UI, instalasi yang masih memakai schema lama perlu dijalankan ulang perintah **`npm run db:push -- --force`** (atau proses migrasi sesuai environment produksi) supaya struktur database selaras dengan kode terbaru. Tanpa melakukan push ulang, manajemen garansi akan gagal berfungsi penuh (misalnya query ke `warranty_claims` akan memunculkan error tabel tidak ditemukan, dan durasi garansi tidak tersimpan di transaksi/service ticket). Setelah struktur diperbarui, lanjutkan verifikasi data existing serta backup sebelum menjalankan di lingkungan produksi.
