export const TREE_STAGES = ["花苞", "盛花", "幼果", "成熟"];

export const FRUIT_TREE_DEFINITIONS = {
  苹果树: { id: "apple", fruit: "苹果", icon: "🍎" },
  梨树: { id: "pear", fruit: "梨", icon: "🍐" },
  桃树: { id: "peach", fruit: "桃子", icon: "🍑" },
  香蕉树: { id: "banana", fruit: "香蕉", icon: "🍌" },
  樱桃树: { id: "cherry", fruit: "樱桃", icon: "🍒" },
};

export const clampTreeProgress = (value) =>
  Math.min(100, Math.max(0, Number(value) || 0));

export const treeStageFromProgress = (progress) => {
  const value = clampTreeProgress(progress);
  if (value < 25) return 0;
  if (value < 50) return 1;
  if (value < 75) return 2;
  return 3;
};

export const isRipeTree = (tree) => treeStageFromProgress(tree?.progress) === 3;

export const advanceTreeGrowth = (tree, amount = 1) => {
  if (!tree || isRipeTree(tree)) return tree;
  return { ...tree, progress: clampTreeProgress(tree.progress + amount) };
};

export const harvestTree = (tree) =>
  isRipeTree(tree) ? { ...tree, progress: 0 } : tree;
