# ✅ Reorganization Checklist

Use this checklist to track your progress through the reorganization process.

---

## 📚 Phase 1: Understanding (Start Here!)

- [ ] Read `START_HERE.md` - Get the overview
- [ ] Read `REORGANIZATION_INDEX.md` - Understand what's included
- [ ] Review `REORGANIZATION_SUMMARY.md` - See detailed changes
- [ ] Look at `schema_comparison_diagram.png` - Visual database comparison
- [ ] Look at `code_organization_comparison.png` - Visual code comparison

**Estimated time: 15-30 minutes**

---

## 🏠 Phase 2: Preview New Home Page (Safe - No Changes)

- [ ] Ensure localhost is running (`npm run dev`)
- [ ] Visit `http://localhost:3000` - See current home page
- [ ] Visit `http://localhost:3000/home1` - See new home page
- [ ] Compare the two pages - Same functionality?
- [ ] Open `app/page.tsx` in your editor
- [ ] Open `app/home1/page.tsx` in your editor
- [ ] Compare the code structure
- [ ] Notice the improvements:
  - [ ] Clear section organization
  - [ ] Extracted MenuCard component
  - [ ] Configuration constants
  - [ ] TypeScript interfaces
  - [ ] Separated data fetching

**Estimated time: 10-15 minutes**

---

## 🎨 Phase 3: Adopt New Home Page (Optional - Low Risk)

Only do this if you like the new home page!

- [ ] Backup current home page
  ```bash
  mv app/page.tsx app/page-old.tsx
  ```
- [ ] Move new home page into place
  ```bash
  mv app/home1/page.tsx app/page.tsx
  ```
- [ ] Restart dev server (Ctrl+C, then `npm run dev`)
- [ ] Visit `http://localhost:3000` - Verify it works
- [ ] Test all menu links:
  - [ ] Live Score
  - [ ] Scores
  - [ ] Players
  - [ ] Schedule
  - [ ] FAQ's
  - [ ] Photos
  - [ ] Settings
- [ ] Check birthday popup (if applicable)
- [ ] Verify no console errors
- [ ] Test on mobile (responsive design)

**Estimated time: 10 minutes**

---

## 📖 Phase 4: Review Database Changes (Before Migration)

- [ ] Open `prisma/schema.prisma` - Current schema
- [ ] Open `prisma/schema-simplified.prisma` - New schema
- [ ] Compare the two files
- [ ] Read `QUICK_REFERENCE.md` - Field name mappings
- [ ] Understand what's being removed:
  - [ ] Player: 6 fields removed
  - [ ] RoundPlayer: 7 fields removed
  - [ ] LiveRoundPlayer: 4 fields removed
  - [ ] 3 models removed entirely
- [ ] Understand what's being renamed:
  - [ ] snake_case → camelCase
  - [ ] All field names updated
- [ ] Review the benefits:
  - [ ] 30-40% simpler
  - [ ] Better performance
  - [ ] Modern naming
  - [ ] Cleaner relations

**Estimated time: 20-30 minutes**

---

## 🗄️ Phase 5: Prepare for Database Migration (If Proceeding)

⚠️ **WARNING**: Only proceed if you're ready to change your database!

### 5.1: Backup

- [ ] Read `MIGRATION_GUIDE.md` - Full migration instructions
- [ ] Identify your database type (Supabase/PostgreSQL)
- [ ] Create database backup:
  ```bash
  # For PostgreSQL/Supabase
  pg_dump -h HOST -U USER -d DATABASE > backup_$(date +%Y%m%d).sql
  ```
- [ ] Verify backup file exists
- [ ] Store backup in safe location
- [ ] Test restore process (optional but recommended):
  ```bash
  # Create test database
  createdb test_database
  # Restore backup to test
  psql -h HOST -U USER -d test_database < backup_YYYYMMDD.sql
  ```

**Estimated time: 10-20 minutes**

### 5.2: Plan Migration

- [ ] Choose migration time (low traffic period)
- [ ] Notify team members (if applicable)
- [ ] Plan for downtime (5-15 minutes)
- [ ] Have rollback plan ready
- [ ] Review `QUICK_REFERENCE.md` for code changes needed
- [ ] Identify all files that need updating:
  ```bash
  # Search for snake_case field usage
  grep -r "created_at" app/
  grep -r "course_id" app/
  grep -r "player_id" app/
  ```
- [ ] Estimate time needed for code updates (1-3 hours)

**Estimated time: 30-60 minutes**

---

## 🚀 Phase 6: Execute Database Migration (Point of No Return!)

⚠️ **CRITICAL**: Have backup ready! This changes your database!

### 6.1: Schema Replacement

- [ ] Stop your dev server (Ctrl+C)
- [ ] Backup current schema:
  ```bash
  mv prisma/schema.prisma prisma/schema-old.prisma
  ```
- [ ] Move new schema into place:
  ```bash
  mv prisma/schema-simplified.prisma prisma/schema.prisma
  ```
- [ ] Review the new schema one more time
- [ ] Create migration (don't apply yet):
  ```bash
  npx prisma migrate dev --name simplified_schema --create-only
  ```

**Estimated time: 5 minutes**

### 6.2: Review Migration SQL

- [ ] Open the generated migration file:
  - Location: `prisma/migrations/XXXXXX_simplified_schema/migration.sql`
- [ ] Review the SQL carefully
- [ ] Verify it matches expectations from `MIGRATION_GUIDE.md`
- [ ] Check for any destructive operations
- [ ] Understand what each ALTER TABLE does
- [ ] Make any necessary adjustments

**Estimated time: 10-15 minutes**

### 6.3: Apply Migration

- [ ] Take a deep breath! 😊
- [ ] Apply the migration:
  ```bash
  npx prisma migrate dev
  ```
- [ ] Watch for errors
- [ ] If errors occur:
  - [ ] Read error message carefully
  - [ ] Check migration SQL
  - [ ] Fix issues
  - [ ] Try again
- [ ] Generate new Prisma Client:
  ```bash
  npx prisma generate
  ```
- [ ] Verify in Prisma Studio:
  ```bash
  npx prisma studio
  ```
- [ ] Check that:
  - [ ] All tables exist
  - [ ] Field names are camelCase
  - [ ] Data is intact
  - [ ] Removed fields are gone

**Estimated time: 5-10 minutes**

---

## 💻 Phase 7: Update Application Code

### 7.1: Find & Replace

Use `QUICK_REFERENCE.md` for the complete list!

- [ ] Open your IDE's find & replace (Ctrl+Shift+H)
- [ ] Replace field names (do these one at a time!):
  - [ ] `.created_at` → `.createdAt`
  - [ ] `.course_id` → `.courseId`
  - [ ] `.player_id` → `.playerId`
  - [ ] `.round_id` → `.roundId`
  - [ ] `.tee_box_id` → `.teeBoxId`
  - [ ] `.hole_id` → `.holeId`
  - [ ] `.gross_score` → `.grossScore`
  - [ ] `.course_handicap` → `.courseHandicap`
  - [ ] `.front_nine` → `.frontNine`
  - [ ] `.back_nine` → `.backNine`
  - [ ] `.is_guest` → `.isGuest`
  - [ ] `.guest_name` → `.guestName`
  - [ ] `.is_tournament` → `.isTournament`
  - [ ] `.course_name` → `.courseName`
  - [ ] `.hole_number` → `.holeNumber`
  - [ ] `.round_player_id` → `.roundPlayerId`
  - [ ] `.live_round_id` → `.liveRoundId`
  - [ ] `.live_round_player_id` → `.liveRoundPlayerId`
  - [ ] `.fairway_hit` → `.fairwayHit`
  - [ ] `.green_in_regulation` → `.greenInReg`

**Estimated time: 30-60 minutes**

### 7.2: Update Removed Fields

- [ ] Find usage of removed fields:
  - [ ] `tee_box_name` → Use `teeBox.name` (add include)
  - [ ] `tee_box_rating` → Use `teeBox.rating`
  - [ ] `tee_box_slope` → Use `teeBox.slope`
  - [ ] `tee_box_par` → Use `teeBox.par`
  - [ ] `index_at_time` → Use current `handicapIndex`
  - [ ] `adjusted_gross_score` → Calculate as needed
  - [ ] `score_differential` → Calculate as needed
- [ ] Add `include` statements where needed:
  ```typescript
  include: {
    teeBox: true,
    player: true,
    // ... other relations
  }
  ```

**Estimated time: 30-60 minutes**

### 7.3: Add New Fields

- [ ] Use new `netScore` field:
  ```typescript
  netScore: grossScore - courseHandicap
  ```
- [ ] Update calculations to use `netScore`

**Estimated time: 15-30 minutes**

---

## 🧪 Phase 8: Testing

### 8.1: Start Dev Server

- [ ] Start dev server:
  ```bash
  npm run dev
  ```
- [ ] Check for TypeScript errors
- [ ] Check for compilation errors
- [ ] Fix any errors found

**Estimated time: 5 minutes**

### 8.2: Test Core Functionality

- [ ] **Home Page**
  - [ ] Page loads without errors
  - [ ] All menu items visible
  - [ ] All links work
  - [ ] Birthday popup works (if applicable)

- [ ] **Players Page**
  - [ ] Players list loads
  - [ ] Can view player details
  - [ ] Can create new player
  - [ ] Can edit player
  - [ ] Handicap displays correctly

- [ ] **Scores Page**
  - [ ] Historical rounds display
  - [ ] Can view round details
  - [ ] Can create new round
  - [ ] Scores display correctly
  - [ ] Net scores calculate correctly

- [ ] **Live Scoring**
  - [ ] Can create live round
  - [ ] Can add players
  - [ ] Can add guest players
  - [ ] Can enter scores
  - [ ] Scores save correctly
  - [ ] Leaderboard updates

- [ ] **Schedule Page**
  - [ ] Events display
  - [ ] Can create events
  - [ ] Can edit events

- [ ] **Photos Page**
  - [ ] Photos display
  - [ ] Can upload photos
  - [ ] Can delete photos

- [ ] **Settings Page**
  - [ ] Settings load
  - [ ] Can modify settings
  - [ ] Changes save

**Estimated time: 30-60 minutes**

### 8.3: Check Console

- [ ] Open browser console (F12)
- [ ] Navigate through all pages
- [ ] Check for errors
- [ ] Check for warnings
- [ ] Fix any issues found

**Estimated time: 10-15 minutes**

### 8.4: Test Edge Cases

- [ ] Guest players in live rounds
- [ ] Players with no handicap
- [ ] Rounds with incomplete scores
- [ ] Empty states (no players, no rounds, etc.)
- [ ] Mobile responsiveness
- [ ] Different screen sizes

**Estimated time: 20-30 minutes**

---

## 📝 Phase 9: Documentation & Cleanup

- [ ] Update any custom documentation
- [ ] Document any custom changes made
- [ ] Remove old backup files (if everything works):
  ```bash
  # Only after thorough testing!
  rm app/page-old.tsx
  rm prisma/schema-old.prisma
  ```
- [ ] Commit changes to git:
  ```bash
  git add .
  git commit -m "Reorganize code and simplify database schema"
  git push
  ```
- [ ] Update team members
- [ ] Celebrate! 🎉

**Estimated time: 15-30 minutes**

---

## 🔄 Rollback Procedure (If Needed)

If something goes wrong:

- [ ] Stop dev server (Ctrl+C)
- [ ] Restore database from backup:
  ```bash
  psql -h HOST -U USER -d DATABASE < backup_YYYYMMDD.sql
  ```
- [ ] Restore old schema:
  ```bash
  mv prisma/schema.prisma prisma/schema-simplified.prisma
  mv prisma/schema-old.prisma prisma/schema.prisma
  ```
- [ ] Restore old home page (if changed):
  ```bash
  mv app/page.tsx app/home1/page.tsx
  mv app/page-old.tsx app/page.tsx
  ```
- [ ] Regenerate Prisma Client:
  ```bash
  npx prisma generate
  ```
- [ ] Restart dev server:
  ```bash
  npm run dev
  ```
- [ ] Verify everything works
- [ ] Review what went wrong
- [ ] Fix issues
- [ ] Try again when ready

---

## 📊 Progress Tracker

### Completed Phases

- [ ] Phase 1: Understanding
- [ ] Phase 2: Preview New Home Page
- [ ] Phase 3: Adopt New Home Page (optional)
- [ ] Phase 4: Review Database Changes
- [ ] Phase 5: Prepare for Migration
- [ ] Phase 6: Execute Migration
- [ ] Phase 7: Update Code
- [ ] Phase 8: Testing
- [ ] Phase 9: Documentation

### Total Estimated Time

- **Minimum** (just new home page): 35-60 minutes
- **Full migration**: 4-7 hours

---

## 🎯 Success Criteria

You're done when:

- ✅ All pages load without errors
- ✅ All functionality works as before
- ✅ No console errors
- ✅ Tests pass (if you have tests)
- ✅ Code is cleaner and more maintainable
- ✅ Database is simpler and more efficient
- ✅ Team is updated and trained

---

## 💡 Tips

- **Take your time** - Don't rush through the migration
- **Test thoroughly** - Better to find issues now than in production
- **Ask for help** - Review the documentation files
- **Backup everything** - You can never have too many backups
- **Celebrate progress** - Each phase completed is a win!

---

**Good luck! You've got this! 🚀**
