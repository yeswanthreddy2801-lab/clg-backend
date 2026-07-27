import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import * as fs from 'fs';
import * as yaml from 'yaml';
import * as path from 'path';

async function generateOpenApiSpec() {
  const app = await NestFactory.create(AppModule, { logger: false });
  
  const config = new DocumentBuilder()
    .setTitle('CampusVerse API')
    .setDescription('Complete OpenAPI specification for CampusVerse backend')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  
  // Convert JSON document to YAML
  const yamlDocument = yaml.stringify(document);
  
  const outputPath = path.resolve(__dirname, '../docs/api-spec.yaml');
  
  fs.writeFileSync(outputPath, yamlDocument, 'utf8');
  console.log(`Successfully generated OpenAPI spec at ${outputPath}`);
  
  await app.close();
  process.exit(0);
}

generateOpenApiSpec().catch(err => {
  console.error(err);
  process.exit(1);
});
