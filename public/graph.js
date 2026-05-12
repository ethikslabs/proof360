const statusText = document.getElementById('status-text');
const statusDot = document.getElementById('status-dot');
const stopBtn = document.getElementById('stop-btn');
const exportBtn = document.getElementById('export-btn');
const reportPanel = document.getElementById('report-panel');

const nodes = [{ id: 'entity', nodeType: 'entity', label: 'Target', status: 'active' }];
const edges = [];

const SECTIONS = [
  { id: 'company_snapshot', title: 'Company Snapshot' },
  { id: 'email_security', title: 'Email Security' },
  { id: 'tls', title: 'TLS / Certificate' },
  { id: 'breach', title: 'Data Breach History' },
  { id: 'web_intelligence', title: 'Web Intelligence' },
  { id: 'signal_extraction', title: 'Signal Extraction' },
  { id: 'evidence_sources', title: 'Evidence Sources' },
  { id: 'trust_gaps', title: 'Trust Gaps' },
  { id: 'programs', title: 'AWS Programs' },
  { id: 'spv_context', title: 'SPV Context' },
];

function initReport() {
  reportPanel.innerHTML = '';
  for (const s of SECTIONS) {
    const card = document.createElement('div');
    card.className = 'section-card';
    card.id = `section-${s.id}`;
    card.innerHTML = `<div class="section-title">${s.title}</div><div class="section-body skeleton">—</div>`;
    reportPanel.appendChild(card);
  }
}
initReport();

const es = new EventSource('/events');

es.onopen = () => {
  statusText.textContent = 'Connected';
  stopBtn.style.display = 'block';
};

es.onerror = () => {
  statusDot.textContent = '⚠';
  statusText.textContent = 'Connection lost';
};

es.onmessage = (e) => {
  try { handleEvent(JSON.parse(e.data)); } catch (_) {}
};

function handleEvent(event) {
  switch (event.type) {
    case 'node_start':
      upsertNode(event.id, event.nodeType, event.label, 'loading');
      renderGraph();
      break;
    case 'node_complete':
      upsertNode(event.id, event.nodeType, event.label, event.ok ? 'done' : 'error');
      renderGraph();
      break;
    case 'edge':
      edges.push({ source: event.from, target: event.to });
      renderGraph();
      break;
    case 'report_section':
      fillSection(event.section, event.content);
      break;
    case 'depth_change':
      statusText.textContent = event.label;
      break;
    case 'interactive':
      statusText.textContent = event.label;
      stopBtn.style.display = 'none';
      statusDot.textContent = '⏳';
      break;
    case 'complete':
      statusDot.textContent = '✓';
      statusText.textContent = event.stoppedAt ? `Done (stopped at ${event.stoppedAt})` : 'Done';
      stopBtn.style.display = 'none';
      exportBtn.style.display = 'block';
      break;
  }
}

function upsertNode(id, nodeType, label, status) {
  const existing = nodes.find(n => n.id === id);
  if (existing) { existing.status = status; existing.nodeType = nodeType; existing.label = label; }
  else nodes.push({ id, nodeType, label, status });
}

function fillSection(sectionId, content) {
  const card = document.getElementById(`section-${sectionId}`);
  if (!card) return;
  card.classList.add('active');
  card.querySelector('.section-body').classList.remove('skeleton');
  card.querySelector('.section-body').textContent = content.summary ?? JSON.stringify(content);
}

function sendStop() {
  fetch('/stop', { method: 'POST' });
  stopBtn.disabled = true;
  stopBtn.textContent = 'Stopping...';
}

async function exportSvg() {
  const svgEl = document.getElementById('graph-svg');
  const clone = svgEl.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('width', '100%');
  bg.setAttribute('height', '100%');
  bg.setAttribute('fill', '#f2ede4');
  clone.insertBefore(bg, clone.firstChild);

  const imgEls = Array.from(clone.querySelectorAll('image[href]'));
  await Promise.all(imgEls.map(async (img) => {
    const href = img.getAttribute('href');
    if (!href || href === '') return;
    try {
      const res = await fetch(href);
      const buf = await res.arrayBuffer();
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      const ct = res.headers.get('content-type') || 'image/png';
      img.setAttribute('href', `data:${ct};base64,${b64}`);
    } catch { /* leave as-is if fetch fails */ }
  }));

  const desc = document.createElementNS('http://www.w3.org/2000/svg', 'desc');
  desc.textContent = JSON.stringify({
    generated: new Date().toISOString(), tool: 'proof360',
    nodes: nodes.map(n => ({ id: n.id, nodeType: n.nodeType, label: n.label, status: n.status })),
    edges: edges.map(e => ({ from: e.source?.id ?? e.source, to: e.target?.id ?? e.target })),
  });
  clone.prepend(desc);
  const serialized = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([serialized], { type: 'image/svg+xml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `proof360-provenance-${Date.now()}.svg`;
  a.click();
}

// D3 graph rendering
const BRAND_ICONS = {
  hibp:         'https://cdn.simpleicons.org/haveibeenpwned/5390f5',
  github:       'https://cdn.simpleicons.org/github/e2e8f0',
  anthropic:    'https://cdn.simpleicons.org/anthropic/D97706',
  nvidia:       'https://cdn.simpleicons.org/nvidia/76B900',
  cloudflare:   'https://cdn.simpleicons.org/cloudflare/F6821F',
  cisco:        'https://cdn.simpleicons.org/cisco/1BA0D7',
};

const ABBREV = {
  entity:'@', firecrawl:'FC', dns:'DNS', ssl:'SSL', abuseipdb:'AIP',
  ports:'PORT', ip_asn:'ASN', http_headers:'HDR', whois:'WIS',
  vector:'VEC', nova_lite:'NL', sonar:'SON', corpus:'COR',
  gap_analysis:'GAP', aws_programs:'AWS', spv:'SPV',
  doc_soc2:'SOC2', doc_iso27001:'ISO', doc_apra:'APRA',
  doc_essential8:'ES8', doc_gdpr:'GDPR',
  vendor_vanta:'VAN', vendor_dicker:'DD',
};

function brandFor(node) {
  if (node.id === 'entity' && node.label && node.label !== 'Target')
    return `/proxy-favicon?domain=${encodeURIComponent(node.label)}`;
  return BRAND_ICONS[node.id] ?? null;
}

const NODE_COLOURS = {
  entity:   '#64748b',
  api:      '#0891b2',
  model:    '#6366f1',
  mcp:      '#d97706',
  document: '#ea580c',
  vendor:   '#0d9488',
  spv:      '#059669',
};

const NODE_R = 26;
let sim;

function shapePathFor(d) {
  const r = NODE_R;
  switch (d.nodeType) {
    case 'api': {
      const rx = 6;
      return `M${-r+rx},${-r} H${r-rx} Q${r},${-r} ${r},${-r+rx} V${r-rx} Q${r},${r} ${r-rx},${r} H${-r+rx} Q${-r},${r} ${-r},${r-rx} V${-r+rx} Q${-r},${-r} ${-r+rx},${-r} Z`;
    }
    case 'model': {
      const dr = r + 4;
      return `M0,${-dr} L${dr},0 L0,${dr} L${-dr},0 Z`;
    }
    case 'mcp': {
      const h = Math.round(r * 0.866);
      return `M0,${-r} L${h},${-r/2} L${h},${r/2} L0,${r} L${-h},${r/2} L${-h},${-r/2} Z`;
    }
    case 'document': {
      const fold = Math.round(r * 0.38);
      return `M${-r+3},${-r} L${r-fold},${-r} L${r},${-r+fold} L${r},${r} L${-r+3},${r} Z`;
    }
    case 'vendor': {
      return `M0,${-r} L${r},${-r*0.5} L${r},${r*0.2} Q${r},${r*0.85} 0,${r} Q${-r},${r*0.85} ${-r},${r*0.2} L${-r},${-r*0.5} Z`;
    }
    default:
      return `M${-r},0 A${r},${r},0,1,0,${r},0 A${r},${r},0,1,0,${-r},0 Z`;
  }
}

function renderGraph() {
  const svgEl = d3.select('#graph-svg');
  const W = svgEl.node().clientWidth || 800;
  const H = svgEl.node().clientHeight || 600;

  svgEl.selectAll('g').remove();
  const g = svgEl.append('g');

  for (const n of nodes) {
    if (n.x === undefined) {
      n.x = W / 2 + (Math.random() - 0.5) * W * 0.6;
      n.y = H / 2 + (Math.random() - 0.5) * H * 0.6;
    }
  }

  if (!sim) {
    sim = d3.forceSimulation()
      .force('link', d3.forceLink().id(d => d.id).distance(110))
      .force('charge', d3.forceManyBody().strength(-280))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collide', d3.forceCollide(NODE_R + 18))
      .force('x', d3.forceX(W / 2).strength(0.06))
      .force('y', d3.forceY(H / 2).strength(0.06))
      .alphaDecay(0.015);
  } else {
    sim.force('center', d3.forceCenter(W / 2, H / 2));
    sim.force('x', d3.forceX(W / 2).strength(0.06));
    sim.force('y', d3.forceY(H / 2).strength(0.06));
    sim.force('collide', d3.forceCollide(NODE_R + 18));
  }

  sim.nodes(nodes);
  sim.force('link').links(edges);
  sim.alpha(0.5).restart();

  const defs = svgEl.select('defs');
  if (defs.select('#arrow').empty()) {
    defs.append('marker')
      .attr('id', 'arrow').attr('viewBox', '0 0 10 10')
      .attr('refX', 8).attr('refY', 5)
      .attr('markerWidth', 6).attr('markerHeight', 6)
      .attr('orient', 'auto-start-reverse')
      .append('path').attr('d', 'M 0 0 L 10 5 L 0 10 z').attr('fill', '#c8c0b2');
  }
  if (defs.select('#brand-clip').empty()) {
    defs.append('clipPath').attr('id', 'brand-clip')
      .append('circle').attr('r', 16);
  }

  const linkSel = g.append('g')
    .selectAll('line').data(edges).join('line')
    .attr('stroke', '#d4cec6').attr('stroke-width', 1.5)
    .attr('marker-end', 'url(#arrow)');

  const nodeSel = g.append('g')
    .selectAll('g.nd').data(nodes).join(
      enter => {
        const ng = enter.append('g').attr('class', 'nd');
        ng.append('path').attr('class', 'nd-shape').attr('fill', '#0c0c10');
        ng.append('text').attr('class', 'nd-abbrev')
          .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
          .attr('font-size', 9).attr('font-weight', 600)
          .attr('font-family', 'IBM Plex Mono, monospace').attr('letter-spacing', '0.04em');
        ng.append('image').attr('class', 'nd-brand')
          .attr('width', 32).attr('height', 32).attr('x', -16).attr('y', -16)
          .attr('clip-path', 'url(#brand-clip)')
          .on('error', function() {
            d3.select(this).attr('opacity', 0);
            d3.select(this.parentNode).select('.nd-abbrev').attr('opacity', 1);
          });
        ng.append('text').attr('class', 'nd-label').attr('y', NODE_R + 15)
          .attr('text-anchor', 'middle')
          .attr('font-size', 10).attr('fill', '#7c6e62')
          .attr('font-family', 'IBM Plex Mono, monospace');
        return ng;
      }
    );

  nodeSel.select('.nd-shape')
    .attr('d', d => shapePathFor(d))
    .attr('stroke', d => d.status === 'error' ? '#963030' : (NODE_COLOURS[d.nodeType] ?? '#64748b'))
    .attr('stroke-width', d => d.status === 'loading' ? 1 : 2)
    .attr('opacity', d => d.status === 'loading' ? 0.4 : 1);

  nodeSel.select('.nd-abbrev')
    .text(d => ABBREV[d.id] ?? d.id.slice(0, 4).toUpperCase())
    .attr('fill', d => NODE_COLOURS[d.nodeType] ?? '#64748b')
    .attr('opacity', d => brandFor(d) ? 0 : (d.status === 'loading' ? 0.4 : 1));

  nodeSel.select('.nd-brand')
    .attr('href', d => brandFor(d) ?? '')
    .attr('opacity', d => brandFor(d) ? (d.status === 'loading' ? 0.4 : 1) : 0);

  nodeSel.select('.nd-label').text(d => d.label);

  sim.on('tick', () => {
    linkSel
      .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
    nodeSel.attr('transform', d => `translate(${d.x ?? W/2},${d.y ?? H/2})`);
  });
}
