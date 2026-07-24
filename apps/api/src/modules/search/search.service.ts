import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@opensearch-project/opensearch';
import Redis from 'ioredis';
import { SearchQueryDto } from './dto/search.dto';

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private osClient: Client;
  private redis: Redis;
  private readonly INDICES = [
    'users', 'projects', 'stories', 'posts', 'news', 'events', 'clubs', 'talent'
  ];

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    this.osClient = new Client({
      node: this.configService.get<string>('OPENSEARCH_URL') || 'http://localhost:9200',
    });

    this.redis = new Redis(this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379');

    await this.initializeIndices();
  }

  private async initializeIndices() {
    for (const index of this.INDICES) {
      const indexName = `college_${index}`;
      try {
        const { body: exists } = await this.osClient.indices.exists({ index: indexName });
        if (!exists) {
          await this.osClient.indices.create({
            index: indexName,
            body: {
              mappings: {
                properties: {
                  collegeId: { type: 'keyword' },
                  // other dynamic properties will map automatically or can be explicitly typed
                }
              }
            }
          });
          this.logger.log(`Created OpenSearch index: ${indexName}`);
        }
      } catch (err) {
        this.logger.error(`Failed to initialize index ${indexName}`, err);
      }
    }
  }

  async search(collegeId: string, query: SearchQueryDto) {
    const { q, type } = query;
    let targetIndices: string[];

    if (type && type !== 'all') {
      targetIndices = [`college_${type}`];
    } else {
      targetIndices = this.INDICES.map(i => `college_${i}`);
    }

    try {
      const { body } = await this.osClient.search({
        index: targetIndices.join(','),
        body: {
          query: {
            bool: {
              must: [
                {
                  multi_match: {
                    query: q,
                    fields: ['*'], // Search all fields
                    fuzziness: 'AUTO'
                  }
                }
              ],
              filter: [
                { term: { collegeId } } // Strict Tenant Scoping
              ]
            }
          }
        }
      });

      // Group results by index if 'all' is selected
      if (type === 'all' || !type) {
        const grouped: Record<string, any[]> = {
          users: [], projects: [], stories: [], posts: [], news: [], events: [], clubs: [], talent: []
        };
        body.hits.hits.forEach((hit: any) => {
          const idxType = hit._index.replace('college_', '');
          if (grouped[idxType]) {
            grouped[idxType].push({ _id: hit._id, ...hit._source });
          }
        });
        return grouped;
      } else {
        return body.hits.hits.map((hit: any) => ({ _id: hit._id, ...hit._source }));
      }
    } catch (err) {
      this.logger.error(`Search error for query: ${q}`, err);
      return type === 'all' ? {} : [];
    }
  }

  async addRecentSearch(userId: string, query: string) {
    const key = `recent_searches:${userId}`;
    const pipeline = this.redis.pipeline();
    // Remove if it exists to bring it to the top
    pipeline.lrem(key, 0, query);
    pipeline.lpush(key, query);
    // Keep only last 10
    pipeline.ltrim(key, 0, 9);
    // Expire in 30 days
    pipeline.expire(key, 30 * 24 * 60 * 60);
    
    await pipeline.exec();
    return { success: true };
  }

  async getRecentSearches(userId: string) {
    const key = `recent_searches:${userId}`;
    return this.redis.lrange(key, 0, 9);
  }

  // Talent Hub methods (Legacy from Phase 6, before Kafka indexer)
  async indexTalentProfile(id: string, profileData: any) {
    const indexName = 'college_talent';
    await this.osClient.index({
      index: indexName,
      id,
      body: profileData
    });
  }

  async searchTalentProfiles(collegeId: string, skills?: string[], keyword?: string) {
    const must: any[] = [];
    if (keyword) {
      must.push({ multi_match: { query: keyword, fields: ['bio', 'skills'] } });
    }
    if (skills && skills.length > 0) {
      must.push({ terms: { 'skills.keyword': skills } });
    }

    try {
      const { body } = await this.osClient.search({
        index: 'college_talent',
        body: {
          query: {
            bool: {
              must,
              filter: [{ term: { collegeId } }]
            }
          }
        }
      });
      return body.hits.hits.map((hit: any) => ({ _id: hit._id, ...hit._source }));
    } catch (e) {
      return [];
    }
  }
}
