import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CollegesModule } from './modules/colleges/colleges.module';
import { FeedModule } from './modules/feed/feed.module';
import { StoriesModule } from './modules/stories/stories.module';
import { ReelsModule } from './modules/reels/reels.module';
import { TalentModule } from './modules/talent/talent.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { NewsModule } from './modules/news/news.module';
import { EventsModule } from './modules/events/events.module';
import { ClubsModule } from './modules/clubs/clubs.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { PlacementsModule } from './modules/placements/placements.module';
import { LostAndFoundModule } from './modules/lost-and-found/lost-and-found.module';

import { SearchModule } from './modules/search/search.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { AdminModule } from './modules/admin/admin.module';
import { MediaModule } from './modules/media/media.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { CommonModule } from './common/common.module';
import { InteractionsModule } from './modules/interactions/interactions.module';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerStorageRedisService } from 'throttler-storage-redis';

@Module({
  imports: [
    ConfigModule, 
    EventEmitterModule.forRoot(), 
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
        const url = new URL(redisUrl);
        return {
          connection: {
            host: url.hostname,
            port: parseInt(url.port) || 6379,
            username: url.username,
            password: url.password,
          },
        };
      },
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [{ ttl: 60, limit: 100 }], // default limit
        storage: new ThrottlerStorageRedisService(config.get('REDIS_URL') || 'redis://localhost:6379'),
      }),
    }),
    CommonModule,
    InteractionsModule,
    AuthModule,
    UsersModule,
    CollegesModule,
    FeedModule,
    StoriesModule,
    ReelsModule,
    TalentModule,
    ProjectsModule,
    NewsModule,
    EventsModule,
    ClubsModule,
    MarketplaceModule,
    PlacementsModule,
    LostAndFoundModule,
    SearchModule,
    NotificationsModule,
    MessagingModule,
    AdminModule,
    MediaModule,
    ModerationModule,
    RecommendationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
