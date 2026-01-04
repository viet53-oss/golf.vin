# Real-Time Live Scoring Setup

## Phase 1: Real-Time Infrastructure ✅

### Completed:
1. ✅ Created Supabase client utility (`lib/supabase-client.ts`)
2. ✅ Created React hooks for real-time subscriptions (`hooks/useRealtimeScores.ts`)
3. ✅ Added `MoneyEvent` model to Prisma schema
4. ✅ Created money event server actions (`app/actions/money-events.ts`)
5. ✅ Migrated database with `prisma db push`

### Required Environment Variable:

You need to add your Supabase anon key to `.env`:

```env
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key-here"
```

**How to get your Supabase anon key:**
1. Go to https://supabase.com/dashboard
2. Select your project: `murcnbooxfuosrpdgyyb`
3. Go to Settings → API
4. Copy the "anon" / "public" key
5. Add it to your `.env` file

### Next Steps:

**Phase 2: Live Scoring UI**
- [ ] Create `/live` page for real-time score viewing
- [ ] Build mobile-first score entry component
- [ ] Add group-based organization
- [ ] Implement color-coded score display

**Phase 3: Money Tracking UI**
- [ ] Create money leaderboard component
- [ ] Add birdie/eagle notifications
- [ ] Build money history view

**Phase 4: Testing & Polish**
- [ ] Test real-time updates with multiple browser windows
- [ ] Add offline support
- [ ] Implement optimistic updates
- [ ] Add haptic feedback for mobile

## Technical Details

### Real-Time Hooks Available:

```typescript
// Subscribe to score updates for a round
const { scores, isConnected, error } = useRealtimeScores(roundId);

// Subscribe to money events for a round
const { moneyEvents, isConnected, error } = useRealtimeMoneyEvents(roundId);

// Generic table subscription
const { data, isConnected, error } = useRealtimeTable('table_name', 'filter');
```

### Server Actions Available:

```typescript
// Create money event
await createMoneyEvent({
  roundId,
  playerId,
  holeNumber,
  eventType: 'birdie',
  amount: 3 // $1 × 3 other players
});

// Auto-detect from score
await autoDetectMoneyEvents(roundId, playerId, holeId, strokes, totalParticipants);

// Get money totals
const { data } = await getMoneyTotalsByRound(roundId);
```

### Database Schema:

```sql
CREATE TABLE money_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL,
  player_id UUID NOT NULL,
  hole_number INT NOT NULL,
  event_type VARCHAR NOT NULL, -- 'birdie', 'eagle', 'albatross', 'skin'
  amount DECIMAL NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Money Event Rules (Current Implementation):

- **Birdie** (-1): $1 per participant
- **Eagle** (-2): $2 per participant  
- **Albatross** (-3): $5 per participant

Example: If 16 players are in the round and you make a birdie, you earn $15 (16 - 1 = 15 players × $1).

## Questions to Answer:

1. Do you want to adjust the money amounts?
2. Should we track "skins" (lowest score on a hole wins)?
3. Do you want real-time notifications when someone makes a birdie?
4. Should players be able to enter scores for their whole group or just themselves?
