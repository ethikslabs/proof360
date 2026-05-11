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

  // Dark background rect — CSS doesn't travel with the exported file
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('width', '100%');
  bg.setAttribute('height', '100%');
  bg.setAttribute('fill', 'white');
  clone.insertBefore(bg, clone.firstChild);

  // Embed favicon images as base64 so the exported SVG is self-contained
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
const FAVICON_DOMAINS = {
  firecrawl:    'firecrawl.dev',
  perplexity:   'perplexity.ai',
  aws_programs: 'aws.amazon.com',
  github:       'github.com',
  hibp:         'haveibeenpwned.com',
  abuseipdb:    'abuseipdb.com',
  ssl:          'ssllabs.com',
};

function faviconFor(node) {
  if (node.id === 'entity' && node.label && node.label !== 'Target')
    return `/proxy-favicon?domain=${encodeURIComponent(node.label)}`;
  const d = FAVICON_DOMAINS[node.id];
  return d ? `/proxy-favicon?domain=${d}` : null;
}

const NODE_COLOURS = {
  entity: '#94a3b8', api: '#2dd4bf', model: '#818cf8',
  mcp: '#f59e0b', document: '#fb923c',
};
const NODE_R = 32;
let sim;

function renderGraph() {
  const svgEl = d3.select('#graph-svg');
  const W = svgEl.node().clientWidth || 800;
  const H = svgEl.node().clientHeight || 600;

  svgEl.selectAll('g').remove();
  const g = svgEl.append('g');

  // Spread new nodes across the panel instead of spawning at 0,0
  for (const n of nodes) {
    if (n.x === undefined) {
      n.x = W / 2 + (Math.random() - 0.5) * W * 0.7;
      n.y = H / 2 + (Math.random() - 0.5) * H * 0.7;
    }
  }

  if (!sim) {
    sim = d3.forceSimulation()
      .force('link', d3.forceLink().id(d => d.id).distance(200))
      .force('charge', d3.forceManyBody().strength(-800))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collide', d3.forceCollide(NODE_R + 24))
      .force('y', d3.forceY(H / 2).strength(0.02))
      .alphaDecay(0.015);
  } else {
    sim.force('center', d3.forceCenter(W / 2, H / 2));
    sim.force('collide', d3.forceCollide(NODE_R + 24));
  }

  sim.nodes(nodes);
  sim.force('link').links(edges);
  sim.alpha(0.5).restart();

  // Arrow marker
  const defs = svgEl.select('defs');
  if (defs.select('#arrow').empty()) {
    defs.append('marker')
      .attr('id', 'arrow').attr('viewBox', '0 0 10 10')
      .attr('refX', 8).attr('refY', 5)
      .attr('markerWidth', 6).attr('markerHeight', 6)
      .attr('orient', 'auto-start-reverse')
      .append('path').attr('d', 'M 0 0 L 10 5 L 0 10 z').attr('fill', '#1e3a3a');
  }

  const linkSel = g.append('g')
    .selectAll('line').data(edges).join('line')
    .attr('stroke', '#1e3a3a').attr('stroke-width', 1.5)
    .attr('marker-end', 'url(#arrow)');

  const nodeSel = g.append('g')
    .selectAll('g.nd').data(nodes).join(
      enter => {
        const ng = enter.append('g').attr('class', 'nd');
        ng.append('circle').attr('r', NODE_R).attr('fill', '#0C0C12');
        ng.append('use').attr('width', 28).attr('height', 28).attr('x', -14).attr('y', -14);
        ng.append('image').attr('width', 28).attr('height', 28).attr('x', -14).attr('y', -14)
          .attr('clip-path', 'url(#favicon-clip)').attr('display', 'none');
        ng.append('text').attr('y', NODE_R + 16).attr('text-anchor', 'middle')
          .attr('font-size', 11).attr('fill', '#64748b').attr('font-family', 'monospace');
        return ng;
      }
    );

  // Add favicon clip path to defs once
  if (defs.select('#favicon-clip').empty()) {
    defs.append('clipPath').attr('id', 'favicon-clip')
      .append('circle').attr('r', 14);
  }

  nodeSel.select('circle')
    .attr('stroke', d => d.status === 'error' ? '#f87171' : (NODE_COLOURS[d.nodeType] ?? '#334155'))
    .attr('stroke-width', d => d.status === 'loading' ? 1.5 : 2)
    .attr('opacity', d => d.status === 'loading' ? 0.45 : 1);

  nodeSel.select('use')
    .attr('href', d => `#icon-${d.nodeType}`)
    .attr('color', d => d.status === 'error' ? '#f87171' : (NODE_COLOURS[d.nodeType] ?? '#94a3b8'))
    .attr('opacity', d => d.status === 'loading' ? 0.45 : 1)
    .attr('display', d => faviconFor(d) ? 'none' : null);

  nodeSel.select('image')
    .attr('href', d => faviconFor(d) ?? '')
    .attr('opacity', d => d.status === 'loading' ? 0.45 : 1)
    .attr('display', d => faviconFor(d) ? null : 'none');

  nodeSel.select('text').text(d => d.label);

  sim.on('tick', () => {
    linkSel
      .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
    nodeSel.attr('transform', d => `translate(${d.x ?? W/2},${d.y ?? H/2})`);
  });
}
