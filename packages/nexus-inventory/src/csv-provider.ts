import { readFile } from "node:fs/promises";
import type {
  InventoryService,
  Vehicle,
  VehicleMatch,
  VehicleQuery,
  StockStatus,
} from "./types.js";

// --- Constants ---

const TOP_MATCHES = 3;
const EXACT_MAKE_MODEL_SCORE = 0.5;
const EXACT_MAKE_SCORE = 0.25;
const EXACT_YEAR_SCORE = 0.15;
const CLOSE_YEAR_SCORE = 0.08;
const FEATURE_MATCH_BONUS = 0.05;
const MAX_FEATURE_BONUS = 0.2;

const VALID_STOCK_STATUSES: ReadonlySet<string> = new Set([
  "available",
  "sold",
  "pending",
  "in_transit",
]);

// --- CSV Parsing ---

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i]!;
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseVehicleRow(fields: string[]): Vehicle | null {
  if (fields.length < 10) {
    return null;
  }

  const vin = fields[0]!;
  const make = fields[1]!;
  const model = fields[2]!;
  const year = parseInt(fields[3]!, 10);
  const trim = fields[4]!;
  const color = fields[5]!;
  const rawFeatures = fields[6]!;
  const msrp = parseFloat(fields[7]!);
  const rawStatus = fields[8]!.toLowerCase();
  const daysOnLot = parseInt(fields[9]!, 10);

  if (!vin || !make || !model || isNaN(year) || isNaN(msrp) || isNaN(daysOnLot)) {
    return null;
  }

  const stockStatus: StockStatus = VALID_STOCK_STATUSES.has(rawStatus)
    ? (rawStatus as StockStatus)
    : "available";

  const features = rawFeatures
    ? rawFeatures
        .split("|")
        .map((f) => f.trim())
        .filter((f) => f.length > 0)
    : [];

  return {
    vin,
    make,
    model,
    year,
    trim,
    color,
    features,
    msrp,
    stockStatus,
    daysOnLot,
  };
}

// --- Scoring ---

function scoreVehicle(vehicle: Vehicle, query: VehicleQuery): VehicleMatch | null {
  let score = 0;
  const reasons: string[] = [];

  const makeMatch =
    query.make !== undefined &&
    vehicle.make.toLowerCase() === query.make.toLowerCase();
  const modelMatch =
    query.model !== undefined &&
    vehicle.model.toLowerCase() === query.model.toLowerCase();

  if (makeMatch && modelMatch) {
    score += EXACT_MAKE_MODEL_SCORE;
    reasons.push(`Exact make/model match: ${vehicle.make} ${vehicle.model}`);
  } else if (makeMatch) {
    score += EXACT_MAKE_SCORE;
    reasons.push(`Make match: ${vehicle.make}`);
  }

  if (query.year !== undefined) {
    if (vehicle.year === query.year) {
      score += EXACT_YEAR_SCORE;
      reasons.push(`Exact year match: ${vehicle.year}`);
    } else if (Math.abs(vehicle.year - query.year) <= 1) {
      score += CLOSE_YEAR_SCORE;
      reasons.push(`Close year: ${vehicle.year} (wanted ${query.year})`);
    }
  }

  if (query.features && query.features.length > 0) {
    const vehicleFeaturesLower = vehicle.features.map((f) => f.toLowerCase());
    let featureBonus = 0;
    for (const wanted of query.features) {
      const wantedLower = wanted.toLowerCase();
      if (vehicleFeaturesLower.some((f) => f.includes(wantedLower))) {
        featureBonus += FEATURE_MATCH_BONUS;
        reasons.push(`Feature match: ${wanted}`);
      }
    }
    score += Math.min(featureBonus, MAX_FEATURE_BONUS);
  }

  // Price filter — exclude vehicles outside range entirely
  if (query.minPrice !== undefined && vehicle.msrp < query.minPrice) {
    return null;
  }
  if (query.maxPrice !== undefined && vehicle.msrp > query.maxPrice) {
    return null;
  }

  if (score === 0 && reasons.length === 0) {
    return null;
  }

  // Clamp score to [0, 1]
  const clampedScore = Math.min(score, 1);

  return {
    vehicle,
    matchScore: Math.round(clampedScore * 100) / 100,
    matchReasons: reasons,
  };
}

// --- Provider ---

export class CsvInventoryProvider implements InventoryService {
  private vehicles: Vehicle[] = [];
  private loaded = false;
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async load(): Promise<void> {
    const content = await readFile(this.filePath, "utf-8");
    const lines = content.split("\n").filter((line) => line.trim().length > 0);

    // Skip header row
    const dataLines = lines.slice(1);
    this.vehicles = [];

    for (const line of dataLines) {
      const fields = parseCsvLine(line);
      const vehicle = parseVehicleRow(fields);
      if (vehicle !== null) {
        this.vehicles.push(vehicle);
      }
    }

    this.loaded = true;
  }

  private ensureLoaded(): void {
    if (!this.loaded) {
      throw new Error(
        "CsvInventoryProvider not loaded. Call load() before using the service.",
      );
    }
  }

  private getAvailable(): Vehicle[] {
    return this.vehicles.filter((v) => v.stockStatus === "available");
  }

  async findMatching(query: VehicleQuery): Promise<VehicleMatch[]> {
    this.ensureLoaded();

    const available = this.getAvailable();
    const matches: VehicleMatch[] = [];

    for (const vehicle of available) {
      const match = scoreVehicle(vehicle, query);
      if (match !== null) {
        matches.push(match);
      }
    }

    matches.sort((a, b) => b.matchScore - a.matchScore);
    return matches.slice(0, TOP_MATCHES);
  }

  async getVehicle(vin: string): Promise<Vehicle | null> {
    this.ensureLoaded();
    return this.vehicles.find((v) => v.vin === vin) ?? null;
  }

  async listAvailable(filters?: Partial<VehicleQuery>): Promise<Vehicle[]> {
    this.ensureLoaded();

    let results = this.getAvailable();

    if (!filters) {
      return results;
    }

    if (filters.make !== undefined) {
      const makeLower = filters.make.toLowerCase();
      results = results.filter((v) => v.make.toLowerCase() === makeLower);
    }

    if (filters.model !== undefined) {
      const modelLower = filters.model.toLowerCase();
      results = results.filter((v) => v.model.toLowerCase() === modelLower);
    }

    if (filters.year !== undefined) {
      results = results.filter((v) => v.year === filters.year);
    }

    if (filters.minPrice !== undefined) {
      const min = filters.minPrice;
      results = results.filter((v) => v.msrp >= min);
    }

    if (filters.maxPrice !== undefined) {
      const max = filters.maxPrice;
      results = results.filter((v) => v.msrp <= max);
    }

    if (filters.features && filters.features.length > 0) {
      const wantedFeatures = filters.features.map((f) => f.toLowerCase());
      results = results.filter((v) => {
        const vehicleFeaturesLower = v.features.map((f) => f.toLowerCase());
        return wantedFeatures.some((wf) =>
          vehicleFeaturesLower.some((vf) => vf.includes(wf)),
        );
      });
    }

    return results;
  }
}
