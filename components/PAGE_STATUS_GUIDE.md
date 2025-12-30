# PageStatus Component

Komponen global untuk menampilkan status halaman di seluruh aplikasi Klandesa.

## 📦 Instalasi

Komponen ini sudah tersedia di `/components/PageStatus.tsx`

## 🎯 Fitur

- ✅ 9 tipe status berbeda (development, maintenance, beta, dll)
- ✅ 3 varian tampilan (Banner, Inline Badge, Full Page)
- ✅ 4 ukuran (sm, md, lg, full)
- ✅ Dismissible (dapat ditutup)
- ✅ Custom content support
- ✅ Animasi smooth
- ✅ Fully typed dengan TypeScript
- ✅ Responsive design

## 🚀 Quick Start

### 1. Basic Usage (Banner)

```tsx
import { PageStatus } from "@/components/PageStatus";

export default function MyPage() {
  return (
    <div>
      <PageStatus type="development" />
      {/* konten halaman */}
    </div>
  );
}
```

### 2. Inline Badge

```tsx
import { InlinePageStatus } from "@/components/PageStatus";

export default function MyPage() {
  return (
    <div>
      <h1>
        Dashboard <InlinePageStatus type="beta" />
      </h1>
    </div>
  );
}
```

### 3. Full Page Status

```tsx
import { FullPageStatus } from "@/components/PageStatus";

export default function MyPage() {
  return (
    <FullPageStatus
      type="coming-soon"
      title="Fitur Ini Segera Hadir"
      message="Kami sedang bekerja keras untuk menghadirkan fitur ini."
    />
  );
}
```

## 📚 Tipe Status

| Type | Icon | Warna | Keterangan |
|------|------|-------|------------|
| `development` | 🚧 | Yellow | Halaman dalam pengembangan |
| `maintenance` | 🔧 | Orange | Sedang dalam pemeliharaan |
| `coming-soon` | 🚀 | Purple | Fitur segera hadir |
| `beta` | ⚡ | Blue | Versi beta |
| `warning` | ⚠️ | Red | Peringatan penting |
| `info` | ℹ️ | Cyan | Informasi umum |
| `locked` | 🔒 | Gray | Akses terbatas |
| `success` | ✅ | Green | Berhasil |
| `experimental` | 🧪 | Indigo | Fitur eksperimental |

## 🎨 Props

### PageStatus (Banner)

```tsx
interface PageStatusProps {
  type?: PageStatusType;          // Tipe status (default: "development")
  title?: string;                 // Custom title
  message?: string;               // Custom message
  showIcon?: boolean;             // Tampilkan icon (default: true)
  size?: "sm" | "md" | "lg" | "full"; // Ukuran (default: "md")
  dismissible?: boolean;          // Dapat ditutup (default: false)
  onDismiss?: () => void;         // Callback saat ditutup
  children?: React.ReactNode;     // Custom content
  className?: string;             // Custom CSS class
  animate?: boolean;              // Animasi (default: true)
}
```

### InlinePageStatus (Badge)

```tsx
interface InlinePageStatusProps {
  type?: PageStatusType;          // Tipe status
  text?: string;                  // Custom text
  showIcon?: boolean;             // Tampilkan icon (default: true)
  className?: string;             // Custom CSS class
}
```

### FullPageStatus (Full Page)

```tsx
interface FullPageStatusProps {
  type?: PageStatusType;          // Tipe status
  title?: string;                 // Custom title
  message?: string;               // Custom message
  showIcon?: boolean;             // Tampilkan icon (default: true)
  children?: React.ReactNode;     // Custom content
  action?: {                      // Action button
    label: string;
    onClick: () => void;
  };
}
```

## 💡 Contoh Penggunaan

### Custom Title & Message

```tsx
<PageStatus
  type="development"
  title="Fitur Absensi Sedang Dikembangkan"
  message="Estimasi selesai: 15 Januari 2024"
/>
```

### With Custom Content

```tsx
<PageStatus type="coming-soon">
  <button className="mt-3 px-4 py-2 bg-purple-600 text-white rounded-lg">
    Daftar Waitlist
  </button>
</PageStatus>
```

### Dismissible

```tsx
const [show, setShow] = useState(true);

{show && (
  <PageStatus
    type="info"
    title="Update Terbaru"
    message="Sistem telah diperbarui ke versi 2.0"
    dismissible
    onDismiss={() => setShow(false)}
  />
)}
```

### Different Sizes

```tsx
<PageStatus type="warning" size="sm" />  {/* Compact */}
<PageStatus type="warning" size="md" />  {/* Default */}
<PageStatus type="warning" size="lg" />  {/* Large */}
<PageStatus type="warning" size="full" /> {/* Extra Large */}
```

### Inline in Text

```tsx
<p>
  Status: <InlinePageStatus type="beta" text="Beta Testing" />
</p>
```

### Full Page with Action

```tsx
<FullPageStatus
  type="locked"
  title="Akses Ditolak"
  message="Anda tidak memiliki izin untuk mengakses halaman ini."
  action={{
    label: "Kembali ke Dashboard",
    onClick: () => router.push("/dashboard"),
  }}
/>
```

### Without Icon

```tsx
<PageStatus
  type="info"
  showIcon={false}
  title="Pemberitahuan"
  message="Sistem akan maintenance pada Minggu, 15 Jan 2024"
/>
```

## 🎯 Use Cases

### 1. Halaman Dalam Pengembangan

```tsx
export default function AbsensiPage() {
  return (
    <FullPageStatus
      type="development"
      title="Halaman Absensi Sedang Dikembangkan"
      message="Fitur ini akan segera tersedia."
    />
  );
}
```

### 2. Fitur Beta

```tsx
export default function ReportPage() {
  return (
    <div>
      <PageStatus
        type="beta"
        size="sm"
        title="Fitur Beta"
        message="Fitur ini masih dalam tahap beta. Laporkan bug ke admin."
      />
      {/* konten halaman */}
    </div>
  );
}
```

### 3. Maintenance Notice

```tsx
export default function FinancePage() {
  return (
    <div>
      <PageStatus
        type="maintenance"
        title="Sedang Maintenance"
        message="Halaman akan aktif kembali pada pukul 14:00 WIB"
        dismissible
        onDismiss={() => localStorage.setItem("dismissed", "true")}
      />
      {/* konten halaman */}
    </div>
  );
}
```

### 4. Coming Soon Features

```tsx
export default function AdvancedAnalytics() {
  return (
    <FullPageStatus
      type="coming-soon"
      title="Analytics Dashboard Coming Soon"
      message="Kami sedang membangun dashboard analytics yang powerful."
      action={{
        label: "Back to Home",
        onClick: () => router.push("/"),
      }}
    >
      <div className="text-sm">
        <p>Features:</p>
        <ul>
          <li>Real-time data</li>
          <li>Custom reports</li>
          <li>Export to Excel/PDF</li>
        </ul>
      </div>
    </FullPageStatus>
  );
}
```

### 5. Warning Messages

```tsx
<PageStatus
  type="warning"
  title="Data Akan Dihapus Permanen"
  message="Pastikan Anda telah backup data sebelum melanjutkan."
  dismissible={false}
/>
```

### 6. Success Messages

```tsx
<PageStatus
  type="success"
  title="Data Berhasil Disimpan"
  message="Semua perubahan telah tersimpan ke database."
  dismissible
  onDismiss={() => setShowSuccess(false)}
/>
```

## 🎨 Customization

### Custom Styling

```tsx
<PageStatus
  type="info"
  className="shadow-xl border-4"
/>
```

### Without Animation

```tsx
<PageStatus
  type="development"
  animate={false}
/>
```

## 📱 Responsive

Komponen otomatis responsive dan beradaptasi dengan ukuran layar.

## 🔗 Related Components

- `components/PageStatus.tsx` - Komponen utama
- `components/PageStatus.example.tsx` - Contoh lengkap
- `app/(app)/absensi/page.tsx` - Implementasi di halaman absensi

## 📝 Notes

- Komponen menggunakan `motion/react` untuk animasi
- Icons dari `lucide-react`
- Fully typed dengan TypeScript
- Compatible dengan Tailwind CSS

## 🤝 Contributing

Untuk menambahkan tipe status baru, edit `statusConfigs` di `PageStatus.tsx`:

```tsx
const statusConfigs: Record<PageStatusType, PageStatusConfig> = {
  // tambahkan tipe baru di sini
  "my-new-type": {
    icon: MyIcon,
    bgColor: "bg-custom-50",
    borderColor: "border-custom-200",
    textColor: "text-custom-900",
    iconColor: "text-custom-600",
    defaultTitle: "My New Status",
    defaultMessage: "Description of the status.",
  },
};
```

---

**Made with ❤️ for Klandesa**
