import { calculateHandicap, Round } from './lib/handicap';

console.log('Running Handicap Logic Tests...\n');

function createRound(id: string, score: number, date: string): Round {
    return {
        id,
        date,
        score,
        rating: 70.0,
        slope: 113, // Standard slope implies diff = score - rating
    };
}

// Test A: < 3 Rounds (Index 0)
const roundsA = [
    createRound('1', 80, '2023-01-01'),
    createRound('2', 82, '2023-01-02'),
];
const resultA = calculateHandicap(roundsA);
console.log(`Test A (<3 rounds): Expected 0, Got ${resultA.handicapIndex}`);
if (resultA.handicapIndex !== 0) console.error('FAIL');


// Test B: 3 Rounds (Lowest - 2.0)
// Diffs: 10, 12, 14. Lowest = 10. Adjustment -2.0 = 8.0.
const roundsB = [
    createRound('1', 80, '2023-01-01'), // Diff 10
    createRound('2', 82, '2023-01-02'), // Diff 12
    createRound('3', 84, '2023-01-03'), // Diff 14
];
const resultB = calculateHandicap(roundsB);
console.log(`Test B (3 rounds): Expected 8.0, Got ${resultB.handicapIndex}`);
if (resultB.handicapIndex !== 8.0) console.error('FAIL');


// Test C: 20 Rounds (Avg of lowest 8)
// Let's make 20 rounds with diff 10. Index should be 10.0.
const roundsC: Round[] = [];
for (let i = 1; i <= 20; i++) {
    roundsC.push(createRound(i.toString(), 80, `2023-01-${i < 10 ? '0' + i : i}`));
}
const resultC = calculateHandicap(roundsC);
console.log(`Test C (20 rounds, stable): Expected 10.0, Got ${resultC.handicapIndex}`);
if (resultC.handicapIndex !== 10.0) console.error('FAIL');


// Test D: Soft Cap
// Low HI = 10.0. Soft Cap Trigger = 13.0.
// Calculated Avg = 15.0.
// Excess = 2.0. Suppressed = 13.0 + (2.0 / 2) = 14.0.
const roundsD: Round[] = [];
for (let i = 1; i <= 20; i++) {
    roundsD.push(createRound(i.toString(), 85, `2023-01-${i < 10 ? '0' + i : i}`)); // Diff 15.0
}
const resultD = calculateHandicap(roundsD, 10.0);
console.log(`Test D (Soft Cap): LowHI=10.0, Calc=15.0. Expected 14.0, Got ${resultD.handicapIndex}`);
if (resultD.handicapIndex !== 14.0) console.error(`FAIL - SoftCapped: ${resultD.isSoftCapped}`);


// Test E: Hard Cap
// Low HI = 10.0. Hard Cap Trigger = 15.0.
// Calculated Avg = 20.0.
// Soft Cap Check: 13.0 + (7.0 / 2) = 16.5.
// Hard Cap Logic: 16.5 > 15.0, so should be 15.0.
const roundsE: Round[] = [];
for (let i = 1; i <= 20; i++) {
    roundsE.push(createRound(i.toString(), 90, `2023-01-${i < 10 ? '0' + i : i}`)); // Diff 20.0
}
const resultE = calculateHandicap(roundsE, 10.0);
console.log(`Test E (Hard Cap): LowHI=10.0, Calc=20.0. Expected 15.0, Got ${resultE.handicapIndex}`);
if (resultE.handicapIndex !== 15.0) console.error(`FAIL - HardCapped: ${resultE.isHardCapped}`);

console.log('\nTests Completed.');
