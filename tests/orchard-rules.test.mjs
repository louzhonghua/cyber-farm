import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceTreeGrowth,
  harvestTree,
  isRipeTree,
  treeStageFromProgress,
} from "../src/orchard-rules.js";

test("果树按花苞、盛花、幼果、成熟四阶段推进", () => {
  assert.equal(treeStageFromProgress(0), 0);
  assert.equal(treeStageFromProgress(25), 1);
  assert.equal(treeStageFromProgress(50), 2);
  assert.equal(treeStageFromProgress(75), 3);
});

test("成熟果树保持成熟直到采摘", () => {
  const ripe = { id: "apple", progress: 88 };
  assert.equal(isRipeTree(ripe), true);
  assert.deepEqual(advanceTreeGrowth(ripe, 10), ripe);
});

test("采摘成熟果树后回到花苞阶段", () => {
  assert.equal(harvestTree({ id: "pear", progress: 100 }).progress, 0);
  assert.equal(harvestTree({ id: "peach", progress: 40 }).progress, 40);
});
