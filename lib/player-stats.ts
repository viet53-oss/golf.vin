/**
 * Shared utility for calculating player statistics
 * Used across Scores, Pool, and other components to ensure consistency
 */

export interface PlayerStatsInput {
    gross_score: number | null;
    index_at_time: number | null;
    player: {
        index: number;
        preferred_tee_box?: string | null;
    };
    tee_box?: {
        slope: number;
        rating: number;
    } | null;
    scores?: Array<{
        strokes: number;
        hole: {
            hole_number: number;
            difficulty?: number | null;
        };
    }>;
}

export interface CourseData {
    tee_boxes?: Array<{
        name: string;
        slope: number;
        rating: number;
    }>;
}

export interface PlayerStats {
    courseHandicap: number;
    netTotal: number;
    slope: number;
    rating: number;
    grossHoleScores: Array<{
        holeNumber: number;
        difficulty: number;
        grossScore: number;
    }>;
}

/**
 * Calculate comprehensive player statistics including course handicap and net score
 */
export function calculatePlayerStats(
    rp: PlayerStatsInput,
    course: CourseData,
    par: number
): PlayerStats {
    const idxBefore = rp.index_at_time ?? rp.player?.index ?? 0;
    
    // Override with preferred tee box if available
    let preferredTee = null;
    if (rp.player?.preferred_tee_box && course.tee_boxes) {
        preferredTee = course.tee_boxes.find((tb) =>
            tb.name.toLowerCase() === rp.player.preferred_tee_box!.toLowerCase()
        );
    }
    
    const slope = preferredTee?.slope ?? rp.tee_box?.slope ?? 113;
    const rating = preferredTee?.rating ?? rp.tee_box?.rating ?? par;
    const courseHandicap = Math.round((idxBefore * (slope / 113)) + (rating - par));
    const netTotal = (rp.gross_score ?? 999) - courseHandicap;
    
    // Calculate Gross Hole Scores for Tie Breaker (sorted by difficulty)
    const scores = rp.scores || [];
    const grossHoleScores = scores.map((s) => {
        const h = s.hole;
        const diff = h?.difficulty || 18;
        
        return {
            holeNumber: h?.hole_number || 0,
            difficulty: diff,
            grossScore: s.strokes
        };
    }).sort((a, b) => a.difficulty - b.difficulty);
    
    return { courseHandicap, netTotal, slope, rating, grossHoleScores };
}

/**
 * Calculate course handicap after a round (for index_after)
 */
export function calculateCourseHandicapAfter(
    indexAfter: number | null,
    indexBefore: number,
    slope: number,
    rating: number,
    par: number
): number {
    if (typeof indexAfter !== 'number') {
        return Math.round((indexBefore * (slope / 113)) + (rating - par));
    }
    
    const calculated = Math.round((indexAfter * (slope / 113)) + (rating - par));
    return isNaN(calculated) 
        ? Math.round((indexBefore * (slope / 113)) + (rating - par))
        : calculated;
}

/**
 * Compare two players for sorting (Net Score + Tie Breaker)
 */
export function comparePlayers(
    a: PlayerStatsInput,
    b: PlayerStatsInput,
    course: CourseData,
    par: number
): number {
    const statsA = calculatePlayerStats(a, course, par);
    const statsB = calculatePlayerStats(b, course, par);
    
    // 1. Primary: Net Score
    if (statsA.netTotal !== statsB.netTotal) {
        return statsA.netTotal - statsB.netTotal;
    }
    
    // 2. Tie Breaker: Hardest Holes by Gross Score (1, 2, 3...)
    const aHoles = statsA.grossHoleScores;
    const bHoles = statsB.grossHoleScores;
    
    if (aHoles.length === 0 || bHoles.length === 0) return 0;
    
    // Find first difference in hole score (sorted by difficulty)
    for (let i = 0; i < Math.min(aHoles.length, bHoles.length); i++) {
        if (aHoles[i].grossScore !== bHoles[i].grossScore) {
            return aHoles[i].grossScore - bHoles[i].grossScore;
        }
    }
    
    return 0;
}
