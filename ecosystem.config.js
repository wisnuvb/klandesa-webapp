/**
 * PM2 — klandesa-webapp (Next.js admin + website desa)
 *
 * Target: dedicated OVH 64 GB RAM / 16 vCPU, ~1000 desa aktif.
 * Alokasi server (perkiraan):
 *   - Webapp (file ini)     : 8 worker × ~1,5 GB ≈ 12 GB
 *   - MySQL                 : innodb_buffer_pool 16–20 GB
 *   - API mobile (nanti)    : sisakan ~4 vCPU + ~6 GB (project terpisah)
 *   - OS, Nginx, Redis, dll : ~4–6 GB
 *
 * Set DATABASE_URL di .env server dengan connection_limit=5
 * (8 worker × 5 ≈ 40 koneksi; sisakan quota untuk API mobile nanti).
 */
module.exports = {
  apps: [
    {
      name: "klandesa-webapp",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 2042",
      cwd: "/var/www/html/klandesa/klandesa-webapp",
      // Setengah vCPU untuk webapp; sisanya untuk MySQL, Nginx, API mobile.
      instances: 8,
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
      },
      env_production: {
        NODE_ENV: "production",
        // Selaras dengan max_memory_restart — kurangi restart loop saat spike (PDF, GIS, upload).
        NODE_OPTIONS: "--max-old-space-size=1536",
      },
      // Memory & restart
      max_memory_restart: "1536M",
      max_restarts: 10,
      min_uptime: "30s",
      // Graceful shutdown
      kill_timeout: 15000,
      listen_timeout: 10000,
      // Logging
      output: "/var/www/html/klandesa/klandesa-webapp/logs/out.log",
      error: "/var/www/html/klandesa/klandesa-webapp/logs/error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      max_size: "10M",
      max_file: 5,
    },
  ],
};
