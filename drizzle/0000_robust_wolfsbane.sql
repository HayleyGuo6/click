CREATE TABLE `recordings` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`object_key` text NOT NULL,
	`mime` text NOT NULL,
	`transcript` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `recordings_owner` ON `recordings` (`owner`);--> statement-breakpoint
CREATE TABLE `scenes` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`direction` text NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `scenes_owner_time` ON `scenes` (`owner`,`created_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`scene_id` text NOT NULL,
	`title` text NOT NULL,
	`direction` text NOT NULL,
	`status` text NOT NULL,
	`mode` text NOT NULL,
	`data` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sessions_owner_time` ON `sessions` (`owner`,`updated_at`);--> statement-breakpoint
CREATE INDEX `sessions_owner_scene` ON `sessions` (`owner`,`scene_id`);