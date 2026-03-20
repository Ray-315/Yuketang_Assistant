let state = {
  bridgeBaseUrl: DEFAULT_SETTINGS.bridgeBaseUrl,
  adapterProfiles: DEFAULT_SETTINGS.adapterProfiles,
  hotkeysEnabled: true,
  currentName: "",
  snapshot: null,
  ws: null
};

const toolbar = createToolbar();
document.documentElement.appendChild(toolbar.root);

init().catch((error) => updateStatus(`初始化失败: ${String(error)}`));

async function init() {
  const stored = await chrome.storage.sync.get(["bridgeBaseUrl", "adapterProfiles", "hotkeysEnabled"]);
  state = { ...state, ...stored };
  connectSocket();
  scanAndIdentify();
  observePage();
  window.addEventListener("keydown", onKeydown, true);
}

function createToolbar() {
  const root = document.createElement("div");
  root.id = "grading-workbench-toolbar";
  root.innerHTML = `
    <style>
      #grading-workbench-toolbar {
        position: fixed; top: 20px; right: 20px; z-index: 2147483647; width: 228px;
        padding: 14px; border-radius: 18px; background: rgba(247, 242, 233, 0.96);
        border: 1px solid rgba(108, 87, 70, 0.18); box-shadow: 0 12px 32px rgba(50, 32, 24, 0.18);
        color: #3a2c22; font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
      }
      #grading-workbench-toolbar .meta { display:flex; justify-content:space-between; gap:12px; font-size:12px; color:#6d5c52; }
      #grading-workbench-toolbar .student { font-size:18px; font-weight:700; margin:8px 0 4px; }
      #grading-workbench-toolbar .question { font-size:13px; color:#7b675b; margin-bottom:10px; }
      #grading-workbench-toolbar .question.done { color:#2f6b4f; font-weight:700; }
      #grading-workbench-toolbar .actions { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; }
      #grading-workbench-toolbar button { border:none; border-radius:12px; padding:10px 8px; font-weight:700; cursor:pointer; }
      #grading-workbench-toolbar .ok { background:#d6efe0; }
      #grading-workbench-toolbar .bad { background:#f2d8d5; }
      #grading-workbench-toolbar .undo { background:#ece3db; }
      #grading-workbench-toolbar .status { margin-top:10px; font-size:12px; color:#6d5c52; min-height:18px; }
    </style>
    <div class="meta"><span>批改工作台</span><span data-role="state">离线</span></div>
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

function observePage() {
  const observer = new MutationObserver(() => scanAndIdentify());
  observer.observe(document.body, { subtree: true, childList: true, characterData: true });
  window.setInterval(scanAndIdentify, 1200);
}

function scanAndIdentify() {
  const profile = pickProfile(location.href, state.adapterProfiles);
  if (!profile) return;
  const nextName = extractStudentName(profile);
  if (!nextName || nextName === state.currentName) return;
  state.currentName = nextName;
  toolbar.student.textContent = nextName;
  identifyStudent(nextName).catch((error) => updateStatus(`识别失败: ${String(error)}`));
}

function pickProfile(url, profiles) {
  return profiles.find((profile) => profile.enabled && (profile.hostPattern === "*" || url.includes(profile.hostPattern)));
}

function extractStudentName(profile) {
  const selectors = [profile.primarySelector, ...(profile.fallbackSelectors || [])].filter(Boolean);
  for (const selector of selectors) {
    const node = document.querySelector(selector);
    const text = node?.textContent?.trim();
    if (text) return text;
  }
  const all = Array.from(document.querySelectorAll("span, div, td"));
  const anchor = (profile.anchorTexts || []).find((item) => item);
  const anchoredNode = all.find((node) => node.textContent?.includes(anchor));
  return anchoredNode?.textContent?.trim() || "";
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
  updateStatus(snapshot.lastAction || "等待操作");
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
