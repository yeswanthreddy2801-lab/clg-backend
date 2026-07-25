import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ScanContentDto } from './dto/moderation.dto';
import { ContentModerationProvider } from '../../common/providers/content-moderation.provider';
import { RecommendationProvider } from '../../common/providers/recommendation.provider';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(
    private readonly moderationProvider: ContentModerationProvider,
    private readonly recommendationProvider: RecommendationProvider
  ) {}

  async scanContent(dto: ScanContentDto) {
    this.logger.debug(`Scanning ${dto.targetType} (${dto.targetId})...`);
    
    let isFlagged = false;
    let reason = '';

    if (dto.text) {
      const result = await this.moderationProvider.moderateText(dto.text);
      if (result.flagged) {
        isFlagged = true;
        reason = result.reason || 'Flagged by text moderation model';
      }
    }

    if (!isFlagged && dto.mediaUrl) {
      const result = await this.moderationProvider.moderateImage(dto.mediaUrl);
      if (result.flagged) {
        isFlagged = true;
        reason = result.reason || 'Flagged by image moderation model';
      }
    }

    if (isFlagged) {
      let automodUser = await prisma.user.findFirst({ where: { email: 'automod@campusverse.local' } });
      if (!automodUser) {
        automodUser = await prisma.user.findFirst({ where: { role: 'super_admin' } });
      }

      if (automodUser) {
        // Privacy for messages: do not save the raw text in the report, use a hash.
        let safeReason = `AutoMod Flagged: ${reason}`;
        if (dto.targetType === 'message') {
          const hash = crypto.createHash('sha256').update(dto.text || '').digest('hex');
          safeReason = `AutoMod Flagged Message (Hash: ${hash}). Reason: ${reason}`;
        }

        await prisma.report.create({
          data: {
            reporterId: automodUser.id,
            targetType: dto.targetType,
            targetId: dto.targetId,
            reason: safeReason,
            collegeId: dto.collegeId || null,
            status: dto.collegeId ? 'pending' : 'escalated'
          }
        });
        this.logger.warn(`AutoMod flagged ${dto.targetType} ${dto.targetId}`);
      }
    }

    return { flagged: isFlagged };
  }

  async checkDuplicate(collegeId: string, text: string, type: 'project' | 'story') {
    // Basic duplication check: Fetch recent items of the same type and score them
    let recentItems: any[] = [];
    
    if (type === 'project') {
      recentItems = await prisma.project.findMany({
        where: { collegeId },
        orderBy: { createdAt: 'desc' },
        take: 20
      });
    } else {
      recentItems = await prisma.story.findMany({
        where: { collegeId },
        orderBy: { createdAt: 'desc' },
        take: 20
      });
    }

    for (const item of recentItems) {
      const itemText = type === 'project' ? `${item.title} ${item.description}` : item.content;
      if (!itemText) continue;
      
      const similarity = await this.recommendationProvider.getSimilarityScore(text, itemText);
      if (similarity > 0.9) {
        this.logger.warn(`High duplicate confidence (${similarity}) detected for new ${type}`);
        
        let automodUser = await prisma.user.findFirst({ where: { email: 'automod@campusverse.local' } });
        if (!automodUser) {
          automodUser = await prisma.user.findFirst({ where: { role: 'super_admin' } });
        }
        if (automodUser) {
           await prisma.report.create({
            data: {
              reporterId: automodUser.id,
              targetType: type,
              targetId: type === 'project' ? item.id : item.id, // Simplification
              reason: `AutoMod: High duplicate confidence (${similarity}) detected with new content`,
              collegeId: collegeId,
              status: 'pending'
            }
          });
        }

        return { isDuplicate: true, similarToId: item.id, confidence: similarity };
      }
    }

    return { isDuplicate: false };
  }
}
