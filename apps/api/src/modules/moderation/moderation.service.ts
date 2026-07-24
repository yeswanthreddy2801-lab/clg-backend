import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ScanContentDto } from './dto/moderation.dto';

const prisma = new PrismaClient();

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  // TODO: Phase 14 - Replace this with an actual external call to the ML Python Microservice.
  async scanContent(dto: ScanContentDto) {
    this.logger.debug(`Scanning ${dto.targetType} (${dto.targetId})...`);
    
    // Simplistic heuristic for now
    const flaggedKeywords = ['badword123', 'spam', 'hate', 'illegal'];
    
    let isFlagged = false;
    let reason = '';

    if (dto.text) {
      const lowerText = dto.text.toLowerCase();
      for (const kw of flaggedKeywords) {
        if (lowerText.includes(kw)) {
          isFlagged = true;
          reason = `Found heuristic keyword: ${kw}`;
          break;
        }
      }
    }

    if (isFlagged) {
      // Find a system or automated user to act as the 'reporterId'
      // For simplicity, we just look up the first super_admin or we can create a dummy "SYSTEM_AUTOMOD" user.
      // Alternatively, the schema requires a valid `reporterId`. We'll just grab the first admin for now, or create an AUTOMOD user.
      
      let automodUser = await prisma.user.findFirst({ where: { email: 'automod@campusverse.local' } });
      if (!automodUser) {
        // Fallback to finding any super admin just to satisfy foreign keys
        automodUser = await prisma.user.findFirst({ where: { role: 'super_admin' } });
      }

      if (automodUser) {
        await prisma.report.create({
          data: {
            reporterId: automodUser.id,
            targetType: dto.targetType,
            targetId: dto.targetId,
            reason: `AutoMod Flagged: ${reason}`,
            // If collegeId is null, it goes to super_admin (global escalation).
            // If set, it goes to college_admin queue.
            collegeId: dto.collegeId || null,
            status: dto.collegeId ? 'pending' : 'escalated' // Route appropriately
          }
        });
        this.logger.warn(`AutoMod flagged ${dto.targetType} ${dto.targetId}: ${reason}`);
      }
    }

    return { flagged: isFlagged };
  }
}
