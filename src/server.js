import "dotenv/config";
import express from "express";
import multer from "multer";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { client } from "./llama-client.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { bankingChat } from "./controllers/agent.js";
import { proxyChat, streamChat, structuredChat } from "./controllers/chat.js";
import { buildRagChat } from "./controllers/rag.js";
import { getCapabilities, proxyModels } from "./controllers/system.js";
import {
  buildUploadController,
  buildUploadDeleteController,
  buildUploadListController,
} from "./controllers/upload.js";
import { RagService } from "./services/rag-service.js";

const root = fileURLToPath(new URL("../public", import.meta.url));
const docsDir = fileURLToPath(new URL("../docs", import.meta.url));
const app = express();
const port = Number(process.env.PORT || 3000);

const ragService = new RagService();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, docsDir);
  },
  filename: function (req, file, cb) {
    // Basic sanitization and unique name to prevent overwriting
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

app.use(express.json({ limit: "1mb" }));

// API Routes
app.post("/api/chat", proxyChat);
app.post("/api/chat/stream", streamChat);
app.post("/api/structured", structuredChat);
app.post("/api/banking-agent", bankingChat);
app.post("/api/rag", buildRagChat(ragService));
app.post(
  "/api/upload",
  upload.single("file"),
  buildUploadController(ragService),
);
app.get("/api/uploads", buildUploadListController(ragService));
app.delete("/api/upload/:filename", buildUploadDeleteController(ragService));
app.get("/api/capabilities", getCapabilities);
app.get("/api/models", proxyModels);

// Vendor static files
app.get("/vendor/marked.js", (req, res) => {
  res.sendFile(
    fileURLToPath(
      new URL("../node_modules/marked/lib/marked.esm.js", import.meta.url),
    ),
  );
});
app.get("/vendor/dompurify.js", (req, res) => {
  res.sendFile(
    fileURLToPath(
      new URL("../node_modules/dompurify/dist/purify.es.mjs", import.meta.url),
    ),
  );
});

// Public static files
app.use(express.static(root));

// Error handling middleware (must be after routes)
app.use(notFoundHandler);
app.use(errorHandler);

// SPA fallback
app.get(/.*/, (req, res) => {
  res.sendFile(join(root, "index.html"));
});

app.listen(port, () => {
  console.log(`Local LLM Lab: http://localhost:${port}`);
  console.log(`llama.cpp endpoint: ${client.baseUrl}`);
});
