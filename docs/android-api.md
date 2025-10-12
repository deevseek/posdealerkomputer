# Dokumentasi API Mobile (Android)

Dokumen ini menjelaskan cara aplikasi Android terintegrasi dengan backend LaptopPOS melalui endpoint `REST` yang tersedia di jalur
`/api/mobile`. Selain daftar endpoint, bagian awal merangkum konfigurasi server yang perlu diaktifkan agar aplikasi Android dapat
melakukan request tanpa terblokir oleh kebijakan CORS browser internal seperti yang digunakan oleh WebView maupun library HTTP
modern.【F:server/index.ts†L10-L52】【F:server/middleware/cors.ts†L1-L81】

## 1. Konfigurasi Server

### 1.1 CORS untuk Android

- Middleware khusus diaktifkan secara global untuk menangani permintaan `OPTIONS` dan memasang header CORS pada semua endpoint
  API.【F:server/index.ts†L14-L52】【F:server/middleware/cors.ts†L1-L81】
- Variabel lingkungan `MOBILE_ALLOWED_ORIGINS` dapat diisi dengan daftar origin yang dipisahkan koma, misalnya:

  ```env
  MOBILE_ALLOWED_ORIGINS=https://app.profesionalservis.my.id,https://*.profesionalservis.my.id,http://localhost:5173
  ```

  Nilai `*` akan mengizinkan semua origin (default). Prefix `*.` mengizinkan seluruh subdomain dari domain terkait. Jika daftar
  disediakan, header `Access-Control-Allow-Origin` akan mengikuti origin request yang cocok dan otomatis menambahkan header
  `Vary: Origin` untuk cache-aware proxy.【F:server/middleware/cors.ts†L17-L81】

- Header CORS yang dipasang mencakup:
  - `Access-Control-Allow-Origin`
  - `Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS`
  - `Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With, Accept, Origin`
  - `Access-Control-Max-Age: 600`

  Permintaan `OPTIONS` akan dijawab dengan status `204`, sehingga aplikasi Android yang melakukan preflight request dapat segera
  mengirim request utama.【F:server/middleware/cors.ts†L52-L81】

### 1.2 Middleware Lainnya

Urutan middleware di server memastikan sesi, parsing JSON, dan konteks database tenant terpasang sebelum route `mobile` diaktifkan.
Ini penting agar autentikasi multi-tenant berjalan mulus di aplikasi Android.【F:server/index.ts†L14-L83】

## 2. Informasi Umum API

- **Base URL produksi**: `https://profesionalservis.my.id/api/mobile`
- **Base URL pengembangan**: `http://localhost:3000/api/mobile`
- Semua response menggunakan format JSON UTF-8.
- Autentikasi memakai JWT Bearer. Token didapat dari endpoint login dan wajib dikirim pada header `Authorization` untuk setiap
  request terproteksi.【F:server/routes/mobile.ts†L118-L321】

## 3. Alur Autentikasi

1. **POST `/api/mobile/login`**
   - Body:

     ```json
     {
       "username": "demo",
       "password": "rahasia"
     }
     ```

   - Response sukses berisi token, profil pengguna, informasi tenant, serta konfigurasi toko yang telah disanitasi.【F:server/routes/mobile.ts†L118-L218】
   - Error yang mungkin muncul:
     - `400` apabila validasi payload gagal (Zod).【F:server/routes/mobile.ts†L219-L239】
     - `401` jika kombinasi username/password salah.【F:server/routes/mobile.ts†L182-L205】
     - `403` bila akun tidak terhubung ke tenant aktif.【F:server/routes/mobile.ts†L186-L189】
     - `503` apabila database tenant belum siap (misalnya masih provisioning).【F:server/routes/mobile.ts†L231-L233】

2. Simpan token pada secure storage di aplikasi Android, lalu sertakan pada header:

   ```
   Authorization: Bearer <token>
   ```

3. Token memiliki masa berlaku default 12 jam (`MOBILE_JWT_EXPIRES_IN`). Perbarui token dengan memanggil endpoint login lagi setelah
   kedaluwarsa.【F:server/routes/mobile.ts†L96-L205】

## 4. Endpoint Terproteksi

Setelah token didapat, endpoint di bawah ini dapat diakses. Seluruh endpoint otomatis mem-filter data berdasarkan `clientId`
pengguna, sehingga tidak mungkin melihat data tenant lain.【F:server/routes/mobile.ts†L242-L543】

### 4.1 GET `/api/mobile/me`

Mengambil profil pengguna yang sedang login. Response:

```json
{
  "user": {
    "id": "usr_123",
    "username": "demo",
    "firstName": "Demo",
    "lastName": "User",
    "role": "admin"
  }
}
```

Jika akun tidak ditemukan akan mengembalikan `404`.【F:server/routes/mobile.ts†L318-L337】

### 4.2 GET `/api/mobile/summary`

Mengembalikan ringkasan performa bisnis (penjualan hari ini, profit bulanan, status WhatsApp, dsb) dengan normalisasi tipe angka
untuk menghindari `null` pada UI Android.【F:server/routes/mobile.ts†L339-L383】

### 4.3 GET `/api/mobile/store`

Mengambil konfigurasi toko tenant yang sedang aktif (nama, alamat, pajak, status WhatsApp). Data disanitasi agar seluruh field
null-safe.【F:server/routes/mobile.ts†L385-L400】

### 4.4 GET `/api/mobile/categories`

Mengambil daftar kategori produk milik tenant dan mengurutkannya berdasarkan nama. Berguna untuk mengisi dropdown filter pada
aplikasi Android.【F:server/routes/mobile.ts†L402-L423】

### 4.5 GET `/api/mobile/products`

Menyediakan daftar produk dengan pagination dan parameter `search`. Response mencakup metadata pagination (`page`, `limit`,
`total`, `totalPages`) yang dapat dipakai untuk implementasi infinite scroll di Android.【F:server/routes/mobile.ts†L425-L543】

### 4.6 GET `/api/mobile/products/:id`

Mengambil detail produk lengkap, termasuk informasi stok, harga, serta spesifikasi (apabila disimpan dalam format JSON). Error
`404` dikembalikan jika produk tidak ditemukan atau bukan milik tenant yang sama.【F:server/routes/mobile.ts†L545-L652】

### 4.7 Fitur CRUD Lengkap di Mobile

Versi terbaru API menambahkan seluruh endpoint yang sebelumnya hanya ada di dashboard web, sehingga aplikasi Android dapat mengelola semua modul bisnis secara native.【F:server/routes/mobile.ts†L655-L1297】

- **Manajemen Kategori & Produk** – endpoint `POST/PUT/DELETE` untuk `/categories` dan `/products` memungkinkan penambahan inventori baru, update harga, hingga menonaktifkan produk langsung dari perangkat mobile.【F:server/routes/mobile.ts†L655-L781】
- **CRM Pelanggan & Supplier** – daftar, detail, serta CRUD lengkap untuk `/customers` dan `/suppliers` agar tim lapangan bisa memperbarui kontak secara real time.【F:server/routes/mobile.ts†L783-L922】
- **Transaksi Penjualan** – `/transactions` mendukung pembacaan riwayat dan pembuatan transaksi baru lengkap dengan auto-number dan sinkronisasi stok/keuangan.【F:server/routes/mobile.ts†L924-L995】
- **Servis & Teknisi** – `/service-tickets` kini menyediakan daftar aktif, detail, parts, pembaruan status, serta pembatalan dengan validasi aturan bisnis yang sama seperti web.【F:server/routes/mobile.ts†L997-L1114】
- **Pergerakan Stok & Keuangan** – endpoint `/stock-movements` dan `/financial-records` memastikan mutasi gudang serta pencatatan keuangan bisa dilakukan dari Android.【F:server/routes/mobile.ts†L1116-L1188】
- **Laporan & Akuntansi** – `/reports/sales`, `/reports/service`, `/reports/financial`, `/reports/inventory`, `/reports/balance-sheet`, `/reports/income-statement`, dan `/reports/chart-of-accounts` memudahkan pembuatan dashboard ringkas di aplikasi.【F:server/routes/mobile.ts†L1189-L1229】
- **Klaim Garansi** – seluruh siklus hidup klaim (`GET/POST/PATCH`) tersedia di `/warranty-claims`, termasuk validasi eligibility sebelum pengajuan baru.【F:server/routes/mobile.ts†L1231-L1297】

## 5. Penanganan Error

| Status | Kapan terjadi |
| ------ | ------------- |
| `400`  | Request body atau query tidak valid.【F:server/routes/mobile.ts†L219-L224】【F:server/routes/mobile.ts†L534-L539】【F:server/routes/mobile.ts†L643-L647】 |
| `401`  | Token hilang, kedaluwarsa, atau tidak valid.【F:server/routes/mobile.ts†L182-L205】【F:server/routes/mobile.ts†L242-L312】 |
| `403`  | Pengguna tidak memiliki tenant aktif.【F:server/routes/mobile.ts†L186-L189】 |
| `404`  | Data tidak ditemukan (user/product).【F:server/routes/mobile.ts†L327-L328】【F:server/routes/mobile.ts†L587-L589】 |
| `500`  | Error internal server; log detail dicetak di backend.【F:server/routes/mobile.ts†L237-L239】【F:server/routes/mobile.ts†L332-L335】【F:server/routes/mobile.ts†L378-L380】【F:server/routes/mobile.ts†L541-L542】【F:server/routes/mobile.ts†L650-L651】 |
| `503`  | Database tenant belum tersedia, coba beberapa saat lagi.【F:server/routes/mobile.ts†L231-L233】【F:server/routes/mobile.ts†L305-L307】 |

Tangani status di atas pada aplikasi Android untuk memberikan pesan yang sesuai kepada pengguna.

## 6. Checklist Implementasi Android

1. Tambahkan base URL API ke konfigurasi build atau remote config.
2. Pada repository HTTP (Retrofit, Ktor, dsb) aktifkan dukungan request `OPTIONS` otomatis (biasanya default).
3. Sertakan header `Authorization` dengan Bearer token pada semua request terproteksi.
4. Gunakan response `meta.totalPages` dari endpoint `/products` untuk menghentikan pagination ketika halaman terakhir telah
   tercapai.
5. Tangkap kode status `401` lalu arahkan pengguna ke layar login untuk refresh token.
6. Jika menerima `503`, tampilkan pesan maintenance dan lakukan retry dengan exponential backoff.

Dengan mengikuti konfigurasi dan alur di atas, aplikasi Android dapat terhubung stabil ke backend LaptopPOS.

