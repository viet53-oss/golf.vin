-- AlterTable
ALTER TABLE "live_round_players" ADD COLUMN     "index_at_time" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "scorer_id" TEXT,
ADD COLUMN     "tee_box_name" TEXT;
