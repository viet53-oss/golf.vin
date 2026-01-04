# Multi-Group Live Scoring Feature

## Objective
When 3 or more groups are using live scoring on the same date within a 4-hour window, automatically group them into the same round for shared scoring and leaderboard.

## Requirements

### 1. Round Detection Logic
- Monitor active live scoring sessions
- Check if 3+ groups are scoring on the same date
- Verify all sessions are within 4 hours of each other
- Automatically merge them into a single round

### 2. Database Schema Updates

#### Add to Round table:
```prisma
model Round {
  // ... existing fields
  is_live_round    Boolean   @default(false)
  started_at       DateTime?
  groups           Group[]
}

model Group {
  id               String    @id @default(cuid())
  round_id         String
  round            Round     @relation(fields: [round_id], references: [id])
  group_number     Int
  players          RoundPlayer[]
  created_at       DateTime  @default(now())
}
```

### 3. Live Scoring Flow

#### When a user starts live scoring:
1. Check for existing live rounds on the same date
2. If found and within 4-hour window:
   - Join existing round as a new group
   - Assign group number (1, 2, 3, etc.)
3. If not found or outside window:
   - Create new round
   - Start as Group 1

#### Group Management:
- Each group sees their own "My Group" for scoring
- All groups see "Live Scores" leaderboard with all players
- Players sorted by score across all groups

### 4. Real-time Synchronization
- Use Supabase Realtime for live updates
- When any group saves scores:
  - Broadcast to all groups in the same round
  - Update leaderboard in real-time
  - Show which group each player belongs to

### 5. UI Updates

#### My Group Section:
- Keep current functionality
- Add group indicator: "My Group (Group 2)"

#### Live Scores Section:
- Show all players from all groups
- Add "Group" column to show which group each player is in
- Color-code or badge each group
- Sort by total score (leaderboard view)

### 6. Time Window Logic
```typescript
function canJoinRound(existingRound: Round, currentTime: Date): boolean {
  const startTime = existingRound.started_at;
  const hoursDiff = (currentTime - startTime) / (1000 * 60 * 60);
  return hoursDiff <= 4;
}

function findOrCreateLiveRound(date: string): Round {
  // Find rounds on this date that are still active (within 4 hours)
  const activeRounds = await prisma.round.findMany({
    where: {
      date: date,
      is_live_round: true,
      started_at: {
        gte: new Date(Date.now() - 4 * 60 * 60 * 1000) // 4 hours ago
      }
    },
    include: {
      groups: {
        include: {
          players: true
        }
      }
    }
  });

  // Count total groups across all active rounds
  const totalGroups = activeRounds.reduce((sum, r) => sum + r.groups.length, 0);

  if (totalGroups >= 2) {
    // Join the most recent active round
    return activeRounds[0];
  } else {
    // Create new round
    return await prisma.round.create({
      data: {
        date: date,
        is_live_round: true,
        started_at: new Date(),
        // ... other fields
      }
    });
  }
}
```

### 7. Implementation Steps

1. **Phase 1: Database Schema**
   - Add Group model
   - Update Round model with is_live_round and started_at
   - Create migration

2. **Phase 2: Backend Logic**
   - Create `findOrCreateLiveRound` function
   - Update save score logic to handle groups
   - Add group assignment logic

3. **Phase 3: Real-time Sync**
   - Set up Supabase Realtime subscriptions
   - Broadcast score updates across groups
   - Handle real-time leaderboard updates

4. **Phase 4: UI Updates**
   - Add group indicators
   - Update Live Scores to show all groups
   - Add group column/badges
   - Implement real-time updates in UI

5. **Phase 5: Testing**
   - Test with 2 groups (should not merge)
   - Test with 3+ groups (should merge)
   - Test 4-hour window logic
   - Test real-time synchronization

## Current Status
- ✅ Basic live scoring UI complete
- ✅ Single-group scoring functional
- ⏳ Multi-group detection - NOT IMPLEMENTED
- ⏳ Real-time sync - NOT IMPLEMENTED
- ⏳ Group management - NOT IMPLEMENTED

## Next Steps
1. Decide if this feature should be implemented now or later
2. If now: Start with Phase 1 (Database Schema)
3. If later: Continue with other features and revisit

## Notes
- This is a significant feature requiring database changes
- Requires real-time infrastructure (Supabase Realtime)
- Should be tested thoroughly before deployment
- Consider edge cases: players joining mid-round, groups finishing at different times, etc.
