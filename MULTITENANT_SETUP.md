# Multi-Tenant Setup with Subdomain Routing

## Struktur Project

```
app/
  ├── (landing)/        → Landing page (klandesa.com)
  ├── (app)/           → Dashboard aplikasi (app.klandesa.com)
  └── (website)/       → Website tenant ([tenant].klandesa.com)
```

## Cara Kerja Subdomain Routing

### 1. **Landing Page** - `klandesa.com` atau `www.klandesa.com`
   - Public access, tidak perlu login
   - Marketing website utama
   - Route: `app/(landing)/*`

### 2. **App Dashboard** - `app.klandesa.com`
   - Memerlukan autentikasi
   - Dashboard untuk manage tenants & settings
   - Route: `app/(app)/*`

### 3. **Tenant Website** - `[tenant].klandesa.com`
   - Website khusus tiap tenant
   - Custom per tenant (konten, branding, dll)
   - Route: `app/(website)/*`

### 4. **Custom Domain** - `domain-milik-desa.com`
   - Website tenant bisa diakses via domain milik desa
   - Ownership verification dilakukan via DNS TXT record
   - Setelah terverifikasi, middleware akan resolve tenant via tabel `WebsiteDomain`

## Testing di Development

### Edit file hosts (macOS/Linux):
```bash
sudo nano /etc/hosts
```

Tambahkan:
```
127.0.0.1 localhost
127.0.0.1 app.localhost
127.0.0.1 tenant1.localhost
127.0.0.1 tenant2.localhost
```

### Jalankan dev server:
```bash
npm run dev
# atau
yarn dev
```

### Akses URLs:
- `http://localhost:3000` → Landing page
- `http://app.localhost:3000` → App dashboard (perlu login)
- `http://tenant1.localhost:3000` → Tenant website
- `http://tenant2.localhost:3000` → Tenant website lain

## Middleware Flow

1. **Detect subdomain** dari hostname
2. **Route berdasarkan subdomain:**
   - `null/www` → Rewrite ke `(landing)/*`
   - `app` → Check auth → Rewrite ke `(app)/*`
   - `[tenant]` → Set tenant header → Rewrite ke `(website)/*`
3. **Pass tenant info** via headers ke page components

## Domain Management (Subdomain & Custom Domain)

### Konsep
- **Subdomain**: `kode-desa.<WEBSITE_ROOT_DOMAIN>`
  - Aktivasi langsung (tanpa verifikasi) karena subdomain berada di bawah domain utama Klandesa
  - DNS wajib support wildcard `A * -> SERVER_IP`
- **Custom domain**: `domain-desa.com` / `www.domain-desa.com`
  - Harus diverifikasi via TXT record sebelum status aktif
  - DNS diarahkan ke Klandesa via A record (apex) atau CNAME (subdomain)

### Ownership Verification (DNS TXT)
- TXT name: `_klandesa-verify.<hostname>`
- TXT value: token verifikasi yang diberikan saat pendaftaran domain
- Verifikasi menggunakan DNS-over-HTTPS (DoH) untuk mengurangi ketergantungan resolver lokal

### Routing Rules
- Middleware melakukan tenant resolution dengan prioritas:
  1. Header `x-tenant-hostname` / `x-tenant-subdomain` (internal)
  2. Host header → lookup `WebsiteDomain.hostname`
  3. Fallback subdomain → lookup `Village.code`

### SSL
- Subdomain: mengikuti konfigurasi infrastruktur (reverse proxy/CDN) Klandesa
- Custom domain: direkomendasikan lewat proxy/CDN (mis. Cloudflare) dengan SSL/TLS Full (Strict)

## Helper Functions

### `lib/subdomain.ts`
- `getSubdomain()` - Extract subdomain dari request
- `isMainDomain()` - Check jika main domain
- `isAppSubdomain()` - Check jika app subdomain
- `isTenantSubdomain()` - Check jika tenant subdomain

### `lib/tenant.ts`
- `getTenant()` - Get tenant data dari header/database

## API (Website)

### Domain
- `GET /api/website/domains` → list domain desa
- `POST /api/website/domains` → daftar subdomain/custom domain + instruksi DNS
- `PATCH /api/website/domains/:id` → set primary / set customDomain aktif
- `DELETE /api/website/domains/:id` → hapus domain
- `POST /api/website/domains/:id/verify` → verifikasi TXT (custom domain)
- `GET /api/website/domains/:id/events` → event log (monitoring ringan)

### Engine
- `GET /api/website/engine/config` → config efektif (template + customization)
- `PATCH /api/website/engine/config` → update customization (preset_key / overrides)
- `GET /api/website/engine/presets` → list preset bawaan
- `POST /api/website/engine/presets` → save/apply/delete preset (action-based)

### Monitoring
- `GET /api/website/monitoring/health` → ringkasan status domain untuk desa

## Next Steps

1. **Setup database** untuk tenant data
2. **Implement tenant CRUD** di dashboard
3. **Add custom theming** per tenant
4. **Configure custom domains** (optional)
5. **Add tenant-specific content management**

## Production Setup

Di production, configure DNS untuk subdomain wildcards:
```
A     @          → your-server-ip
A     *          → your-server-ip (wildcard)
CNAME www        → yourdomain.com
```

Environment variables:
```env
NEXT_PUBLIC_ROOT_DOMAIN=klandesa.com
WEBSITE_ROOT_DOMAIN=klandesa.id
WEBSITE_CNAME_TARGET=klandesa.id
WEBSITE_A_TARGET=YOUR_SERVER_IP
```
