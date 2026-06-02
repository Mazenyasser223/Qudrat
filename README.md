# Qudrat Educational Platform

A private, internal web application for managing exams and students with role-based access control and sequential exam progression.

> **Confidential** — This repository and its documentation are private. Do not share, distribute, or publish without explicit written permission from the project owner.

---

## Overview

Qudrat is a full-stack exam management platform built for teachers and students. Teachers create image-based exams, organize them into sequential groups, and monitor performance. Students take timed exams in a enforced progression order and review results with detailed feedback.

---

## Features

### Teacher Dashboard
- Create and manage student accounts
- Build exams with image-based questions
- Organize exams into sequential groups
- Grant or revoke student permissions
- View analytics and performance reports
- Manage review exams and student profiles

### Student Interface
- Secure login with teacher-created credentials
- Enforced sequential exam progression
- Live countdown timer with warnings
- Results review and detailed answer breakdown
- Personal progress and exam history
- Review exam sessions

---

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 18, React Router, Tailwind CSS, React Hook Form, Axios, Socket.IO Client |
| **Backend** | Node.js, Express.js, MongoDB, Mongoose, JWT, bcryptjs, Socket.IO |
| **Security** | Helmet, express-rate-limit, express-mongo-sanitize, HPP protection |
| **Media** | Cloudinary (image uploads), Sharp, Multer |
| **Infrastructure** | VPS, Nginx (reverse proxy), PM2, Let's Encrypt SSL, MongoDB Atlas |

---

## Project Structure

```
Qudrat/
├── client/                          # React frontend (Create React App)
│   ├── public/                      # Static assets, icons, manifest
│   ├── src/
│   │   ├── components/
│   │   │   ├── Auth/                # Login and registration forms
│   │   │   ├── Exam/                # Exam UI: timer, questions, results, submission
│   │   │   └── Layout/              # App shell, header, navigation
│   │   ├── context/                 # Auth and dark-mode providers
│   │   ├── contexts/                # Socket.IO client context
│   │   ├── hooks/                   # Custom React hooks
│   │   ├── pages/
│   │   │   ├── Student/             # Dashboard, take exam, review, history
│   │   │   └── Teacher/             # Dashboard, students, exams, analytics
│   │   ├── utils/                   # Storage, error handling, exam ordering
│   │   ├── App.js                   # Routes and lazy-loaded pages
│   │   └── index.js                 # Application entry point
│   ├── tailwind.config.js
│   └── package.json
│
├── server/                          # Node.js / Express API
│   ├── config/
│   │   ├── database.js              # MongoDB connection
│   │   ├── cloudinary.js            # Cloudinary configuration
│   │   └── security.js              # CORS and security settings
│   ├── controllers/                 # Request handlers (auth, exams, users, reports)
│   ├── middleware/
│   │   ├── auth.js                  # JWT authentication
│   │   ├── security.js              # Rate limiting, sanitization, headers
│   │   ├── validation.js            # Input validation
│   │   ├── upload.js                # Question image uploads
│   │   ├── uploadReviews.js         # Review image uploads
│   │   └── cache.js                 # Response caching
│   ├── models/                      # Mongoose schemas (User, Exam, ExamGroup, Review)
│   ├── routes/                      # API route definitions
│   ├── uploads/                     # Local upload directory (gitignored content)
│   ├── index.js                     # Server entry point, Socket.IO, static serving
│   ├── deploy-optimized.sh          # Production deployment script
│   └── package.json
│
├── DEPLOY.md                        # Internal deployment runbook (restricted)
├── README.md                        # This file
└── .gitignore
```

---

## Architecture

```
┌─────────────┐     HTTPS      ┌─────────────┐     REST / WS    ┌─────────────┐
│   Browser   │ ─────────────► │    Nginx    │ ───────────────► │   Express   │
│  (React)    │ ◄───────────── │  (reverse   │ ◄─────────────── │   + Socket  │
└─────────────┘                │   proxy)    │                  └──────┬──────┘
                               └─────────────┘                         │
                                                                       │
                    ┌──────────────────────────────────────────────────┤
                    │                                                  │
                    ▼                                                  ▼
            ┌───────────────┐                                  ┌───────────────┐
            │ MongoDB Atlas │                                  │  Cloudinary   │
            │   (database)  │                                  │   (images)    │
            └───────────────┘                                  └───────────────┘
```

The Express server serves both the REST API (`/api/*`) and the production React build. Real-time exam updates are handled over Socket.IO.

---

## API Routes

| Prefix | Purpose |
|--------|---------|
| `/api/auth` | Login, registration, token management |
| `/api/users` | User and student management |
| `/api/exams` | Exam CRUD, submission, image uploads |
| `/api/exam-groups` | Sequential exam group organization |
| `/api/reviews` | Review exam sessions |
| `/api/reports` | Analytics and reporting |
| `/api/admin` | Administrative operations |
| `/api/health` | Server health check |

---

## Requirements

- Node.js v16 or later
- npm
- MongoDB instance (Atlas recommended for production)
- Cloudinary account (for question image storage)
- Environment credentials — **request from the project owner; never commit secrets**

---

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd Qudrat
```

### 2. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 3. Configure environment

Create `server/.env` in the server directory. **Do not commit this file.**

Obtain the actual values from the project owner. Use placeholders during local setup:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=<your-mongodb-connection-string>
JWT_SECRET=<your-jwt-secret>
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:3000
MAX_FILE_SIZE=10485760
UPLOAD_PATH=uploads/questions
CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>
```

### Environment variables

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `development` or `production` |
| `PORT` | Server port (default: `5000`) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for JWT signing |
| `JWT_EXPIRE` | Token expiry (e.g. `7d`) |
| `CLIENT_URL` | Frontend origin URL (used for CORS) |
| `MAX_FILE_SIZE` | Maximum upload size in bytes |
| `UPLOAD_PATH` | Local upload directory path |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |

---

## Running Locally

Start the API and frontend in separate terminals:

```bash
# Terminal 1 — API server (with hot reload)
cd server
npm run dev

# Terminal 2 — React dev server
cd client
npm start
```

The client dev server runs on port **3000** and proxies API requests to the backend on port **5000**.

---

## Production Build

```bash
cd client
DISABLE_ESLINT_PLUGIN=true npm run build
```

The compiled output is written to `client/build/`. The Express server serves this directory in production.

For full deployment steps (VPS, Nginx, PM2), see **`DEPLOY.md`** — that document is for authorized operators only and must not be made public.

---

## Scripts

### Server (`server/`)

| Command | Description |
|---------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start with nodemon (development) |

### Client (`client/`)

| Command | Description |
|---------|-------------|
| `npm start` | Start development server |
| `npm run build` | Build for production |
| `npm test` | Run test suite |

---

## Security

- Passwords are hashed with bcrypt — never stored in plain text
- JWT tokens expire and must be reissued on login
- Rate limiting is active on API routes; exam submission has a dedicated limiter
- Helmet, mongo sanitization, and HPP middleware are enabled
- **Never commit `.env` files, credentials, or production server details**
- `.env`, upload contents, and build artifacts are excluded via `.gitignore`

---

## License

**Private — All Rights Reserved.**

Unauthorized use, reproduction, or distribution of this software or its documentation is strictly prohibited.
