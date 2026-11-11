import fs from 'fs';
import path from 'path';

// Parse .env if env vars not already set
const envFile = path.resolve(__dirname, '../frontend/.env.local');
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      process.env[key] = val;
    }
  }
}

import {
  createCleanInitialState,
  sanitizeOperationalState,
  DEFAULT_FUEL_PRICE,
} from '../backend/src/db/seed';
import { StateController } from '../api/src/controllers/state.controller';
import { DatabaseAdapter } from '../backend/src/db/DatabaseAdapter';
import {
  getDaysInMonth,
  getPeriodDateRange,
  getPeriodForDate,
  resolvePeriodRecord,
  generatePeriodId,
} from '../backend/src/utils/periodUtils';

async function runTests() {
  console.log('--- Testing Fuel Price & Pertamina Periods Integration ---');

  // Test 1: Clean Initial State has 0 price and empty periods
  const cleanState = createCleanInitialState();
  if (cleanState.fuelPrice.pricePerLiter !== 0) {
    throw new Error(`Test 1 Failed: Expected price 0, got ${cleanState.fuelPrice.pricePerLiter}`);
  }
  if (!Array.isArray(cleanState.fuelPricePeriods) || cleanState.fuelPricePeriods.length !== 0) {
    throw new Error(`Test 1 Failed: fuelPricePeriods should be empty array`);
  }
  console.log('✓ Test 1 Passed: createCleanInitialState initializes price to 0 with empty fuelPricePeriods.');

  // Test 2: Pertamina Period Calculation (01-14 & 15-Akhir)
  const novP1 = getPeriodDateRange(2026, 11, 'Periode I');
  if (novP1.startDate !== '2026-11-01' || novP1.endDate !== '2026-11-14') {
    throw new Error(`Test 2 Failed: Expected Nov P1 2026-11-01 to 2026-11-14, got ${JSON.stringify(novP1)}`);
  }
  const novP2 = getPeriodDateRange(2026, 11, 'Periode II');
  if (novP2.startDate !== '2026-11-15' || novP2.endDate !== '2026-11-30') {
    throw new Error(`Test 2 Failed: Expected Nov P2 2026-11-15 to 2026-11-30, got ${JSON.stringify(novP2)}`);
  }
  const febLeapP2 = getPeriodDateRange(2028, 2, 'Periode II');
  if (febLeapP2.endDate !== '2028-02-29') {
    throw new Error(`Test 2 Failed: Expected leap Feb 2028 end date 2028-02-29, got ${febLeapP2.endDate}`);
  }
  const febP2 = getPeriodDateRange(2026, 2, 'Periode II');
  if (febP2.endDate !== '2026-02-28') {
    throw new Error(`Test 2 Failed: Expected normal Feb 2026 end date 2026-02-28, got ${febP2.endDate}`);
  }
  console.log('✓ Test 2 Passed: Pertamina period dates (01-14 and 15-akhir) calculated accurately including leap years.');

  // Test 3: resolvePeriodRecord fallback to Rp 0
  const emptyRecord = resolvePeriodRecord([], 2026, 11, 'Periode I');
  if (emptyRecord.pricePerLiter !== 0 || emptyRecord.notes !== '') {
    throw new Error(`Test 3 Failed: resolvePeriodRecord should fallback to 0 price with blank notes`);
  }
  console.log('✓ Test 3 Passed: resolvePeriodRecord returns Rp 0 when no record is stored.');

  // Test 4: Sanitization of period records
  const stateWithPeriods = sanitizeOperationalState({
    fuelPricePeriods: [
      {
        id: generatePeriodId(2026, 11, 'Periode I'),
        year: 2026,
        month: 11,
        period: 'Periode I',
        startDate: '2026-11-01',
        endDate: '2026-11-14',
        pricePerLiter: 18750,
        currency: 'IDR',
        fuelType: 'Biofuel B50',
        notes: 'Pertamina Rate 1-14 Nov',
        updatedBy: 'Admin',
        updatedAt: '2026-11-11T12:00:00.000Z',
      },
      {
        id: generatePeriodId(2026, 11, 'Periode II'),
        year: 2026,
        month: 11,
        period: 'Periode II',
        startDate: '2026-11-15',
        endDate: '2026-11-30',
        pricePerLiter: 19100,
        currency: 'IDR',
        fuelType: 'Biofuel B50',
        notes: 'Pertamina Rate 15-30 Nov',
        updatedBy: 'Admin',
        updatedAt: '2026-11-11T12:00:00.000Z',
      },
    ],
  });
  if (stateWithPeriods.fuelPricePeriods.length !== 2) {
    throw new Error(`Test 4 Failed: Expected 2 periods, got ${stateWithPeriods.fuelPricePeriods.length}`);
  }
  if (stateWithPeriods.fuelPricePeriods[0].pricePerLiter !== 18750 || stateWithPeriods.fuelPricePeriods[1].pricePerLiter !== 19100) {
    throw new Error(`Test 4 Failed: Price values mismatch`);
  }
  console.log('✓ Test 4 Passed: Sanitization preserves multiple Pertamina period records accurately.');

  // Test 5: RBAC Security Check
  // Non-admin attempting to change fuelPricePeriods MUST be blocked
  let rbacBlocked = false;
  try {
    await StateController.updateState('Planner', stateWithPeriods);
  } catch (err: any) {
    if (err.message.includes('Only Administrator can update the fuel benchmark price')) {
      rbacBlocked = true;
    }
  }
  if (!rbacBlocked) {
    throw new Error('Test 5 Failed: Non-admin was NOT blocked from changing fuelPricePeriods!');
  }
  console.log('✓ Test 5 Passed: Non-admin is strictly blocked from modifying Pertamina Purchase Rates.');

  // Test 6: Admin CAN save period records and they persist in database
  const adminSaved = await StateController.updateState('Admin', stateWithPeriods);
  if (adminSaved.fuelPricePeriods.length !== 2) {
    throw new Error(`Test 6 Failed: Admin save did not persist period records`);
  }
  const loadedFromDb = await DatabaseAdapter.getState();
  if (loadedFromDb.fuelPricePeriods.length !== 2) {
    throw new Error(`Test 6 Failed: Loaded from DB did not match saved periods`);
  }
  console.log('✓ Test 6 Passed: Admin can update Pertamina period rates and they persist.');

  // Cleanup: Reset to clean state
  await StateController.updateState('Admin', cleanState);
  const finalState = await DatabaseAdapter.getState();
  if (finalState.fuelPricePeriods.length !== 0 || finalState.fuelPrice.pricePerLiter !== 0) {
    throw new Error(`Cleanup Failed: Expected clean baseline`);
  }
  console.log('✓ Cleanup Passed: Reset to clean baseline.');

  console.log('--- ALL TESTS PASSED SUCCESSFULLY! ---');
}

runTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
