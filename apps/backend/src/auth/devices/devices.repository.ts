import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DRIZZLE_CLIENT } from "../../database/database.constants";
import type { Database } from "../../database/database.types";
import { devices } from "../../database/schema";
import type { DeviceStatus, DeviceType } from "./devices.types";

export interface NewDeviceRecord {
  id: string;
  name: string;
  type: DeviceType;
  credentialHash: string;
}

@Injectable()
export class DevicesRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  insert(data: NewDeviceRecord) {
    return this.db
      .insert(devices)
      .values({ ...data, status: "active", createdAt: new Date() })
      .returning()
      .get();
  }

  findByCredentialHash(credentialHash: string) {
    return this.db.select().from(devices).where(eq(devices.credentialHash, credentialHash)).get();
  }

  /** Cantidad de dispositivos activos — usado para decidir si el bootstrap sigue disponible. */
  countActive(): number {
    return this.db.select().from(devices).where(eq(devices.status, "active")).all().length;
  }

  updateLastSeen(id: string, date: Date) {
    this.db.update(devices).set({ lastSeenAt: date }).where(eq(devices.id, id)).run();
  }

  updateStatus(id: string, status: DeviceStatus) {
    this.db.update(devices).set({ status }).where(eq(devices.id, id)).run();
  }
}
