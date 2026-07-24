import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { SearchIndexerService } from './search.indexer.service';

@Module({
  controllers: [SearchController],
  providers: [SearchService, SearchIndexerService],
})
export class SearchModule {}
