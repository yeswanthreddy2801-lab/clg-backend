import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Client } from '@opensearch-project/opensearch';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private client: Client;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const node = this.configService.get<string>('OPENSEARCH_URL') || 'http://localhost:9200';
    this.client = new Client({ node });

    try {
      const exists = await this.client.indices.exists({ index: 'talent_profiles' });
      if (!exists.body) {
        await this.client.indices.create({
          index: 'talent_profiles',
          body: {
            mappings: {
              properties: {
                userId: { type: 'keyword' },
                collegeId: { type: 'keyword' },
                bio: { type: 'text' },
                skills: { type: 'keyword' },
                hourlyRate: { type: 'float' },
              },
            },
          },
        });
        this.logger.log('Created talent_profiles index');
      }
    } catch (e) {
      this.logger.error('Failed to connect to OpenSearch or create index', e);
    }
  }

  async indexTalentProfile(id: string, body: any) {
    return this.client.index({
      index: 'talent_profiles',
      id,
      body,
      refresh: true,
    });
  }

  async searchTalentProfiles(collegeId: string, skills?: string[], keyword?: string) {
    const must: any[] = [{ term: { collegeId } }];

    if (skills && skills.length > 0) {
      must.push({
        terms: { skills },
      });
    }

    if (keyword) {
      must.push({
        match: { bio: keyword },
      });
    }

    const { body } = await this.client.search({
      index: 'talent_profiles',
      body: {
        query: {
          bool: { must },
        },
      },
    });

    return body.hits.hits.map((hit: any) => hit._source);
  }
}
