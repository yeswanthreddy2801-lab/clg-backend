import { Module } from '@nestjs/common';
import { LostAndFoundService } from './lost-and-found.service';
import { LostAndFoundController } from './lost-and-found.controller';

@Module({
  controllers: [LostAndFoundController],
  providers: [LostAndFoundService],
})
export class LostAndFoundModule {}
