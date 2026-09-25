import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// The pilot persists a versioned operational snapshot. Production adapters can
// replace this repository without changing the client-side workflow contract.
export const appState = sqliteTable("app_state", {
  id: text("id").primaryKey(),
  payload: text("payload").notNull(),
  version: integer("version").notNull().default(1),
  updatedAt: text("updated_at").notNull(),
});

// Separate from the editable pilot snapshot: clients cannot overwrite decisions.
export const inventoryChecks = sqliteTable("inventory_checks", {
  id: text("id").primaryKey(),
  orderItem: text("order_item").notNull().unique(),
  payload: text("payload").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull(),
});

// Frontline product feedback stays separate from transactional order state so
// pilot resets never erase the associate voice or its review history.
export const associateFeedback = sqliteTable("associate_feedback", {
  id: text("id").primaryKey(),
  area: text("area").notNull(),
  status: text("status").notNull().default("reported"),
  impact: text("impact").notNull(),
  minutesLost: integer("minutes_lost").notNull().default(0),
  payload: text("payload").notNull(),
  createdAt: text("created_at").notNull(),
});
