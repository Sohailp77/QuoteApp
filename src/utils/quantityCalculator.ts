import { CalcMethod, RoundingMode, Product, QuoteItem } from '../types';

export interface CalculationInput {
  calc_method: CalcMethod;
  input_qty?: number;
  length?: number;
  width?: number;
  pcs?: number;
  unit_coverage?: number;
  rounding_mode?: RoundingMode;
  input_unit?: string;
  selling_unit?: string;
}

export interface CalculationResult {
  calc_method: CalcMethod;
  input_qty: number; // Total customer requirement (e.g., 100 SQFT)
  calculated_qty: number; // Raw exact calculated decimal (e.g., 6.6667)
  final_qty: number; // Final rounded selling quantity (e.g., 7 BOXES)
  unit_coverage: number;
  rounding_mode: RoundingMode;
  input_unit: string;
  selling_unit: string;
  formula_text: string;
}

/**
 * Perform quantity calculation based on product config and user input requirement
 */
export function calculateQuantity(input: CalculationInput): CalculationResult {
  const method = input.calc_method || 'direct';
  const coverage = input.unit_coverage && input.unit_coverage > 0 ? input.unit_coverage : 1;
  const rounding = input.rounding_mode || 'round_up';
  const inputUnit = input.input_unit || '';
  const sellingUnit = input.selling_unit || 'Unit';
  const pcsCount = input.pcs && input.pcs > 0 ? input.pcs : 1;

  let totalInputRequirement = 0;

  if (method === 'area') {
    const l = input.length || 0;
    const w = input.width || 0;
    const directArea = input.input_qty || 0;

    if (l > 0 && w > 0) {
      totalInputRequirement = l * w * pcsCount;
    } else {
      totalInputRequirement = directArea * pcsCount;
    }
  } else if (method === 'length') {
    const l = input.length || input.input_qty || 0;
    totalInputRequirement = l * pcsCount;
  } else if (method === 'weight' || method === 'volume' || method === 'custom') {
    const req = input.input_qty || 0;
    totalInputRequirement = req * pcsCount;
  } else {
    // direct quantity
    totalInputRequirement = (input.input_qty !== undefined && input.input_qty !== null ? input.input_qty : input.pcs) || 1;
  }

  // Calculate raw selling quantity: requirement / coverage
  const rawCalculatedQty = method === 'direct' ? totalInputRequirement : totalInputRequirement / coverage;

  // Apply rounding rule
  let finalQty = rawCalculatedQty;
  if (method !== 'direct') {
    switch (rounding) {
      case 'round_up':
        finalQty = Math.ceil(rawCalculatedQty);
        break;
      case 'round_down':
        finalQty = Math.floor(rawCalculatedQty);
        break;
      case 'round_nearest':
        finalQty = Math.round(rawCalculatedQty);
        break;
      case 'allow_decimals':
      default:
        finalQty = Math.round(rawCalculatedQty * 1000) / 1000;
        break;
    }
  }

  // Generate formula text
  let formulaText = '';
  if (method === 'direct') {
    formulaText = `${finalQty} ${sellingUnit}`;
  } else {
    const rawFormatted = Number(rawCalculatedQty.toFixed(2));
    const reqFormatted = Number(totalInputRequirement.toFixed(2));
    formulaText = `${reqFormatted} ${inputUnit} ÷ ${coverage} ${inputUnit}/${sellingUnit} = ${rawFormatted}`;
    if (rounding === 'round_up' && finalQty !== rawCalculatedQty) {
      formulaText += ` → ${finalQty} ${sellingUnit} (rounded up)`;
    } else {
      formulaText += ` → ${finalQty} ${sellingUnit}`;
    }
  }

  return {
    calc_method: method,
    input_qty: Number(totalInputRequirement.toFixed(3)),
    calculated_qty: Number(rawCalculatedQty.toFixed(3)),
    final_qty: finalQty,
    unit_coverage: coverage,
    rounding_mode: rounding,
    input_unit: inputUnit,
    selling_unit: sellingUnit,
    formula_text: formulaText,
  };
}

/**
 * Encode Product Calculation configuration into database string representation (`calc_type`)
 * Format: `method|input_unit|coverage|rounding`
 */
export function encodeProductCalcConfig(config: {
  calc_method?: CalcMethod;
  input_unit?: string;
  unit_coverage?: number;
  rounding_mode?: RoundingMode;
}): string {
  const method = config.calc_method || 'direct';
  const inputUnit = (config.input_unit || '').trim();
  const coverage = config.unit_coverage || 1;
  const rounding = config.rounding_mode || 'round_up';

  return `${method}|${inputUnit}|${coverage}|${rounding}`;
}

/**
 * Decode database string representation (`calc_type`) into Product Calculation Configuration
 * Supports legacy values ('pcs', 'size', 'area', 'length', 'weight') gracefully
 */
export function decodeProductCalcConfig(calcTypeStr?: string): {
  calc_method: CalcMethod;
  input_unit: string;
  unit_coverage: number;
  rounding_mode: RoundingMode;
} {
  if (!calcTypeStr || calcTypeStr === 'pcs' || calcTypeStr === 'simple') {
    return { calc_method: 'direct', input_unit: '', unit_coverage: 1, rounding_mode: 'round_up' };
  }

  if (calcTypeStr.includes('|')) {
    const parts = calcTypeStr.split('|');
    const method = (parts[0] as CalcMethod) || 'direct';
    const inputUnit = parts[1] || '';
    const coverage = parseFloat(parts[2]) || 1;
    const rounding = (parts[3] as RoundingMode) || 'round_up';

    return {
      calc_method: method,
      input_unit: inputUnit,
      unit_coverage: coverage,
      rounding_mode: rounding,
    };
  }

  // Legacy fallback mapping
  switch (calcTypeStr) {
    case 'size':
    case 'area':
      return { calc_method: 'area', input_unit: 'SQFT', unit_coverage: 1, rounding_mode: 'round_up' };
    case 'length':
      return { calc_method: 'length', input_unit: 'METER', unit_coverage: 1, rounding_mode: 'round_up' };
    case 'weight':
      return { calc_method: 'weight', input_unit: 'KG', unit_coverage: 1, rounding_mode: 'allow_decimals' };
    default:
      return { calc_method: 'direct', input_unit: '', unit_coverage: 1, rounding_mode: 'round_up' };
  }
}

/**
 * Extract calculation configuration from a Product object with complete safe defaults
 */
export function getProductCalcConfig(product: Partial<Product>): {
  calc_method: CalcMethod;
  input_unit: string;
  unit_coverage: number;
  rounding_mode: RoundingMode;
  selling_unit: string;
} {
  const decoded = decodeProductCalcConfig(product.calc_type);
  
  return {
    calc_method: product.calc_method || decoded.calc_method,
    input_unit: product.input_unit || decoded.input_unit,
    unit_coverage: product.unit_coverage && product.unit_coverage > 0 ? product.unit_coverage : decoded.unit_coverage,
    rounding_mode: product.rounding_mode || decoded.rounding_mode,
    selling_unit: product.unit || 'Unit',
  };
}
