# Live Scoring Quick Reference

## 🚀 Quick Start

### 1. Add Supabase Key to `.env`
```env
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key-from-supabase-dashboard"
```

### 2. Restart Dev Server
```bash
# Stop current server (Ctrl+C)
npm run dev
```

### 3. Use Real-Time Hooks in Your Components

```tsx
'use client';
import { useRealtimeScores } from '@/hooks/useRealtimeScores';

export default function MyComponent({ roundId }: { roundId: string }) {
  const { scores, isConnected, error } = useRealtimeScores(roundId);
  
  return (
    <div>
      <div>Status: {isConnected ? '🟢 Live' : '🔴 Offline'}</div>
      <div>Score updates: {scores.length}</div>
    </div>
  );
}
```

---

## 📊 Available Hooks

### `useRealtimeScores(roundId)`
Subscribes to score changes for a round.

**Returns:**
- `scores` - Array of score updates
- `isConnected` - Boolean connection status
- `error` - Error message if any
- `refresh()` - Clear and restart subscription

### `useRealtimeMoneyEvents(roundId)`
Subscribes to money events for a round.

**Returns:**
- `moneyEvents` - Array of money events
- `isConnected` - Boolean connection status
- `error` - Error message if any
- `refresh()` - Clear and restart subscription

### `useRealtimeTable(tableName, filter?)`
Generic subscription to any table.

**Example:**
```tsx
const { data, isConnected } = useRealtimeTable('round_players', 'round_id=eq.abc123');
```

---

## 💰 Money Event Actions

### Auto-Detect Money Events
```tsx
import { autoDetectMoneyEvents } from '@/app/actions/money-events';

// After saving a score:
await autoDetectMoneyEvents(
  roundId,
  playerId,
  holeId,
  strokes,
  totalParticipants
);
```

### Manual Money Event
```tsx
import { createMoneyEvent } from '@/app/actions/money-events';

await createMoneyEvent({
  roundId: 'round-uuid',
  playerId: 'player-uuid',
  holeNumber: 5,
  eventType: 'birdie',
  amount: 15 // $1 × 15 other players
});
```

### Get Money Totals
```tsx
import { getMoneyTotalsByRound } from '@/app/actions/money-events';

const result = await getMoneyTotalsByRound(roundId);
if (result.success) {
  console.log(result.data); 
  // [{ player_id, player_name, total_amount, event_count }, ...]
}
```

---

## 🎯 Money Event Rules

| Score | Event Type | Amount Per Player |
|-------|-----------|-------------------|
| -3 (Albatross) | `albatross` | $5 |
| -2 (Eagle) | `eagle` | $2 |
| -1 (Birdie) | `birdie` | $1 |

**Example:** 16 players, you make a birdie → You earn $15

---

## 🧪 Testing Real-Time

### Method 1: Use Test Component
```tsx
import RealtimeTest from '@/components/RealtimeTest';

<RealtimeTest roundId="your-round-id" />
```

### Method 2: Two Browser Windows
1. Open `http://localhost:3000/scores` in two windows
2. Submit a score in one window
3. Watch it appear in the other window instantly

### Method 3: Check Connection in Console
```javascript
// In browser console:
const { getSupabaseClient } = await import('/lib/supabase-client');
const client = getSupabaseClient();
console.log('Supabase client:', client);
```

---

## 🔧 Troubleshooting

### "NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined"
→ Add the key to `.env` and restart dev server

### "Failed to connect to real-time updates"
→ Check Supabase dashboard for project status
→ Verify DATABASE_URL is correct

### Updates not appearing
→ Check browser console for errors
→ Verify `isConnected` is `true`
→ Make sure you're subscribed to the correct `roundId`

### Supabase Realtime not enabled
→ Go to Supabase Dashboard → Database → Replication
→ Enable replication for `scores` and `money_events` tables

---

## 📁 File Structure

```
golf-v3/
├── lib/
│   └── supabase-client.ts          # Supabase client setup
├── hooks/
│   └── useRealtimeScores.ts        # Real-time hooks
├── app/
│   └── actions/
│       └── money-events.ts         # Money event actions
├── components/
│   └── RealtimeTest.tsx            # Testing component
└── prisma/
    └── schema.prisma               # MoneyEvent model
```

---

## 🎨 UI Integration Examples

### Show Live Connection Status
```tsx
const { isConnected } = useRealtimeScores(roundId);

<div className="flex items-center gap-2">
  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
  <span className="text-sm">{isConnected ? 'Live' : 'Offline'}</span>
</div>
```

### Show Money Event Notification
```tsx
const { moneyEvents } = useRealtimeMoneyEvents(roundId);

useEffect(() => {
  const latest = moneyEvents[moneyEvents.length - 1];
  if (latest) {
    toast.success(`${latest.player_name} made a ${latest.event_type}! +$${latest.amount}`);
  }
}, [moneyEvents]);
```

### Live Score Counter
```tsx
const { scores } = useRealtimeScores(roundId);

<div className="text-2xl font-bold">
  {scores.length} scores submitted
</div>
```

---

## 🚦 Next: Build Live Scoring Page

Ready to build the live scoring UI? Here's the plan:

1. Create `/live` route
2. Show all groups and current scores
3. Mobile-first score entry
4. Color-coded scores
5. Money leaderboard

Let me know when you're ready to proceed! 🏌️‍♂️
