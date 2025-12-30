# API Statistik Kependudukan - Dokumentasi

## Endpoint

### GET /api/statistics

Mengambil data statistik kependudukan berdasarkan village dan tahun.

#### Query Parameters
- `year` (optional): Tahun untuk filter data. Default: tahun berjalan

#### Response Success (200)
```json
{
  "success": true,
  "cached": false,
  "data": {
    "summary": {
      "totalPenduduk": 1452,
      "lakiLaki": 744,
      "perempuan": 708,
      "pertumbuhanBulanIni": 3,
      "persentasePertumbuhan": 0.21
    },
    "jenisKelamin": [...],
    "usia": [...],
    "pendidikan": [...],
    "pekerjaan": [...],
    "perkawinan": [...],
    "agama": [...],
    "golonganDarah": [...],
    "wilayah": [...],
    "kesehatan": [...],
    "trend": [...]
  }
}
```

### DELETE /api/statistics

Menghapus cache statistik.

#### Response Success (200)
```json
{
  "success": true,
  "message": "Cache cleared"
}
```

## Kategori Statistik

### 1. **Overview (Summary)**
- Total Penduduk
- Jumlah Laki-laki dan Perempuan
- Pertumbuhan Bulan Ini
- Persentase Pertumbuhan

### 2. **Jenis Kelamin**
Distribusi penduduk berdasarkan gender dengan persentase.

### 3. **Usia**
Distribusi penduduk per rentang usia (0-4, 5-9, ..., 60+) dengan breakdown gender.

### 4. **Pendidikan**
Distribusi tingkat pendidikan dari Tidak Sekolah hingga S3.

### 5. **Pekerjaan**
Distribusi jenis pekerjaan penduduk.

### 6. **Status Perkawinan**
Distribusi status perkawinan (Belum Kawin, Kawin, Cerai Hidup, Cerai Mati).

### 7. **Agama**
Distribusi agama penduduk.

### 8. **Golongan Darah**
Distribusi golongan darah (A, B, AB, O).

### 9. **Wilayah/Dusun**
Distribusi penduduk per dusun/wilayah.

### 10. **Kesehatan**
Statistik kesehatan meliputi:
- Penyandang Disabilitas
- Peserta BPJS/KIS
- Ibu Hamil
- Ibu Menyusui
- Balita Stunting

### 11. **Trend Kependudukan**
Grafik pertumbuhan penduduk 6 bulan terakhir.

## Optimasi Performa

### Caching
- Data di-cache selama **5 menit**
- Cache key: `stats-{villageId}-{year}`
- Cache dapat di-clear dengan DELETE request

### Database Query Optimization
- Menggunakan `select` untuk field-field yang diperlukan saja
- Filter `isAlive: true` untuk hanya menghitung penduduk aktif
- Single query untuk fetch semua data
- Processing dilakukan di memory (aggregasi client-side)

### Normalisasi Data
- Pendidikan dan Pekerjaan dinormalisasi untuk konsistensi
- Handling null values dengan fallback "Tidak Diketahui"

## Performance Considerations

1. **Single Query**: Semua data diambil dalam 1 query untuk menghindari N+1 problem
2. **Select Minimal Fields**: Hanya select field yang dibutuhkan
3. **Memory Processing**: Aggregasi dilakukan di memory setelah fetch
4. **Cache Layer**: Response di-cache untuk mengurangi load database
5. **Type Safety**: Full TypeScript support untuk type checking

## Contoh Penggunaan

### Fetch Statistik
```typescript
const response = await fetch('/api/statistics?year=2024');
const { data } = await response.json();
console.log(data.summary.totalPenduduk);
```

### Clear Cache
```typescript
await fetch('/api/statistics', { method: 'DELETE' });
```

## Tips Optimasi Lebih Lanjut (Future Enhancement)

1. **Redis Cache**: Gunakan Redis untuk distributed caching
2. **Database Aggregation**: Move aggregasi ke database dengan `groupBy`
3. **Materialized Views**: Buat materialized view untuk statistik
4. **Background Jobs**: Update statistik secara berkala via cron job
5. **Incremental Updates**: Track changes dan update cache incremental
