import assert from 'node:assert/strict';

export function analyzeProductRenderSamples(samples, requestedDurationMs) {
  assert.ok(Number.isFinite(requestedDurationMs) && requestedDurationMs > 0, 'requested duration must be positive');
  assert.ok(samples.length >= 2, 'at least two product render samples are required');

  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index];
    for (const key of ['observedAtMs', 'renderCount', 'lastRenderTimestampMs', 'phase']) {
      assert.ok(Number.isFinite(sample[key]), `sample ${index} has non-finite ${key}`);
    }
    assert.ok(sample.phase >= 0 && sample.phase < 1, `sample ${index} phase is out of range`);
    if (index === 0) continue;
    const previous = samples[index - 1];
    assert.ok(sample.observedAtMs >= previous.observedAtMs, `sample ${index} observation time regressed`);
    assert.ok(sample.renderCount >= previous.renderCount, `sample ${index} renderCount regressed`);
    assert.ok(
      sample.lastRenderTimestampMs >= previous.lastRenderTimestampMs,
      `sample ${index} last render time regressed`,
    );
  }

  const first = samples[0];
  const last = samples.at(-1);
  const rendered = [first];
  for (let index = 1; index < samples.length; index += 1) {
    if (samples[index].renderCount !== rendered.at(-1).renderCount) rendered.push(samples[index]);
  }

  let phaseTravel = 0;
  const renderGaps = [];
  for (let index = 1; index < rendered.length; index += 1) {
    const previous = rendered[index - 1];
    const current = rendered[index];
    phaseTravel += (current.phase - previous.phase + 1) % 1;
    renderGaps.push(current.lastRenderTimestampMs - previous.lastRenderTimestampMs);
  }
  renderGaps.push(Math.max(0, last.observedAtMs - last.lastRenderTimestampMs));

  const renderCountDelta = last.renderCount - first.renderCount;
  const renderedWallClockMs = Math.max(0, last.lastRenderTimestampMs - first.lastRenderTimestampMs);
  return {
    renderCountStart: first.renderCount,
    renderCountEnd: last.renderCount,
    renderCountDelta,
    productAchievedFps: renderedWallClockMs > 0
      ? (renderCountDelta * 1_000) / renderedWallClockMs
      : 0,
    maxRenderGapMs: Math.max(...renderGaps),
    phaseStart: first.phase,
    phaseEnd: last.phase,
    phaseTravel,
    renderedWallClockMs,
    wallClockCoverageRatio: renderedWallClockMs / requestedDurationMs,
  };
}

export function evaluateProductRenderBudget(metrics, budget) {
  const checks = {
    renderCountGrowth: metrics.renderCountDelta > 0,
    achievedFps: metrics.productAchievedFps >= budget.productAchievedFpsMinimum,
    maxRenderGap: metrics.maxRenderGapMs <= budget.productMaxRenderGapMsMaximum,
    phaseTravel:
      metrics.phaseTravel >= budget.productPhaseTravelMinimum &&
      metrics.phaseTravel <= budget.productPhaseTravelMaximum,
    wallClockCoverage:
      metrics.wallClockCoverageRatio >= budget.productWallClockCoverageRatioMinimum,
  };
  return { pass: Object.values(checks).every(Boolean), checks };
}
