export const viewTitles = {
  dashboard: { title: "总览工作台", note: "班级、作业、备份与当前会话全局概览" },
  students: { title: "学生档案", note: "维护名单、批量导入与班级归属" },
  "assignment-form": { title: "新建作业", note: "按章节组装题目并冻结本次花名册" },
  "assignment-detail": { title: "作业详情", note: "从学生维度和题目维度复盘本次作业" },
  grading: { title: "批改控制台", note: "围绕当前学生快速录入并即时纠偏" },
  settings: { title: "设置中心", note: "管理桥接、备份、导出和站点适配规则" }
} as const;
