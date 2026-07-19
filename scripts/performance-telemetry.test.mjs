import assert from 'node:assert/strict';
import test from 'node:test';
import {
  analyzeProductRenderSamples,
  evaluateProductRenderBudget,
} from './performance-telemetry.mjs';

const PRODUCT_BUDGET = {
  productAchievedFpsMinimum: 30,
  productMaxRenderGapMsMaximum: 250,
  productPhaseTravelMinimum: 0.98,
  productPhaseTravelMaximum: 1.02,
  productWallClockCoverageRatioMinimum: 0.98,
};

test('accepts continuously rendered product telemetry across one wrapped loop', () => {
  const samples = Array.from({ length: 2_401 }, (_, index) => ({
    observedAtMs: index * 20,
    renderCount: index + 10,
    lastRenderTimestampMs: index * 20,
    phase: (index % 2_400) / 2_400,
  }));
  const result = analyzeProductRenderSamples(samples, 48_000);
  assert.equal(result.renderCountDelta, 2_400);
  assert.equal(result.maxRenderGapMs, 20);
  assert.ok(result.phaseTravel >= 1);
  assert.ok(result.wallClockCoverageRatio >= 1);
  assert.equal(evaluateProductRenderBudget(result, PRODUCT_BUDGET).pass, true);
});

test('exposes a stalled product renderer even while observer samples continue', () => {
  const samples = Array.from({ length: 49 }, (_, index) => ({
    observedAtMs: index * 1_000,
    renderCount: Math.min(index, 4) + 1,
    lastRenderTimestampMs: Math.min(index, 4) * 1_000,
    phase: Math.min(index, 4) / 48,
  }));
  const result = analyzeProductRenderSamples(samples, 48_000);
  assert.equal(result.renderCountDelta, 4);
  assert.equal(result.maxRenderGapMs, 44_000);
  assert.ok(result.phaseTravel < 0.1);
  assert.ok(result.wallClockCoverageRatio < 0.1);
  assert.equal(
    evaluateProductRenderBudget(result, PRODUCT_BUDGET).pass,
    false,
    'independent observer rAF samples must not conceal a stalled product renderer',
  );
});

test('rejects malformed or regressing telemetry', () => {
  assert.throws(
    () => analyzeProductRenderSamples([
      { observedAtMs: 0, renderCount: 2, lastRenderTimestampMs: 1, phase: 0.2 },
      { observedAtMs: 10, renderCount: 1, lastRenderTimestampMs: 2, phase: 0.3 },
    ], 10),
    /renderCount regressed/,
  );
});
