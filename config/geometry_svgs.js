window.JIUSHU_GEOMETRY_SVGS = (() => {
  const style = `
    <defs>
      <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" fill="#0288d1"></path>
      </marker>
    </defs>
    <style>
      .g-line{stroke:#24465f;stroke-width:3;fill:none;stroke-linecap:round;stroke-linejoin:round}
      .g-thin{stroke:#6d8da3;stroke-width:2;fill:none;stroke-dasharray:7 6}
      .g-fill-a{fill:rgba(2,136,209,.12);stroke:#0288d1;stroke-width:2}
      .g-fill-b{fill:rgba(76,175,80,.12);stroke:#4caf50;stroke-width:2}
      .g-label{font:700 18px "Noto Sans SC",sans-serif;fill:#20364a}
      .g-note{font:600 15px "Noto Sans SC",sans-serif;fill:#557084}
      .g-dot{fill:#0288d1;stroke:white;stroke-width:2}
    </style>`;

  function svg(body, height = 300) {
    return `<svg viewBox="0 0 520 ${height}" role="img" xmlns="http://www.w3.org/2000/svg">${style}${body}</svg>`;
  }

  function stripLatex(text) {
    return String(text || '')
      .replace(/\\begin\{[^}]+\}|\\end\{[^}]+\}/g, '')
      .replace(/\\\\/g, ' ')
      .replace(/[{}\\]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function numberAfter(text, pattern) {
    const match = text.match(pattern);
    return match ? Number(match[1]) : null;
  }

  function ratioFrom(text, pattern) {
    const match = text.match(pattern);
    return match ? [Number(match[1]), Number(match[2])] : null;
  }

  function parseHourglass(question, path) {
    const text = stripLatex(question && question.equation);
    const file = String(path || '').split('/').pop() || '';
    const isADBC = text.includes('AD平行BC') || /^053701002/.test(file);

    let top = null;
    let bottom = null;
    let topName = isADBC ? 'AD' : 'AB';
    let bottomName = isADBC ? 'BC' : 'DC';
    const facts = [];

    const abdc = ratioFrom(text, /AB\s*:\s*DC\s*=\s*(\d+)\s*:\s*(\d+)/);
    if (abdc) {
      top = abdc[0];
      bottom = abdc[1];
      topName = 'AB';
      bottomName = 'DC';
      facts.push(`AB:DC=${top}:${bottom}`);
    }

    const adbc = ratioFrom(text, /AD\s*:\s*BC\s*=\s*(\d+)\s*:\s*(\d+)/);
    if (adbc) {
      top = adbc[0];
      bottom = adbc[1];
      topName = 'AD';
      bottomName = 'BC';
      facts.push(`AD:BC=${top}:${bottom}`);
    }

    const abLen = numberAfter(text, /AB长(\d+)/);
    const dcLen = numberAfter(text, /DC长(\d+)/);
    if (abLen && dcLen) {
      top = abLen;
      bottom = dcLen;
      topName = 'AB';
      bottomName = 'DC';
      facts.push(`AB=${abLen}`, `DC=${dcLen}`);
    }

    const adLen = numberAfter(text, /AD长(\d+)/);
    const bcLen = numberAfter(text, /BC长(\d+)/);
    if (adLen && bcLen) {
      top = adLen;
      bottom = bcLen;
      topName = 'AD';
      bottomName = 'BC';
      facts.push(`AD=${adLen}`, `BC=${bcLen}`);
    }

    const doLen = numberAfter(text, /DO长(\d+)/);
    const obLen = numberAfter(text, /OB长(\d+)/);
    if (!top && !bottom && doLen && obLen) {
      top = obLen;
      bottom = doLen;
      facts.push(`DO=${doLen}`, `OB=${obLen}`);
    }

    const boDiffOd = numberAfter(text, /BO比OD长(\d+)/);
    if (boDiffOd && top && bottom) {
      const diffParts = Math.abs(bottom - top) || 1;
      const unit = boDiffOd / diffParts;
      facts.push(`BO:OD=${bottom}:${top}`, `BD=${(top + bottom) * unit}`);
    } else if (doLen || obLen) {
      if (doLen) facts.push(`DO=${doLen}`);
      if (obLen) facts.push(`OB=${obLen}`);
    }

    const acLen = numberAfter(text, /AC长(\d+)/);
    if (acLen) facts.push(`AC=${acLen}`);

    if (!top || !bottom) {
      top = 2;
      bottom = 1;
      facts.push(`${topName}:${bottomName}=示意`);
    }

    return { top, bottom, topName, bottomName, facts, isADBC };
  }

  function hourglass(question, path) {
    const params = parseHourglass(question, path);
    const total = Math.max(1, params.top + params.bottom);
    const topDraw = 150 + 180 * (params.top / Math.max(params.top, params.bottom));
    const bottomDraw = 150 + 180 * (params.bottom / Math.max(params.top, params.bottom));
    const cx = 260;
    const yTop = 70;
    const yBottom = 235;
    const ax = cx - topDraw / 2;
    const bx = cx + topDraw / 2;
    const dx = cx - bottomDraw / 2;
    const cX = cx + bottomDraw / 2;
    const t = params.top / total;
    const ox = ax + (cX - ax) * t;
    const oy = yTop + (yBottom - yTop) * t;
    const topRatio = `${params.topName}:${params.bottomName}=${params.top}:${params.bottom}`;
    const splitRatio = params.isADBC
      ? `BO:OD=${params.bottom}:${params.top}`
      : `DO:OB=${params.bottom}:${params.top}`;
    const topLeftLabel = params.isADBC ? 'A' : 'A';
    const topRightLabel = params.isADBC ? 'D' : 'B';
    const bottomLeftLabel = params.isADBC ? 'B' : 'D';
    const bottomRightLabel = params.isADBC ? 'C' : 'C';
    const facts = params.facts.slice(0, 4).map((fact, index) =>
      `<text class="g-note" x="22" y="${38 + index * 22}">${fact}</text>`
    ).join('');

    return svg(`
      <line class="g-line" x1="${ax}" y1="${yTop}" x2="${bx}" y2="${yTop}"></line>
      <line class="g-line" x1="${dx}" y1="${yBottom}" x2="${cX}" y2="${yBottom}"></line>
      <line class="g-line" x1="${ax}" y1="${yTop}" x2="${cX}" y2="${yBottom}"></line>
      <line class="g-line" x1="${bx}" y1="${yTop}" x2="${dx}" y2="${yBottom}"></line>
      <circle class="g-dot" cx="${ox}" cy="${oy}" r="6"></circle>
      <text class="g-label" x="${ax - 18}" y="${yTop - 12}">${topLeftLabel}</text>
      <text class="g-label" x="${bx + 8}" y="${yTop - 12}">${topRightLabel}</text>
      <text class="g-label" x="${dx - 18}" y="${yBottom + 28}">${bottomLeftLabel}</text>
      <text class="g-label" x="${cX + 8}" y="${yBottom + 28}">${bottomRightLabel}</text>
      <text class="g-label" x="${ox + 10}" y="${oy - 8}">O</text>
      <text class="g-note" x="186" y="32">${params.topName} ∥ ${params.bottomName}</text>
      <text class="g-note" x="326" y="112">${topRatio}</text>
      <text class="g-note" x="326" y="136">${splitRatio}</text>
      ${facts}
      <text class="g-note" x="110" y="286">严格对齐：平行边比例决定交点 O 在线段上的分割比例</text>
    `);
  }

  function pyramid() {
    return svg(`
      <polygon class="g-fill-a" points="260,48 92,238 428,238"></polygon>
      <line class="g-line" x1="260" y1="48" x2="260" y2="238"></line>
      <line class="g-thin" x1="150" y1="170" x2="370" y2="170"></line>
      <circle class="g-dot" cx="260" cy="48" r="5"></circle>
      <circle class="g-dot" cx="260" cy="170" r="5"></circle>
      <text class="g-label" x="268" y="46">A</text><text class="g-label" x="70" y="260">B</text>
      <text class="g-label" x="430" y="260">C</text><text class="g-label" x="268" y="166">O</text>
      <text class="g-note" x="138" y="286">金字塔模型：同高三角形，底边比 = 面积比</text>
    `);
  }

  function swallowtail() {
    return svg(`
      <polygon class="g-fill-a" points="260,45 80,245 440,245"></polygon>
      <line class="g-line" x1="260" y1="45" x2="180" y2="245"></line>
      <line class="g-line" x1="260" y1="45" x2="340" y2="245"></line>
      <line class="g-line" x1="100" y1="245" x2="420" y2="245"></line>
      <line class="g-thin" x1="180" y1="245" x2="340" y2="245"></line>
      <circle class="g-dot" cx="260" cy="45" r="5"></circle>
      <circle class="g-dot" cx="180" cy="245" r="5"></circle>
      <circle class="g-dot" cx="340" cy="245" r="5"></circle>
      <text class="g-label" x="268" y="42">A</text><text class="g-label" x="65" y="268">B</text>
      <text class="g-label" x="444" y="268">C</text><text class="g-label" x="166" y="268">D</text>
      <text class="g-label" x="334" y="268">E</text>
      <text class="g-note" x="115" y="286">燕尾模型：共高面积比，沿边分点比例传递</text>
    `);
  }

  function birdHead() {
    return svg(`
      <polygon class="g-fill-b" points="90,244 260,46 430,244"></polygon>
      <polygon class="g-fill-a" points="168,154 260,46 350,154"></polygon>
      <line class="g-line" x1="168" y1="154" x2="350" y2="154"></line>
      <line class="g-line" x1="168" y1="154" x2="90" y2="244"></line>
      <line class="g-line" x1="350" y1="154" x2="430" y2="244"></line>
      <circle class="g-dot" cx="168" cy="154" r="5"></circle>
      <circle class="g-dot" cx="350" cy="154" r="5"></circle>
      <text class="g-label" x="268" y="42">A</text><text class="g-label" x="70" y="268">B</text>
      <text class="g-label" x="435" y="268">C</text><text class="g-label" x="144" y="150">D</text>
      <text class="g-label" x="356" y="150">E</text>
      <text class="g-note" x="126" y="286">鸟头模型：两边同时取比例，小三角面积按乘积变化</text>
    `);
  }

  function get(path, question) {
    const file = String(path || '').split('/').pop() || '';
    if (/^05370[1235]/.test(file)) return hourglass(question, path);
    if (/^053704/.test(file)) return pyramid();
    if (/^05240/.test(file)) return swallowtail();
    if (/^051802/.test(file)) return birdHead();
    return '';
  }

  return { get };
})();
