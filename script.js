const svg = document.getElementById('graph');
const canvasWrap = document.getElementById('canvasWrap');

const a1 = document.getElementById('a1'), b1 = document.getElementById('b1'), c1 = document.getElementById('c1');
const a2 = document.getElementById('a2'), b2 = document.getElementById('b2'), c2 = document.getElementById('c2');

const eq1text = document.getElementById('eq1text'), eq2text = document.getElementById('eq2text');

const intersectionDiv = document.getElementById('intersection');
const stepsPre = document.getElementById('steps');

const resetViewBtn = document.getElementById('resetView');
const downloadPngBtn = document.getElementById('downloadPng');
const swapBtn = document.getElementById('swap');
const resetAllBtn = document.getElementById('resetAll');
const zoomLevelSpan = document.getElementById('zoomLevel');

let view = { x: -300, y: -300, w: 600, h: 600 };
let scale = 1;
const minScale = 0.01, maxScale = 200;
svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`);

let pointerState = { dragging: false, lastX: 0, lastY: 0 };
let lastPinchDist = null;

/* ---------- Utilities ---------- */
function round(n, d=4){ return Math.round(n * Math.pow(10,d))/Math.pow(10,d); }

function parseTextToCoeffs(txt){
  if(!txt || !txt.trim()) return null;
  const s = txt.replace(/\s+/g,'');
  let m = s.match(/^([+-]?\d*\.?\d*)x([+-]?\d*\.?\d*)y=([+-]?\d*\.?\d*)$/i);
  if(m){
    const A = m[1]===''||m[1]==='+'?1: m[1]==='-'?-1: Number(m[1]);
    const B = m[2]===''||m[2]==='+'?1: m[2]==='-'?-1: Number(m[2]);
    const C = Number(m[3]);
    return {A,B,C};
  }
  m = s.match(/^y=([+-]?\d*\.?\d*)x([+-]?\d*\.?\d*)$/i);
  if(m){
    const mVal = (m[1]===''||m[1]==='+')?1: m[1]==='-'?-1: Number(m[1]);
    const bVal = m[2]?Number(m[2]):0;
    return {A:-mVal, B:1, C:bVal};
  }
  m = s.match(/^x=([+-]?\d*\.?\d*)$/i);
  if(m) return {A:1, B:0, C:Number(m[1])};
  return null;
}

function syncTextToInputs(){
  const p1 = parseTextToCoeffs(eq1text.value);
  const p2 = parseTextToCoeffs(eq2text.value);
  if(p1){ a1.value = p1.A; b1.value = p1.B; c1.value = p1.C; }
  if(p2){ a2.value = p2.A; b2.value = p2.B; c2.value = p2.C; }
}

function syncInputsToText(){
  eq1text.value = `${a1.value}x ${b1.value>=0?'+':'-'} ${Math.abs(b1.value)}y = ${c1.value}`;
  eq2text.value = `${a2.value}x ${b2.value>=0?'+':'-'} ${Math.abs(b2.value)}y = ${c2.value}`;
}

/* ---------- Math ---------- */
function intersection(l1, l2){
  const det = l1.A*l2.B - l2.A*l1.B;
  if(Math.abs(det) < 1e-12) return null;
  const x = (l1.C*l2.B - l2.C*l1.B) / det;
  const y = (l1.A*l2.C - l2.A*l1.C) / det;
  return {x: round(x), y: round(y)};
}

function pointsForLine(line, samples=9){
  const pts=[];
  const {A,B,C} = line;
  if(Math.abs(B) > 1e-12){
    for(let i=0;i<samples;i++){
      const t = i/(samples-1);
      const x = view.x + t*view.w;
      const y = (C - A*x)/B;
      pts.push({x:round(x), y:round(y)});
    }
  } else if(Math.abs(A) > 1e-12){
    const xVal = C/A;
    for(let i=0;i<samples;i++){
      const t = i/(samples-1);
      const y = view.y + t*view.h;
      pts.push({x:round(xVal), y:round(y)});
    }
  }
  return pts;
}

function segmentForLine(line){
  const {A,B,C} = line;
  const bounds = {
    left: view.x,
    right: view.x + view.w,
    top: view.y,
    bottom: view.y + view.h
  };
  const candidates=[];
  if(Math.abs(B) > 1e-12){
    const yL = (C - A*bounds.left)/B;
    const yR = (C - A*bounds.right)/B;
    if(yL >= bounds.top && yL <= bounds.bottom) candidates.push({x:bounds.left,y:yL});
    if(yR >= bounds.top && yR <= bounds.bottom) candidates.push({x:bounds.right,y:yR});
  }
  if(Math.abs(A) > 1e-12){
    const xT = (C - B*bounds.top)/A;
    const xB = (C - B*bounds.bottom)/A;
    if(xT >= bounds.left && xT <= bounds.right) candidates.push({x:xT,y:bounds.top});
    if(xB >= bounds.left && xB <= bounds.right) candidates.push({x:xB,y:bounds.bottom});
  }
  if(candidates.length < 2) return null;
  return {a:candidates[0], b:candidates[candidates.length-1]};
}

/* ---------- SVG Helpers ---------- */
function clearSvg(){ while(svg.firstChild) svg.removeChild(svg.firstChild); }

/* ---------- Drawing ---------- */
function drawGrid(){
  clearSvg();
  const gridStep = Math.max(view.w, view.h) / 18;
  const startX = Math.floor(view.x / gridStep) * gridStep;
  const endX = view.x + view.w;
  const startY = Math.floor(view.y / gridStep) * gridStep;
  const endY = view.y + view.h;

  for(let x=startX; x<=endX; x+=gridStep){
    const line = document.createElementNS('http://www.w3.org/2000/svg','line');
    line.setAttribute('x1', x);
    line.setAttribute('y1', view.y);
    line.setAttribute('x2', x);
    line.setAttribute('y2', view.y + view.h);
    line.setAttribute('stroke', Math.abs(x) < 1e-6 ? '#000' : '#e6e7eb');
    line.setAttribute('stroke-width', Math.abs(x) < 1e-6 ? '1.5' : '0.5');
    svg.appendChild(line);
  }

  for(let y=startY; y<=endY; y+=gridStep){
    const line = document.createElementNS('http://www.w3.org/2000/svg','line');
    line.setAttribute('x1', view.x);
    line.setAttribute('y1', y);
    line.setAttribute('x2', view.x + view.w);
    line.setAttribute('y2', y);
    line.setAttribute('stroke', Math.abs(y) < 1e-6 ? '#000' : '#e6e7eb');
    line.setAttribute('stroke-width', Math.abs(y) < 1e-6 ? '1.5' : '0.5');
    svg.appendChild(line);
  }
}

function drawLineSegment(line, color){
  const seg = segmentForLine(line);
  if(!seg) return;
  const l = document.createElementNS('http://www.w3.org/2000/svg','line');
  l.setAttribute('x1', seg.a.x);
  l.setAttribute('y1', seg.a.y);
  l.setAttribute('x2', seg.b.x);
  l.setAttribute('y2', seg.b.y);
  l.setAttribute('stroke', color);
  l.setAttribute('stroke-width','3');
  l.setAttribute('stroke-linecap','round');
  svg.appendChild(l);

  const mx = (seg.a.x + seg.b.x)/2;
  const my = (seg.a.y + seg.b.y)/2;
  const text = document.createElementNS('http://www.w3.org/2000/svg','text');
  text.setAttribute('x', mx);
  text.setAttribute('y', my - 12);
  text.setAttribute('font-size','13');
  text.setAttribute('font-weight','700');
  text.setAttribute('fill', color);
  text.setAttribute('text-anchor','middle');
  text.textContent = `${line.A}x + ${line.B}y = ${line.C}`;
  svg.appendChild(text);
}

function drawPoints(pts, color){
  pts.forEach(p=>{
    const c = document.createElementNS('http://www.w3.org/2000/svg','circle');
    c.setAttribute('cx', p.x);
    c.setAttribute('cy', p.y);
    c.setAttribute('r','4');
    c.setAttribute('fill',color);
    svg.appendChild(c);

    const t = document.createElementNS('http://www.w3.org/2000/svg','text');
    t.setAttribute('x', p.x + 8);
    t.setAttribute('y', p.y - 6);
    t.setAttribute('font-size','11');
    t.textContent = `(${p.x}, ${p.y})`;
    svg.appendChild(t);
  });
}

function drawIntersectionPoint(pt){
  if(!pt) return;
  const c = document.createElementNS('http://www.w3.org/2000/svg','circle');
  c.setAttribute('cx', pt.x);
  c.setAttribute('cy', pt.y);
  c.setAttribute('r','6');
  c.setAttribute('fill','#10b981');
  svg.appendChild(c);

  const t = document.createElementNS('http://www.w3.org/2000/svg','text');
  t.setAttribute('x', pt.x + 10);
  t.setAttribute('y', pt.y - 10);
  t.setAttribute('font-size','12');
  t.setAttribute('font-weight','700');
  t.textContent = `(${pt.x}, ${pt.y})`;
  svg.appendChild(t);
}

/* ---------- Steps ---------- */
function buildSteps(l1, l2, inter){
  const A1 = l1.A, B1 = l1.B, C1 = l1.C;
  const A2 = l2.A, B2 = l2.B, C2 = l2.C;
  const det = round(A1*B2 - A2*B1,5);
  let s = '';
  s += `Given:\n  ${A1}x + ${B1}y = ${C1}\n  ${A2}x + ${B2}y = ${C2}\n\n`;
  s += `Determinant D = A1·B2 − A2·B1 = ${det}\n\n`;
  if(Math.abs(det) < 1e-12){
    s += `D = 0 → Lines are parallel or coincident (no unique intersection).\n`;
    return s;
  }
  const Dx = round(C1*B2 - C2*B1,5);
  const Dy = round(A1*C2 - A2*C1,5);
  s += `Dx = C1·B2 − C2·B1 = ${Dx}\nDy = A1·C2 − A2·C1 = ${Dy}\n\n`;
  s += `x = Dx / D = ${Dx} / ${det} = ${inter.x}\n`;
  s += `y = Dy / D = ${Dy} / ${det} = ${inter.y}\n`;
  return s;
}

/* ---------- Render ---------- */
function render(){
  drawGrid();
  const line1 = {A:+a1.value, B:+b1.value, C:+c1.value};
  const line2 = {A:+a2.value, B:+b2.value, C:+c2.value};

  drawLineSegment(line1, '#ef4444');
  drawPoints(pointsForLine(line1), '#ef4444');

  drawLineSegment(line2, '#2563eb');
  drawPoints(pointsForLine(line2), '#2563eb');

  const inter = intersection(line1, line2);
  if(inter){
    drawIntersectionPoint(inter);
    intersectionDiv.innerHTML = `They meet at <strong>(${inter.x}, ${inter.y})</strong>`;
    stepsPre.textContent = buildSteps(line1, line2, inter);
  } else {
    intersectionDiv.innerHTML = `<span style="color:#b91c1c">No single intersection</span>`;
    stepsPre.textContent = `The determinant is zero, so the lines are parallel or coincident.\n\nLine A: ${line1.A}x + ${line1.B}y = ${line1.C}\nLine B: ${line2.A}x + ${line2.B}y = ${line2.C}`;
  }
}

/* ---------- Input Events ---------- */
[a1,b1,c1,a2,b2,c2].forEach(el=>{
  el.addEventListener('input', ()=>{ syncInputsToText(); render(); });
});
eq1text.addEventListener('input', ()=>{ syncTextToInputs(); render(); });
eq2text.addEventListener('input', ()=>{ syncTextToInputs(); render(); });

swapBtn.addEventListener('click', ()=>{
  const tA=a1.value, tB=b1.value, tC=c1.value;
  a1.value=a2.value; b1.value=b2.value; c1.value=c2.value;
  a2.value=tA; b2.value=tB; c2.value=tC;
  syncInputsToText(); render();
});

resetAllBtn.addEventListener('click', ()=>{
  a1.value=1; b1.value=1; c1.value=8;
  a2.value=2; b2.value=-1; c2.value=1;
  syncInputsToText(); render();
});

/* ---------- Zoom & Pan ---------- */
function setViewBox(){
  view.w = 600 / scale;
  view.h = 600 / scale;
  svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`);
  zoomLevelSpan.textContent = `${round(scale,2)}×`;
}

canvasWrap.addEventListener('wheel', ev=>{
  ev.preventDefault();
  const factor = Math.exp(-ev.deltaY * 0.0012);
  scale = Math.max(minScale, Math.min(maxScale, scale * factor));

  const rect = svg.getBoundingClientRect();
  const px = (ev.clientX - rect.left) * (view.w / rect.width);
  const py = (ev.clientY - rect.top) * (view.h / rect.height);

  view.x += px * (1 - 1/factor);
  view.y += py * (1 - 1/factor);
  setViewBox();
});

canvasWrap.addEventListener('pointerdown', ev=>{
  pointerState.dragging = true;
  pointerState.lastX = ev.clientX;
  pointerState.lastY = ev.clientY;
  canvasWrap.setPointerCapture(ev.pointerId);
});
canvasWrap.addEventListener('pointermove', ev=>{
  if(!pointerState.dragging) return;
  const dx = ev.clientX - pointerState.lastX;
  const dy = ev.clientY - pointerState.lastY;
  view.x -= dx * (view.w / canvasWrap.clientWidth);
  view.y -= dy * (view.h / canvasWrap.clientHeight);
  pointerState.lastX = ev.clientX;
  pointerState.lastY = ev.clientY;
  setViewBox();
});
canvasWrap.addEventListener('pointerup', ()=>{ pointerState.dragging=false; });
canvasWrap.addEventListener('pointercancel', ()=>{ pointerState.dragging=false; });

canvasWrap.addEventListener('touchmove', e=>{
  if(e.touches.length !== 2) return;
  const t0 = e.touches[0], t1 = e.touches[1];
  const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
  if(lastPinchDist === null){ lastPinchDist = dist; return; }
  const factor = dist / lastPinchDist;
  lastPinchDist = dist;
  scale = Math.max(minScale, Math.min(maxScale, scale * factor));
  setViewBox();
},{passive:true});
canvasWrap.addEventListener('touchend', ()=>{ lastPinchDist=null; });

resetViewBtn.addEventListener('click', ()=>{
  scale = 1;
  view = {x:-300,y:-300,w:600,h:600};
  setViewBox();
});

/* ---------- PNG Export ---------- */
downloadPngBtn.addEventListener('click', ()=>{
  const svgClone = svg.cloneNode(true);
  const bg = document.createElementNS('http://www.w3.org/2000/svg','rect');
  bg.setAttribute('x', view.x);
  bg.setAttribute('y', view.y);
  bg.setAttribute('width', view.w);
  bg.setAttribute('height', view.h);
  bg.setAttribute('fill','#ffffff');
  svgClone.insertBefore(bg, svgClone.firstChild);

  const serializer = new XMLSerializer();
  const str = serializer.serializeToString(svgClone);
  const blob = new Blob([str], {type:'image/svg+xml;charset=utf-8'});
  const url = URL.createObjectURL(blob);

  const img = new Image();
  img.onload = function(){
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 1600;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(img,0,0,canvas.width,canvas.height);
    URL.revokeObjectURL(url);
    canvas.toBlob(blobOut=>{
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blobOut);
      a.download = 'linear-graph.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
    },'image/png');
  };
  img.src = url;
});

/* ---------- Init ---------- */
syncInputsToText();
setViewBox();
render();