let state = {
  bridgeBaseUrl: DEFAULT_SETTINGS.bridgeBaseUrl,
  adapterProfiles: DEFAULT_SETTINGS.adapterProfiles,
  hotkeysEnabled: true,
  currentName: "",
  snapshot: null,
  ws: null,
  scanTimer: null,
  scoreSyncTimer: null,
  lastCommittedScoreKey: ""
};

const SCORE_SELECTORS = [
  "#app > section > section > section > div.box__right > div > section > section.answer__wrap > section.annotation.no-annotation > section.correction__cmp > section.correction > div > section:nth-child(1) > section > input",
  "#app > section > section > section > div.box__right > div > section > section.answer__wrap > section.annotation.no-annotation > section.correction__cmp > section.correction > div > section:nth-child(1) > section > div input",
  "#app > section > section > section > div.box__right > div > section > section.answer__wrap > section.annotation.no-annotation > section.correction__cmp > section.correction > div > section:nth-child(1) > section > p.yellow.f24.pr10",
  "#app .correction__cmp .correction .el-input__inner",
  "#app .correction__cmp .correction input",
  "#app .correction__cmp .correction p.yellow.f24.pr10",
  ".correction__cmp .el-input__inner",
  ".correction__cmp input",
  ".correction__cmp .yellow.f24.pr10",
  "input[placeholder*='分']",
  "p.yellow.f24.pr10"
];

const SCORE_CANDIDATE_SELECTORS = [
  "input",
  "textarea",
  ".el-input__inner",
  "[contenteditable='true']",
  "p.yellow.f24.pr10",
  ".yellow.f24.pr10"
];

const toolbar = createToolbar();
document.documentElement.appendChild(toolbar.root);

init().catch((error) => updateStatus(`初始化失败: ${String(error)}`));

async function init() {
  const stored = await chrome.storage.sync.get(["bridgeBaseUrl", "adapterProfiles", "hotkeysEnabled"]);
  state = { ...state, ...stored };
  lockToolbarToViewport();
  connectSocket();
  scanAndIdentify();
  observePage();
  window.addEventListener("keydown", onKeydown, true);
  window.addEventListener("resize", lockToolbarToViewport, { passive: true });
  window.visualViewport?.addEventListener("resize", lockToolbarToViewport, { passive: true });
  window.visualViewport?.addEventListener("scroll", lockToolbarToViewport, { passive: true });
}

function createToolbar() {
  const root = document.createElement("div");
  root.id = "grading-workbench-toolbar";
  root.innerHTML = `
    <style>
      #grading-workbench-toolbar {
        --toolbar-scale: 1;
        width: 286px;
        position: fixed;
        top: 18px;
        right: 18px;
        z-index: 2147483647;
        padding: 16px;
        border-radius: 22px;
        background: linear-gradient(180deg, rgba(251, 247, 239, 0.98), rgba(246, 239, 227, 0.96));
        border: 1px solid rgba(128, 103, 80, 0.16);
        box-shadow: 0 20px 44px rgba(52, 38, 27, 0.16), 0 2px 0 rgba(255, 255, 255, 0.35) inset;
        color: #36281f;
        font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
        transform: scale(var(--toolbar-scale));
        transform-origin: top right;
        max-width: calc(100vw - 24px);
        backdrop-filter: blur(16px);
      }
      #grading-workbench-toolbar .meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        font-size: 12px;
        color: #7a6857;
        letter-spacing: 0.02em;
      }
      #grading-workbench-toolbar .meta strong {
        font-weight: 600;
      }
      #grading-workbench-toolbar .student {
        font-size: 24px;
        line-height: 1.08;
        font-weight: 800;
        letter-spacing: -0.04em;
        margin: 10px 0 6px;
        color: #2f221a;
      }
      #grading-workbench-toolbar .question {
        font-size: 13px;
        color: #786555;
        margin-bottom: 12px;
        padding-bottom: 10px;
        border-bottom: 1px solid rgba(125, 105, 86, 0.12);
      }
      #grading-workbench-toolbar .question.done {
        color: #2a6a4f;
        font-weight: 800;
      }
      #grading-workbench-toolbar .actions {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
      }
      #grading-workbench-toolbar button {
        min-height: 74px;
        border: none;
        border-radius: 16px;
        padding: 0 10px;
        font-weight: 800;
        font-size: 14px;
        cursor: pointer;
        white-space: nowrap;
        box-shadow: 0 1px 0 rgba(255,255,255,0.45) inset;
        transition: transform 120ms ease, filter 120ms ease;
      }
      #grading-workbench-toolbar button:hover {
        transform: translateY(-1px);
        filter: saturate(1.03);
      }
      #grading-workbench-toolbar .ok { background: #dcefdc; color: #1f3c2d; }
      #grading-workbench-toolbar .bad { background: #f4d8d6; color: #4b2522; }
      #grading-workbench-toolbar .undo { background: #ebe2d8; color: #3c3027; }
      #grading-workbench-toolbar .status {
        margin-top: 12px;
        padding-top: 10px;
        border-top: 1px solid rgba(125, 105, 86, 0.12);
        font-size: 12px;
        line-height: 1.45;
        color: #7a6857;
        min-height: 18px;
      }
    </style>
    <div class="meta"><span>批改工作台</span><strong data-role="state">离线</strong></div>
    <div class="student" data-role="student">等待识别</div>
    <div class="question" data-role="question">题号: -</div>
    <div class="actions">
      <button class="ok" data-action="correct">A 对</button>
      <button class="bad" data-action="incorrect">S 错</button>
      <button class="undo" data-action="undo">Z 上一题</button>
    </div>
    <div class="status" data-role="status">准备连接桌面端…</div>
  `;
  root.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => sendAction(button.dataset.action)));
  return {
    root,
    state: root.querySelector('[data-role="state"]'),
    student: root.querySelector('[data-role="student"]'),
    question: root.querySelector('[data-role="question"]'),
    status: root.querySelector('[data-role="status"]')
  };
}

function lockToolbarToViewport() {
  const viewport = window.visualViewport;
  const scale = viewport?.scale ? 1 / viewport.scale : 1;
  toolbar.root.style.setProperty("--toolbar-scale", String(scale));
}

function observePage() {
  const observer = new MutationObserver(() => {
    scheduleScan();
    scheduleScoreSync();
  });
  observer.observe(document.body, { subtree: true, childList: true, characterData: true });
  window.setInterval(() => {
    scanAndIdentify();
    syncScoreToPage(state.snapshot);
  }, 1200);
}

function scheduleScan() {
  if (state.scanTimer) {
    window.clearTimeout(state.scanTimer);
  }
  state.scanTimer = window.setTimeout(() => {
    state.scanTimer = null;
    scanAndIdentify();
  }, 120);
}

function scanAndIdentify() {
  const profile = pickProfile(location.href, state.adapterProfiles);
  if (!profile) return;
  const nextName = extractStudentName(profile);
  if (!nextName || nextName === state.currentName) return;
  state.currentName = nextName;
  state.lastCommittedScoreKey = "";
  toolbar.student.textContent = nextName;
  identifyStudent(nextName).catch((error) => updateStatus(`识别失败: ${String(error)}`));
}

function pickProfile(url, profiles) {
  return profiles.find((profile) => profile.enabled && (profile.hostPattern === "*" || url.includes(profile.hostPattern)));
}

function extractStudentName(profile) {
  const selectors = [
    profile.primarySelector,
    ...(profile.fallbackSelectors || []),
    "#app .el-table__row.current-row .username",
    "#app .el-table__row.current-row span.f14.c333.username",
    ".el-table__row.current-row .username",
    "section.user .username"
  ].filter(Boolean);
  for (const selector of selectors) {
    const node = document.querySelector(selector);
    const text = normalizeStudentName(node?.textContent);
    if (text) return text;
  }
  const currentRow = document.querySelector(".el-table__row.current-row");
  const currentRowName = normalizeStudentName(currentRow?.querySelector(".username")?.textContent);
  if (currentRowName) return currentRowName;

  const all = Array.from(document.querySelectorAll("span, div, td"));
  const anchors = (profile.anchorTexts || []).filter(Boolean);
  for (const anchor of anchors) {
    const anchoredNode = all.find((node) => node.textContent?.includes(anchor));
    const text = normalizeStudentName(anchoredNode?.textContent);
    if (text && text !== anchor) {
      return text;
    }
  }
  return "";
}

function normalizeStudentName(raw) {
  return (raw || "")
    .replace(/\s+/g, " ")
    .replace(/当前学生[:：]?\s*/g, "")
    .trim();
}

async function identifyStudent(rawName) {
  const response = await fetch(`${state.bridgeBaseUrl}/api/bridge/identify-student`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rawName, sourceUrl: location.href })
  });
  const payload = await readJsonResponse(response);
  applySnapshot(payload.snapshot);
}

async function sendAction(action) {
  try {
    if (state.snapshot?.currentStudentCompleted) {
      updateStatus(`该学生已完成，当前分数 ${state.snapshot.predictedScore} 分`);
      return;
    }
    const response = await fetch(`${state.bridgeBaseUrl}/api/bridge/grade-action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        rawStudentName: state.currentName,
        clientEventId: `${action}-${Date.now()}`
      })
    });
    applySnapshot(await readJsonResponse(response));
  } catch (error) {
    updateStatus(`发送失败: ${String(error)}`);
  }
}

function connectSocket() {
  try {
    state.ws = new WebSocket(state.bridgeBaseUrl.replace("http", "ws") + "/ws");
    state.ws.addEventListener("open", () => updateStatus("已连接桌面端"));
    state.ws.addEventListener("message", (event) => applySnapshot(JSON.parse(event.data)));
    state.ws.addEventListener("close", () => {
      toolbar.state.textContent = "离线";
      updateStatus("连接已断开，3 秒后重连");
      window.setTimeout(connectSocket, 3000);
    });
  } catch (error) {
    updateStatus(`WebSocket 失败: ${String(error)}`);
  }
}

function applySnapshot(snapshot) {
  state.snapshot = snapshot;
  toolbar.state.textContent = snapshot.connectionState === "connected" ? "在线" : "离线";
  toolbar.student.textContent = snapshot.currentStudentName || state.currentName || "等待识别";
  if (snapshot.currentStudentCompleted) {
    toolbar.question.textContent = `已完成 · ${snapshot.predictedScore} 分`;
    toolbar.question.classList.add("done");
  } else {
    toolbar.question.textContent = `题号: ${snapshot.currentQuestionLabel || "-"} (${snapshot.questionIndex}/${snapshot.questionCount})`;
    toolbar.question.classList.remove("done");
  }
  scheduleScoreSync();
  updateStatus(snapshot.lastAction || "等待操作");
}

function scheduleScoreSync() {
  if (state.scoreSyncTimer) {
    window.clearTimeout(state.scoreSyncTimer);
  }
  state.scoreSyncTimer = window.setTimeout(() => {
    state.scoreSyncTimer = null;
    syncScoreToPage(state.snapshot);
  }, 80);
}

function syncScoreToPage(snapshot) {
  if (!snapshot) return;
  const commitKey = buildScoreCommitKey(snapshot);
  if (!commitKey) return;
  if (state.lastCommittedScoreKey === commitKey) return;
  const node = findScoreNode();
  if (!node) return;
  const nextScore = String(snapshot.predictedScore);
  const currentValue = readNodeValue(node);
  if (currentValue === nextScore) {
    state.lastCommittedScoreKey = commitKey;
    return;
  }
  writeNodeValue(node, nextScore);
  node.dispatchEvent(new InputEvent("input", { bubbles: true, data: nextScore, inputType: "insertText" }));
  node.dispatchEvent(new Event("change", { bubbles: true }));
  node.dispatchEvent(new Event("blur", { bubbles: true }));
  state.lastCommittedScoreKey = commitKey;
  updateStatus(`已回填 ${nextScore} 分`);
}

function findScoreNode() {
  const scoreLabels = Array.from(document.querySelectorAll("label, span, p, div"))
    .filter((node) => normalizeLabel(node.textContent) === "得分");
  for (const label of scoreLabels) {
    const contextualNode = findScoreNodeNear(label);
    if (contextualNode) return contextualNode;
  }

  for (const selector of SCORE_SELECTORS) {
    const node = normalizeWritableNode(document.querySelector(selector));
    if (node) return node;
  }
  return null;
}

function findScoreNodeNear(label) {
  const containers = [
    label.closest(".el-form-item"),
    label.closest("[class*='score']"),
    label.parentElement,
    label.parentElement,
    label.closest("section"),
    label.closest(".correction"),
    label.closest(".correction__cmp"),
    document.querySelector(".correction__cmp"),
    document.querySelector(".box__right")
  ].filter(Boolean);
  for (const container of containers) {
    const node = pickClosestScoreCandidate(label, container);
    if (node) return node;
  }
  return null;
}

function pickClosestScoreCandidate(label, container) {
  const labelRect = label.getBoundingClientRect();
  const candidates = [];
  for (const selector of SCORE_CANDIDATE_SELECTORS) {
    for (const rawNode of container.querySelectorAll(selector)) {
      const node = normalizeWritableNode(rawNode);
      if (!node || node === label || label.contains(node)) continue;
      if (node instanceof HTMLTextAreaElement) continue;
      const rect = node.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      const verticalDistance = Math.abs(rect.top - labelRect.top);
      const horizontalDistance = rect.left >= labelRect.left - 24 ? rect.left - labelRect.left : 9999;
      const rowBonus = verticalDistance <= 36 ? -400 : 0;
      const inputBonus = node instanceof HTMLInputElement ? -300 : 0;
      const areaPenalty = rect.height > 80 || rect.width > 320 ? 2000 : 0;
      const score = verticalDistance * 4 + horizontalDistance + areaPenalty + rowBonus + inputBonus;
      candidates.push({ node, score, verticalDistance });
    }
  }
  candidates.sort((a, b) => a.score - b.score);
  const best = candidates.find((item) => item.verticalDistance <= 120) || candidates[0];
  return best?.node ?? null;
}

function buildScoreCommitKey(snapshot) {
  if (!snapshot.currentStudentCompleted) return "";
  const studentKey = snapshot.currentStudentId || snapshot.currentStudentName || "";
  if (!studentKey) return "";
  return `${studentKey}:${snapshot.predictedScore}:${snapshot.gradedCount}:${snapshot.questionCount}`;
}

function normalizeWritableNode(node) {
  if (!node) return null;
  if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) return node;
  if (node.isContentEditable) return node;
  const descendant = node.querySelector?.("input, textarea, .el-input__inner, [contenteditable='true']");
  if (descendant instanceof HTMLInputElement || descendant instanceof HTMLTextAreaElement) return descendant;
  if (descendant?.isContentEditable) return descendant;
  return node;
}

function normalizeLabel(raw) {
  return (raw || "").replace(/\s+/g, "").replace(/[＊*：:]/g, "");
}

function readNodeValue(node) {
  if ("value" in node && typeof node.value === "string") {
    return node.value.trim();
  }
  return (node.textContent || "").trim();
}

function writeNodeValue(node, value) {
  if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
      || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(node), "value")?.set;
    node.focus();
    node.click();
    if (setter) {
      setter.call(node, value);
    } else {
      node.value = value;
    }
    node.setAttribute("value", value);
    node.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Backspace" }));
    node.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "Backspace" }));
    return;
  }
  if (node.isContentEditable) {
    node.focus();
    node.innerText = value;
    return;
  }
  node.textContent = value;
}

async function readJsonResponse(response) {
  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || `请求失败: ${response.status}`);
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(text || String(error));
  }
}

function updateStatus(message) {
  toolbar.status.textContent = message;
}

function onKeydown(event) {
  if (!state.hotkeysEnabled) return;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
  if (event.key.toLowerCase() === "a") sendAction("correct");
  if (event.key.toLowerCase() === "s") sendAction("incorrect");
  if (event.key.toLowerCase() === "z") sendAction("undo");
}
