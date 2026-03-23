# GEMINI.md - Student Management App

## Project Overview
This is a web application for managing student registrations ("Registro de Alumnos"). It features a full-stack architecture with a frontend for data entry and visualization, and a backend that interacts with both a MySQL database and AWS S3 for file storage.

### Main Technologies
- **Frontend:** Vanilla HTML5, CSS3, and JavaScript (located in `public/index.html`).
- **Backend:** Node.js with Express (ESM, `type: module`).
- **Database:** MySQL (optimized for AWS RDS with SSL support).
- **Storage:** AWS S3 (via `@aws-sdk/client-s3`) for storing profile images.
- **Deployment:** Configured for **Vercel** (`vercel.json`).

## Architecture
- **API Entry Point:** `index.js` handles all API routes and serves static files from the `public` directory.
- **Image Handling:** Images are uploaded via `multer` (memory storage), sent to AWS S3 with a UUID-based key, and served back to the frontend through an Express proxy endpoint (`/api/imagen/:key`).
- **Database Schema:** Expects an `alumno` table with columns: `id` (INT, PK, AI), `nombre` (VARCHAR), `apellidos` (VARCHAR), `localidad` (VARCHAR), and `imagen` (VARCHAR, stores the S3 key).

## Building and Running

### Environment Configuration
Ensure you have a `.env` file with the following variables:
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: MySQL/RDS credentials.
- `AWS_ENDPOINT`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_BUCKET_NAME`: AWS S3 credentials and configuration.
- `PORT`: (Optional) Port for local server (defaults to 3000).

### Key Commands
- **Local Development:** 
  ```bash
  node index.js
  ```
  *(Note: `package.json` currently points to `server.js` in its start script, but the entry point is `index.js`).*
- **Install Dependencies:**
  ```bash
  npm install
  ```

## Development Conventions
- **Code Style:** Uses ES Modules (`import/export`).
- **Backend API:** All endpoints are prefixed with `/api`.
- **Database Connection:** Uses `mysql2/promise` for async/await support and handles SSL for RDS compatibility.
- **Error Handling:** Centralized try-catch blocks in Express routes with JSON error responses.

## Key Files
- `index.js`: Main server logic, API routes, and S3/MySQL integrations.
- `public/index.html`: Single-page frontend application.
- `package.json`: Project dependencies (`express`, `multer`, `mysql2`, `@aws-sdk/client-s3`, etc.).
- `vercel.json`: Deployment configuration for Vercel functions and rewrites.
