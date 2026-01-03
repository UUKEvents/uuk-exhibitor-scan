# UUK Exhibitor Scan

Professional QR scanner and lead capture application for Universities UK events. Built with Next.js (Vercel) and vanilla JavaScript, with offline-first support.

## Features

- **PWA Support**: Installable on iOS and Android for a native app experience.
- **Offline-First**: Scans are queued locally using `localStorage` if connection is lost, and synced automatically when back online.
- **Secure Auth**: Server-side passcode verification against n8n-backend hashes.
- **Lead Capture**: Rate leads (1-5 stars) and add internal notes.
- **Session Tracking**: Dedicated mode for tracking session attendance counts and attendee barcodes.
- **CSV Export**: Export the offline queue manually if needed.

## Architecture

- **Frontend**: Vanilla JS (ES Modules), HTML5, and CSS3.
- **Backend**: Vercel Serverless Functions (`api/`).
- **Integrations**: Connects to n8n webhooks for data persistence and authentication.

## Setup & Environment

### Prerequisites

- Node.js >= 18.0.0
- Vercel CLI (`npm i -g vercel`)

### Environment Variables

Configure these in your Vercel dashboard:

- `N8N_AUTH_WEBHOOK_URL`: Webhook for exhibitor authentication.
- `N8N_WEBHOOK_URL`: Webhook for lead capture submissions.
- `N8N_SESSION_WEBHOOK_URL`: Webhook for session report submissions.

### Local Development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Run the development server:

   ```bash
   npm run dev
   ```

3. Access the app at `http://localhost:3000`.

## Scripts

- `npm run dev`: Start Vercel development environment.
- `npm start`: Serve the `public/` directory (static host fallback).

## Security & Best Practices

- **SRI**: External libraries (e.g., `html5-qrcode`) are pinned and verified via Subresource Integrity.
- **Modules**: Modern ES Modules for code organization.
- **Sanitization**: Input fields are trimmed and validated before submission.
