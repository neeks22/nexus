import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { join } from "node:path";
import { writeFile, mkdir, unlink } from "node:fs/promises";
import {
  CsvInventoryProvider,
  extractHighlights,
  formatForAI,
  addFreshnessQualifier,
  isStale,
} from "../../../packages/nexus-inventory/src/index.js";
import type { Vehicle } from "../../../packages/nexus-inventory/src/index.js";

// --- Fixtures ---

const FIXTURES_DIR = join(
  import.meta.dirname ?? ".",
  "..",
  "..",
  "..",
  "packages",
  "nexus-inventory",
  "fixtures",
);
const SAMPLE_CSV = join(FIXTURES_DIR, "sample-inventory.csv");

const TEMP_DIR = join(import.meta.dirname ?? ".", "__temp__");

// --- Helper to create temp CSV files ---

async function writeTempCsv(filename: string, content: string): Promise<string> {
  await mkdir(TEMP_DIR, { recursive: true });
  const path = join(TEMP_DIR, filename);
  await writeFile(path, content, "utf-8");
  return path;
}

async function cleanupTempFile(path: string): Promise<void> {
  try {
    await unlink(path);
  } catch {
    // Ignore cleanup errors
  }
}

// --- CSV Parsing Tests ---

describe("CsvInventoryProvider", () => {
  describe("CSV parsing", () => {
    it("should parse a valid CSV file", async () => {
      const provider = new CsvInventoryProvider(SAMPLE_CSV);
      await provider.load();

      const all = await provider.listAvailable();
      // Sample has 10 rows: 1 sold, 1 pending, 1 in_transit = 7 available
      expect(all.length).toBe(7);
    });

    it("should handle an empty CSV file (header only)", async () => {
      const path = await writeTempCsv(
        "empty.csv",
        "vin,make,model,year,trim,color,features,msrp,stock_status,days_on_lot\n",
      );
      try {
        const provider = new CsvInventoryProvider(path);
        await provider.load();
        const all = await provider.listAvailable();
        expect(all.length).toBe(0);
      } finally {
        await cleanupTempFile(path);
      }
    });

    it("should skip malformed rows with missing fields", async () => {
      const csv = [
        "vin,make,model,year,trim,color,features,msrp,stock_status,days_on_lot",
        "VIN001,Honda,CR-V,2024,EX-L,White,AWD|Leather,42500,available,12",
        "VIN002,Honda", // Too few fields
        "VIN003,Toyota,RAV4,2024,XLE,Gray,AWD,39800,available,18",
      ].join("\n");

      const path = await writeTempCsv("malformed.csv", csv);
      try {
        const provider = new CsvInventoryProvider(path);
        await provider.load();
        const all = await provider.listAvailable();
        expect(all.length).toBe(2);
      } finally {
        await cleanupTempFile(path);
      }
    });

    it("should throw if load() was not called", async () => {
      const provider = new CsvInventoryProvider(SAMPLE_CSV);
      await expect(provider.listAvailable()).rejects.toThrow("not loaded");
    });
  });

  // --- findMatching Tests ---

  describe("findMatching", () => {
    let provider: CsvInventoryProvider;

    beforeAll(async () => {
      provider = new CsvInventoryProvider(SAMPLE_CSV);
      await provider.load();
    });

    it("should find exact make/model matches with highest scores", async () => {
      const matches = await provider.findMatching({
        make: "Honda",
        model: "CR-V",
      });

      expect(matches.length).toBeGreaterThan(0);
      expect(matches.length).toBeLessThanOrEqual(3);

      for (const match of matches) {
        expect(match.vehicle.make).toBe("Honda");
        expect(match.vehicle.model).toBe("CR-V");
        expect(match.matchScore).toBeGreaterThan(0);
        expect(match.matchReasons.length).toBeGreaterThan(0);
      }
    });

    it("should find partial matches (make only)", async () => {
      const matches = await provider.findMatching({ make: "Toyota" });

      expect(matches.length).toBeGreaterThan(0);
      for (const match of matches) {
        expect(match.vehicle.make).toBe("Toyota");
        expect(match.matchReasons.some((r) => r.includes("Make match"))).toBe(true);
      }
    });

    it("should return empty when no matches found", async () => {
      const matches = await provider.findMatching({
        make: "Ferrari",
        model: "F40",
      });
      expect(matches.length).toBe(0);
    });

    it("should respect price filter", async () => {
      const matches = await provider.findMatching({
        make: "Honda",
        maxPrice: 30000,
      });

      for (const match of matches) {
        expect(match.vehicle.msrp).toBeLessThanOrEqual(30000);
      }
    });

    it("should return top 3 sorted by score", async () => {
      const matches = await provider.findMatching({ make: "Honda" });

      expect(matches.length).toBeLessThanOrEqual(3);

      for (let i = 1; i < matches.length; i++) {
        expect(matches[i - 1]!.matchScore).toBeGreaterThanOrEqual(
          matches[i]!.matchScore,
        );
      }
    });

    it("should boost score for year match", async () => {
      const matchesWithYear = await provider.findMatching({
        make: "Honda",
        model: "CR-V",
        year: 2024,
      });

      const matchesWithoutYear = await provider.findMatching({
        make: "Honda",
        model: "CR-V",
      });

      if (matchesWithYear.length > 0 && matchesWithoutYear.length > 0) {
        expect(matchesWithYear[0]!.matchScore).toBeGreaterThanOrEqual(
          matchesWithoutYear[0]!.matchScore,
        );
      }
    });

    it("should boost score for feature matches", async () => {
      const matchesWithFeatures = await provider.findMatching({
        make: "Honda",
        model: "CR-V",
        features: ["Leather Seats", "AWD"],
      });

      expect(matchesWithFeatures.length).toBeGreaterThan(0);
      // The EX-L trim with leather + AWD should score highest
      const topMatch = matchesWithFeatures[0]!;
      expect(topMatch.matchReasons.some((r) => r.includes("Feature match"))).toBe(
        true,
      );
    });

    it("should only return available vehicles", async () => {
      // VIN004 is sold, VIN007 is pending, VIN010 is in_transit
      const matches = await provider.findMatching({ make: "Honda" });
      for (const match of matches) {
        expect(match.vehicle.stockStatus).toBe("available");
      }
    });
  });

  // --- getVehicle Tests ---

  describe("getVehicle", () => {
    let provider: CsvInventoryProvider;

    beforeAll(async () => {
      provider = new CsvInventoryProvider(SAMPLE_CSV);
      await provider.load();
    });

    it("should find a vehicle by VIN", async () => {
      const vehicle = await provider.getVehicle("1HGCV1F34PA000001");
      expect(vehicle).not.toBeNull();
      expect(vehicle!.make).toBe("Honda");
      expect(vehicle!.model).toBe("CR-V");
      expect(vehicle!.year).toBe(2024);
      expect(vehicle!.trim).toBe("EX-L");
    });

    it("should return null for unknown VIN", async () => {
      const vehicle = await provider.getVehicle("NONEXISTENT_VIN");
      expect(vehicle).toBeNull();
    });

    it("should return vehicles regardless of stock status", async () => {
      // VIN004 is sold — getVehicle should still return it
      const vehicle = await provider.getVehicle("1HGCV1F34PA000004");
      expect(vehicle).not.toBeNull();
      expect(vehicle!.stockStatus).toBe("sold");
    });
  });

  // --- listAvailable Tests ---

  describe("listAvailable", () => {
    let provider: CsvInventoryProvider;

    beforeAll(async () => {
      provider = new CsvInventoryProvider(SAMPLE_CSV);
      await provider.load();
    });

    it("should list all available vehicles without filters", async () => {
      const vehicles = await provider.listAvailable();
      expect(vehicles.length).toBe(7);
      for (const v of vehicles) {
        expect(v.stockStatus).toBe("available");
      }
    });

    it("should filter by make", async () => {
      const vehicles = await provider.listAvailable({ make: "Honda" });
      expect(vehicles.length).toBeGreaterThan(0);
      for (const v of vehicles) {
        expect(v.make).toBe("Honda");
      }
    });

    it("should filter by model", async () => {
      const vehicles = await provider.listAvailable({ model: "CR-V" });
      for (const v of vehicles) {
        expect(v.model).toBe("CR-V");
      }
    });

    it("should filter by year", async () => {
      const vehicles = await provider.listAvailable({ year: 2024 });
      for (const v of vehicles) {
        expect(v.year).toBe(2024);
      }
    });

    it("should filter by price range", async () => {
      const vehicles = await provider.listAvailable({
        minPrice: 30000,
        maxPrice: 40000,
      });
      for (const v of vehicles) {
        expect(v.msrp).toBeGreaterThanOrEqual(30000);
        expect(v.msrp).toBeLessThanOrEqual(40000);
      }
    });

    it("should filter by features", async () => {
      const vehicles = await provider.listAvailable({
        features: ["Leather Seats"],
      });
      expect(vehicles.length).toBeGreaterThan(0);
      for (const v of vehicles) {
        const hasLeather = v.features.some((f) =>
          f.toLowerCase().includes("leather"),
        );
        expect(hasLeather).toBe(true);
      }
    });

    it("should combine multiple filters", async () => {
      const vehicles = await provider.listAvailable({
        make: "Honda",
        year: 2024,
        minPrice: 35000,
      });
      for (const v of vehicles) {
        expect(v.make).toBe("Honda");
        expect(v.year).toBe(2024);
        expect(v.msrp).toBeGreaterThanOrEqual(35000);
      }
    });

    it("should return empty for impossible filters", async () => {
      const vehicles = await provider.listAvailable({
        make: "Ferrari",
      });
      expect(vehicles.length).toBe(0);
    });
  });
});

// --- Feature Extractor Tests ---

describe("Feature Extractor", () => {
  const richVehicle: Vehicle = {
    vin: "TEST001",
    make: "Honda",
    model: "CR-V",
    year: 2024,
    trim: "EX-L",
    color: "Platinum White Pearl",
    features: [
      "Panoramic Roof",
      "Leather Seats",
      "AWD",
      "Heated Seats",
      "Apple CarPlay",
      "Adaptive Cruise Control",
    ],
    msrp: 42500,
    stockStatus: "available",
    daysOnLot: 12,
  };

  const sparseVehicle: Vehicle = {
    vin: "TEST002",
    make: "Honda",
    model: "Civic",
    year: 2024,
    trim: "LX",
    color: "Black",
    features: ["Apple CarPlay"],
    msrp: 24000,
    stockStatus: "available",
    daysOnLot: 30,
  };

  const emptyVehicle: Vehicle = {
    vin: "TEST003",
    make: "Toyota",
    model: "Corolla",
    year: 2024,
    trim: "L",
    color: "White",
    features: [],
    msrp: 22000,
    stockStatus: "available",
    daysOnLot: 45,
  };

  describe("extractHighlights", () => {
    it("should extract up to 3 priority features from a feature-rich vehicle", () => {
      const highlights = extractHighlights(richVehicle);
      expect(highlights.length).toBeGreaterThanOrEqual(1);
      expect(highlights.length).toBeLessThanOrEqual(3);
    });

    it("should prioritize high-value features", () => {
      const highlights = extractHighlights(richVehicle);
      // Panoramic Roof and AWD and Leather are top priority
      const topFeatures = ["Panoramic Roof", "AWD", "Leather Seats"];
      const hasTopFeature = highlights.some((h) =>
        topFeatures.some((t) => h.includes(t)),
      );
      expect(hasTopFeature).toBe(true);
    });

    it("should return whatever is available for sparse vehicles", () => {
      const highlights = extractHighlights(sparseVehicle);
      expect(highlights.length).toBeGreaterThanOrEqual(1);
      expect(highlights[0]).toBe("Apple CarPlay");
    });

    it("should return empty array for vehicle with no features", () => {
      const highlights = extractHighlights(emptyVehicle);
      expect(highlights.length).toBe(0);
    });
  });

  describe("formatForAI", () => {
    it("should format a full vehicle description", () => {
      const result = formatForAI(richVehicle);
      expect(result).toContain("2024 Honda CR-V");
      expect(result).toContain("EX-L");
      expect(result).toContain("Platinum White Pearl");
      expect(result).toContain("\u2014");
    });

    it("should include feature highlights", () => {
      const result = formatForAI(richVehicle);
      // Should contain at least one feature
      const hasFeature = richVehicle.features.some((f) => result.includes(f));
      expect(hasFeature).toBe(true);
    });

    it("should handle vehicle with no features", () => {
      const result = formatForAI(emptyVehicle);
      expect(result).toContain("2024 Toyota Corolla");
      expect(result).not.toContain("\u2014");
    });
  });
});

// --- Freshness Tests ---

describe("Freshness", () => {
  describe("addFreshnessQualifier", () => {
    it("should add qualifier when message references inventory", () => {
      const message = "We have a great selection of vehicles on our lot.";
      const result = addFreshnessQualifier(message);
      expect(result).toContain("Based on our current listings");
    });

    it("should not add qualifier when message does not reference inventory", () => {
      const message = "Thank you for reaching out! How can I help?";
      const result = addFreshnessQualifier(message);
      expect(result).toBe(message);
    });

    it("should not duplicate qualifier if already present", () => {
      const message =
        "We have these vehicles available, based on our current listings.";
      const result = addFreshnessQualifier(message);
      expect(result).toBe(message);
    });

    it("should handle message ending with punctuation", () => {
      const message = "We currently have 5 vehicles in stock.";
      const result = addFreshnessQualifier(message);
      expect(result).toContain("Based on our current listings.");
      // Should not double-period
      expect(result).not.toContain("..");
    });

    it("should handle message ending without punctuation", () => {
      const message = "We have matching vehicles in stock";
      const result = addFreshnessQualifier(message);
      expect(result).toContain(". Based on our current listings.");
    });
  });

  describe("isStale", () => {
    it("should return false for fresh data", () => {
      const recentDate = new Date(Date.now() - 1000 * 60 * 30); // 30 minutes ago
      expect(isStale(recentDate)).toBe(false);
    });

    it("should return true for old data (default 24h)", () => {
      const oldDate = new Date(Date.now() - 1000 * 60 * 60 * 25); // 25 hours ago
      expect(isStale(oldDate)).toBe(true);
    });

    it("should respect custom maxAgeHours", () => {
      const twoHoursAgo = new Date(Date.now() - 1000 * 60 * 60 * 2);
      expect(isStale(twoHoursAgo, 1)).toBe(true);
      expect(isStale(twoHoursAgo, 3)).toBe(false);
    });

    it("should return false for exactly now", () => {
      expect(isStale(new Date())).toBe(false);
    });
  });
});
