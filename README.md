# 批改工作台

本地优先的教师作业批改统计工具，基于 `Tauri 2 + Rust + React + SQLite + Chrome MV3`。

## 已实现

- 班级、学生、作业的本地管理
- 作业创建时冻结班级花名册
- 单学生顺序批改会话
- `correct / incorrect / undo` 事务式写入与撤销
- 桌面端批改控制台与手动兜底
- 按题统计、按学生统计、自动判分
- CSV / Excel 学生名单导入
- CSV / Excel 作业报表导出
- 自动备份与手动恢复
- Chrome 扩展悬浮条、快捷键和 localhost bridge
- 页面适配配置，默认写入你提供的学生姓名 selector

## 项目结构

```text
.
├── extension/              # Chrome MV3 扩展
├── sample-data/            # 示例名单
├── shared/                 # 桌面前端与扩展共享协议
├── src/                    # React 桌面前端
├── src-tauri/              # Rust / Tauri 后端
└── task.md                 # 原始需求文档
```

## 运行桌面端

### 依赖

- Node.js 24+
- Rust 1.94+
- Tauri 2 所需系统依赖

### 开发模式

```bash
npm install
npm run tauri:dev
```

### 生产构建

```bash
npm run build
cd src-tauri
cargo check
```

## 加载 Chrome 扩展

1. 打开 Chrome 的 `chrome://extensions`
2. 开启“开发者模式”
3. 选择“加载已解压的扩展程序”
4. 选择仓库中的 `extension/` 目录
5. 打开扩展设置页，确认 bridge 地址和 selector

默认 bridge 地址是 `http://127.0.0.1:48123`。

默认学生姓名 selector：

```text
#app > section > section > section > div.box__left > section > div > div > div > div > div.el-table__body-wrapper.is-scrolling-none > table > tbody > tr.el-table__row.current-row > td.el-table_1_column_1.el-table__cell > div > div > section.user > div > span.f14.c333.username
```

## 使用流程

1. 在桌面端创建班级
2. 导入或录入学生名单
3. 新建作业并录入题目标识
4. 进入批改控制台，开始批改
5. 在网页批改系统中切换学生，扩展会自动识别姓名
6. 用悬浮条或快捷键 `A / S / Z` 完成录入
7. 在作业详情页查看学生视图和题目分析
8. 在设置页导出报表、生成模板或恢复备份

## 数据文件

- SQLite 数据库默认存放在系统本地应用数据目录下的 `grading-workbench/`
- 备份默认存放在文档目录下的 `grading-backups/`

## 示例数据

- [sample-data/example-roster.csv](sample-data/example-roster.csv)

## 已知限制

- 当前首发只内置一个主站点 selector profile，更多站点需要在扩展设置页自行配置
- 修改 bridge 端口后建议重启桌面端与扩展页面
- 作业编辑目前偏重“新建并冻结花名册”，不建议对已经开始批改的作业重排题目
