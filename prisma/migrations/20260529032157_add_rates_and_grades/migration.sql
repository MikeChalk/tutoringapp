/*
  Warnings:

  - You are about to drop the column `hourlyRate` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `hourlyRate` on the `tutors` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "billing_rates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gradeLevel" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "rate" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "pay_scales" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenure" TEXT NOT NULL,
    "gradeLevel" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "rate" REAL NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_hour_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tutorId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "hours" REAL NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'IN_PERSON',
    "billingRate" REAL NOT NULL DEFAULT 0,
    "tutorPayRate" REAL NOT NULL DEFAULT 0,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "hour_logs_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "tutors" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "hour_logs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_hour_logs" ("createdAt", "date", "description", "hours", "id", "projectId", "status", "tutorId", "updatedAt") SELECT "createdAt", "date", "description", "hours", "id", "projectId", "status", "tutorId", "updatedAt" FROM "hour_logs";
DROP TABLE "hour_logs";
ALTER TABLE "new_hour_logs" RENAME TO "hour_logs";
CREATE TABLE "new_projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "subject" TEXT NOT NULL DEFAULT '',
    "gradeLevel" TEXT NOT NULL DEFAULT 'ELEMENTARY',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "clientId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "projects_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_projects" ("clientId", "createdAt", "description", "id", "name", "status", "updatedAt") SELECT "clientId", "createdAt", "description", "id", "name", "status", "updatedAt" FROM "projects";
DROP TABLE "projects";
ALTER TABLE "new_projects" RENAME TO "projects";
CREATE TABLE "new_tutors" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "bio" TEXT,
    "subjects" TEXT NOT NULL DEFAULT '',
    "tenure" TEXT NOT NULL DEFAULT '1ST_YEAR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "onboarded" BOOLEAN NOT NULL DEFAULT false,
    "onboardedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "tutors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_tutors" ("bio", "createdAt", "id", "isActive", "onboarded", "onboardedAt", "subjects", "updatedAt", "userId") SELECT "bio", "createdAt", "id", "isActive", "onboarded", "onboardedAt", "subjects", "updatedAt", "userId" FROM "tutors";
DROP TABLE "tutors";
ALTER TABLE "new_tutors" RENAME TO "tutors";
CREATE UNIQUE INDEX "tutors_userId_key" ON "tutors"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "billing_rates_gradeLevel_mode_key" ON "billing_rates"("gradeLevel", "mode");

-- CreateIndex
CREATE UNIQUE INDEX "pay_scales_tenure_gradeLevel_mode_key" ON "pay_scales"("tenure", "gradeLevel", "mode");
