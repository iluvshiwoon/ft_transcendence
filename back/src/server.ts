import Fastify from 'fastify';
import dotenv from 'dotenv';

dotenv.config();

const app = Fastify({
    logger: true,
});

const PORT = parseInt(process.env.BACKEND_PORT || '3001', 10);
const HOST = process.env.BACKEND_HOST || '0.0.0.0';

app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
});

const start = async (): Promise<void> => {
    try {
        await app.listen({ port: PORT, host: HOST });
        // Fastify logs the address automatically via logger: true
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();