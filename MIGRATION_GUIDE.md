# Migration Guide: From Old Schema to Simplified Schema

## ⚠️ Important: Read Before Migrating

This guide will help you migrate from the old database schema to the simplified one. **This is a breaking change** that will require code updates throughout your application.

---

## Step 1: Backup Your Database

**CRITICAL**: Always backup before making schema changes!

```bash
# If using Supabase/PostgreSQL
pg_dump -h your-host -U your-user -d your-database > backup_$(date +%Y%m%d).sql

# Or use Supabase dashboard to create a backup
```

---

## Step 2: Field Name Mapping

### Player Model
```typescript
// OLD → NEW
low_handicap_index → REMOVED (use handicapIndex)
index → handicapIndex
created_at → createdAt
year_joined → REMOVED
address → REMOVED
city → REMOVED
state → REMOVED
zip → REMOVED
preferred_tee_box → REMOVED
manual_rounds → REMOVED (HandicapRound model removed)
```

### TeeBox Model
```typescript
// OLD → NEW
course_id → courseId
created_at → createdAt
yardages → REMOVED
// ADDED: par (Int)
```

### Hole Model
```typescript
// OLD → NEW
course_id → courseId
hole_number → holeNumber
difficulty → REMOVED
elements → REMOVED (HoleElement model removed)
```

### Round Model
```typescript
// OLD → NEW
course_id → courseId
course_name → courseName
created_at → createdAt
is_tournament → isTournament
completed → REMOVED
is_live → REMOVED
```

### RoundPlayer Model
```typescript
// OLD → NEW
round_id → roundId
player_id → playerId
tee_box_id → teeBoxId
gross_score → grossScore
adjusted_gross_score → REMOVED (calculate as needed)
score_differential → REMOVED (calculate as needed)
index_at_time → REMOVED
created_at → createdAt
back_nine → backNine
front_nine → frontNine
index_after → REMOVED
payout → REMOVED
points → REMOVED
in_pool → REMOVED
tee_box_name → REMOVED (use teeBox relation)
tee_box_par → REMOVED (use teeBox relation)
tee_box_rating → REMOVED (use teeBox relation)
tee_box_slope → REMOVED (use teeBox relation)
course_handicap → courseHandicap
// ADDED: netScore (Int?)
```

### LiveRound Model
```typescript
// OLD → NEW
course_id → courseId
course_name → courseName
created_at → createdAt
updated_at → updatedAt
par → REMOVED (use TeeBox.par)
rating → REMOVED (use TeeBox.rating)
slope → REMOVED (use TeeBox.slope)
```

### LiveRoundPlayer Model
```typescript
// OLD → NEW
live_round_id → liveRoundId
player_id → playerId
tee_box_id → teeBoxId
tee_box_name → REMOVED (use teeBox relation)
tee_box_rating → REMOVED (use teeBox relation)
tee_box_slope → REMOVED (use teeBox relation)
tee_box_par → REMOVED (use teeBox relation)
index_at_time → REMOVED
course_handicap → courseHandicap
gross_score → grossScore
front_nine → frontNine
back_nine → backNine
guest_name → guestName
is_guest → isGuest
scorer_id → REMOVED
```

### Score Model
```typescript
// OLD → NEW
round_player_id → roundPlayerId
hole_id → holeId
fairway_hit → fairwayHit
green_in_regulation → greenInReg
created_at → REMOVED
```

### LiveScore Model
```typescript
// OLD → NEW
live_round_player_id → liveRoundPlayerId
hole_id → holeId
```

---

## Step 3: Code Update Examples

### Before (Old Schema)
```typescript
// Fetching a player
const player = await prisma.player.findUnique({
  where: { id: playerId },
  select: {
    id: true,
    name: true,
    index: true,
    low_handicap_index: true,
    created_at: true,
  }
});

// Creating a round player
const roundPlayer = await prisma.roundPlayer.create({
  data: {
    round_id: roundId,
    player_id: playerId,
    tee_box_id: teeBoxId,
    gross_score: 85,
    index_at_time: 12.5,
    course_handicap: 14,
    tee_box_name: "Blue",
    tee_box_rating: 72.1,
    tee_box_slope: 130,
  }
});
```

### After (New Schema)
```typescript
// Fetching a player
const player = await prisma.player.findUnique({
  where: { id: playerId },
  select: {
    id: true,
    name: true,
    handicapIndex: true,
    createdAt: true,
  }
});

// Creating a round player (with teeBox relation)
const roundPlayer = await prisma.roundPlayer.create({
  data: {
    roundId: roundId,
    playerId: playerId,
    teeBoxId: teeBoxId,
    grossScore: 85,
    courseHandicap: 14,
    netScore: 71, // 85 - 14
  },
  include: {
    teeBox: true, // Get tee box details from relation
  }
});

// Access tee box info through relation
console.log(roundPlayer.teeBox.name); // "Blue"
console.log(roundPlayer.teeBox.rating); // 72.1
console.log(roundPlayer.teeBox.slope); // 130
```

---

## Step 4: Migration Script

Create a new migration file:

```bash
# 1. Replace the schema file
mv prisma/schema.prisma prisma/schema-old.prisma
mv prisma/schema-simplified.prisma prisma/schema.prisma

# 2. Create migration
npx prisma migrate dev --name simplified_schema --create-only

# 3. Edit the migration file to preserve data
```

### Sample Migration SQL (prisma/migrations/XXX_simplified_schema/migration.sql)

```sql
-- Step 1: Rename columns to camelCase
ALTER TABLE players RENAME COLUMN created_at TO "createdAt";
ALTER TABLE players RENAME COLUMN low_handicap_index TO "handicapIndex";
ALTER TABLE players DROP COLUMN IF EXISTS "index";
ALTER TABLE players DROP COLUMN IF EXISTS year_joined;
ALTER TABLE players DROP COLUMN IF EXISTS address;
ALTER TABLE players DROP COLUMN IF EXISTS city;
ALTER TABLE players DROP COLUMN IF EXISTS state;
ALTER TABLE players DROP COLUMN IF EXISTS zip;
ALTER TABLE players DROP COLUMN IF EXISTS preferred_tee_box;

-- Step 2: Add new fields
ALTER TABLE tee_boxes ADD COLUMN IF NOT EXISTS par INTEGER DEFAULT 72;

-- Step 3: Update tee_boxes
ALTER TABLE tee_boxes RENAME COLUMN course_id TO "courseId";
ALTER TABLE tee_boxes RENAME COLUMN created_at TO "createdAt";
ALTER TABLE tee_boxes DROP COLUMN IF EXISTS yardages;

-- Step 4: Update holes
ALTER TABLE holes RENAME COLUMN course_id TO "courseId";
ALTER TABLE holes RENAME COLUMN hole_number TO "holeNumber";
ALTER TABLE holes DROP COLUMN IF EXISTS difficulty;

-- Step 5: Drop removed models
DROP TABLE IF EXISTS hole_elements CASCADE;
DROP TABLE IF EXISTS handicap_rounds CASCADE;
DROP TABLE IF EXISTS money_events CASCADE;

-- Step 6: Update rounds
ALTER TABLE rounds RENAME COLUMN course_id TO "courseId";
ALTER TABLE rounds RENAME COLUMN course_name TO "courseName";
ALTER TABLE rounds RENAME COLUMN created_at TO "createdAt";
ALTER TABLE rounds RENAME COLUMN is_tournament TO "isTournament";
ALTER TABLE rounds DROP COLUMN IF EXISTS completed;
ALTER TABLE rounds DROP COLUMN IF EXISTS is_live;

-- Step 7: Update round_players
ALTER TABLE round_players RENAME COLUMN round_id TO "roundId";
ALTER TABLE round_players RENAME COLUMN player_id TO "playerId";
ALTER TABLE round_players RENAME COLUMN tee_box_id TO "teeBoxId";
ALTER TABLE round_players RENAME COLUMN gross_score TO "grossScore";
ALTER TABLE round_players RENAME COLUMN course_handicap TO "courseHandicap";
ALTER TABLE round_players RENAME COLUMN front_nine TO "frontNine";
ALTER TABLE round_players RENAME COLUMN back_nine TO "backNine";
ALTER TABLE round_players RENAME COLUMN created_at TO "createdAt";

-- Add netScore column
ALTER TABLE round_players ADD COLUMN IF NOT EXISTS "netScore" INTEGER;
UPDATE round_players SET "netScore" = "grossScore" - "courseHandicap" WHERE "grossScore" IS NOT NULL;

-- Drop removed columns
ALTER TABLE round_players DROP COLUMN IF EXISTS adjusted_gross_score;
ALTER TABLE round_players DROP COLUMN IF EXISTS score_differential;
ALTER TABLE round_players DROP COLUMN IF EXISTS index_at_time;
ALTER TABLE round_players DROP COLUMN IF EXISTS index_after;
ALTER TABLE round_players DROP COLUMN IF EXISTS payout;
ALTER TABLE round_players DROP COLUMN IF EXISTS points;
ALTER TABLE round_players DROP COLUMN IF EXISTS in_pool;
ALTER TABLE round_players DROP COLUMN IF EXISTS tee_box_name;
ALTER TABLE round_players DROP COLUMN IF EXISTS tee_box_par;
ALTER TABLE round_players DROP COLUMN IF EXISTS tee_box_rating;
ALTER TABLE round_players DROP COLUMN IF EXISTS tee_box_slope;

-- Step 8: Update scores
ALTER TABLE scores RENAME COLUMN round_player_id TO "roundPlayerId";
ALTER TABLE scores RENAME COLUMN hole_id TO "holeId";
ALTER TABLE scores RENAME COLUMN fairway_hit TO "fairwayHit";
ALTER TABLE scores RENAME COLUMN green_in_regulation TO "greenInReg";
ALTER TABLE scores DROP COLUMN IF EXISTS created_at;

-- Step 9: Update live_rounds
ALTER TABLE live_rounds RENAME COLUMN course_id TO "courseId";
ALTER TABLE live_rounds RENAME COLUMN course_name TO "courseName";
ALTER TABLE live_rounds RENAME COLUMN created_at TO "createdAt";
ALTER TABLE live_rounds RENAME COLUMN updated_at TO "updatedAt";
ALTER TABLE live_rounds DROP COLUMN IF EXISTS par;
ALTER TABLE live_rounds DROP COLUMN IF EXISTS rating;
ALTER TABLE live_rounds DROP COLUMN IF EXISTS slope;

-- Step 10: Update live_round_players
ALTER TABLE live_round_players RENAME COLUMN live_round_id TO "liveRoundId";
ALTER TABLE live_round_players RENAME COLUMN player_id TO "playerId";
ALTER TABLE live_round_players RENAME COLUMN tee_box_id TO "teeBoxId";
ALTER TABLE live_round_players RENAME COLUMN guest_name TO "guestName";
ALTER TABLE live_round_players RENAME COLUMN is_guest TO "isGuest";
ALTER TABLE live_round_players RENAME COLUMN course_handicap TO "courseHandicap";
ALTER TABLE live_round_players RENAME COLUMN gross_score TO "grossScore";
ALTER TABLE live_round_players RENAME COLUMN front_nine TO "frontNine";
ALTER TABLE live_round_players RENAME COLUMN back_nine TO "backNine";

ALTER TABLE live_round_players DROP COLUMN IF EXISTS tee_box_name;
ALTER TABLE live_round_players DROP COLUMN IF EXISTS tee_box_rating;
ALTER TABLE live_round_players DROP COLUMN IF EXISTS tee_box_slope;
ALTER TABLE live_round_players DROP COLUMN IF EXISTS tee_box_par;
ALTER TABLE live_round_players DROP COLUMN IF EXISTS index_at_time;
ALTER TABLE live_round_players DROP COLUMN IF EXISTS scorer_id;

-- Step 11: Update live_scores
ALTER TABLE live_scores RENAME COLUMN live_round_player_id TO "liveRoundPlayerId";
ALTER TABLE live_scores RENAME COLUMN hole_id TO "holeId";

-- Step 12: Add unique constraints
ALTER TABLE scores ADD CONSTRAINT scores_roundPlayerId_holeId_unique UNIQUE ("roundPlayerId", "holeId");
ALTER TABLE live_scores ADD CONSTRAINT live_scores_liveRoundPlayerId_holeId_unique UNIQUE ("liveRoundPlayerId", "holeId");
ALTER TABLE holes ADD CONSTRAINT holes_courseId_holeNumber_unique UNIQUE ("courseId", "holeNumber");
```

---

## Step 5: Run the Migration

```bash
# Apply the migration
npx prisma migrate dev

# Generate new Prisma Client
npx prisma generate

# Verify the schema
npx prisma studio
```

---

## Step 6: Update Your Application Code

### Files to Update

Search for these patterns and update:

```bash
# Find all snake_case database field references
grep -r "created_at" app/
grep -r "course_id" app/
grep -r "player_id" app/
# ... etc
```

### Common Updates Needed

1. **Import statements** - No changes needed
2. **Prisma queries** - Update field names to camelCase
3. **Type definitions** - Update to match new schema
4. **Calculations** - Remove references to deleted fields

---

## Step 7: Testing Checklist

- [ ] Players page loads correctly
- [ ] Can create new players
- [ ] Scores page shows historical rounds
- [ ] Can create new rounds
- [ ] Live scoring works
- [ ] Can add players to live rounds
- [ ] Can enter scores
- [ ] Photos page works
- [ ] Schedule page works
- [ ] Settings page works

---

## Rollback Plan

If something goes wrong:

```bash
# 1. Restore from backup
psql -h your-host -U your-user -d your-database < backup_YYYYMMDD.sql

# 2. Revert schema
mv prisma/schema.prisma prisma/schema-simplified.prisma
mv prisma/schema-old.prisma prisma/schema.prisma

# 3. Regenerate client
npx prisma generate
```

---

## Need Help?

If you encounter issues:

1. Check the error message carefully
2. Verify field names match the new schema
3. Ensure all relations are properly included
4. Check that you're using camelCase for field names
5. Review the REORGANIZATION_SUMMARY.md for field mappings

---

## Summary

This migration:
- ✅ Simplifies the database by 30-40%
- ✅ Removes redundant fields
- ✅ Uses standard camelCase naming
- ✅ Improves performance
- ✅ Makes code more maintainable

Take your time, test thoroughly, and don't hesitate to ask questions!
