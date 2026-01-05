# Live Scoring Isolation

## Overview
The live scoring system is **completely isolated** from handicap calculations. Player handicaps and indices are **NOT** updated during live scoring.

## How It Works

### Live Rounds
- Live rounds are marked with:
  - `is_live: true`
  - `completed: false`
- These rounds are visible on the Live Scoring page
- Scores can be entered, edited, and updated freely
- **No handicap calculations occur during this phase**

### Completing a Round
When you click the **"Save"** button on the Live Scoring page:
1. A confirmation dialog warns you that this will update all player handicaps
2. If confirmed, the round is marked as `completed: true`
3. The `recalculateAllHandicaps()` function is triggered
4. All player handicaps and indices are recalculated based on **only completed rounds**

### Handicap Calculation Filter
The handicap recalculation system has a critical filter:
```typescript
.filter((r: any) => r.tee_box && r.round.completed === true)
```

This ensures that:
- ✅ Only finalized, completed rounds affect handicaps
- ❌ Live rounds (completed: false) are excluded from calculations
- ✅ Players can score without affecting their official handicap
- ✅ Scores can be corrected during the round without handicap fluctuations

## Benefits

1. **Accuracy**: Handicaps only update with verified, final scores
2. **Flexibility**: Scores can be edited during the round without consequences
3. **Transparency**: Clear separation between "in-progress" and "official" rounds
4. **Control**: Admins can verify scores before finalizing handicap updates

## Key Files

- **`app/actions/update-live-score.ts`**: Handles live score updates (isolated)
- **`app/actions/complete-round.ts`**: Finalizes rounds and triggers handicap updates
- **`app/actions/recalculate-handicaps.ts`**: Processes only completed rounds (line 67)
- **`app/live/LiveScoreClient.tsx`**: Live scoring UI with clear warnings

## Important Notes

⚠️ **The "Save" button on the Live Scoring page does NOT just save scores - it COMPLETES the round and UPDATES ALL HANDICAPS.**

If you want to:
- **Save progress without updating handicaps**: Just enter scores and navigate away. They're auto-saved to the database but the round remains incomplete.
- **Update handicaps**: Click the "Save" button and confirm the warning dialog.

## Reopening Rounds

If you need to edit a completed round:
1. The system provides a "Reopen" function (admin only)
2. This marks the round as `completed: false`
3. Handicaps are recalculated **without** this round
4. You can edit scores
5. Complete the round again to include it in handicap calculations

## Bug Fix: Safety Check Excluding Live Rounds

### The Problem
A critical bug was discovered where the safety check in `recalculateAllHandicaps()` could incorrectly flag live rounds:

- The safety check looks for rounds with `gross_score < 60` to catch accidentally completed partial rounds
- During live scoring, `gross_score` is updated after each hole (e.g., 4 after hole 1, 8 after hole 2, etc.)
- If `recalculateAllHandicaps()` was triggered while live scoring was in progress, it would find these partial scores
- The safety check would then mark the live round as incomplete (which is correct)
- But this would also trigger a full handicap recalculation, causing player indices to change unexpectedly

### The Fix
The safety check now explicitly excludes live rounds:

```typescript
const partialRoundPlayers = await prisma.roundPlayer.findMany({
    where: {
        gross_score: { lt: 60, not: null },
        round: { 
            completed: true,
            is_live: false  // ⚠️ CRITICAL: Exclude live rounds from this check
        }
    },
    select: { round_id: true }
});
```

This ensures that:
- ✅ Live rounds are never flagged as "partial" (they're intentionally incomplete)
- ✅ Even if `recalculateAllHandicaps()` is called during live scoring, it won't affect live rounds
- ✅ Player handicaps remain stable during live scoring
- ✅ The safety check still catches genuinely problematic completed rounds with partial scores
