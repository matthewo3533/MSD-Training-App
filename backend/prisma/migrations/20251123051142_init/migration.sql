-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "intakes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "intake_members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "intakeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "intake_members_intakeId_fkey" FOREIGN KEY ("intakeId") REFERENCES "intakes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "intake_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "skill_groups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "intakeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "skill_groups_intakeId_fkey" FOREIGN KEY ("intakeId") REFERENCES "intakes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "skills" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "skillGroupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "skills_skillGroupId_fkey" FOREIGN KEY ("skillGroupId") REFERENCES "skill_groups" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "training_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "intakeId" TEXT NOT NULL,
    "traineeId" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "sessionDate" DATETIME NOT NULL,
    "comments" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "training_sessions_intakeId_fkey" FOREIGN KEY ("intakeId") REFERENCES "intakes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "training_sessions_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "training_sessions_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "skill_ratings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trainingSessionId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "comments" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "skill_ratings_trainingSessionId_fkey" FOREIGN KEY ("trainingSessionId") REFERENCES "training_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "skill_ratings_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "daily_summaries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trainingSessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "daily_summaries_trainingSessionId_fkey" FOREIGN KEY ("trainingSessionId") REFERENCES "training_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "daily_summaries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateIndex
CREATE INDEX "intakes_createdBy_idx" ON "intakes"("createdBy");

-- CreateIndex
CREATE INDEX "intake_members_intakeId_idx" ON "intake_members"("intakeId");

-- CreateIndex
CREATE INDEX "intake_members_userId_idx" ON "intake_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "intake_members_intakeId_userId_key" ON "intake_members"("intakeId", "userId");

-- CreateIndex
CREATE INDEX "skill_groups_intakeId_idx" ON "skill_groups"("intakeId");

-- CreateIndex
CREATE INDEX "skills_skillGroupId_idx" ON "skills"("skillGroupId");

-- CreateIndex
CREATE INDEX "training_sessions_intakeId_idx" ON "training_sessions"("intakeId");

-- CreateIndex
CREATE INDEX "training_sessions_traineeId_idx" ON "training_sessions"("traineeId");

-- CreateIndex
CREATE INDEX "training_sessions_trainerId_idx" ON "training_sessions"("trainerId");

-- CreateIndex
CREATE INDEX "training_sessions_sessionDate_idx" ON "training_sessions"("sessionDate");

-- CreateIndex
CREATE INDEX "skill_ratings_trainingSessionId_idx" ON "skill_ratings"("trainingSessionId");

-- CreateIndex
CREATE INDEX "skill_ratings_skillId_idx" ON "skill_ratings"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "skill_ratings_trainingSessionId_skillId_key" ON "skill_ratings"("trainingSessionId", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "daily_summaries_trainingSessionId_key" ON "daily_summaries"("trainingSessionId");

-- CreateIndex
CREATE INDEX "daily_summaries_userId_idx" ON "daily_summaries"("userId");

-- CreateIndex
CREATE INDEX "daily_summaries_trainingSessionId_idx" ON "daily_summaries"("trainingSessionId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");
