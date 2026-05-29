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
    "tutorPaid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "hour_logs_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "tutors" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "hour_logs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_hour_logs" ("billingRate", "createdAt", "date", "description", "hours", "id", "mode", "projectId", "status", "tutorId", "tutorPayRate", "updatedAt") SELECT "billingRate", "createdAt", "date", "description", "hours", "id", "mode", "projectId", "status", "tutorId", "tutorPayRate", "updatedAt" FROM "hour_logs";
DROP TABLE "hour_logs";
ALTER TABLE "new_hour_logs" RENAME TO "hour_logs";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
