# FuzzTube 🎬🐦

A full-stack social video platform that combines **video sharing** (YouTube-like) 
and **microblogging** (Twitter-like) into one unified space.

Built from scratch as a personal project during my 2nd year of CS — 
from a blank folder in January to a fully deployed production app.

## 🌐 Live Demo
https://fuzztube.netlify.app

## ✨ Features

- 🎥 Video upload & streaming with real-time progress
- 🐦 Tweet-style feed with likes & retweets  
- 🔔 Real-time notifications (subscribe, like, comment)
- 📊 Creator dashboard with live analytics
- 🔐 JWT authentication with protected routes
- 📋 Playlist management
- 👤 Channel profiles with subscriber counts
- 💬 Comments on videos

## 🛠 Tech Stack

**Frontend**
- React TypeScript
- Tailwind CSS
- Axios
- Deployed on Netlify

**Backend**
- Node.js + Express.js
- MongoDB + Mongoose
- Cloudinary (video & image storage)
- JWT (authentication)
- Deployed on Render

## 📁 Project Structure

\`\`\`
FuzzTube/
├── FRONTEND/     # React TypeScript app
└── BACKEND/      # Node.js + Express REST API
\`\`\`

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- MongoDB URI
- Cloudinary account

### Backend Setup
\`\`\`bash
cd BACKEND
npm install
cp .env.example .env   # fill in your env variables
npm run dev
\`\`\`

### Frontend Setup
\`\`\`bash
cd FRONTEND
npm install
cp .env.example .env   # add VITE_API_BASE_URL
npm run dev
\`\`\`

## 🔑 Environment Variables

**Backend `.env`**
\`\`\`
PORT=8000
MONGODB_URI=
CORS_ORIGIN=http://localhost:5173
ACCESS_TOKEN_SECRET=
REFRESH_TOKEN_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
\`\`\`

**Frontend `.env`**
\`\`\`
VITE_API_BASE_URL=http://localhost:8000/api/v1
\`\`\`

## 📸 Screenshots

> Add your screenshots here

## 🙏 Acknowledgements
Built with help from documentation, community resources, and AI tools — 
but every bug in production was mine to fix. 😄
