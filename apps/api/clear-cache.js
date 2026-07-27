require('dotenv').config({ path: '../../.env' });
const Redis = require('ioredis');

async function main() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const redis = new Redis(redisUrl.startsWith('rediss://') ? redisUrl : redisUrl);
  await redis.del('colleges:all');
  console.log('Cache cleared');
  process.exit(0);
}

main();
