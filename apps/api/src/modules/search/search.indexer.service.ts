import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Consumer } from 'kafkajs';
import { Client } from '@opensearch-project/opensearch';

@Injectable()
export class SearchIndexerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SearchIndexerService.name);
  private kafka: Kafka;
  private consumer: Consumer;
  private osClient: Client;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    this.logger.warn('Skipping Kafka/OpenSearch initialization for dev speed');
    return;
    
    this.osClient = new Client({
      node: this.configService.get<string>('OPENSEARCH_URL') || 'http://localhost:9200',
    });

    const brokers = this.configService.get<string>('KAFKA_BROKERS') || 'localhost:9092';
    this.kafka = new Kafka({
      clientId: 'search-indexer',
      brokers: brokers.split(','),
    });

    this.consumer = this.kafka.consumer({ groupId: 'search-indexer-group' });
    
    try {
      await this.consumer.connect();
      // Subscribe to all entity creation/update topics
      await this.consumer.subscribe({ topic: 'entity.created', fromBeginning: false });
      await this.consumer.subscribe({ topic: 'entity.updated', fromBeginning: false });

      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          if (!message.value) return;
          try {
            const event = JSON.parse(message.value.toString());
            await this.handleEntityEvent(event);
          } catch (err) {
            this.logger.error(`Error processing Kafka message on ${topic}:`, err);
          }
        },
      });
      this.logger.log('Search Kafka consumer started.');
    } catch (e) {
      this.logger.error('Failed to connect to Kafka (search indexer)', e);
    }
  }

  async onModuleDestroy() {
    try {
      await this.consumer.disconnect();
    } catch (e) {}
  }

  private async handleEntityEvent(event: any) {
    const { entityType, entityId, collegeId, action, payload } = event;
    // entityType should map directly to our indices: users, projects, stories, posts, news, events, clubs
    const indexName = `college_${entityType}`;
    
    if (action === 'created' || action === 'updated') {
      await this.osClient.index({
        index: indexName,
        id: entityId,
        body: {
          collegeId,
          ...payload
        }
      });
      this.logger.debug(`Indexed ${entityType} ${entityId} into ${indexName}`);
    } else if (action === 'deleted') {
      try {
        await this.osClient.delete({
          index: indexName,
          id: entityId,
        });
        this.logger.debug(`Deleted ${entityType} ${entityId} from ${indexName}`);
      } catch (err: any) {
        if (err.meta?.statusCode !== 404) {
          throw err;
        }
      }
    }
  }
}
