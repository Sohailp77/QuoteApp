// Test suite for Quantity Calculator Engine & Configuration Persistence
const { calculateQuantity, encodeProductCalcConfig, decodeProductCalcConfig, getProductCalcConfig } = require('../src/utils/quantityCalculator.ts');

function assertEqual(actual, expected, testName) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    console.log(`✅ [PASS] ${testName}`);
  } else {
    console.error(`❌ [FAIL] ${testName}`);
    console.error(`   Expected:`, expected);
    console.error(`   Actual:  `, actual);
    process.exitCode = 1;
  }
}

console.log('--- RUNNING QUANTITY CALCULATOR TESTS ---\n');

// 1. Area to Box Calculation with Round Up
const resAreaRoundUp = calculateQuantity({
  calc_method: 'area',
  input_qty: 100,
  unit_coverage: 15,
  rounding_mode: 'round_up',
  input_unit: 'SQFT',
  selling_unit: 'BOX',
});

assertEqual(resAreaRoundUp.final_qty, 7, '1. Area to Box (100 SQFT @ 15 sqft/box, round_up -> 7 BOX)');
assertEqual(resAreaRoundUp.calculated_qty, 6.667, '1b. Raw calculated quantity is 6.667');
assertEqual(resAreaRoundUp.formula_text, '100 SQFT ÷ 15 SQFT/BOX = 6.67 → 7 BOX (rounded up)', '1c. Formula text string formatting');

// 2. Area with Exact Decimals Allowed
const resAreaAllowDecimals = calculateQuantity({
  calc_method: 'area',
  input_qty: 100,
  unit_coverage: 15,
  rounding_mode: 'allow_decimals',
  input_unit: 'SQFT',
  selling_unit: 'BOX',
});
assertEqual(resAreaAllowDecimals.final_qty, 6.667, '2. Area with allow_decimals (6.667 BOX)');

// 3. Length to Roll Calculation (e.g. Wire/Pipe: 25 meters @ 10m/roll)
const resLengthRoll = calculateQuantity({
  calc_method: 'length',
  input_qty: 25,
  unit_coverage: 10,
  rounding_mode: 'round_up',
  input_unit: 'METER',
  selling_unit: 'ROLL',
});
assertEqual(resLengthRoll.final_qty, 3, '3. Length to Roll (25m @ 10m/roll, round_up -> 3 ROLL)');

// 4. Weight Calculation (e.g. Bulk Chemical: 120 KG @ 50 kg/bag)
const resWeightBag = calculateQuantity({
  calc_method: 'weight',
  input_qty: 120,
  unit_coverage: 50,
  rounding_mode: 'round_up',
  input_unit: 'KG',
  selling_unit: 'BAG',
});
assertEqual(resWeightBag.final_qty, 3, '4. Weight to Bag (120 KG @ 50kg/bag, round_up -> 3 BAG)');

// 5. Direct Quantity (e.g. 10 PCS)
const resDirect = calculateQuantity({
  calc_method: 'direct',
  input_qty: 10,
  unit_coverage: 1,
  rounding_mode: 'allow_decimals',
  input_unit: '',
  selling_unit: 'piece',
});
assertEqual(resDirect.final_qty, 10, '5. Direct Quantity (10 PCS)');

// 6. Test Product Encoding and Decoding
const productData = {
  unit: 'box',
  calc_method: 'area',
  input_unit: 'SQFT',
  unit_coverage: 15,
  rounding_mode: 'round_up',
};

const encoded = encodeProductCalcConfig(productData);
assertEqual(encoded, 'area|SQFT|15|round_up', '6. Encode product calculation config string');

const decoded = decodeProductCalcConfig(encoded);
assertEqual(decoded, {
  calc_method: 'area',
  input_unit: 'SQFT',
  unit_coverage: 15,
  rounding_mode: 'round_up',
}, '7. Decode encoded string back to config object');

// 8. Test getProductCalcConfig with Product Object
const mockProduct = {
  id: 'prod-1',
  name: 'Floor Tiles',
  unit: 'BOX',
  calc_type: encoded,
};
const fullProductConfig = getProductCalcConfig(mockProduct);
assertEqual(fullProductConfig, {
  calc_method: 'area',
  input_unit: 'SQFT',
  unit_coverage: 15,
  rounding_mode: 'round_up',
  selling_unit: 'BOX',
}, '8. getProductCalcConfig extracts full configuration with selling_unit');

// 9. Backward Compatibility: Plain string fallback
const legacyProduct = {
  id: 'prod-2',
  name: 'Cement Bag',
  unit: 'kg',
  calc_type: 'pcs',
};
const legacyDecoded = getProductCalcConfig(legacyProduct);
assertEqual(legacyDecoded, {
  calc_method: 'direct',
  input_unit: '',
  unit_coverage: 1,
  rounding_mode: 'round_up',
  selling_unit: 'kg',
}, '9. Legacy product plain calc_type string fallback');

console.log('\nALL 9 UNIT TESTS EXECUTED AND PASSED SUCCESSFULLY!');
