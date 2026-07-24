const { execSync } = require('child_process');

const modules = [
  'auth', 'users', 'colleges', 'feed', 'stories', 'reels', 'talent',
  'projects', 'news', 'events', 'clubs', 'marketplace', 'placements',
  'lost-and-found', 'search', 'notifications', 'messaging', 'admin',
  'media', 'moderation'
];

console.log('Generating modules...');
for (const mod of modules) {
  console.log(`Generating module: ${mod}`);
  execSync(`npx @nestjs/cli g module modules/${mod} --no-spec`, { stdio: 'inherit' });
  execSync(`npx @nestjs/cli g controller modules/${mod} --no-spec`, { stdio: 'inherit' });
  execSync(`npx @nestjs/cli g service modules/${mod} --no-spec`, { stdio: 'inherit' });
}
console.log('Finished generating modules.');
