# CampusVerse Entity Relationship Diagram (ERD)

This document provides a conceptual overview of the database schema for the CampusVerse platform.

## Multi-Tenancy Invariant

The core invariant of this schema is **Multi-Tenancy per College**. Almost every user-generated content table includes a `collegeId` foreign key to the `College` table. This ensures data isolation at the query layer.

## Core Entities

- **College**: The root tenant entity (`id`, `name`, `domain`, `status`).
- **User**: Represents all platform actors (`id`, `collegeId`, `email`, `role`).
- **Follow**: A self-referential many-to-many relationship tracking who follows whom (`followerId`, `followingId`).

## Social Feed (Polymorphic Pattern)

We use a pseudo-polymorphic pattern for shared social interactions (Likes, Comments, Mentions) via `targetType` and `targetId` fields, allowing a single `Like` table to serve Posts, Stories, Projects, etc.

- **Post**: Main feed posts (`type`, `content`, `authorId`, `collegeId`).
- **PostMedia**: Associated media for posts.
- **Hashtag** & **PostHashtag**: Many-to-many relationship for tracking trending tags.
- **Like**: Tracks engagement (`targetType`, `targetId`, `userId`).
- **Comment**: Supports nested replies via `parentCommentId` (`targetType`, `targetId`, `userId`, `content`).

## Content Modules

- **Stories**: Long-form written content. Includes `Story`, `StoryChapter`, `StoryBookmark`, and `StoryView` to track engagement and read progress.
- **Reels**: Short-form vertical video. Includes `Reel` and `ReelView`.
- **Talent Hub**: `TalentEntry` (user submissions), `TalentCompetition` (college-run events), and `TalentSubmission` (link between entry and competition).
- **Projects**: `Project` (student work), `ProjectMedia`, `ProjectTeamMember` (link to multiple users), and `ProjectTechnology` (tech stack).

## Campus Life

- **NewsPost**: Official college announcements (`publishedByAdminId`, `isPinned`).
- **Event**: College or club events (`startsAt`, `venue`). Includes `EventInterest` for RSVPs.
- **Club**: Student organizations. Includes `ClubMembership` (roles within club) and `ClubRecruitmentPost`/`ClubRecruitmentApplication` for hiring.

## Hubs

- **MarketplaceListing**: Buy/sell items (`price`, `condition`, `status`).
- **PlacementExperience**: Interview and job experiences (`company`, `verdict`, `roundsJson`). Includes `PlacementUpvote`.
- **LostFoundReport**: Lost and found items (`type`, `location`, `status`).

## Communication & Audit

- **Notification**: Real-time alerts (`type`, `targetId`, `isRead`).
- **Messaging**: `Conversation`, `ConversationParticipant`, `Message`, and `MessageReceipt` for real-time chat (WebSocket integration in Phase 12).
- **Report**: Moderation queues for flagged content (`targetType`, `targetId`, `reason`, `status`).
- **AuditLog**: Immutable log of critical actions, especially cross-tenant actions by super admins (`action`, `metadataJson`).
