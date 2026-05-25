-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" DATETIME,
    "image" TEXT,
    "passwordHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Council" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "question" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rounds" INTEGER NOT NULL DEFAULT 3,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Council_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CouncilParticipant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "councilId" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    CONSTRAINT "CouncilParticipant_councilId_fkey" FOREIGN KEY ("councilId") REFERENCES "Council" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "councilId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "round" INTEGER NOT NULL DEFAULT 1,
    "type" TEXT NOT NULL DEFAULT 'response',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_councilId_fkey" FOREIGN KEY ("councilId") REFERENCES "Council" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Message_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "CouncilParticipant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConsensusPoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "councilId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "agreement" REAL NOT NULL DEFAULT 0.0,
    "round" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConsensusPoint_councilId_fkey" FOREIGN KEY ("councilId") REFERENCES "Council" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "Council_userId_idx" ON "Council"("userId");

-- CreateIndex
CREATE INDEX "Council_status_idx" ON "Council"("status");

-- CreateIndex
CREATE INDEX "CouncilParticipant_councilId_idx" ON "CouncilParticipant"("councilId");

-- CreateIndex
CREATE INDEX "Message_councilId_round_idx" ON "Message"("councilId", "round");

-- CreateIndex
CREATE INDEX "Message_participantId_idx" ON "Message"("participantId");

-- CreateIndex
CREATE INDEX "ConsensusPoint_councilId_idx" ON "ConsensusPoint"("councilId");
