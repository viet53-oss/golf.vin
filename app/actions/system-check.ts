'use server'

export async function systemCheck() {
    console.log("SYSTEM CHECK: Function called");
    return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        env: {
            nodeEnv: process.env.NODE_ENV,
            hasDbUrl: !!process.env.DATABASE_URL
        }
    };
}
