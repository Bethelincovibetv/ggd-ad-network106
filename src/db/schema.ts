import { pgTable, text, integer } from 'drizzle-orm/pg-core';

export const airtimeRedemptions = pgTable('airtime_redemptions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  userEmail: text('user_email'),
  network: text('network').notNull(),
  planId: text('plan_id').notNull(),
  phoneNumber: text('phone_number').notNull(),
  amountNgn: integer('amount_ngn').notNull(),
  creditsDeducted: integer('credits_deducted').notNull(),
  reference: text('reference').notNull().unique(),
  apiStatusCode: text('api_status_code'),
  status: text('status').notNull().default('pending'),
  apiResponse: text('api_response'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const sabussApiConfigs = pgTable('sabuss_api_configs', {
  id: text('id').primaryKey(),
  apiKey: text('api_key').notNull(),
  apiPin: text('api_pin').notNull().default('0000'),
  isActive: text('is_active').notNull().default('true'),
  minAmount: integer('min_amount').notNull().default(100),
  maxAmount: integer('max_amount').notNull().default(10000),
  environment: text('environment').notNull().default('production'),
  updatedAt: text('updated_at').notNull(),
});

export const chatMessages = pgTable('chat_messages', {
  id: text('id').primaryKey(),
  senderId: text('sender_id').notNull(),
  receiverId: text('receiver_id').notNull(),
  message: text('message'),
  imageUrl: text('image_url'),
  taskId: text('task_id'),
  kind: text('kind').default('text'),
  isRead: text('is_read').default('false'),
  createdAt: text('created_at').notNull(),
});

export const chatImages = pgTable('chat_images', {
  id: text('id').primaryKey(),
  senderId: text('sender_id').notNull(),
  receiverId: text('receiver_id').notNull(),
  imageUrl: text('image_url').notNull(),
  originalName: text('original_name'),
  caption: text('caption'),
  fileSize: integer('file_size'),
  createdAt: text('created_at').notNull(),
});

export const postViews = pgTable('post_views', {
  postId: text('post_id').primaryKey(),
  viewsCount: integer('views_count').notNull().default(0),
  uniqueViewers: text('unique_viewers'),
  lastViewedAt: text('last_viewed_at').notNull(),
});
