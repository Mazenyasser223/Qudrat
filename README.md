# Qudrat Educational Platform

A private, internal web application for managing exams and students with role-based access control and sequential exam progression.

> **Confidential** — This document and the project it describes are private. Do not share, distribute, or publish without explicit written permission from the project owner.

---

## Features

### Teacher Dashboard
- Create and manage student accounts
- Build exams with image-based questions
- Organize exams into 8 sequential groups
- Grant or revoke student permissions
- View real-time analytics and performance reports

### Student Interface
- Secure login with teacher-created credentials
- Enforced sequential exam progression
- Live countdown timer with warnings
- Results review and detailed answer breakdown
- PDF export of mistakes and explanations
- Personal progress history

---

## Tech Stack

**Frontend:** React 18, React Router, Tailwind CSS, React Hook Form, Axios, jsPDF

**Backend:** Node.js, Express.js, MongoDB, Mongoose, JWT, bcryptjs, Socket.IO, Helmet.js

**Infrastructure:** Ubuntu 20.04 VPS, Nginx (reverse proxy), PM2 (process manager), Let's Encrypt SSL, MongoDB Atlas, Cloudinary

---

## Requirements

- Node.js v16+
- MongoDB v4.4+
- npm or yarn
- Access to environment credentials (contact project owner)

---

## Installation

```bash
# Clone
git clone https://github.com/Mazenyasser223/Qudrat.git
cd Qudrat

# Install dependencies
npm install
cd server && npm install
cd ../client && npm install

# Configure environment
cd server
cp .env.example .env
# Fill in .env with credentials provided by the project owner
```

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `development` or `production` |
| `PORT` | Server port (default: 5000) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for JWT signing |
| `JWT_EXPIRE` | Token expiry (e.g. `7d`) |
| `CLIENT_URL` | Frontend origin URL |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |

---

## Running the App

```bash
# Development (client + server together)
npm run dev

# Or separately
cd server && npm start       # Terminal 1
cd client && npm start       # Terminal 2
```

---

## Deployment

The app runs on a VPS with the following setup:

- **Web server:** Nginx as a reverse proxy
- **Process manager:** PM2 keeps the Node.js server alive
- **SSL:** Let's Encrypt with auto-renewal
- **Database:** MongoDB Atlas (cloud-hosted)
- **File storage:** Cloudinary (images and uploads)

### Deploy Steps

```bash
git pull origin main

npm install
cd server && npm install
cd ../client && npm install

# Build frontend
cd client && npm run build

# Restart services
pm2 restart qudrat-api
systemctl reload nginx
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start client + server in development |
| `npm run build` | Build client for production |
| `npm start` | Start production server |
| `npm test` | Run tests |

---

## Security Notes

- All passwords are hashed with bcrypt — never stored in plain text
- JWT tokens expire and must be refreshed
- Rate limiting is active on all API routes
- Do not expose `.env` files or commit credentials to version control

---

## License

**Private — All Rights Reserved.**
Unauthorized use, reproduction, or distribution of this software or its documentation is strictly prohibited.
