import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';

import { prismaClient as prisma } from 'src/prisma/client';

@Processor('media-processing')
export class MediaProcessor extends WorkerHost {
  private readonly logger = new Logger(MediaProcessor.name);
  private s3Client: S3Client;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    super();
    this.bucketName = this.configService.get<string>('S3_BUCKET_NAME') || 'campusverse-media';
    this.s3Client = new S3Client({
      region: this.configService.get<string>('AWS_REGION') || 'us-east-1',
      endpoint: this.configService.get<string>('AWS_S3_ENDPOINT') || 'http://localhost:9000',
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') || 'minioadmin',
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || 'minioadmin',
      },
      forcePathStyle: true,
    });
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing media job: ${job.id}`);

    const { mediaId, objectKey } = job.data;

    try {
      const getCommand = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: objectKey,
      });

      const response = await this.s3Client.send(getCommand);
      
      // Convert stream to buffer
      const streamToBuffer = async (stream: any): Promise<Buffer> => {
        return new Promise((resolve, reject) => {
          const chunks: any[] = [];
          stream.on('data', (chunk: any) => chunks.push(chunk));
          stream.on('error', reject);
          stream.on('end', () => resolve(Buffer.concat(chunks)));
        });
      };

      const buffer = await streamToBuffer(response.Body);

      // Create thumbnail
      const thumbBuffer = await sharp(buffer)
        .resize({ width: 300 })
        .webp({ quality: 80 })
        .toBuffer();

      const thumbObjectKey = objectKey.replace(/\.[^/.]+$/, "") + '_thumb.webp';

      const putCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: thumbObjectKey,
        Body: thumbBuffer,
        ContentType: 'image/webp',
      });

      await this.s3Client.send(putCommand);

      const thumbUrl = `${this.configService.get<string>('AWS_S3_ENDPOINT') || 'http://localhost:9000'}/${this.bucketName}/${thumbObjectKey}`;

      await prisma.media.update({
        where: { id: mediaId },
        data: { thumbnailUrl: thumbUrl },
      });

      this.logger.log(`Successfully generated thumbnail for media ${mediaId}`);
      return { success: true, thumbnailUrl: thumbUrl };
    } catch (error) {
      this.logger.error(`Error processing media ${mediaId}:`, error);
      throw error;
    }
  }
}
