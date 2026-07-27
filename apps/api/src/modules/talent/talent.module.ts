import { Module } from '@nestjs/common';
import { TalentService } from './talent.service';
import { TalentController } from './talent.controller';

import { SearchModule } from '../search/search.module';

@Module({
  imports: [SearchModule],
  controllers: [TalentController],
  providers: [TalentService],
})
export class TalentModule {}
