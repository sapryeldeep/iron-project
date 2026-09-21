/**
 * Steel Sheet (صاج) Weight Calculation Utility
 * 
 * Formula:
 * Weight (kg) = Volume (m³) * Density (kg/m³)
 * Where:
 * - Volume (m³) = Length (m) * Width (m) * Thickness (m)
 * - Density of carbon steel is typically 7.85 g/cm³ (or 7850 kg/m³)
 */

export type MeasurementUnit = 'mm' | 'cm' | 'm';

export interface SteelSheetInput {
  length: number;       // Length of the sheet
  width: number;        // Width of the sheet
  thickness: number;    // Thickness of the sheet (normally entered in mm)
  lengthUnit: MeasurementUnit;
  widthUnit: MeasurementUnit;
  thicknessUnit: 'mm' | 'cm'; // Usually entered in mm, but can support cm
  density?: number;     // Density in g/cm³ (default: 7.85)
}

/**
 * Converts any value in a given measurement unit to meters.
 */
export function convertToMeters(value: number, unit: MeasurementUnit): number {
  if (isNaN(value) || value <= 0) return 0;
  switch (unit) {
    case 'mm':
      return value / 1000;
    case 'cm':
      return value / 100;
    case 'm':
      return value;
    default:
      return value;
  }
}

/**
 * Calculates the volume of the steel sheet in cubic meters (m³).
 */
export function calculateVolume(input: Omit<SteelSheetInput, 'density'>): number {
  const lengthInMeters = convertToMeters(input.length, input.lengthUnit);
  const widthInMeters = convertToMeters(input.width, input.widthUnit);
  // Thickness is typically in mm, convert to meters
  const thicknessInMeters = input.thicknessUnit === 'cm' 
    ? input.thickness / 100 
    : input.thickness / 1000;

  return lengthInMeters * widthInMeters * thicknessInMeters;
}

/**
 * Calculates the exact weight of a single steel sheet in kilograms (كجم) and tons (طن).
 * 
 * @param input SteelSheetInput values
 * @returns Object with weight in kilograms and tons, and volume in cubic meters
 */
export function calculateSteelWeight(input: SteelSheetInput) {
  const { density = 7.85 } = input;
  
  // 1. Calculate volume in cubic meters (m³)
  const volumeM3 = calculateVolume(input);
  
  // 2. Convert density from g/cm³ to kg/m³ (e.g. 7.85 g/cm³ * 1000 = 7850 kg/m³)
  const densityKgM3 = density * 1000;
  
  // 3. Compute weight in kilograms
  const weightKg = volumeM3 * densityKgM3;
  
  // 4. Compute weight in tons
  const weightTons = weightKg / 1000;

  return {
    weightKg: Number(weightKg.toFixed(3)),
    weightTons: Number(weightTons.toFixed(4)),
    volumeM3: Number(volumeM3.toFixed(6))
  };
}
