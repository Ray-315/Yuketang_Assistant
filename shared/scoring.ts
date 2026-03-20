export type ScoreBand = {
  maxWrong: number | null;
  score: number;
};

export type ScorePolicy = {
  thresholdRatio: number;
  thresholdRounding: "ceil" | "floor";
  bands: ScoreBand[];
};

export const defaultScorePolicy: ScorePolicy = {
  thresholdRatio: 0.3,
  thresholdRounding: "ceil",
  bands: [
    { maxWrong: 0, score: 100 },
    { maxWrong: null, score: 95 },
    { maxWrong: null, score: 90 }
  ]
};
