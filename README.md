# Slide Wave AI — Google Slides Bulk Generator

Automate bulk presentation generation in Google Slides using Google Sheets, raw text, JSON data, or Gemini AI.

---

## 🌟 Key Features

- **Google OAuth 2.0 Authentication**: Seamless login and automatic token refresh without using Google Apps Script.
- **Deep Dark Black Mode UI**: Built with a rich AMOLED Dark Black aesthetic (`#050508`), glassmorphism cards, glowing indigo accents, and clean light mode toggle.
- **Scalable Persistent Credit & Database System**:
  - Thread-safe, atomic database updates (`$inc`) using **MongoDB & Mongoose**.
  - **Zero Credit Loss Architecture**: Granted and purchased credits persist safely across server restarts and cloud redeployments.
  - **Persistent Session Store**: Powered by `connect-mongo` to prevent unexpected logouts upon cloud container restarts.
  - **Audit Transactions Log**: Fully tracked payment, usage, and admin bonus transactions (`Transaction` model).
- **Multiple Generation Sources**:
  1. **Google Sheets**: Map sheet headers to placeholders. Each row generates presentation slides.
  2. **JSON Array**: Paste or drag & drop a `.json` file containing an array of objects.
  3. **Gemini AI Generator**: Prompt-to-slide generation with automated layout mapping.
  4. **Multi-Item Batch Generator (Beta)**: Combine multiple dataset items into structured grid slide layouts.
- **Dynamic Placeholder Detection & Formatting**:
  - Live placeholder preview from Google Slides template URL.
  - Supports text (`{{name}}`), dates (`{{date|DD/MM/YYYY}}`), currency/numbers (`{{score|currency}}`), and QR Codes (`{{qr:url}}`).
- **Export & Download Options**:
  - **Google Slides**: Direct link to newly generated presentation on Drive.
  - **PDF Export**: Single-click PDF presentation download.
  - **PNG Images ZIP**: Export each slide as high-resolution PNG image inside a compressed ZIP archive.
- **Live Progress Tracker**: Real-time progress bar with step-by-step updates and job cancellation support.
- **Admin Console & Credit Distribution**: Admin directory to view registered users, total slides generated, and grant credits directly with audit notes.
- **Resilience & Security**: Exponential backoff API retry logic, rate limiting, Joi schema validation, and scheduled temporary file garbage collection.

---

## 🏗️ Architecture & Project Structure

```
Google Slide Generator/
├── client/                # Modern React SPA (Vite + Lucide Icons)
│   ├── src/
│   │   ├── components/    # Admin, Generator Tabs, Modals, Navbar, Sidebar
│   │   ├── context/       # Auth, Credit, Theme, Toast React Contexts
│   │   ├── index.css      # Dark Black Design System & CSS variables
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
├── models/                # Mongoose Database Schemas
│   ├── User.js            # User accounts & credits balance
│   ├── Transaction.js     # Payments, usages & bonus audit logs
│   ├── History.js        # Persistent generation history
│   └── Template.js       # Admin curated templates
├── controllers/           # Express Route Logic Controllers
│   ├── admin.controller.js
│   ├── auth.controller.js
│   ├── credit.controller.js
│   ├── generate.controller.js
│   ├── history.controller.js
│   └── template.controller.js
├── services/              # Core Business Services
│   ├── CreditService.js   # Atomic credit manager (MongoDB + fallback)
│   ├── GoogleAuthService.js
│   ├── SlidesService.js   # Slides batchUpdate, duplication & replacement
│   ├── SheetsService.js   # Sheets API row reader
│   ├── DriveService.js    # Drive file operations
│   ├── ExportService.js   # PDF & PNG export pipeline
│   └── ZipService.js      # ZIP archive generator
├── config/                # DB & API Configurations
│   └── db.js              # Scalable MongoDB connection module
├── routes/                # Express API Endpoints
├── middleware/            # Auth, Validation & Rate Limiting
├── utils/                 # Utilities, Retry, Logger & Cleanup
├── server.js              # Application Entry Point (Express + MongoStore)
├── package.json
└── README.md
```

---

## 🚀 Getting Started & Local Setup

### Prerequisites
- Node.js >= 18.0.0
- MongoDB instance (Local MongoDB server or free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster)
- Google Cloud Platform Console account with Drive, Slides, and Sheets APIs enabled.

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

Build the client bundle:
```bash
npm run build:client
```

Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

Edit `.env`:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/slidewave
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
ADMIN_EMAIL=your_admin_email@gmail.com
SESSION_SECRET=a_very_long_secure_random_string
RAZORPAY_KEY_ID=rzp_test_xxxx
RAZORPAY_KEY_SECRET=xxxx
PORT=3000
```

### 3. Run the Application
Start the server:
```bash
npm run dev
```

Open `http://localhost:3000` in your web browser.

---

## ☁️ Cloud Deployment (Render, Railway, Docker, Heroku)

To ensure persistent credits and zero data loss on production cloud platforms:

1. **Set `MONGODB_URI`**: Use a cloud MongoDB URI (such as MongoDB Atlas `mongodb+srv://...`).
2. **Set `NODE_ENV=production`**: Enables secure cookies and production assets caching.
3. **Build Command**: `npm run build`
4. **Start Command**: `npm start`

---

## 📡 API Reference

The Android client uses the same Express API. Its production base URL is
`https://slide-wave-ai.onrender.com/`; endpoint paths below are relative to that URL.

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/auth/google` | Public | Start Google OAuth |
| `GET` | `/auth/google/callback` | OAuth callback | Complete OAuth and create a session |
| `POST` | `/auth/mobile/exchange` | One-time ticket + PKCE verifier | Exchange Android OAuth ticket for an app session |
| `GET` | `/auth/status` | Public | Check the session and current user/credits |
| `POST` | `/auth/logout` | Public | Revoke tokens and end the session |
| `POST` | `/api/detect-placeholders` | Signed in | Find placeholders in a Slides template |
| `POST` | `/api/generate-sheet` | Signed in | Generate presentations from Sheets |
| `POST` | `/api/generate-json` | Signed in | Generate presentations from JSON |
| `POST` | `/api/generate-csv` | Signed in | Generate presentations from CSV |
| `GET` | `/api/status/:jobId` | Signed in | Get generation job status |
| `POST` | `/api/cancel/:jobId` | Signed in | Cancel a generation job |
| `GET` | `/api/logs/:jobId` | Signed in | Fetch generation logs |
| `GET` | `/api/download/pdf/:id` | Signed in | Download a generated PDF |
| `GET` | `/api/download/images/:id` | Signed in | Download generated slide images |
| `GET` | `/api/credits` | Signed in | Get balance, transactions, and credit packages |
| `POST` | `/api/credits/estimate` | Signed in | Estimate a job's credit cost |
| `POST` | `/api/credits/create-order` | Signed in | Create a Razorpay order |
| `POST` | `/api/credits/verify-payment` | Signed in | Verify payment and add credits |
| `POST` | `/api/credits/redeem-coupon` | Signed in | Redeem a coupon |
| `GET` | `/api/history` | Signed in | List generation history |
| `DELETE` | `/api/history/:id` | Signed in | Delete a history item |
| `POST` | `/api/history/bulk-delete` | Signed in | Delete multiple history items |
| `GET` | `/api/templates` | Public | List presentation templates |
| `POST` | `/api/templates` | Admin | Create a template |
| `PUT` | `/api/templates/:id` | Admin | Update a template |
| `DELETE` | `/api/templates/:id` | Admin | Delete a template |
| `POST` | `/api/gemini/generate-questions` | Signed in | Generate questions with Gemini |
| `POST` | `/api/gemini/parse-text` | Signed in | Parse text with Gemini |
| `POST` | `/api/support` | Public | Submit a support message |
| `GET` | `/api/support/admin` | Admin | List support messages |
| `DELETE` | `/api/support/admin` | Admin | Clear support messages |
| `DELETE` | `/api/support/admin/:id` | Admin | Delete a support message |
| `GET` | `/api/admin/users` | Admin | List users |
| `GET` | `/api/admin/users/:email/transactions` | Admin | List a user's transactions |
| `GET` | `/api/admin/stats` | Admin | Get admin statistics |
| `POST` | `/api/admin/credits/add` | Admin | Grant credits |
| `GET` | `/api/admin/coupons` | Admin | List coupons |
| `POST` | `/api/admin/coupons` | Admin | Create a coupon |
| `DELETE` | `/api/admin/coupons/:id` | Admin | Delete a coupon |

Authenticated endpoints use the Express `connect.sid` session cookie. Admin endpoints
also require the signed-in account to match the configured administrator.

### Android app

The Android base URL is set in `android/app/build.gradle.kts` and resolved by
`RetrofitClient`. To build the debug APK:

```bash
cd android
./gradlew assembleDebug
```

The APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`.

For Google sign-in on Render, set `GOOGLE_REDIRECT_URI` to
`https://slide-wave-ai.onrender.com/auth/google/callback` in the Render service and
add that exact URL to the Google OAuth client's authorized redirect URIs. Configure
the service's Google credentials, `SESSION_SECRET`, Gemini key, database URI, and
payment credentials in Render's environment settings as required by the enabled
features.

Android sign-in uses a short-lived, single-use ticket and PKCE to hand the OAuth
session from the Chrome Custom Tab to the app's cookie jar. This requires a working
MongoDB connection on Render for the temporary ticket and persistent session store.

---

## ⚡ Error Handling & Resilience
- Exponential backoff retry logic handles transient 429 rate limit or 5xx server errors automatically.
- Structured Winston logs recorded in server logs.
- Automatic temporary file cleanup removes old PDF/ZIP files after configured TTL (default 2 hours).
