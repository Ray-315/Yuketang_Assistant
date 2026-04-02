import { useEffect, useMemo, useState, type CSSProperties } from "react";
import "../showcase.css";

type Pulse = {
  label: string;
  value: string;
  note: string;
};

const pulses: Pulse[] = [
  { label: "批改吞吐", value: "128 / h", note: "热区被重新编排，下一位学生始终提前半步浮现。" },
  { label: "决策置信", value: "96.4%", note: "统计与评分轨迹同步呼吸，不再把老师扔进冷冰冰的表格里。" },
  { label: "注意力负荷", value: "-31%", note: "把重复动作改造成顺手的手势，视觉把重要信号自动推到前景。" },
];

const rails = [
  "LIVE FEEDBACK",
  "EDITORIAL UTILITY",
  "MOTION WITH DISCIPLINE",
  "GRADING COCKPIT",
  "LOCAL-FIRST RHYTHM",
];

const constellations = [
  {
    title: "Scene 01",
    heading: "把批改工作台做成一块会呼吸的仪表盘",
    body: "每一次 hover、切换和聚焦都像精密设备的机械回弹，轻、准、连贯，不靠夸张特效刷存在感。",
  },
  {
    title: "Scene 02",
    heading: "让批改节奏自己发光",
    body: "滚动时信息轨道错位推进，状态层在背景里缓慢流动，像是在看一台持续运转的教学引擎。",
  },
  {
    title: "Scene 03",
    heading: "把操作压缩成高能量的几秒",
    body: "顶部主视觉是一个夸张版的工作流总线，右侧指标卡像调音台一样实时起伏，纯前端也能很能打。",
  },
];

const deck = [
  { name: "Board", summary: "多层景深背景、游走光斑、可追踪鼠标的视差核心区。", accent: "Parallax core" },
  { name: "Pulse", summary: "主 KPI 卡组带有延迟入场和悬停抬升，边缘跟随高亮。", accent: "Stagger + hover" },
  { name: "Ribbon", summary: "无缝轨道文案循环滚动，把品牌气氛和节奏一起拉满。", accent: "Infinite loop" },
  { name: "Signal", summary: "细线扫描、网格呼吸、弱透视旋转，保持炫但不乱。", accent: "Ambient motion" },
];

const phases = [
  { id: "01", title: "导入作业", detail: "答案结构被拆解成可追踪片段，像把纸面搬进高速工作流。" },
  { id: "02", title: "滑行批改", detail: "当前学生、待复核题目与信号栏同步推进，不给操作留下空白拍。" },
  { id: "03", title: "追踪汇总", detail: "状态收束成可行动的统计层，让老师下一步决策不必重新理解数据。" },
];

const students = [
  { name: "林知夏", score: "92", status: "已完成", note: "步骤完整，建议在第 4 题旁追加一个鼓励批注。", tempo: "快节奏" },
  { name: "沈临川", score: "76", status: "待复核", note: "计算思路接近正确，但单位换算遗漏，适合重点追踪。", tempo: "需回看" },
  { name: "周见微", score: "88", status: "进行中", note: "主观题表达清晰，系统建议先处理客观题再回收整体评价。", tempo: "稳定推进" },
];

function useShowcaseHash() {
  const [enabled, setEnabled] = useState(() => window.location.hash === "#showcase");

  useEffect(() => {
    const onHashChange = () => setEnabled(window.location.hash === "#showcase");
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return enabled;
}

export function useShowcaseMode() {
  return useShowcaseHash();
}

export function ShowcasePage() {
  const [pointer, setPointer] = useState({ x: 0.52, y: 0.38 });
  const [activePulse, setActivePulse] = useState(0);
  const [activeStudent, setActiveStudent] = useState(1);
  const showcaseUrl = `${window.location.origin}${window.location.pathname}#showcase`;

  useEffect(() => {
    const id = window.setInterval(() => {
      setActivePulse((current) => (current + 1) % pulses.length);
    }, 2200);
    return () => window.clearInterval(id);
  }, []);

  const pointerStyle = useMemo(
    () =>
      ({
        "--mx": `${(pointer.x * 100).toFixed(2)}%`,
        "--my": `${(pointer.y * 100).toFixed(2)}%`,
      }) as CSSProperties,
    [pointer],
  );

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    setPointer({ x, y });
  };

  return (
    <main className="showcase-shell" style={pointerStyle} onPointerMove={handlePointerMove}>
      <div className="showcase-noise" aria-hidden="true" />
      <section className="showcase-hero">
        <div className="hero-copy">
          <p className="showcase-kicker">Subagent Demo / Frontend Overdrive</p>
          <h1>把教师工作台，抬进一场会流动的前端秀。</h1>
          <p className="hero-body">
            这个页面专门拿来秀肌肉: 视差背景、轨道文案、分层卡片、扫描光束、浮动信号和成组入场都在同一个纯
            React + CSS 的 demo 里协同工作。
          </p>
          <div className="hero-actions">
            <a href="#" className="showcase-button showcase-button-primary">回到工作台</a>
            <a href="#showcase" className="showcase-button showcase-button-ghost">锁定展示模式</a>
          </div>
        </div>

        <div className="hero-stage">
          <div className="stage-halo" aria-hidden="true" />
          <div className="stage-grid" aria-hidden="true" />
          <div className="stage-panel stage-panel-main">
            <span>Rhythm Engine</span>
            <strong>批改动线被重新编排</strong>
            <p>焦点卡、学生序列和答题轨迹同时推进，像在看一块通电的控制台。</p>
          </div>
          <div className="stage-panel stage-panel-side">
            <span>Realtime Layer</span>
            <strong>{pulses[activePulse]?.value}</strong>
            <p>{pulses[activePulse]?.label}</p>
          </div>
          <div className="signal-column" aria-label="animated metrics">
            {pulses.map((pulse, index) => (
              <article
                key={pulse.label}
                className={`signal-card${index === activePulse ? " active" : ""}`}
                onMouseEnter={() => setActivePulse(index)}
              >
                <small>{pulse.label}</small>
                <strong>{pulse.value}</strong>
                <p>{pulse.note}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="showcase-rail" aria-label="moving highlights">
        <div className="rail-track">
          {[...rails, ...rails].map((item, index) => (
            <span key={`${item}-${index}`}>{item}</span>
          ))}
        </div>
      </section>

      <section className="showcase-story">
        <div className="story-head">
          <p className="showcase-kicker">What The Subagent Helped Shape</p>
          <h2>主代理负责实现，子代理负责并行探索视觉方向。</h2>
        </div>
        <div className="story-grid">
          {constellations.map((item) => (
            <article key={item.title} className="story-card">
              <p>{item.title}</p>
              <h3>{item.heading}</h3>
              <span>{item.body}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="showcase-flow">
        <div className="flow-copy">
          <p className="showcase-kicker">Kinetic Ledger</p>
          <h2>从导入到汇总，整条批改流程被做成了一条会推进的舞台轨道。</h2>
        </div>
        <div className="flow-line">
          {phases.map((phase, index) => (
            <article key={phase.id} className="flow-step" style={{ "--step": index } as CSSProperties}>
              <span>{phase.id}</span>
              <h3>{phase.title}</h3>
              <p>{phase.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="showcase-deck">
        <div className="deck-copy">
          <p className="showcase-kicker">Motion Inventory</p>
          <h2>不加依赖，也能把浏览器的表现力榨出来。</h2>
          <p>
            这套页面故意避开新库，用原生 CSS 动画、渐变、遮罩、透视和少量 React 状态做出一套可运行的“技术炫技页”。
          </p>
        </div>
        <div className="deck-grid">
          {deck.map((item, index) => (
            <article key={item.name} className="deck-card" style={{ "--index": index } as CSSProperties}>
              <small>{item.accent}</small>
              <h3>{item.name}</h3>
              <p>{item.summary}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="showcase-console">
        <div className="console-copy">
          <p className="showcase-kicker">Interactive Sample</p>
          <h2>切一下学生，右侧详情就跟着切，专门演示“反馈很快”这件事。</h2>
        </div>
        <div className="console-grid">
          <div className="console-list" role="tablist" aria-label="students">
            {students.map((student, index) => (
              <button
                key={student.name}
                type="button"
                className={`console-student${index === activeStudent ? " active" : ""}`}
                onClick={() => setActiveStudent(index)}
              >
                <strong>{student.name}</strong>
                <span>{student.status}</span>
                <small>{student.tempo}</small>
              </button>
            ))}
          </div>
          <article className="console-detail" key={students[activeStudent]?.name}>
            <p>当前焦点</p>
            <h3>{students[activeStudent]?.name}</h3>
            <div className="console-metrics">
              <div>
                <small>评分</small>
                <strong>{students[activeStudent]?.score}</strong>
              </div>
              <div>
                <small>状态</small>
                <strong>{students[activeStudent]?.status}</strong>
              </div>
            </div>
            <span>{students[activeStudent]?.note}</span>
          </article>
        </div>
      </section>

      <section className="showcase-footer">
        <p className="showcase-kicker">Reduced Motion Ready</p>
        <h2>如果系统开启了减少动态效果，这些动画会自动收敛成静态分层版式。</h2>
        <p>
          入口方式: 在地址后面加上 <code>#showcase</code>，比如本地开发时打开
          <code>{` ${showcaseUrl}`}</code>。
        </p>
      </section>
    </main>
  );
}
