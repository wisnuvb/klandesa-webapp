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

## Helper Functions

### `lib/subdomain.ts`
- `getSubdomain()` - Extract subdomain dari request
- `isMainDomain()` - Check jika main domain
- `isAppSubdomain()` - Check jika app subdomain
- `isTenantSubdomain()` - Check jika tenant subdomain

### `lib/tenant.ts`
- `getTenant()` - Get tenant data dari header/database

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
```
