const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

const targetStr = 'const prisma = new PrismaClient();';
const newStr = `import { prismaClient as prisma } from 'src/prisma/client';`;

let count = 0;
walkDir(path.join(__dirname, 'src'), (filePath) => {
  if (filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Auth service had our temporary fix with datasources
    if (filePath.includes('auth.service.ts')) {
      const regex = /const prisma = new PrismaClient\(\{\s*datasources: \{\s*db: \{ url: process\.env\.DATABASE_URL \|\| 'postgres:\/\/localhost:5432\/campusverse' \},\s*\},\s*\} as any\);/g;
      if (regex.test(content)) {
        content = content.replace(regex, newStr);
        fs.writeFileSync(filePath, content, 'utf-8');
        count++;
        return;
      }
    }

    if (content.includes(targetStr)) {
      content = content.replace(targetStr, newStr);
      fs.writeFileSync(filePath, content, 'utf-8');
      count++;
    }
  }
});

console.log(`Updated ${count} files.`);
