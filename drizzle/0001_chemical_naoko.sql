CREATE TABLE `practice_drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`owner` text NOT NULL,
	`text` text NOT NULL,
	`revision` integer NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `drafts_session_owner` ON `practice_drafts` (`session_id`,`owner`);--> statement-breakpoint
CREATE TABLE `practice_preferences` (
	`owner` text PRIMARY KEY NOT NULL,
	`style` text NOT NULL
);
