import { Module } from '@nestjs/common';
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

@Module({
  imports: [ConfigModule, AuthModule, UsersModule, CollegesModule, FeedModule, StoriesModule, ReelsModule, TalentModule, ProjectsModule, NewsModule, EventsModule, ClubsModule, MarketplaceModule, PlacementsModule, LostAndFoundModule, SearchModule, NotificationsModule, MessagingModule, AdminModule, MediaModule, ModerationModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
