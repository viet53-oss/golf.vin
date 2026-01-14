# Quick Reference: Old vs New Schema

## Field Name Quick Lookup

### 🔄 Universal Changes
```
snake_case → camelCase
created_at → createdAt
updated_at → updatedAt
```

---

## 📋 Model-by-Model Reference

### Player
| Old Field | New Field | Notes |
|-----------|-----------|-------|
| `index` | `handicapIndex` | Renamed for clarity |
| `low_handicap_index` | ❌ REMOVED | Use handicapIndex |
| `created_at` | `createdAt` | camelCase |
| `year_joined` | ❌ REMOVED | Not essential |
| `address` | ❌ REMOVED | Not used |
| `city` | ❌ REMOVED | Not used |
| `state` | ❌ REMOVED | Not used |
| `zip` | ❌ REMOVED | Not used |
| `preferred_tee_box` | ❌ REMOVED | Determined per-round |
| `manual_rounds` | ❌ REMOVED | HandicapRound model removed |

### TeeBox
| Old Field | New Field | Notes |
|-----------|-----------|-------|
| `course_id` | `courseId` | camelCase |
| `created_at` | `createdAt` | camelCase |
| `yardages` | ❌ REMOVED | Not used |
| - | ✅ `par` | NEW: Total par for tee box |

### Hole
| Old Field | New Field | Notes |
|-----------|-----------|-------|
| `course_id` | `courseId` | camelCase |
| `hole_number` | `holeNumber` | camelCase |
| `difficulty` | ❌ REMOVED | Not used |
| `elements` | ❌ REMOVED | HoleElement model removed |

### Round
| Old Field | New Field | Notes |
|-----------|-----------|-------|
| `course_id` | `courseId` | camelCase |
| `course_name` | `courseName` | camelCase |
| `created_at` | `createdAt` | camelCase |
| `is_tournament` | `isTournament` | camelCase |
| `completed` | ❌ REMOVED | Can be inferred |
| `is_live` | ❌ REMOVED | Use LiveRound model |

### RoundPlayer
| Old Field | New Field | Notes |
|-----------|-----------|-------|
| `round_id` | `roundId` | camelCase |
| `player_id` | `playerId` | camelCase |
| `tee_box_id` | `teeBoxId` | camelCase |
| `gross_score` | `grossScore` | camelCase |
| `course_handicap` | `courseHandicap` | camelCase |
| `front_nine` | `frontNine` | camelCase |
| `back_nine` | `backNine` | camelCase |
| `created_at` | `createdAt` | camelCase |
| - | ✅ `netScore` | NEW: Gross - Handicap |
| `adjusted_gross_score` | ❌ REMOVED | Calculate as needed |
| `score_differential` | ❌ REMOVED | Calculate as needed |
| `index_at_time` | ❌ REMOVED | Use current handicap |
| `index_after` | ❌ REMOVED | Not needed |
| `payout` | ❌ REMOVED | Use MoneyEvent if needed |
| `points` | ❌ REMOVED | Use MoneyEvent if needed |
| `in_pool` | ❌ REMOVED | Use MoneyEvent if needed |
| `tee_box_name` | ❌ REMOVED | Use teeBox relation |
| `tee_box_par` | ❌ REMOVED | Use teeBox relation |
| `tee_box_rating` | ❌ REMOVED | Use teeBox relation |
| `tee_box_slope` | ❌ REMOVED | Use teeBox relation |

### Score
| Old Field | New Field | Notes |
|-----------|-----------|-------|
| `round_player_id` | `roundPlayerId` | camelCase |
| `hole_id` | `holeId` | camelCase |
| `fairway_hit` | `fairwayHit` | camelCase |
| `green_in_regulation` | `greenInReg` | Shortened |
| `created_at` | ❌ REMOVED | Not needed |

### LiveRound
| Old Field | New Field | Notes |
|-----------|-----------|-------|
| `course_id` | `courseId` | camelCase |
| `course_name` | `courseName` | camelCase |
| `created_at` | `createdAt` | camelCase |
| `updated_at` | `updatedAt` | camelCase |
| `par` | ❌ REMOVED | Use TeeBox.par |
| `rating` | ❌ REMOVED | Use TeeBox.rating |
| `slope` | ❌ REMOVED | Use TeeBox.slope |

### LiveRoundPlayer
| Old Field | New Field | Notes |
|-----------|-----------|-------|
| `live_round_id` | `liveRoundId` | camelCase |
| `player_id` | `playerId` | camelCase |
| `tee_box_id` | `teeBoxId` | camelCase |
| `guest_name` | `guestName` | camelCase |
| `is_guest` | `isGuest` | camelCase |
| `course_handicap` | `courseHandicap` | camelCase |
| `gross_score` | `grossScore` | camelCase |
| `front_nine` | `frontNine` | camelCase |
| `back_nine` | `backNine` | camelCase |
| `tee_box_name` | ❌ REMOVED | Use teeBox relation |
| `tee_box_rating` | ❌ REMOVED | Use teeBox relation |
| `tee_box_slope` | ❌ REMOVED | Use teeBox relation |
| `tee_box_par` | ❌ REMOVED | Use teeBox relation |
| `index_at_time` | ❌ REMOVED | Use current handicap |
| `scorer_id` | ❌ REMOVED | Not essential |

### LiveScore
| Old Field | New Field | Notes |
|-----------|-----------|-------|
| `live_round_player_id` | `liveRoundPlayerId` | camelCase |
| `hole_id` | `holeId` | camelCase |

---

## 🗑️ Removed Models

| Model | Reason |
|-------|--------|
| `HoleElement` | Too complex, GPS elements not used |
| `HandicapRound` | Simplified handicap tracking |
| `MoneyEvent` | Can be added back separately if needed |

---

## ✅ Code Migration Patterns

### Pattern 1: Simple Field Rename
```typescript
// OLD
player.created_at
player.index

// NEW
player.createdAt
player.handicapIndex
```

### Pattern 2: Removed Field → Use Relation
```typescript
// OLD
roundPlayer.tee_box_name
roundPlayer.tee_box_rating

// NEW
roundPlayer.teeBox.name
roundPlayer.teeBox.rating

// Don't forget to include the relation!
const roundPlayer = await prisma.roundPlayer.findUnique({
  where: { id },
  include: { teeBox: true }
});
```

### Pattern 3: Removed Field → Calculate
```typescript
// OLD
roundPlayer.adjusted_gross_score

// NEW
const adjustedGross = calculateAdjustedGross(roundPlayer.grossScore, ...);
```

### Pattern 4: New Field
```typescript
// NEW FIELD: netScore
const netScore = grossScore - courseHandicap;

await prisma.roundPlayer.create({
  data: {
    grossScore: 85,
    courseHandicap: 14,
    netScore: 71, // NEW!
  }
});
```

---

## 🔍 Find & Replace Guide

Use your IDE's find & replace (Ctrl+Shift+H):

```
Find: \.created_at
Replace: .createdAt

Find: \.course_id
Replace: .courseId

Find: \.player_id
Replace: .playerId

Find: \.round_id
Replace: .roundId

Find: \.tee_box_id
Replace: .teeBoxId

Find: \.hole_id
Replace: .holeId

Find: \.gross_score
Replace: .grossScore

Find: \.course_handicap
Replace: .courseHandicap

Find: \.front_nine
Replace: .frontNine

Find: \.back_nine
Replace: .backNine

Find: \.is_guest
Replace: .isGuest

Find: \.guest_name
Replace: .guestName

Find: \.is_tournament
Replace: .isTournament

Find: \.course_name
Replace: .courseName

Find: \.hole_number
Replace: .holeNumber

Find: \.round_player_id
Replace: .roundPlayerId

Find: \.live_round_id
Replace: .liveRoundId

Find: \.live_round_player_id
Replace: .liveRoundPlayerId

Find: \.fairway_hit
Replace: .fairwayHit

Find: \.green_in_regulation
Replace: .greenInReg
```

---

## 📊 Statistics

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Total Models | 13 | 10 | -23% |
| Player Fields | 13 | 7 | -46% |
| RoundPlayer Fields | 17 | 10 | -41% |
| LiveRoundPlayer Fields | 13 | 9 | -31% |

---

## 🎯 Quick Test

After migration, test these queries:

```typescript
// 1. Get player with handicap
const player = await prisma.player.findUnique({
  where: { id: "..." },
  select: { name: true, handicapIndex: true }
});

// 2. Get round with tee box info
const roundPlayer = await prisma.roundPlayer.findUnique({
  where: { id: "..." },
  include: { teeBox: true, player: true }
});

// 3. Calculate net score
const netScore = roundPlayer.grossScore - roundPlayer.courseHandicap;

// 4. Get live round
const liveRound = await prisma.liveRound.findFirst({
  include: {
    players: {
      include: { teeBox: true, player: true }
    }
  }
});
```

---

## 💡 Pro Tips

1. **Use TypeScript**: Let the compiler catch field name errors
2. **Include relations**: Don't forget to include teeBox when you need its data
3. **Calculate on-the-fly**: For removed calculated fields, compute them when needed
4. **Test incrementally**: Update one page at a time
5. **Use Prisma Studio**: Verify data looks correct after migration

---

## 🆘 Common Errors

### Error: "Unknown field"
```
❌ Property 'tee_box_name' does not exist
✅ Use roundPlayer.teeBox.name instead
```

### Error: "Cannot read property of undefined"
```
❌ roundPlayer.teeBox.name (teeBox is undefined)
✅ Include the relation: include: { teeBox: true }
```

### Error: "Column does not exist"
```
❌ Using old snake_case field names
✅ Use camelCase: createdAt, not created_at
```

---

Print this page and keep it handy during migration! 📄
