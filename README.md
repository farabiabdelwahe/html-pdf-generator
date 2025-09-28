# Node.js PDF Generator with Headless Chromium

This project is a lightweight **PDF generator** built with Node.js and **headless Chromium**, without using Puppeteer.  
It accepts HTML input via POST requests and returns a PDF. Temporary files are cleaned automatically after each request.

---

## Features

- Accepts HTML via `text/plain` or `application/x-www-form-urlencoded`
- Generates PDFs using **system-installed Chromium**
- No header/footer printed in PDFs
- Optional debug files for HTML/PDF (auto-cleaned)
- API key protection
- Runs in **Docker** with minimal image size
