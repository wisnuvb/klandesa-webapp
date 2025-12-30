# Finance API Documentation

## Overview
Complete CRUD API endpoints for financial management in the Klandesa system.

## Endpoints

### 1. Finance Summary (GET /api/finance/summary)
Fetches aggregated financial data for a village by year.

**Query Parameters:**
- `year` (optional): Year for financial data. Defaults to current year.

**Response:**
```json
{
  "success": true,
  "data": {
    "apbdes": {
      "tahun": 2024,
      "totalPendapatan": 1500000000,
      "totalBelanja": 1200000000,
      "realisasiPendapatan": 800000000,
      "realisasiBelanja": 600000000
    },
    "pendapatan": [
      {
        "kategori": "PAD (Pendapatan Asli Desa)",
        "anggaran": 500000000,
        "realisasi": 300000000,
        "persentase": 60,
        "subKategori": [
          {
            "nama": "Hasil Usaha Desa",
            "anggaran": 200000000,
            "realisasi": 150000000
          }
        ]
      }
    ],
    "belanja": [
      {
        "bidang": "Penyelenggaraan Pemerintahan Desa",
        "anggaran": 400000000,
        "realisasi": 250000000,
        "persentase": 62.5,
        "color": "#0f766e",
        "subItems": [
          {
            "nama": "Penghasilan Tetap dan Tunjangan",
            "anggaran": 200000000,
            "realisasi": 150000000,
            "persentase": 75
          }
        ]
      }
    ],
    "transaksi": [
      {
        "id": 1,
        "tanggal": "2024-01-15",
        "kode": "BKM-2024-01-0001",
        "uraian": "Pendapatan dari hasil sewa tanah kas desa",
        "jenis": "masuk",
        "jumlah": 5000000,
        "saldo": 100000000
      }
    ],
    "spp": [
      {
        "id": 2,
        "nomor": "SPP-01/2024/001",
        "tanggal": "2024-01-10",
        "keperluan": "Pembelian ATK kantor",
        "bidang": "Penyelenggaraan Pemerintahan Desa",
        "jumlah": 2500000,
        "status": "pending",
        "pengaju": "Admin Desa"
      }
    ],
    "trend": [
      {
        "bulan": "Jan",
        "pendapatan": 120000000,
        "belanja": 95000000
      }
    ]
  },
  "cached": false
}
```

**Features:**
- Automatically groups budgets by category and subCategory
- Populates `subKategori` for income breakdown
- Populates `subItems` for expense breakdown
- Calculates 6-month financial trends
- Derives SPP data from expense transactions with pending status
- 5-minute cache per village and year

---

### 2. Create Transaction (POST /api/finance/transactions)
Creates a new income or expense transaction.

**Request Body:**
```json
{
  "type": "income",
  "category": "PAD (Pendapatan Asli Desa)",
  "description": "Pendapatan dari hasil sewa tanah kas desa",
  "amount": 5000000,
  "transactionDate": "2024-01-15",
  "paymentMethod": "bank_transfer",
  "referenceNumber": "REF-2024-001",
  "status": "verified"
}
```

**Fields:**
- `type` (required): "income" or "expense"
- `category` (required): Transaction category
- `description` (required): Transaction description
- `amount` (required): Transaction amount
- `transactionDate` (required): Transaction date (ISO 8601)
- `paymentMethod` (optional): "cash", "bank_transfer", etc. Defaults to "cash"
- `referenceNumber` (optional): External reference. Auto-generated if not provided
- `status` (optional): "verified", "pending", "approved", "rejected". Defaults to "verified"

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "transactionNumber": "BKM-2024-01-0001",
    "transactionDate": "2024-01-15T00:00:00.000Z",
    "type": "income",
    "category": "PAD (Pendapatan Asli Desa)",
    "description": "Pendapatan dari hasil sewa tanah kas desa",
    "amount": 5000000,
    "status": "verified"
  },
  "message": "Transaksi berhasil dicatat"
}
```

**Notes:**
- Transaction number is auto-generated: `BKM-{year}-{month}-{random}` for income, `BKK-{year}-{month}-{random}` for expense
- Use `status: "pending"` when creating SPP (Surat Permintaan Pembayaran)

---

### 3. Update Transaction (PUT /api/finance/transactions)
Updates an existing transaction.

**Request Body:**
```json
{
  "id": 1,
  "type": "income",
  "category": "Updated Category",
  "description": "Updated description",
  "amount": 5500000,
  "transactionDate": "2024-01-16",
  "paymentMethod": "cash",
  "referenceNumber": "REF-2024-001-UPDATED"
}
```

**Fields:**
- `id` (required): Transaction ID to update
- All other fields are optional (only provided fields will be updated)

**Response:**
```json
{
  "success": true,
  "data": { /* updated transaction object */ },
  "message": "Transaksi berhasil diupdate"
}
```

---

### 4. Delete Transaction (DELETE /api/finance/transactions)
Deletes a transaction permanently.

**Query Parameters:**
- `id` (required): Transaction ID to delete

**Example:**
```
DELETE /api/finance/transactions?id=1
```

**Response:**
```json
{
  "success": true,
  "message": "Transaksi berhasil dihapus"
}
```

---

### 5. Create Budget (POST /api/finance/budgets)
Creates a new budget entry.

**Request Body:**
```json
{
  "year": 2024,
  "category": "PAD (Pendapatan Asli Desa)",
  "subCategory": "Hasil Usaha Desa",
  "budgetAmount": 200000000,
  "description": "Anggaran hasil usaha desa tahun 2024"
}
```

**Fields:**
- `year` (required): Budget year
- `category` (required): Budget category
- `subCategory` (required): Budget sub-category
- `budgetAmount` (required): Budget amount
- `description` (optional): Budget description. Auto-generated if not provided

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "budgetCode": "PAD-2024-001",
    "year": 2024,
    "category": "PAD (Pendapatan Asli Desa)",
    "subCategory": "Hasil Usaha Desa",
    "budgetAmount": 200000000,
    "realizedAmount": 0,
    "remainingAmount": 200000000,
    "status": "active"
  },
  "message": "Anggaran berhasil ditambahkan"
}
```

**Notes:**
- Budget code is auto-generated: `{category-prefix}-{year}-{random}`
- Initial realizedAmount is 0
- Initial remainingAmount equals budgetAmount

---

### 6. Update Budget (PUT /api/finance/budgets)
Updates an existing budget.

**Request Body:**
```json
{
  "id": 1,
  "category": "Updated Category",
  "subCategory": "Updated Sub Category",
  "budgetAmount": 250000000,
  "status": "completed"
}
```

**Fields:**
- `id` (required): Budget ID to update
- All other fields are optional
- `remainingAmount` is automatically recalculated when `budgetAmount` is updated

**Response:**
```json
{
  "success": true,
  "data": { /* updated budget object */ },
  "message": "Anggaran berhasil diupdate"
}
```

---

### 7. SPP Approval/Rejection (POST /api/finance/spp)
Approves or rejects an SPP (Surat Permintaan Pembayaran).

**Request Body:**
```json
{
  "transactionId": 2,
  "action": "approve",
  "reason": "Dokumen lengkap dan sesuai"
}
```

**Fields:**
- `transactionId` (required): ID of the SPP transaction
- `action` (required): "approve" or "reject"
- `reason` (optional): Approval/rejection reason

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "status": "approved"
  },
  "message": "SPP berhasil disetujui"
}
```

**Notes:**
- SPP is represented as an expense transaction with `status: "pending"`
- Approval changes status to "approved"
- Rejection changes status to "rejected"

---

## Usage in Frontend

### Fetch Finance Data
```typescript
const fetchFinance = async () => {
  const year = new Date().getFullYear();
  const response = await fetch(`/api/finance/summary?year=${year}`);
  const result = await response.json();
  if (result.success) {
    // Update state with result.data
  }
};
```

### Create Income Transaction
```typescript
const handleSavePendapatan = async () => {
  const response = await fetch("/api/finance/transactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "income",
      category: formData.kategori,
      description: formData.uraian,
      amount: formData.jumlah,
      transactionDate: formData.tanggal,
      referenceNumber: formData.nomorBukti,
    }),
  });
  
  if (!response.ok) throw new Error("Gagal menyimpan pendapatan");
  
  // Refetch data to update UI
  await fetchFinance();
};
```

### Create Expense Transaction
```typescript
const handleSaveBelanja = async () => {
  const response = await fetch("/api/finance/transactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "expense",
      category: formData.bidang,
      description: formData.keterangan,
      amount: formData.jumlah,
      transactionDate: formData.tanggal,
      referenceNumber: formData.nomorBukti,
    }),
  });
  
  if (!response.ok) throw new Error("Gagal menyimpan belanja");
  await fetchFinance();
};
```

### Create SPP
```typescript
const handleSaveSPP = async () => {
  const response = await fetch("/api/finance/transactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "expense",
      category: formData.kegiatan,
      description: formData.uraian,
      amount: formData.jumlah,
      transactionDate: formData.tanggal,
      referenceNumber: formData.nomorSPP,
      status: "pending", // SPP starts as pending
    }),
  });
  
  if (!response.ok) throw new Error("Gagal menyimpan SPP");
  await fetchFinance();
};
```

### Approve/Reject SPP
```typescript
const handleApproveReject = async (sppId: number, action: "approve" | "reject", reason?: string) => {
  const response = await fetch("/api/finance/spp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      transactionId: sppId,
      action,
      ...(action === "reject" && { reason }),
    }),
  });
  
  if (!response.ok) throw new Error(`Gagal ${action} SPP`);
  await fetchFinance();
};
```

---

## Authentication
All endpoints require authentication via NextAuth session. The system automatically resolves the village context from:
1. User's `villageCode` in session
2. `DEFAULT_VILLAGE_CODE` environment variable
3. First village in database (fallback)

## Error Handling
All endpoints return consistent error responses:
```json
{
  "error": "Error message",
  "status": 400|401|404|500
}
```

## Caching
The summary endpoint uses a 5-minute cache per village and year to optimize performance.

## Data Aggregation
The summary endpoint automatically:
- Groups budgets by category and subCategory
- Calculates realization percentages
- Generates 6-month financial trends
- Derives SPP data from pending expense transactions
- Assigns colors to expense categories for charts
