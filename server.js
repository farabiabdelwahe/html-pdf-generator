const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs").promises;
const { execFile } = require("child_process");
const path = require("path");
const os = require("os");

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));
app.use(bodyParser.text({ limit: "10mb" })); // For text/plain input
const CHROME_PATH = "/usr/bin/chromium"; // set this in your code

// Simple API key protection
const API_KEY = process.env.API_KEY || "";

// Validate HTML
const isValidHtml = (html) => {
  return typeof html === "string" && html.trim().length > 0 && html.toLowerCase().includes("<html");
};

// Generate PDF using headless Chromium
const generatePdfWithChromium = async (html, outputPdfPath) => {
  const tmpHtmlPath = path.join(os.tmpdir(), `tmp-${Date.now()}.html`);
  await fs.writeFile(tmpHtmlPath, html, "utf8");

  return new Promise((resolve, reject) => {
    execFile(
      CHROME_PATH, // or "google-chrome" depending on Docker image
      [
        "--headless",
        "--no-pdf-header-footer",
        "--disable-gpu",
        "--no-sandbox",
        `--print-to-pdf=${outputPdfPath}`,
        tmpHtmlPath
      ],
      async (err) => {
        // Remove temporary HTML file
        await fs.unlink(tmpHtmlPath).catch(() => {});
        if (err) return reject(err);
        resolve();
      }
    );
  });
};

app.post("/generate-pdf", async (req, res) => {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[${requestId}] Starting PDF generation`);

  let pdfPath;

  try {
    // Authorization
    const authHeader = req.headers["authorization"] || "";
    if (API_KEY && authHeader !== `Bearer ${API_KEY}`) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Extract HTML
    let html;
    if (req.is("application/x-www-form-urlencoded")) html = req.body.html;
    else if (req.is("text/plain")) html = req.body;
    else return res.status(400).json({ error: "Unsupported Content-Type" });

    if (!isValidHtml(html)) return res.status(400).json({ error: "Invalid HTML" });

    // Save debug HTML (optional)
    const htmlDebugPath = path.join(os.tmpdir(), `debug-html-${requestId}.html`);
    await fs.writeFile(htmlDebugPath, html, "utf8");

    // PDF output path
    pdfPath = path.join(os.tmpdir(), `debug-pdf-${requestId}.pdf`);

    // Generate PDF
    await generatePdfWithChromium(html, pdfPath);

    // Read PDF and send
    const pdfBuffer = await fs.readFile(pdfPath);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Length": pdfBuffer.length,
      "Content-Disposition": "attachment; filename=document.pdf",
      "Cache-Control": "no-cache",
    });
    res.end(pdfBuffer);

    console.log(`[${requestId}] PDF sent successfully`);
  } catch (err) {
    console.error(`[${requestId}] PDF generation error: ${err.message}`);
    res.status(500).json({ error: "PDF generation failed", message: err.message });
  } finally {
    // Clean up files
    if (pdfPath) await fs.unlink(pdfPath).catch(() => {});
    console.log(`[${requestId}] Temporary files cleaned`);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[INFO] Server running on port ${PORT}`));
