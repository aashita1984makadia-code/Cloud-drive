# Cloud Drive Full-Stack Application

A production-ready full-stack Cloud Drive application (Google Drive / Dropbox clone) built with Next.js 14 App Router, TypeScript, Tailwind CSS, Prisma PostgreSQL, and AWS S3 presigned URL integration.

## Project Structure

```
cloud-drive-app/
├── prisma/
│   └── schema.prisma         # Database schema for Users, Folders, and Files
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── files/        # Recursive folder and file queries API
│   │   │   └── upload/       # AWS S3 Presigned URL generation API
│   │   ├── globals.css       # Tailwind CSS import
│   │   ├── layout.tsx        # App layout wrapper
│   │   └── page.tsx          # Main entry route
│   ├── components/
│   │   └── DriveInterface.tsx# Complete cloud drive dashboard UI with file uploader
│   └── lib/
│       ├── db.ts             # Prisma Database Client setup
│       └── s3.ts             # AWS S3 Presigner & Client configuration
├── .env.example
├── package.json
└── tsconfig.json
```

## Setup Instructions

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment Variables:**
   Rename `.env.example` to `.env` and fill in your PostgreSQL and AWS S3 credentials.

3. **Initialize Database:**
   ```bash
   npx prisma db push
   ```

4. **Run Development Server:**
   ```bash
   npm run dev
   ```
   Navigate to [http://localhost:3000](http://localhost:3000).
