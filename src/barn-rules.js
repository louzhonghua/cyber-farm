export const ANIMAL_STAGES = ["幼崽", "成长中", "成年"];

export const ANIMAL_DEFINITIONS = {
  鸡: { id: "chicken", icon: "🐔", product: "鸡蛋", action: "collectEggs", size: 6.3 },
  鸭: { id: "duck", icon: "🦆", product: "鸭蛋", action: "collectEggs", size: 6.8 },
  鹅: { id: "goose", icon: "🪿", product: "鹅蛋", action: "collectEggs", size: 7.3 },
  狗: { id: "dog", icon: "🐕", product: null, action: "playDog", size: 8.1 },
  牛: { id: "cow", icon: "🐄", product: "牛奶", action: "collectMilk", size: 10.2 },
  羊: { id: "sheep", icon: "🐑", product: "牛奶", action: "collectMilk", size: 9.1 },
};

export const clampAnimalAge = (age) => Math.min(100, Math.max(0, Number(age) || 0));

export const animalStageFromAge = (age) => {
  const safeAge = clampAnimalAge(age);
  if (safeAge < 34) return 0;
  if (safeAge < 67) return 1;
  return 2;
};

export const isAdultAnimal = (animal) => animalStageFromAge(animal.age) === 2;

export const canCollectAnimal = (animal, action) => {
  const definition = ANIMAL_DEFINITIONS[animal?.kind];
  return Boolean(
    definition &&
    definition.action === action &&
    definition.product &&
    isAdultAnimal(animal) &&
    Number(animal.ready) > 0,
  );
};

export const advanceAnimalGrowth = (animal, amount = 1) => ({
  ...animal,
  age: clampAnimalAge((Number(animal.age) || 0) + amount),
});

export const replenishDailyProduce = (animals) =>
  animals.map((animal) => {
    const definition = ANIMAL_DEFINITIONS[animal.kind];
    if (!definition?.product || !isAdultAnimal(animal)) return animal;
    return { ...animal, ready: Math.min(3, (Number(animal.ready) || 0) + 1) };
  });
