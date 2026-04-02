const DEFAULT_SELECTOR =
  "#app > section > section > section > div.box__left > section > div > div > div > div > div.el-table__body-wrapper.is-scrolling-none > table > tbody > tr.el-table__row.current-row > td.el-table_1_column_1.el-table__cell > div > div > section.user > div > span.f14.c333.username";

const DEFAULT_SETTINGS = {
  bridgeBaseUrl: "http://127.0.0.1:48123",
  adapterProfiles: [
    {
      id: "default-grading-page",
      name: "默认批改页",
      hostPattern: "*",
      primarySelector: DEFAULT_SELECTOR,
      fallbackSelectors: [
        DEFAULT_SELECTOR,
        "#app .el-table__row.current-row .username",
        "#app .el-table__row.current-row span.f14.c333.username",
        ".el-table__row.current-row .username",
        "section.user .username"
      ],
      anchorTexts: ["username", "当前学生"],
      enabled: true
    }
  ],
  hotkeysEnabled: true
};
