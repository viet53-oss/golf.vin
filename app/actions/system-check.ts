'use server'

export async function systemCheck() {
    const dbUrl = process.env.DATABASE_URL || '';
    const hasPgbouncer = dbUrl.includes('pgbouncer=true');
    const port = dbUrl.match(/:(\d+)\//)?.[1];

    return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        env: {
            nodeEnv: process.env.NODE_ENV,
            hasDbUrl: !!dbUrl,
            dbUrlAnalysis: {
                length: dbUrl.length,
                port: port,
                hasPgbouncer: hasPgbouncer,
                protocol: dbUrl.split(':')[0],
                host: dbUrl.split('@')[1]?.split(':')[0] || 'unknown'
            }
        }
    };
}
