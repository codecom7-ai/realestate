module.exports = {
  apps: [
    // Backend API (NestJS)
    {
      name: 'realestate-api',
      cwd: '/opt/realestate/apps/api',
      script: 'dist/apps/api/src/main.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3102
      },
      node_args: '--max-old-space-size=2048',
      max_memory_restart: '1G',
      listen_timeout: 10000,
      kill_timeout: 5000,
      error_file: '/var/log/realestate/api-error.log',
      out_file: '/var/log/realestate/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    },
    // Admin Dashboard (Next.js)
    {
      name: 'realestate-web',
      cwd: '/opt/realestate/apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3101,
        HOSTNAME: '0.0.0.0'
      },
      node_args: '--max-old-space-size=2048',
      max_memory_restart: '1G',
      listen_timeout: 10000,
      kill_timeout: 5000,
      error_file: '/var/log/realestate/web-error.log',
      out_file: '/var/log/realestate/web-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    },
    // Customer Portal (Next.js)
    {
      name: 'realestate-portal',
      cwd: '/opt/realestate/apps/customer-portal',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3103,
        HOSTNAME: '0.0.0.0'
      },
      node_args: '--max-old-space-size=1024',
      max_memory_restart: '512M',
      listen_timeout: 10000,
      kill_timeout: 5000,
      error_file: '/var/log/realestate/portal-error.log',
      out_file: '/var/log/realestate/portal-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};
