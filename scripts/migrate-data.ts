import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';
import { calculateScoreDifferential } from '../lib/handicap';

// Configuration
const BACKUP_DIR = path.join(process.env.USERPROFILE || process.env.HOME || '', 'Desktop', 'golf_v2_backup');
const ENV_PATH = path.resolve(process.cwd(), '.env.local');

// Load environment variables manually
const envContent = fs.readFileSync(ENV_PATH, 'utf8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) envVars[key.trim()] = value.trim();
});

const SUPABASE_URL = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const SUPABASE_KEY = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase credentials.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface CsvRecord {
    [key: string]: string;
}

// Helper to read CSV
function readCsv(filename: string): CsvRecord[] {
    const filePath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(filePath)) {
        console.warn(`Warning: ${filename} not found.`);
        return [];
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
    });
}

async function migrate() {
    console.log('🚀 Starting Golf V3 Migration (Fallback + Join Mode)...');

    // 1. Players
    console.log('\n👤 Importing Players...');
    const players = readCsv('players.csv');
    if (players.length > 0) {
        const { error } = await supabase.from('players').upsert(
            players.map(p => ({
                id: p.id,
                name: p.name,
                email: p.email || null,
                phone: p.phone || null,
                index: p.index && !isNaN(parseFloat(p.index)) ? parseFloat(p.index) : 0,
                low_handicap_index: p.low_handicap_index && !isNaN(parseFloat(p.low_handicap_index)) ? parseFloat(p.low_handicap_index) : null,
                created_at: p.created_at,
            }))
        );
        if (error) console.error('Error importing players:', error);
        else console.log(`✅ Imported ${players.length} players.`);
    }

    // 2. Courses
    console.log('\n⛳ Importing Courses...');
    const courses = readCsv('courses.csv');
    if (courses.length > 0) {
        const { error } = await supabase.from('courses').upsert(
            courses.map(c => ({
                id: c.id,
                name: c.name,
                created_at: c.created_at
            }))
        );
        if (error) console.error('Error courses:', error);
        else console.log(`✅ Imported ${courses.length} courses.`);
    }

    // 3. Tees
    const tees = readCsv('tee_boxes.csv');
    if (tees.length > 0) {
        const { error } = await supabase.from('tee_boxes').upsert(
            tees.map(t => ({
                id: t.id,
                course_id: t.course_id,
                name: t.name,
                rating: parseFloat(t.rating),
                slope: parseFloat(t.slope),
                created_at: t.created_at
            }))
        );
        if (error) console.error('Error tees:', error);
        else console.log(`✅ Imported ${tees.length} tee boxes.`);
    }

    // 4. Holes
    const holes = readCsv('holes.csv');
    if (holes.length > 0) {
        const { error } = await supabase.from('holes').upsert(
            holes.map(h => ({
                id: h.id,
                course_id: h.course_id,
                hole_number: parseInt(h.hole_number),
                par: parseInt(h.par),
                difficulty: h.difficulty ? parseInt(h.difficulty) : null,
            }))
        );
        if (error) console.error('Error holes:', error);
        else console.log(`✅ Imported ${holes.length} holes.`);
    }

    // 5. Rounds
    console.log('\n📅 Importing Rounds (Events)...');
    const rounds = readCsv('rounds.csv');
    const roundMap = new Map<string, string>(); // ID -> CreatedAt

    if (rounds.length > 0) {
        const { error } = await supabase.from('rounds').upsert(
            rounds.map(r => {
                roundMap.set(r.id, r.created_at); // Store for scores
                return {
                    id: r.id,
                    date: r.date,
                    course_id: r.course_id,
                    is_tournament: r.is_tournament === 't' || r.is_tournament === 'true',
                    created_at: r.created_at
                };
            })
        );
        if (error) console.error('Error rounds:', error);
        else console.log(`✅ Imported ${rounds.length} rounds.`);
    }

    // 6. Scores (Round Players)
    console.log('\n📝 Importing & Verifying Scores...');
    const scores = readCsv('round_players.csv');
    let scoreUpdates = 0;

    const teeMap = new Map<string, { rating: number, slope: number }>();
    tees.forEach(t => teeMap.set(t.id, { rating: parseFloat(t.rating), slope: parseFloat(t.slope) }));

    const processedScores = [];
    for (const s of scores) {
        // Fallback logic
        let gross = s.gross_score ? parseInt(s.gross_score) : NaN;
        if (isNaN(gross) && s.adjusted_gross_score) {
            gross = parseInt(s.adjusted_gross_score);
        }

        if (isNaN(gross)) {
            console.warn(`Skipping score ${s.id} - No Gross Score available.`);
            continue;
        }

        let diff = parseFloat(s.score_differential);
        const teeId = s.tee_box_id;

        if (teeId && teeMap.has(teeId)) {
            const { rating, slope } = teeMap.get(teeId)!;
            const calculatedDiff = calculateScoreDifferential(gross, rating, slope);

            if (!isNaN(diff) && Math.abs(diff - calculatedDiff) > 0.1) {
                diff = calculatedDiff;
                scoreUpdates++;
            } else if (isNaN(diff)) {
                diff = calculatedDiff;
            }
        }

        // Determine created_at
        let createdAt = s.created_at; // Usually missing in V2 CSV for this table
        if (!createdAt && s.round_id && roundMap.has(s.round_id)) {
            createdAt = roundMap.get(s.round_id)!;
        }
        if (!createdAt) {
            createdAt = new Date().toISOString(); // Ultimate fallback
        }

        processedScores.push({
            id: s.id,
            round_id: s.round_id,
            player_id: s.player_id,
            tee_box_id: s.tee_box_id || null,
            gross_score: gross,
            adjusted_gross_score: s.adjusted_gross_score && !isNaN(parseInt(s.adjusted_gross_score)) ? parseInt(s.adjusted_gross_score) : gross,
            score_differential: isNaN(diff) ? null : diff,
            index_at_time: s.index_after && !isNaN(parseFloat(s.index_after)) ? parseFloat(s.index_after) : null,
            created_at: createdAt
        });
    }

    if (processedScores.length > 0) {
        const { error } = await supabase.from('round_players').upsert(processedScores);
        if (error) console.error('Error scores:', error);
        else console.log(`✅ Imported ${processedScores.length} scores. Corrected ${scoreUpdates} differentials.`);
    }

    // 7. Manual History
    console.log('\n📜 Importing Manual History...');
    const manual = readCsv('handicap_rounds.csv');
    const processedManual = [];
    for (const m of manual) {
        const gross = parseInt(m.gross_score);
        const rating = parseFloat(m.course_rating);
        const slope = parseFloat(m.slope_rating);

        const diff = calculateScoreDifferential(gross, rating, slope);

        if (!isNaN(gross) && !isNaN(diff)) {
            processedManual.push({
                id: m.id,
                player_id: m.player_id,
                date_played: m.date_played,
                score_differential: diff,
                gross_score: gross,
                created_at: m.created_at
            });
        }
    }

    if (processedManual.length > 0) {
        const { error } = await supabase.from('handicap_rounds').upsert(processedManual);
        if (error) console.error('Error manual:', error);
        else console.log(`✅ Imported ${processedManual.length} manual records.`);
    }

    console.log('\n🎉 Migration Complete!');
}

migrate();
