import { eq } from "drizzle-orm";
import { db } from "@/database/client";
import type { DrizzleExecutor } from "@/database/database.types";
import { categories } from "@/database/schema";

export const categoriesRepository = {
  findAll(executor: DrizzleExecutor = db) {
    return executor.select().from(categories).orderBy(categories.name).all();
  },

  findByName(name: string, executor: DrizzleExecutor = db) {
    return executor.select().from(categories).where(eq(categories.name, name)).get();
  },

  insert(name: string, executor: DrizzleExecutor = db) {
    return executor.insert(categories).values({ name, createdAt: new Date() }).returning().get();
  },
};
