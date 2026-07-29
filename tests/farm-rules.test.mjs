import assert from "node:assert/strict";
import {
  advancePlotGrowth,
  canHarvestPlot,
  canWaterPlot,
} from "../src/farm-rules.js";

let mature = { id: 1, crop: "番茄", stage: 4, hydration: 68 };
for (let index = 0; index < 1000; index += 1) {
  mature = advancePlotGrowth(mature, { hydrationLoss: 6, shouldAdvance: true });
}

assert.equal(mature.stage, 4, "成熟作物必须永久保持在阶段 4，直到被收割");
assert.equal(mature.hydration, 68, "成熟后不再消耗水分");
assert.equal(canWaterPlot(mature), false, "成熟地块不能再浇水");
assert.equal(canHarvestPlot(mature), true, "成熟地块只能进入收割操作");

const halfMature = { id: 2, crop: "玉米", stage: 3, hydration: 80 };
const ripened = advancePlotGrowth(halfMature, { hydrationLoss: 4, shouldAdvance: true });
assert.equal(ripened.stage, 4, "半成熟作物应正常进入成熟阶段");

const locked = advancePlotGrowth(ripened, { hydrationLoss: 99, shouldAdvance: true });
assert.deepEqual(locked, { ...ripened, stage: 4 }, "成熟后的后续时间推进不能重置作物");

console.log("farm lifecycle rules passed");
