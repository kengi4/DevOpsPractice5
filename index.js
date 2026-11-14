const http = require("http");
const { Pool } = require("pg");

const PORT = Number(process.env.PORT) || 3000;

const pool = new Pool({
  host: process.env.DB_HOST || process.env.PGHOST || "db",
  port: Number(process.env.DB_PORT || process.env.PGPORT) || 5432,
  user: process.env.DB_USER || process.env.PGUSER || "postgres",
  password: process.env.DB_PASSWORD || process.env.PGPASSWORD || "postgres",
  database: process.env.DB_NAME || process.env.PGDATABASE || "appdb",
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err.message);
});

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function connectWithRetry(maxAttempts = 15, delayMs = 3000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await pool.query("SELECT NOW() AS now");
      console.log(
        "Connected to PostgreSQL successfully! Server time:",
        result.rows[0].now
      );
      return true;
    } catch (err) {
      console.error(
        `PostgreSQL connection attempt ${attempt}/${maxAttempts} failed: ${err.message}`
      );
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  return false;
}

const server = http.createServer(async (req, res) => {
  if (req.url === "/health") {
    try {
      const result = await pool.query("SELECT NOW() AS now");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "ok",
          db: "connected",
          time: result.rows[0].now,
        })
      );
    } catch (err) {
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "error",
          db: "disconnected",
          error: err.message,
        })
      );
    }
    return;
  }

  try {
    const result = await pool.query("SELECT NOW() AS now");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      `<h1>Hello world!</h1>\n<p>Connected to PostgreSQL successfully! DB time: ${escapeHtml(result.rows[0].now)}</p>\n`
    );
  } catch (err) {
    res.writeHead(503, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      `<h1>Hello world!</h1>\n<p>PostgreSQL connection error: ${escapeHtml(err.message)}</p>\n`
    );
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("Hello world!");
  console.log(`Server is running on port ${PORT}`);
  connectWithRetry();
});

async function shutdown(signal) {
  console.log(`Received ${signal}, shutting down gracefully...`);
  server.close(async () => {
    await pool.end().catch(() => {});
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));