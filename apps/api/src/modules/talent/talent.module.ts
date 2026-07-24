import { Module } from '@nestjs/common';
import { TalentService } from './talent.service';
import { TalentController } from './talent.controller';

@Module({
  controllers: [TalentController],
  providers: [TalentService],
})
export class TalentModule {}
