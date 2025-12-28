import { prisma } from '@/lib/prisma';
import { postScore } from '../actions';
import Link from 'next/link';
import { getTodayLocal } from '@/lib/date-utils';
export const dynamic = 'force-dynamic';

export default async function PostScorePage() {
    let players: any[] = [];
    let courses: any[] = [];

    try {
        players = await prisma.player.findMany({ orderBy: { name: 'asc' } });
    } catch (error) {
        console.error('Failed to fetch players:', error);
    }

    try {
        courses = await prisma.course.findMany({
            include: { tee_boxes: true }
        });
    } catch (error) {
        console.error('Failed to fetch courses:', error);
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-3">
            <div className="max-w-md w-full bg-white p-3 rounded-lg shadow-md">
                <h1 className="text-2xl font-bold mb-6 text-center">Post a Score</h1>

                <form action={postScore} className="space-y-4">

                    {/* Player Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Player</label>
                        <select
                            name="playerId"
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                        >
                            <option value="">Select Player</option>
                            {players.map((p: any) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Date</label>
                        <input
                            type="date"
                            name="date"
                            required
                            defaultValue={getTodayLocal()}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                        />
                    </div>

                    {/* Course Selection (Ideally dynamic Tees based on Course, but simplified here) */}
                    {/* We'll iterate groups: Course Name -> Tee Options */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Course & Tee</label>
                        <select
                            name="teeBoxId" // We need TeeBox ID ultimately
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                        >
                            <option value="">Select Tee</option>
                            {courses.map((course: any) => (
                                <optgroup key={course.id} label={course.name}>
                                    {course.tee_boxes.map((tee: any) => (
                                        <option key={tee.id} value={tee.id}>
                                            {course.name} - {tee.name} ({tee.rating}/{tee.slope})
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                        {/* Hidden Course ID input? 
                 Actually, we can find Course ID from Tee Box if needed, 
                 but our action expects courseId. We can hack it by storing courseId in option value 
                 or just finding specific course for that tee in action.
                 
                 Let's simplify: We will just pass teeBoxId to action, and action will look up tee_box includes course.
                 Wait, my action code expected `courseId`. Let's fix action or pass it here.
                 
                 Easiest: Just use client Javascript to set hidden field, OR simpler:
                 Action looks up TeeBox -> gets Course ID.
             */}
                    </div>

                    {/* Score */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700">Gross</label>
                            <input
                                type="number"
                                name="score"
                                required
                                min="50" max="150"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700">Points</label>
                            <input
                                type="number"
                                name="points"
                                step="0.5"
                                defaultValue="0"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700">Payout ($)</label>
                            <input
                                type="number"
                                name="payout"
                                step="0.01"
                                defaultValue="0.00"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                            />
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        className="w-full flex justify-center py-2 px-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                        Post Score
                    </button>

                    <Link href="/players" className="block text-center text-sm text-gray-500 mt-4 hover:underline">
                        Cancel
                    </Link>
                </form>
            </div>
        </div>
    );
}
