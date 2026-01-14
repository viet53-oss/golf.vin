-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "birthday" TEXT,
    "handicapIndex" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tee_boxes" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "slope" INTEGER NOT NULL,
    "par" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tee_boxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holes" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "holeNumber" INTEGER NOT NULL,
    "par" INTEGER NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "holes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rounds" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "courseName" TEXT NOT NULL,
    "isTournament" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "round_players" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "teeBoxId" TEXT NOT NULL,
    "grossScore" INTEGER,
    "courseHandicap" INTEGER NOT NULL,
    "netScore" INTEGER,
    "frontNine" INTEGER,
    "backNine" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "round_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scores" (
    "id" TEXT NOT NULL,
    "roundPlayerId" TEXT NOT NULL,
    "holeId" TEXT NOT NULL,
    "strokes" INTEGER NOT NULL,
    "putts" INTEGER,
    "fairwayHit" BOOLEAN,
    "greenInReg" BOOLEAN,

    CONSTRAINT "scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_rounds" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "courseName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "live_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_round_players" (
    "id" TEXT NOT NULL,
    "liveRoundId" TEXT NOT NULL,
    "playerId" TEXT,
    "teeBoxId" TEXT NOT NULL,
    "isGuest" BOOLEAN NOT NULL DEFAULT false,
    "guestName" TEXT,
    "courseHandicap" INTEGER NOT NULL,
    "grossScore" INTEGER,
    "frontNine" INTEGER,
    "backNine" INTEGER,

    CONSTRAINT "live_round_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_scores" (
    "id" TEXT NOT NULL,
    "liveRoundPlayerId" TEXT NOT NULL,
    "holeId" TEXT NOT NULL,
    "strokes" INTEGER NOT NULL,

    CONSTRAINT "live_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photos" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "caption" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "players_email_key" ON "players"("email");

-- CreateIndex
CREATE UNIQUE INDEX "holes_courseId_holeNumber_key" ON "holes"("courseId", "holeNumber");

-- CreateIndex
CREATE INDEX "rounds_date_idx" ON "rounds"("date");

-- CreateIndex
CREATE INDEX "round_players_roundId_idx" ON "round_players"("roundId");

-- CreateIndex
CREATE INDEX "round_players_playerId_idx" ON "round_players"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "scores_roundPlayerId_holeId_key" ON "scores"("roundPlayerId", "holeId");

-- CreateIndex
CREATE INDEX "live_rounds_date_idx" ON "live_rounds"("date");

-- CreateIndex
CREATE INDEX "live_round_players_liveRoundId_idx" ON "live_round_players"("liveRoundId");

-- CreateIndex
CREATE UNIQUE INDEX "live_scores_liveRoundPlayerId_holeId_key" ON "live_scores"("liveRoundPlayerId", "holeId");

-- AddForeignKey
ALTER TABLE "tee_boxes" ADD CONSTRAINT "tee_boxes_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holes" ADD CONSTRAINT "holes_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "round_players" ADD CONSTRAINT "round_players_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "round_players" ADD CONSTRAINT "round_players_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "round_players" ADD CONSTRAINT "round_players_teeBoxId_fkey" FOREIGN KEY ("teeBoxId") REFERENCES "tee_boxes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_roundPlayerId_fkey" FOREIGN KEY ("roundPlayerId") REFERENCES "round_players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_holeId_fkey" FOREIGN KEY ("holeId") REFERENCES "holes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_rounds" ADD CONSTRAINT "live_rounds_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_round_players" ADD CONSTRAINT "live_round_players_liveRoundId_fkey" FOREIGN KEY ("liveRoundId") REFERENCES "live_rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_round_players" ADD CONSTRAINT "live_round_players_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_round_players" ADD CONSTRAINT "live_round_players_teeBoxId_fkey" FOREIGN KEY ("teeBoxId") REFERENCES "tee_boxes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_scores" ADD CONSTRAINT "live_scores_liveRoundPlayerId_fkey" FOREIGN KEY ("liveRoundPlayerId") REFERENCES "live_round_players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_scores" ADD CONSTRAINT "live_scores_holeId_fkey" FOREIGN KEY ("holeId") REFERENCES "holes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
