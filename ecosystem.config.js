module.exports = {
  apps: [
    {
      name: "klandesa-webapp",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 2042",
      cwd: "/var/www/html/klandesa/klandesa-webapp",
      instances: 4,
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
      },
      env_production: {
        NODE_ENV: "production",
      },
      // Memory & restart
      max_memory_restart: "512M",
      max_restarts: 10,
      min_uptime: "10s",
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
