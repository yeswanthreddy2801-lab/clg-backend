import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';
import { RequestUploadDto, ConfirmUploadDto } from './dto/media.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

@Injectable()
export class MediaService {
  private s3Client: S3Client;
  private readonly logger = new Logger(MediaService.name);
  private bucketName: string;

  constructor(
    private configService: ConfigService,
    @InjectQueue('media-processing') private mediaQueue: Queue
  ) {
    this.bucketName = this.configService.get<string>('S3_BUCKET_NAME') || 'campusverse-media';
    this.s3Client = new S3Client({
      region: this.configService.get<string>('AWS_REGION') || 'us-east-1',
      endpoint: this.configService.get<string>('AWS_S3_ENDPOINT') || 'http://localhost:9000',
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') || 'minioadmin',
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || 'minioadmin',
      },
      forcePathStyle: true, // Required for MinIO
    });
  }

  async getPresignedUrl(userId: string, collegeId: string, dto: RequestUploadDto) {
    const allowedMimetypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];
    if (!allowedMimetypes.includes(dto.mimetype)) {
      throw new BadRequestException('Unsupported media type');
    }

    const ext = dto.filename.split('.').pop();
    const objectKey = `${collegeId}/${crypto.randomBytes(16).toString('hex')}.${ext}`;

    const media = await prisma.media.create({
      data: {
        authorId: userId,
        collegeId,
        filename: dto.filename,
        mimetype: dto.mimetype,
        size: dto.size,
        status: 'pending',
      }
    });

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: objectKey,
      ContentType: dto.mimetype,
      ContentLength: dto.size,
    });

    const url = await getSignedUrl(this.s3Client, command, { expiresIn: 300 });

    // Store objectKey temporarily in URL field to track it before confirmation
    await prisma.media.update({
      where: { id: media.id },
      data: { url: objectKey },
    });

    return { mediaId: media.id, presignedUrl: url, objectKey };
  }

  async confirmUpload(userId: string, collegeId: string, dto: ConfirmUploadDto) {
    const media = await prisma.media.findUnique({ where: { id: dto.mediaId } });
    if (!media || media.authorId !== userId) {
      throw new NotFoundException('Media not found');
    }

    if (media.status !== 'pending') {
      throw new BadRequestException('Media already processed');
    }

    const objectKey = media.url; // We temporarily stored the key here

    try {
      const headCommand = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: objectKey,
      });
      await this.s3Client.send(headCommand);
    } catch (e) {
      this.logger.error(e);
      throw new BadRequestException('File not found in S3 bucket. Upload failed or incomplete.');
    }

    const finalUrl = `${this.configService.get<string>('AWS_S3_ENDPOINT') || 'http://localhost:9000'}/${this.bucketName}/${objectKey}`;

    await prisma.media.update({
      where: { id: media.id },
      data: { status: 'ready', url: finalUrl },
    });

    if (media.mimetype.startsWith('image/')) {
      await this.mediaQueue.add('process-image', {
        mediaId: media.id,
        objectKey: objectKey,
      });
    }

    return { success: true, mediaId: media.id, url: finalUrl };
  }
}
