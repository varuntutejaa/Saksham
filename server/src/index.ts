import "express-async-errors";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { env } from "./lib/env.js";
import { prisma } from "./lib/prisma.js";
import { authRouter } from "./routes/auth.js";
import { assistantRouter } from "./routes/assistant.js";
import { catalogRouter } from "./routes/catalog.js";
import { adminRouter } from "./routes/admin.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "up", time: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: "degraded", db: "down" });
  }
});

app.use("/api/auth", authRouter);
app.use("/api/assistant", assistantRouter);
app.use("/api", catalogRouter);
app.use("/api/admin", adminRouter);

app.use((_req, res) => res.status(404).json({ error: "Route not found" }));

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(env.port, () => {
  console.log(`Saksham API listening on http://localhost:${env.port}`);
});
