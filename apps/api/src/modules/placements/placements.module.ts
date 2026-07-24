import { Module } from '@nestjs/common';
import { PlacementsService } from './placements.service';
import { PlacementsController } from './placements.controller';

@Module({
  controllers: [PlacementsController],
  providers: [PlacementsService],
})
export class PlacementsModule {}
