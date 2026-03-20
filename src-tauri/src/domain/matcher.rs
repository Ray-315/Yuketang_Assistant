use crate::domain::models::StudentRecord;

fn normalize(name: &str) -> String {
    name.chars()
        .filter(|char| !char.is_whitespace())
        .collect::<String>()
        .to_lowercase()
}

pub fn match_students<'a>(raw_name: &str, students: &'a [StudentRecord]) -> Vec<&'a StudentRecord> {
    let normalized = normalize(raw_name);
    let exact: Vec<_> = students
        .iter()
        .filter(|student| normalize(&student.name) == normalized)
        .collect();
    if !exact.is_empty() {
        return exact;
    }
    students
        .iter()
        .filter(|student| normalize(&student.name).contains(&normalized))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::match_students;
    use crate::domain::models::StudentRecord;

    fn mock_student(name: &str) -> StudentRecord {
        StudentRecord {
            id: name.into(),
            name: name.into(),
            student_no: None,
            notes: None,
            class_ids: vec![],
            created_at: "2026-03-20T00:00:00Z".into(),
        }
    }

    #[test]
    fn matches_without_spaces() {
        let students = vec![mock_student("张三"), mock_student("李四")];
        let matched = match_students(" 张三 ", &students);
        assert_eq!(matched.len(), 1);
        assert_eq!(matched[0].name, "张三");
    }
}
