# 🎯 JobTracker AI

**JobTracker AI** is an event-driven, multi-agent artificial intelligence platform designed to completely automate the job hunt process. It replaces manual spreadsheet tracking with a zero-touch ingestion pipeline that reads your inbox, evaluates application momentum, and drafts strategic responses.

---

## 🏗️ System Architecture & Workflow

The platform operates on a reactive, serverless architecture utilizing Google Cloud and Firebase, ensuring real-time UI synchronization without manual page refreshes.

### The Ingestion & AI Pipeline
1. **The Trigger (Gmail Watch API):** When a new email arrives in the user's inbox, Gmail pushes a notification directly to a Google Cloud Pub/Sub topic (`gmail-events`).
2. **The Webhook (Cloud Functions v2):** A Node.js backend intercepts the Pub/Sub ping, securely retrieves the user's OAuth access token, and downloads the unread email's raw text.
3. **Agent 01 - The Extractor:** Gemini 2.5 Flash analyzes the text. It drops irrelevant emails (like security alerts) and extracts structured data (Company, Role, Status) from valid job updates.
4. **Agent 02 - The Analyst:** The AI calculates an `offerProbability` score (0-100%) based on response times, email sentiment, and historical momentum.
5. **Agent 03 - The Strategist:** The AI determines the next best action (e.g., `PREP_INTERVIEW`, `NEGOTIATE_OFFER`) and drafts a ready-to-send email response into the `action_queue`.
6. **The Live Sync (WebSockets):** The Next.js frontend, connected via Firebase `onSnapshot`, instantly detects the Firestore database changes and updates the "War Room" dashboard in real-time.

---

## 🛠️ Tech Stack

* **Frontend:** Next.js (React), Tailwind CSS (Google Brutalism UI Design System)
* **Backend:** Firebase Cloud Functions (v2), Node.js, TypeScript
* **Database:** Firebase Firestore (NoSQL Document DB with strict Security Rules), Firebase Storage
* **Authentication:** Firebase Auth (Google Provider with OAuth 2.0 Gmail Scopes)
* **Infrastructure:** Google Cloud Pub/Sub, Google Cloud Secret Manager
* **AI Engine:** Google Gemini 2.5 Flash (Multi-modal)

---

## ✅ Currently Implemented Features

* **Zero-Touch Ingestion:** Full integration with Google Cloud Pub/Sub and the Gmail API to automatically catch job-related emails.
* **Multi-Agent Workflow:** Extractor, Analyst, and Strategist agents successfully chaining data to process applications.
* **Live Probability Scoring:** Dynamic 0-100% scores that update based on AI sentiment analysis of employer emails.
* **The War Room Dashboard:** A high-contrast, brutalist UI that renders active applications and calculates state instantly using Firebase WebSockets.
* **Strategy Review Modal:** A secure UI overlay that exposes the Analyst's internal reasoning and provides a one-click clipboard copy of the Strategist's drafted email.
* **Bi-Directional Task Sync:** Users can mark AI-generated tasks as "Executed," which writes back to Firestore and instantly clears the item from the active UI queue.
* **Tenant Isolation:** Production-grade Firestore Security Rules ensuring users can only read/write their own authenticated data.
* **CV Coach Agent Backend:** A multi-modal Cloud Function capable of reading raw PDFs and scoring them against job descriptions.

---

## ⏳ Pending / Roadmap Features

* **Intelligent Reminder Engine:** Firebase Scheduled Functions (Cron jobs) to track "stale" applications and auto-draft follow-ups after 7 days of silence.
* **CV Intelligence UI:** Frontend components for uploading PDFs, generating SHA-256 fingerprints via the Web Crypto API, and triggering Agent 04 (The Coach).
* **Negotiation War Table:** A specialized UI state triggered by offer emails, featuring salary percentile benchmarking and leverage-based counteroffer drafting.
* **Production Hosting:** Final deployment of the Next.js frontend to Vercel or Firebase Hosting.

---

## 🔐 How to Login & Authenticate

1.  Navigate to the application homepage (`localhost:3000` or production URL).
2.  Click the **Login with Google** button.
3.  **Crucial Step:** When the Google consent screen appears, you **must check the box** to grant the application permission to "Read your email messages and settings." (This provides the `gmail.readonly` scope required for the Watch API).
4.  Once authenticated, the system saves your `gmailAccessToken` to the secure Firestore `users` collection.
5.  You will be redirected to the **War Room Dashboard**. Any new emails received after this point will be automatically ingested and scored by the AI.
