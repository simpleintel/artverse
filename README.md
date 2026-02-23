# ArtVerse — AI Art Community

A modern Instagram-style platform where users share AI-created images and videos, generate new art with AI models, and discover creative work from other artists.

## Features

- **Upload & Share** — Post AI-generated images and videos with captions
- **AI Generation** — Generate images and videos directly in-app via Replicate (Flux, Stable Diffusion, Wan 2.1, and more)
- **Social Feed** — Infinite-scroll feed of posts from people you follow
- **Explore** — Discover art from the community in a grid layout
- **Likes & Comments** — Double-tap to like, comment on posts
- **Profiles** — Customizable profiles with avatar, bio, and post grid
- **Follow System** — Follow creators to see their posts in your feed
- **Search** — Find creators by username or display name
- **AI Prompt Sharing** — View the model and prompt used to generate each piece

## Tech Stack

- **Frontend**: React 18, Vite, TailwindCSS, React Router, Lucide Icons
- **Backend**: Express.js, SQLite (better-sqlite3), JWT auth, Multer
- **AI**: Replicate API (Flux, SDXL, Wan 2.1, MiniMax Video)

## Quick Start

### 1. Install everything

```bash
npm run install-all
```

### 2. Configure environment

Edit `.env` in the project root:

```
REPLICATE_API_TOKEN=your_token_here   # Get free at replicate.com
JWT_SECRET=pick-any-secret-string
PORT=3001
```

### 3. Run

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

### 4. Use it

1. Register an account
2. Upload your AI art or generate new art using the Create Post button
3. Follow other users, like and comment on posts
4. Explore the community gallery

## AI Generation Setup

1. Create a free account at [replicate.com](https://replicate.com) (includes $25 free credit)
2. Copy your API token from the dashboard
3. Paste it into `.env` as `REPLICATE_API_TOKEN`

The app works fully without the Replicate token — you just won't be able to generate new art (uploading still works).

## Project Structure

```
├── server/              # Express API
│   ├── index.js         # Server entry point
│   ├── database.js      # SQLite schema & connection
│   ├── middleware/       # JWT auth middleware
│   └── routes/          # API routes (auth, posts, users, comments, generate)
├── client/              # React SPA
│   └── src/
│       ├── api/         # Axios API client
│       ├── context/     # Auth context
│       ├── components/  # Navbar, PostCard, CreatePostModal, CommentSection
│       └── pages/       # Feed, Explore, Profile, Login, Register
├── uploads/             # User-uploaded media files
└── .env                 # Environment variables
```
