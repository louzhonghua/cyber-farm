import assert from "node:assert/strict";
import {
  advanceAnimalGrowth,
  animalStageFromAge,
  canCollectAnimal,
  replenishDailyProduce,
} from "../src/barn-rules.js";

assert.equal(animalStageFromAge(0), 0);
assert.equal(animalStageFromAge(34), 1);
assert.equal(animalStageFromAge(67), 2);
assert.equal(animalStageFromAge(120), 2);

const chick = { kind: "鸡", age: 20, ready: 2 };
const hen = { kind: "鸡", age: 80, ready: 2 };
const dog = { kind: "狗", age: 100, ready: 0 };
assert.equal(canCollectAnimal(chick, "collectEggs"), false);
assert.equal(canCollectAnimal(hen, "collectEggs"), true);
assert.equal(canCollectAnimal(dog, "playDog"), false);
assert.equal(advanceAnimalGrowth(chick, 20).age, 40);

const nextDay = replenishDailyProduce([chick, hen, dog]);
assert.equal(nextDay[0].ready, 2);
assert.equal(nextDay[1].ready, 3);
assert.equal(nextDay[2].ready, 0);

console.log("barn growth and produce rules passed");
