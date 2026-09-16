import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import { DRIZZLE_CLIENT } from "../../database/database.constants";
import type { Database } from "../../database/database.types";
import { devices } from "../../database/schema";
import type { DeviceStatus, DeviceType } from "./devices.types";

export interface NewDeviceRecord {
  id: string;
  name: string;
  type: DeviceType;
  credentialHash: string;
  isAdmin?: boolean;
}

@Injectable()
export class DevicesRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  insert(data: NewDeviceRecord) {
    return this.db
      .insert(devices)
      .values({ ...data, isAdmin: data.isAdmin ?? false, status: "active", createdAt: new Date() })
      .returning()
      .get();
  }

  findById(id: string) {
    return this.db.select().from(devices).where(eq(devices.id, id)).get();
  }

  findAll() {
    return this.db.select().from(devices).orderBy(desc(devices.createdAt)).all();
  }

  findByCredentialHash(credentialHash: string) {
    return this.db.select().from(devices).where(eq(devices.credentialHash, credentialHash)).get();
  }

  /** Cantidad de dispositivos activos — usado para decidir si el bootstrap sigue disponible. */
  countActive(): number {
    return this.db.select().from(devices).where(eq(devices.status, "active")).all().length;
  }

  /** Usado para impedir dejar la instalación sin ningún dispositivo administrador activo. */
  countActiveAdmins(): number {
    return this.db
      .select()
      .from(devices)
      .where(and(eq(devices.status, "active"), eq(devices.isAdmin, true)))
      .all().length;
  }

  updateLastSeen(id: string, date: Date) {
    this.db.update(devices).set({ lastSeenAt: date }).where(eq(devices.id, id)).run();
  }

  updateStatus(id: string, status: DeviceStatus) {
    this.db.update(devices).set({ status }).where(eq(devices.id, id)).run();
  }

  updateName(id: string, name: string) {
    this.db.update(devices).set({ name }).where(eq(devices.id, id)).run();
  }

  updateSellerName(id: string, sellerName: string) {
    this.db.update(devices).set({ sellerName }).where(eq(devices.id, id)).run();
  }
}
