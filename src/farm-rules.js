export const clampCropStage = (stage) => Math.min(4, Math.max(0, Number(stage) || 0));

export const isMaturePlot = (plot) => Boolean(plot?.crop) && clampCropStage(plot.stage) === 4;

export const canWaterPlot = (plot) => Boolean(plot?.crop) && !isMaturePlot(plot);

export const canHarvestPlot = (plot) => isMaturePlot(plot);

export const advancePlotGrowth = (plot, { hydrationLoss = 4, shouldAdvance = false } = {}) => {
  if (!plot.crop) return plot;
  if (isMaturePlot(plot)) return { ...plot, stage: 4 };

  const hydration = Math.max(0, plot.hydration - hydrationLoss);
  const stage =
    shouldAdvance && hydration > 25
      ? Math.min(4, clampCropStage(plot.stage) + 1)
      : clampCropStage(plot.stage);

  return { ...plot, hydration, stage };
};
