// --- Vehicle stock status ---

export type StockStatus = "available" | "sold" | "pending" | "in_transit";

// --- Core interfaces ---

export interface Vehicle {
  vin: string;
  make: string;
  model: string;
  year: number;
  trim: string;
  color: string;
  features: string[];
  msrp: number;
  stockStatus: StockStatus;
  daysOnLot: number;
}

export interface VehicleQuery {
  make?: string;
  model?: string;
  year?: number;
  minPrice?: number;
  maxPrice?: number;
  features?: string[];
}

export interface VehicleMatch {
  vehicle: Vehicle;
  matchScore: number;
  matchReasons: string[];
}

// --- Service interface ---

export interface InventoryService {
  findMatching(query: VehicleQuery): Promise<VehicleMatch[]>;
  getVehicle(vin: string): Promise<Vehicle | null>;
  listAvailable(filters?: Partial<VehicleQuery>): Promise<Vehicle[]>;
}
