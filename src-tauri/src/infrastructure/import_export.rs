use crate::domain::models::AssignmentOverview;
use crate::error::{AppError, AppResult};
use calamine::{open_workbook_auto, Reader};
use csv::{ReaderBuilder, WriterBuilder};
use rust_xlsxwriter::Workbook;

#[derive(Debug, Clone)]
pub struct ImportedStudentRow {
    pub name: String,
    pub student_no: Option<String>,
    pub notes: Option<String>,
}

pub fn read_student_rows(path: &str) -> AppResult<Vec<ImportedStudentRow>> {
    if path.ends_with(".csv") {
        return read_student_rows_from_csv(path);
    }
    read_student_rows_from_xlsx(path)
}

pub fn write_student_template(path: &str, format: &str) -> AppResult<()> {
    match format {
        "csv" => {
            let mut writer = WriterBuilder::new().from_path(path)?;
            writer.write_record(["姓名", "学号", "备注"])?;
            writer.flush()?;
        }
        _ => {
            let mut workbook = Workbook::new();
            let sheet = workbook.add_worksheet();
            sheet.write_string(0, 0, "姓名")?;
            sheet.write_string(0, 1, "学号")?;
            sheet.write_string(0, 2, "备注")?;
            workbook.save(path)?;
        }
    }
    Ok(())
}

pub fn write_assignment_export(path: &str, format: &str, detail: &AssignmentOverview) -> AppResult<()> {
    match format {
        "csv" => write_assignment_csv(path, detail),
        _ => write_assignment_xlsx(path, detail),
    }
}

fn read_student_rows_from_csv(path: &str) -> AppResult<Vec<ImportedStudentRow>> {
    let mut reader = ReaderBuilder::new().flexible(true).from_path(path)?;
    let mut rows = Vec::new();
    for record in reader.records() {
        let record = record?;
        if record.get(0).unwrap_or("").contains("姓名") {
            continue;
        }
        let name = record.get(0).unwrap_or("").trim();
        if name.is_empty() {
            continue;
        }
        rows.push(ImportedStudentRow {
            name: name.into(),
            student_no: record.get(1).map(str::trim).filter(|value| !value.is_empty()).map(String::from),
            notes: record.get(2).map(str::trim).filter(|value| !value.is_empty()).map(String::from),
        });
    }
    Ok(rows)
}

fn read_student_rows_from_xlsx(path: &str) -> AppResult<Vec<ImportedStudentRow>> {
    let mut workbook = open_workbook_auto(path).map_err(|error| AppError::Message(error.to_string()))?;
    let sheet_name = workbook.sheet_names().first().cloned().ok_or_else(|| AppError::Message("Excel 没有工作表".into()))?;
    let range = workbook.worksheet_range(&sheet_name).map_err(|error| AppError::Message(error.to_string()))?;
    let mut rows = Vec::new();
    for (index, row) in range.rows().enumerate() {
        if index == 0 {
            continue;
        }
        let name = row.first().map(|cell| cell.to_string()).unwrap_or_default();
        let name = name.trim().to_string();
        if name.is_empty() {
            continue;
        }
        rows.push(ImportedStudentRow {
            name,
            student_no: row.get(1).map(|cell| cell.to_string()).filter(|value| !value.trim().is_empty()),
            notes: row.get(2).map(|cell| cell.to_string()).filter(|value| !value.trim().is_empty()),
        });
    }
    Ok(rows)
}

fn write_assignment_csv(path: &str, detail: &AssignmentOverview) -> AppResult<()> {
    let mut writer = WriterBuilder::new().from_path(path)?;
    writer.write_record(["学生", "错题数", "已批题数", "得分"])?;
    for student in &detail.students {
        writer.write_record([
            student.student_name.clone(),
            student.wrong_count.to_string(),
            student.graded_count.to_string(),
            student
                .score
                .map(|score| score.to_string())
                .unwrap_or_else(|| "未出分".into()),
        ])?;
    }
    writer.flush()?;
    Ok(())
}

fn write_assignment_xlsx(path: &str, detail: &AssignmentOverview) -> AppResult<()> {
    let mut workbook = Workbook::new();
    let summary = workbook.add_worksheet();
    summary.write_string(0, 0, "学生")?;
    summary.write_string(0, 1, "错题数")?;
    summary.write_string(0, 2, "已批题数")?;
    summary.write_string(0, 3, "得分")?;
    for (index, student) in detail.students.iter().enumerate() {
        let row = (index + 1) as u32;
        summary.write_string(row, 0, &student.student_name)?;
        summary.write_number(row, 1, student.wrong_count as f64)?;
        summary.write_number(row, 2, student.graded_count as f64)?;
        if let Some(score) = student.score {
            summary.write_number(row, 3, score as f64)?;
        } else {
            summary.write_string(row, 3, "未出分")?;
        }
    }
    let questions = workbook.add_worksheet();
    questions.write_string(0, 0, "题号")?;
    questions.write_string(0, 1, "正确率")?;
    questions.write_string(0, 2, "错误率")?;
    for (index, row) in detail.questions_stats.iter().enumerate() {
        let excel_row = (index + 1) as u32;
        questions.write_string(excel_row, 0, &row.question_label)?;
        questions.write_number(excel_row, 1, row.correct_rate)?;
        questions.write_number(excel_row, 2, row.incorrect_rate)?;
    }
    workbook.save(path)?;
    Ok(())
}
