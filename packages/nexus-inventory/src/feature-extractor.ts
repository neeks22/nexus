import type { Vehicle } from "./types.js";

// --- Priority features (ordered by desirability for marketing) ---

const PRIORITY_FEATURES: readonly string[] = [
  "panoramic roof",
  "panoramic sunroof",
  "awd",
  "4wd",
  "all-wheel drive",
  "four-wheel drive",
  "leather seats",
  "leather interior",
  "heated seats",
  "heated steering wheel",
  "sunroof",
  "moonroof",
  "navigation",
  "adaptive cruise control",
  "adaptive cruise",
  "blind spot monitoring",
  "lane departure warning",
  "apple carplay",
  "android auto",
  "wireless charging",
  "premium audio",
  "bose",
  "harman kardon",
  "bang & olufsen",
  "remote start",
  "power liftgate",
  "ventilated seats",
  "cooled seats",
  "heads-up display",
  "360 camera",
  "surround view camera",
];

const MAX_HIGHLIGHTS = 3;
const MIN_HIGHLIGHTS = 1;

// --- Feature extraction ---

export function extractHighlights(vehicle: Vehicle): string[] {
  const highlights: string[] = [];
  const vehicleFeaturesLower = vehicle.features.map((f) => f.toLowerCase());

  for (const priority of PRIORITY_FEATURES) {
    if (highlights.length >= MAX_HIGHLIGHTS) {
      break;
    }

    const matchIndex = vehicleFeaturesLower.findIndex((f) => f.includes(priority));
    if (matchIndex !== -1) {
      // Use the original casing from the vehicle record
      const originalFeature = vehicle.features[matchIndex]!;
      if (!highlights.includes(originalFeature)) {
        highlights.push(originalFeature);
      }
    }
  }

  // If we have fewer than MIN_HIGHLIGHTS, fill with remaining features
  if (highlights.length < MIN_HIGHLIGHTS) {
    for (const feature of vehicle.features) {
      if (highlights.length >= MAX_HIGHLIGHTS) {
        break;
      }
      if (!highlights.includes(feature)) {
        highlights.push(feature);
      }
    }
  }

  return highlights;
}

// --- AI formatting ---

export function formatForAI(vehicle: Vehicle): string {
  const yearMakeModel = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
  const trimPart = vehicle.trim ? ` ${vehicle.trim}` : "";
  const colorPart = vehicle.color ? ` in ${vehicle.color}` : "";
  const highlights = extractHighlights(vehicle);
  const featuresPart =
    highlights.length > 0 ? ` \u2014 ${highlights.join(", ")}` : "";

  return `${yearMakeModel}${trimPart}${colorPart}${featuresPart}`;
}
