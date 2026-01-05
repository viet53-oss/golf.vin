
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Edit } from 'lucide-react';

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const course = await prisma.course.findUnique({
        where: { id },
        include: {
            tee_boxes: { orderBy: { name: 'desc' } }, // Usually standard
            holes: { orderBy: { hole_number: 'asc' } }
        }
    });

    if (!course) notFound();

    // Group holes by Front/Back
    const frontNine = course.holes.filter((h: any) => h.hole_number <= 9);
    const backNine = course.holes.filter((h: any) => h.hole_number > 9);

    const frontPar = frontNine.reduce((sum: number, h: any) => sum + h.par, 0);
    const backPar = backNine.reduce((sum: number, h: any) => sum + h.par, 0);
    const totalPar = frontPar + backPar;

    return (
        <div className="min-h-screen bg-white p-6 md:p-12 font-sans text-gray-900">
            {/* Header */}
            <div className="max-w-5xl mx-auto mb-8 flex items-center justify-end">
                <Link href="/settings" className="flex items-center gap-2 text-sm font-bold bg-white border border-gray-300 px-1 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                    Home
                </Link>
            </div>

            <div className="max-w-5xl mx-auto border border-black rounded-lg p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">

                {/* Title Section */}
                <div className="flex justify-between items-start mb-8">
                    <h1 className="text-4xl font-extrabold tracking-tight">{course.name}</h1>
                    <Link
                        href={`/settings/course/${course.id}/edit`}
                        className="flex items-center gap-2 text-sm font-bold bg-white border border-gray-300 px-1 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Edit <Edit className="w-3 h-3" />
                    </Link>
                </div>

                {/* Tee Boxes Summary */}
                <div className="space-y-8">
                    {course.tee_boxes.map((tee: any) => (
                        <div key={tee.id} className="space-y-4">
                            <h2 className="text-2xl font-bold border-b-2 border-gray-100 pb-2">
                                {tee.name} Tees
                            </h2>

                            {/* Stats Row */}
                            <div className="grid grid-cols-3 bg-gray-50 rounded-lg p-4 mb-4">
                                <div>
                                    <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">Course Rating</div>
                                    <div className="text-xl font-bold">{tee.rating.toFixed(1)}</div>
                                </div>
                                <div>
                                    <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">Slope Rating</div>
                                    <div className="text-xl font-bold">{Math.round(tee.slope)}</div>
                                </div>
                                <div>
                                    <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">Total Par</div>
                                    <div className="text-xl font-bold">{totalPar}</div>
                                </div>
                            </div>

                            {/* Scorecard Table - Front 9 */}
                            <div className="mb-6">
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">Front Nine</h3>
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    <table className="w-full text-center text-sm">
                                        <thead className="bg-gray-100 font-bold text-gray-700">
                                            <tr>
                                                <th className="py-2 w-24 text-left pl-1">Hole</th>
                                                {frontNine.map((h: any) => <th key={h.id} className="py-2 border-l border-gray-200">{h.hole_number}</th>)}
                                                <th className="py-2 border-l border-gray-200 bg-gray-200">OUT</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            <tr>
                                                <td className="py-3 font-bold text-left pl-1">Par</td>
                                                {frontNine.map((h: any) => <td key={h.id} className="py-3 border-l border-gray-200">{h.par}</td>)}
                                                <td className="py-3 border-l border-gray-200 font-bold bg-gray-50">{frontPar}</td>
                                            </tr>
                                            <tr>
                                                <td className="py-3 font-bold text-left pl-1 text-gray-500">Hardness</td>
                                                {frontNine.map((h: any) => <td key={h.id} className="py-3 border-l border-gray-200 text-gray-500">{h.difficulty ?? '-'}</td>)}
                                                <td className="py-3 border-l border-gray-200 bg-gray-50">-</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Scorecard Table - Back 9 */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">Back Nine</h3>
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    <table className="w-full text-center text-sm">
                                        <thead className="bg-gray-100 font-bold text-gray-700">
                                            <tr>
                                                <th className="py-2 w-24 text-left pl-1">Hole</th>
                                                {backNine.map((h: any) => <th key={h.id} className="py-2 border-l border-gray-200">{h.hole_number}</th>)}
                                                <th className="py-2 border-l border-gray-200 bg-gray-200">IN</th>
                                                <th className="py-2 border-l border-gray-200 bg-gray-300">TOT</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            <tr>
                                                <td className="py-3 font-bold text-left pl-1">Par</td>
                                                {backNine.map((h: any) => <td key={h.id} className="py-3 border-l border-gray-200">{h.par}</td>)}
                                                <td className="py-3 border-l border-gray-200 font-bold bg-gray-50">{backPar}</td>
                                                <td className="py-3 border-l border-gray-200 font-bold bg-gray-100">{totalPar}</td>
                                            </tr>
                                            <tr>
                                                <td className="py-3 font-bold text-left pl-1 text-gray-500">Hardness</td>
                                                {backNine.map((h: any) => <td key={h.id} className="py-3 border-l border-gray-200 text-gray-500">{h.difficulty ?? '-'}</td>)}
                                                <td className="py-3 border-l border-gray-200 bg-gray-50">-</td>
                                                <td className="py-3 border-l border-gray-200 bg-gray-100">-</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>


                        </div>
                    ))}

                    {course.tee_boxes.length === 0 && <p className="text-gray-500">No tee boxes defined.</p>}
                </div>
            </div>
        </div>
    );
}
