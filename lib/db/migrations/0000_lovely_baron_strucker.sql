CREATE TABLE "chats" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"userId" uuid NOT NULL,
	"projectId" uuid,
	"privacy" varchar DEFAULT 'private' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"chatId" uuid NOT NULL,
	"role" varchar NOT NULL,
	"parts" json NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"userId" uuid NOT NULL,
	"files" jsonb[] NOT NULL,
	"prompt" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(64) NOT NULL,
	"password" varchar(64) NOT NULL,
	"isAnonymous" boolean NOT NULL,
	"createdAt" timestamp NOT NULL,
	"signedAt" timestamp NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_chatId_chats_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."chats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chats_user_project_id_idx" ON "chats" USING btree ("userId","projectId","id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "chats_user_ungrouped_id_idx" ON "chats" USING btree ("userId","id" DESC NULLS LAST) WHERE "chats"."projectId" is null;--> statement-breakpoint
CREATE INDEX "messages_chat_id_idx" ON "messages" USING btree ("chatId","id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "projects_user_id_idx" ON "projects" USING btree ("userId","id" DESC NULLS LAST);