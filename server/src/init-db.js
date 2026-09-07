import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function initDatabase() {
  console.log('🚀 Initializing TTU Dashboard tables in Supabase PostgreSQL...\n');

  const statements = [
    `DO $$ BEGIN
      CREATE TYPE "UserRole" AS ENUM ('student', 'student_head', 'lecturer', 'admin');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;`,

    `DO $$ BEGIN
      CREATE TYPE "DeadlineType" AS ENUM ('assignment', 'project', 'examination');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;`,

    `DO $$ BEGIN
      CREATE TYPE "AnnouncementCategory" AS ENUM ('notice', 'update', 'calendar');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;`,

    `CREATE TABLE IF NOT EXISTS "users" (
      "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL UNIQUE,
      "password_hash" TEXT NOT NULL,
      "role" "UserRole" NOT NULL DEFAULT 'student',
      "department" TEXT NOT NULL DEFAULT 'Graphic Design',
      "year" TEXT,
      "certificate" TEXT,
      "student_id" TEXT UNIQUE,
      "staff_id" TEXT UNIQUE,
      "phone" TEXT UNIQUE,
      "designation" TEXT,
      "courses" TEXT[] NOT NULL DEFAULT '{}',
      "profile_picture_url" TEXT,
      "is_verified" BOOLEAN NOT NULL DEFAULT true,
      "verification_code_hash" TEXT,
      "verification_expires_at" TIMESTAMPTZ,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
    );`,

    `CREATE TABLE IF NOT EXISTS "deadlines" (
      "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "title" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "course" TEXT NOT NULL,
      "certificate" TEXT NOT NULL DEFAULT 'All Certificates',
      "year" TEXT NOT NULL DEFAULT 'All Years',
      "due_date" DATE NOT NULL,
      "type" "DeadlineType" NOT NULL,
      "author_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
      "attachment_name" TEXT,
      "attachment_url" TEXT,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
    );`,

    `CREATE TABLE IF NOT EXISTS "announcements" (
      "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "title" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "category" "AnnouncementCategory" NOT NULL,
      "certificate" TEXT NOT NULL DEFAULT 'All Certificates',
      "year" TEXT NOT NULL DEFAULT 'All Years',
      "is_pinned" BOOLEAN NOT NULL DEFAULT false,
      "author_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
    );`,

    `CREATE TABLE IF NOT EXISTS "events" (
      "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "location" TEXT NOT NULL,
      "event_date" DATE NOT NULL,
      "event_time" TEXT,
      "type" TEXT NOT NULL,
      "organizer" TEXT NOT NULL,
      "author_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
    );`,

    `CREATE TABLE IF NOT EXISTS "deadline_completions" (
      "student_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "deadline_id" TEXT NOT NULL REFERENCES "deadlines"("id") ON DELETE CASCADE,
      "completed_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY ("student_id", "deadline_id")
    );`,

    `CREATE TABLE IF NOT EXISTS "timetable_slots" (
      "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "day" TEXT NOT NULL,
      "time" TEXT NOT NULL,
      "course" TEXT NOT NULL,
      "room" TEXT NOT NULL,
      "year" TEXT NOT NULL DEFAULT 'All Years'
    );`,

    `CREATE TABLE IF NOT EXISTS "class_whatsapp_groups" (
      "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "year" TEXT NOT NULL UNIQUE,
      "title" TEXT NOT NULL,
      "head_name" TEXT NOT NULL,
      "head_id" TEXT NOT NULL,
      "head_phone" TEXT NOT NULL,
      "invite_link" TEXT NOT NULL DEFAULT '',
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
    );`,

    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "certificate" TEXT;`,
    `ALTER TABLE "deadlines" ADD COLUMN IF NOT EXISTS "certificate" TEXT NOT NULL DEFAULT 'All Certificates';`,
    `ALTER TABLE "deadlines" ADD COLUMN IF NOT EXISTS "year" TEXT NOT NULL DEFAULT 'All Years';`,
    `ALTER TABLE "announcements" ADD COLUMN IF NOT EXISTS "certificate" TEXT NOT NULL DEFAULT 'All Certificates';`,
    `ALTER TABLE "announcements" ADD COLUMN IF NOT EXISTS "year" TEXT NOT NULL DEFAULT 'All Years';`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_verified" BOOLEAN NOT NULL DEFAULT true;`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "verification_code_hash" TEXT;`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "verification_expires_at" TIMESTAMPTZ;`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" TEXT UNIQUE;`
  ];

  try {
    for (const sql of statements) {
      await prisma.$executeRawUnsafe(sql);
    }
    console.log('✅ All tables and constraints created successfully in Supabase PostgreSQL!');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

initDatabase();
