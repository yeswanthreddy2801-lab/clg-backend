import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { SearchModule } from '../search/search.module';
import { ModerationModule } from '../moderation/moderation.module';

@Module({
  imports: [SearchModule, ModerationModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
})
export class ProjectsModule {}
