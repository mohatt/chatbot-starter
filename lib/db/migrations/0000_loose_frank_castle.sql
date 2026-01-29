CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" uuid NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"password" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billings" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" uuid NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"isAnonymous" boolean DEFAULT false,
	"billingId" uuid NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billingPeriods" (
	"id" uuid PRIMARY KEY NOT NULL,
	"billingId" uuid NOT NULL,
	"tier" varchar NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"chatUsage" numeric(12, 6) DEFAULT 0 NOT NULL,
	"maxChatUsage" numeric(12, 6) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chats" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"userId" uuid NOT NULL,
	"projectId" uuid,
	"privacy" varchar DEFAULT 'private' NOT NULL,
	"isTitlePending" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"chatId" uuid NOT NULL,
	"role" varchar NOT NULL,
	"parts" json NOT NULL,
	"metadata" jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"userId" uuid NOT NULL,
	"prompt" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "configs" (
	"key" varchar(128) NOT NULL,
	"group" varchar(128) NOT NULL,
	"value" jsonb,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "configs_group_key_pk" PRIMARY KEY("group","key")
);
--> statement-breakpoint
CREATE TABLE "cronJobs" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"status" varchar NOT NULL,
	"lockId" uuid,
	"lockedAt" timestamp,
	"completedAt" timestamp,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"mimeType" varchar(128) NOT NULL,
	"size" integer NOT NULL,
	"metadata" jsonb NOT NULL,
	"bucket" varchar NOT NULL,
	"userId" uuid,
	"projectId" uuid,
	"chatId" uuid,
	"messageId" uuid,
	"storageKey" varchar(256) NOT NULL,
	"url" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_billingId_billings_id_fk" FOREIGN KEY ("billingId") REFERENCES "public"."billings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billingPeriods" ADD CONSTRAINT "billingPeriods_billingId_billings_id_fk" FOREIGN KEY ("billingId") REFERENCES "public"."billings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_chatId_chats_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_chatId_chats_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."chats"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_messageId_messages_id_fk" FOREIGN KEY ("messageId") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_userId_idx" ON "accounts" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "sessions_userId_idx" ON "sessions" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "billingPeriods_billingId_idx" ON "billingPeriods" USING btree ("billingId");--> statement-breakpoint
CREATE INDEX "billingPeriods_year_month_idx" ON "billingPeriods" USING btree ("year","month");--> statement-breakpoint
CREATE INDEX "chats_user_project_id_idx" ON "chats" USING btree ("userId","projectId","id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "chats_user_ungrouped_id_idx" ON "chats" USING btree ("userId","id" DESC NULLS LAST) WHERE "chats"."projectId" is null;--> statement-breakpoint
CREATE INDEX "messages_chat_id_idx" ON "messages" USING btree ("chatId","id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "projects_user_id_idx" ON "projects" USING btree ("userId","id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "configs_group_idx" ON "configs" USING btree ("group");--> statement-breakpoint
CREATE INDEX "cronJobs_status_idx" ON "cronJobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "files_user_id_idx" ON "files" USING btree ("userId","id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "files_chat_id_idx" ON "files" USING btree ("chatId","id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "files_message_id_idx" ON "files" USING btree ("messageId","id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "files_project_id_idx" ON "files" USING btree ("projectId","id" DESC NULLS LAST);