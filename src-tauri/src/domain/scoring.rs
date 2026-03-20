use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScoreBand {
    pub max_wrong: Option<i64>,
    pub score: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScorePolicy {
    pub threshold_ratio: f64,
    pub threshold_rounding: String,
    pub bands: Vec<ScoreBand>,
}

impl Default for ScorePolicy {
    fn default() -> Self {
        Self {
            threshold_ratio: 0.3,
            threshold_rounding: "ceil".into(),
            bands: vec![
                ScoreBand {
                    max_wrong: Some(0),
                    score: 100,
                },
                ScoreBand {
                    max_wrong: None,
                    score: 95,
                },
                ScoreBand {
                    max_wrong: None,
                    score: 90,
                },
            ],
        }
    }
}

pub fn resolve_score(policy: &ScorePolicy, wrong_count: i64, question_count: i64) -> i64 {
    if question_count <= 0 {
        return 0;
    }
    if wrong_count == 0 {
        return policy.bands.first().map(|band| band.score).unwrap_or(100);
    }
    let raw_threshold = (question_count as f64) * policy.threshold_ratio;
    let threshold = if policy.threshold_rounding == "floor" {
        raw_threshold.floor() as i64
    } else {
        raw_threshold.ceil() as i64
    };
    if wrong_count <= threshold {
        policy.bands.get(1).map(|band| band.score).unwrap_or(95)
    } else {
        policy.bands.get(2).map(|band| band.score).unwrap_or(90)
    }
}

#[cfg(test)]
mod tests {
    use super::{resolve_score, ScorePolicy};

    #[test]
    fn respects_threshold_rounding() {
        let policy = ScorePolicy::default();
        assert_eq!(resolve_score(&policy, 0, 10), 100);
        assert_eq!(resolve_score(&policy, 3, 10), 95);
        assert_eq!(resolve_score(&policy, 4, 10), 90);
        assert_eq!(resolve_score(&policy, 3, 7), 95);
        assert_eq!(resolve_score(&policy, 4, 7), 90);
    }
}
