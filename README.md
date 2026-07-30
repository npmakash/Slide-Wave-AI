# Slide Wave AI

Automate bulk presentation generation in Google Slides using Google Sheets, raw text, JSON data, or Gemini AI.

---

## 🌟 Key Features

- **Google OAuth 2.0 Authentication**: Seamless login and automatic token refresh without using Apps Script.
- **Two Generation Sources**:
  1. **Google Sheets**: Map sheet headers to placeholders. Each row generates one slide.
  2. **JSON Array**: Paste or drag & drop a `.json` file containing array of objects.
- **Dynamic Placeholder Detection & Mapping**:
  - Live placeholder preview from Google Slides template URL.
  - Supports text (`{{name}}`), dates (`{{date|DD/MM/YYYY}}`), numbers/currency (`{{score|currency}}`), and QR Codes (`{{qr:url}}`).
- **Export Options**:
  - **PDF Export**: Export the generated presentation as a PDF.
  - **PNG Images ZIP**: Export each generated slide as a high-resolution PNG image inside a ZIP file.
- **Live Progress Tracker**: Real-time progress bar with step-by-step updates and job cancellation support.
- **Generation History & Audit Logs**: Search, filter, bulk delete past generations, and download detailed execution logs.
- **Resilience & Security**: Exponential backoff API retry logic, rate limiting, input validation, and automatic temporary file cleanup.

---

## 🏗️ Architecture & Project Structure

```
Google Slide Generator/
├── public/                # Frontend SPA assets
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── app.js         # Entry point & SPA router
│       ├── auth.js        # OAuth login state management
│       ├── progress.js    # Live progress bar tracker & polling
│       ├── preview.js     # Live placeholder detection modal
│       ├── sheetTab.js    # Tab 1 (Google Sheets) submission & downloads
│       ├── jsonTab.js     # Tab 2 (JSON) drag-and-drop & submission
│       ├── history.js     # Generation history manager
│       └── utils.js       # Toast notifications & fetch wrapper
├── routes/                # Express API routes
│   ├── auth.routes.js
│   ├── generate.routes.js
│   ├── download.routes.js
│   └── history.routes.js
├── controllers/           # Route logic controllers
│   ├── auth.controller.js
│   ├── generate.controller.js
│   ├── download.controller.js
│   └── history.controller.js
├── services/              # Core business services
│   ├── GoogleAuthService.js  # OAuth client & token refresh
│   ├── SlidesService.js      # Slides batchUpdate, duplication & replacement
│   ├── SheetsService.js      # Sheets API row reader
│   ├── DriveService.js       # Drive file copy, delete, rename & export
│   ├── ExportService.js      # PDF & PNG export pipeline
│   └── ZipService.js         # ZIP archive generation using archiver
├── middleware/            # Express middlewares
│   ├── auth.middleware.js
│   ├── validate.middleware.js
│   └── rateLimiter.js
├── utils/                 # Utility helpers
│   ├── placeholderParser.js
│   ├── retryWithBackoff.js
│   ├── dateFormatter.js
│   ├── numberFormatter.js
│   ├── logger.js
│   └── cleanup.js
├── config/google.config.js
├── server.js              # Application entry point
├── package.json
└── .env.example
```

---

## 🚀 Getting Started & Installation Guide

### Prerequisites
- Node.js >= 18.0.0
- Google Cloud Platform Console account with Google Slides, Google Drive, and Google Sheets APIs enabled.

### 1. Set Up Google Cloud OAuth 2.0
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project.
3. Enable **Google Drive API**, **Google Slides API**, and **Google Sheets API**.
4. Go to **Credentials** -> **Create Credentials** -> **OAuth client ID**.
5. Select **Web application**.
6. Add Authorized Redirect URI: `http://localhost:3000/auth/google/callback`.
7. Save your Client ID and Client Secret.

### 2. Install & Configure Environment
Clone the repository and install dependencies:
```bash
npm install
```

Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

Edit `.env`:
```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
SESSION_SECRET=a_very_long_secure_random_string
PORT=3000
```

### 3. Run the Application
Start the server:
```bash
npm start
```
Or for development with nodemon:
```bash
npm run dev
```

Open `http://localhost:3000` in your web browser.

---

## 📡 API Reference

### Authentication
- `GET /auth/google`: Initiates Google OAuth 2.0 authorization redirect.
- `GET /auth/google/callback`: OAuth callback handler.
- `GET /auth/status`: Check current session authentication status.
- `POST /auth/logout`: Revoke session and log out.

### Generation & Jobs
- `POST /api/detect-placeholders`: Scan slide template and list detected `{{placeholders}}`.
- `POST /api/generate-sheet`: Start bulk generation from Google Sheets.
- `POST /api/generate-json`: Start bulk generation from JSON array.
- `GET /api/status/:jobId`: Poll job execution progress.
- `POST /api/cancel/:jobId`: Cancel active generation job.
- `GET /api/logs/:jobId`: Download detailed text log for a job.

### Downloads & History
- `GET /api/download/pdf/:id`: Download PDF export of presentation.
- `GET /api/download/images/:id`: Download ZIP archive of PNG slides.
- `GET /api/history`: List generation history.
- `DELETE /api/history/:id`: Delete a history record.
- `POST /api/history/bulk-delete`: Bulk delete history records.

---

## ⚡ Error Handling & Resilience
- Exponential backoff retry logic handles transient 429 rate limit or 5xx server errors automatically.
- Structured Winston logs recorded in `logs/` folder.
- Temp file garbage collector automatically cleans up old PDF/ZIP files after configured TTL (default 2 hours).
