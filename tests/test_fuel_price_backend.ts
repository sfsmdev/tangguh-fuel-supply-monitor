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

async function runTests() {
  console.log('--- Testing Fuel Price Integration & Zero Defaults ---');

  // Test 1: Clean Initial State has 0 price and no mock data
  const cleanState = createCleanInitialState();
  if (cleanState.fuelPrice.pricePerLiter !== 0) {
    throw new Error(`Test 1 Failed: Expected price 0, got ${cleanState.fuelPrice.pricePerLiter}`);
  }
  if (cleanState.fuelPrice.notes !== '' || cleanState.fuelPrice.updatedBy !== '') {
    throw new Error(`Test 1 Failed: Notes or updatedBy should be empty`);
  }
  console.log('✓ Test 1 Passed: createCleanInitialState initializes price to 0 with no mock data.');

  // Test 2: Sanitization of empty or legacy data defaults to 0
  const sanitizedEmpty = sanitizeOperationalState({});
  if (sanitizedEmpty.fuelPrice.pricePerLiter !== 0) {
    throw new Error(`Test 2 Failed: Expected sanitized empty state to have price 0`);
  }
  console.log('✓ Test 2 Passed: sanitizeOperationalState({}) defaults to price 0.');

  // Test 3: Valid admin input is preserved correctly
  const stateWithPrice = sanitizeOperationalState({
    fuelPrice: {
      id: 'current',
      pricePerLiter: 19250,
      currency: 'IDR',
      fuelType: 'Biofuel B50 Marine Offshore',
      effectiveDate: '2026-11-15',
      notes: 'Harga Acuan Resmi Pertamina',
      updatedBy: 'Admin',
      updatedAt: '2026-11-11T09:00:00.000Z',
    },
  });
  if (stateWithPrice.fuelPrice.pricePerLiter !== 19250) {
    throw new Error(`Test 3 Failed: Expected 19250, got ${stateWithPrice.fuelPrice.pricePerLiter}`);
  }
  if (stateWithPrice.fuelPrice.notes !== 'Harga Acuan Resmi Pertamina') {
    throw new Error(`Test 3 Failed: Notes mismatch`);
  }
  console.log('✓ Test 3 Passed: User admin input is preserved faithfully.');

  // Test 4: DatabaseAdapter save & load roundtrip
  await DatabaseAdapter.saveState(cleanState);
  const loadedClean = await DatabaseAdapter.getState();
  if (loadedClean.fuelPrice.pricePerLiter !== 0) {
    throw new Error(`Test 4 Failed: Expected loaded clean state price 0, got ${loadedClean.fuelPrice.pricePerLiter}`);
  }
  console.log('✓ Test 4 Passed: DatabaseAdapter save & load roundtrip with price 0.');

  // Test 5: RBAC Security Check
  // Non-admin attempting to change fuelPrice MUST throw
  let rbacBlocked = false;
  try {
    await StateController.updateState('Planner', stateWithPrice);
  } catch (err: any) {
    if (err.message.includes('Only Administrator can update the fuel benchmark price')) {
      rbacBlocked = true;
    } else {
      console.log('Other error:', err.message);
    }
  }
  if (!rbacBlocked) {
    throw new Error('Test 5 Failed: Non-admin was NOT blocked from changing fuelPrice!');
  }
  console.log('✓ Test 5 Passed: Non-admin is strictly blocked from modifying fuel price.');

  // Test 6: Admin CAN change fuel price
  const adminSaved = await StateController.updateState('Admin', stateWithPrice);
  if (adminSaved.fuelPrice.pricePerLiter !== 19250) {
    throw new Error(`Test 6 Failed: Admin save did not persist price`);
  }
  console.log('✓ Test 6 Passed: Admin can update fuel price and it persists.');

  // Cleanup: restore clean state with price 0
  await StateController.updateState('Admin', cleanState);
  const finalState = await DatabaseAdapter.getState();
  if (finalState.fuelPrice.pricePerLiter !== 0) {
    throw new Error(`Cleanup Failed: Expected price 0`);
  }
  console.log('✓ Cleanup Passed: Reset to Rp 0 baseline.');

  console.log('--- ALL TESTS PASSED SUCCESSFULLY! ---');
}

runTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
