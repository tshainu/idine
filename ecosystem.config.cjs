module.exports = {
  apps: [
    {
      name: "web-app",
      // Bun only auto-loads .env from its cwd — run from the repo root so the
      // root .env (DATABASE_URL etc.) reaches the server on every spawn.
      cwd: __dirname,
      script: "packages/web/src/server.ts",
      interpreter: "bun",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      restart_delay: 1000,
      env: {
        PORT: process.env.PORT || 4200,
        NODE_ENV: "development",
        WEBSITE_URL: "http://localhost:4200",
        APPLICATION_ID: "idine",
        BETTER_AUTH_SECRET: "localsecret1234567890abcdef",
        DATABASE_URL: "file:/home/user/idine/local.db",
        DATABASE_AUTH_TOKEN: "",
      },
    },
  ],
};
