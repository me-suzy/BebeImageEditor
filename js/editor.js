/**
 * Bebe Image Editor - Logică canvas, layere, instrumente (inspirat Fireworks)
 */
(function () {
    'use strict';

    const mainCanvas = document.getElementById('mainCanvas');
    const drawCanvas = document.getElementById('drawCanvas');
    const canvasWrap = document.getElementById('canvasWrap');
    const canvasInner = document.getElementById('canvasInner');
    const ctx = mainCanvas.getContext('2d');
    const drawCtx = drawCanvas.getContext('2d');

    let canvasWidth = 1161;
    let canvasHeight = 900;
    let canvasColor = '#ffffff';
    let layers = [];
    let nextLayerId = 1;
    let currentTool = 'pointer';
    let fillColor = '#000000';
    let strokeColor = '#ff0000';
    let globalOpacity = 1;
    let zoom = 1;
    let panX = 0, panY = 0;
    let selectedLayerId = null;
    let dragStart = null;
    let shapeStart = null;
    let brushStart = null;
    let resizeStart = null;
    let panStart = null;
    let cropStart = null;
    let selectionStart = null;
    let selectionRect = null;
    let bitmapSelection = null; // { x, y, w, h } for marquee/lasso/magicwand
    let lassoPoints = [];
    let cloneSource = null; // { x, y } for clone tool
    let penPoints = []; // for pen tool
    let marqueeStart = null;
    const HANDLE_SIZE = 8;
    let brushPoints = []; // collect points for path layer
    const VECTOR_TYPES = ['rect', 'ellipse', 'line', 'text', 'path'];
    let docName = 'Untitled-1';
    let canvasAnchor = 'c';
    let brushSizePx = 4;
    var imageCache = {};
    const MAX_UNDO = 50;
    let undoStack = [];
    let redoStack = [];
    let nextDocId = 1;
    let documents = [];
    let currentDocIndex = 0;
    let pendingCloseIndex = null;
    let pickingCanvasColorMode = null;

    const canvasColorEl = document.getElementById('canvasColor');
    const fillColorEl = document.getElementById('fillColor');
    const strokeColorEl = document.getElementById('strokeColor');
    const globalOpacityEl = document.getElementById('globalOpacity');
    const opacityValEl = document.getElementById('opacityVal');
    const brushSizeEl = document.getElementById('brushSize');
    const brushSizeValEl = document.getElementById('brushSizeVal');
    const zoomInputEl = document.getElementById('zoomInput');
    const docInfoEl = document.getElementById('docInfo');
    const statusCoordsEl = document.getElementById('statusCoords');
    const statusSizeEl = document.getElementById('statusSize');
    const layersListEl = document.getElementById('layersList');
    const propDocNameEl = document.getElementById('propDocName');
    const propLayerOpacityEl = document.getElementById('propLayerOpacity');
    const propSelectionColorsEl = document.getElementById('propSelectionColors');
    const propLayerFillEl = document.getElementById('propLayerFill');
    const propLayerStrokeEl = document.getElementById('propLayerStroke');
    const layerOpacitySliderEl = document.getElementById('layerOpacitySlider');
    const layerOpacityValEl = document.getElementById('layerOpacityVal');

    // ---- Eyedropper live preview element ----
    var eyedropperPreview = document.createElement('div');
    eyedropperPreview.id = 'eyedropperPreview';
    eyedropperPreview.style.cssText = 'display:none;position:fixed;pointer-events:none;z-index:9999;';
    eyedropperPreview.innerHTML = '<div style="width:48px;height:48px;border:2px solid #fff;border-radius:50%;box-shadow:0 0 0 1px #000,0 2px 8px rgba(0,0,0,0.5);overflow:hidden;position:relative;">'
        + '<div id="eyedropperSwatch" style="width:100%;height:100%;"></div>'
        + '<div style="position:absolute;bottom:0;left:0;right:0;text-align:center;font-size:9px;color:#fff;background:rgba(0,0,0,0.7);padding:1px 0;" id="eyedropperHex">#000000</div>'
        + '</div>';
    document.body.appendChild(eyedropperPreview);
    var eyedropperSwatch = document.getElementById('eyedropperSwatch');
    var eyedropperHex = document.getElementById('eyedropperHex');

    function showEyedropperPreview(clientX, clientY, color) {
        eyedropperPreview.style.display = 'block';
        eyedropperPreview.style.left = (clientX + 16) + 'px';
        eyedropperPreview.style.top = (clientY + 16) + 'px';
        eyedropperSwatch.style.backgroundColor = color;
        eyedropperHex.textContent = color;
    }
    function hideEyedropperPreview() {
        eyedropperPreview.style.display = 'none';
    }

    // ---- Color input undo tracking (avoid spamming pushUndo on every input event) ----
    var colorUndoPushed = false;

    function saveState() {
        return {
            layers: JSON.parse(JSON.stringify(layers)),
            nextLayerId: nextLayerId,
            canvasWidth: canvasWidth,
            canvasHeight: canvasHeight,
            canvasColor: canvasColor
        };
    }

    function restoreState(state) {
        layers = state.layers.map(l => ({ ...l }));
        nextLayerId = state.nextLayerId;
        canvasWidth = state.canvasWidth;
        canvasHeight = state.canvasHeight;
        canvasColor = state.canvasColor;
        canvasColorEl.value = canvasColor;
        imageCache = {};
        drawCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
        render();
    }

    function pushUndo() {
        undoStack.push(saveState());
        if (undoStack.length > MAX_UNDO) undoStack.shift();
        redoStack = [];
        updateUndoRedoButtons();
    }

    function undo() {
        if (undoStack.length === 0) return;
        redoStack.push(saveState());
        restoreState(undoStack.pop());
        updateUndoRedoButtons();
    }

    function redo() {
        if (redoStack.length === 0) return;
        undoStack.push(saveState());
        restoreState(redoStack.pop());
        updateUndoRedoButtons();
    }

    function updateUndoRedoButtons() {
        const btnUndo = document.getElementById('btnUndo');
        const btnRedo = document.getElementById('btnRedo');
        if (btnUndo) btnUndo.disabled = undoStack.length === 0;
        if (btnRedo) btnRedo.disabled = redoStack.length === 0;
    }

    function getDocState() {
        return {
            name: docName,
            layers: JSON.parse(JSON.stringify(layers)),
            nextLayerId: nextLayerId,
            canvasWidth: canvasWidth,
            canvasHeight: canvasHeight,
            canvasColor: canvasColor,
            undoStack: undoStack.map(s => ({ ...s, layers: s.layers.map(l => ({ ...l })) })),
            redoStack: redoStack.map(s => ({ ...s, layers: s.layers.map(l => ({ ...l })) }))
        };
    }

    function saveCurrentDocToStore() {
        if (documents.length === 0 || currentDocIndex < 0 || currentDocIndex >= documents.length) return;
        documents[currentDocIndex] = getDocState();
    }

    function loadDocFromStore(i) {
        if (i < 0 || i >= documents.length) return;
        const d = documents[i];
        docName = d.name;
        layers = d.layers.map(l => ({ ...l }));
        nextLayerId = d.nextLayerId;
        canvasWidth = d.canvasWidth;
        canvasHeight = d.canvasHeight;
        canvasColor = d.canvasColor;
        undoStack = d.undoStack.map(s => ({ ...s, layers: s.layers.map(l => ({ ...l })) }));
        redoStack = d.redoStack.map(s => ({ ...s, layers: s.layers.map(l => ({ ...l })) }));
        canvasColorEl.value = canvasColor;
        propDocNameEl.textContent = docName;
        imageCache = {};
        selectedLayerId = null;
        dragStart = null;
        shapeStart = null;
        brushStart = null;
        drawCtx.clearRect(0, 0, mainCanvas.width || canvasWidth, mainCanvas.height || canvasHeight);
        render();
        updateUndoRedoButtons();
    }

    function renderTabs() {
        const container = document.getElementById('docTabs');
        if (!container) return;
        container.innerHTML = '';
        documents.forEach((doc, i) => {
            const active = i === currentDocIndex ? ' active' : '';
            const tab = document.createElement('div');
            tab.className = 'doc-tab' + active;
            tab.dataset.index = String(i);
            const label = document.createElement('span');
            label.className = 'doc-tab-label';
            label.textContent = doc.name;
            label.title = doc.name;
            const closeBtn = document.createElement('button');
            closeBtn.type = 'button';
            closeBtn.className = 'doc-tab-close';
            closeBtn.title = 'Închide';
            closeBtn.innerHTML = '×';
            closeBtn.addEventListener('click', (e) => { e.stopPropagation(); requestCloseTab(i); });
            tab.appendChild(label);
            tab.appendChild(closeBtn);
            tab.addEventListener('click', () => { if (i !== currentDocIndex) { saveCurrentDocToStore(); currentDocIndex = i; loadDocFromStore(i); renderTabs(); } });
            container.appendChild(tab);
        });
    }

    function requestCloseTab(i) {
        pendingCloseIndex = i;
        document.getElementById('closeConfirmDocName').textContent = documents[i].name;
        document.getElementById('closeConfirmOverlay').classList.add('visible');
    }

    function doCloseTab(saveFirst) {
        const i = pendingCloseIndex;
        if (i === null || i === undefined) return;
        pendingCloseIndex = null;
        document.getElementById('closeConfirmOverlay').classList.remove('visible');
        saveCurrentDocToStore();
        if (saveFirst) {
            loadDocFromStore(i);
            var saveName = prompt('Numele fișierului:', docName || 'image');
            if (saveName === null) { renderTabs(); return; } // user cancelled
            saveName = saveName.replace(/\.png$/i, '');
            docName = saveName;
            documents[i].name = saveName;
            const link = document.createElement('a');
            link.download = saveName + '.png';
            link.href = mainCanvas.toDataURL('image/png');
            link.click();
        }
        documents.splice(i, 1);
        if (documents.length === 0) {
            // Niciun document deschis — arată stare goală
            currentDocIndex = -1;
            layers = [];
            nextLayerId = 1;
            selectedLayerId = null;
            undoStack = [];
            redoStack = [];
            docName = '';
            canvasWidth = 0;
            canvasHeight = 0;
            mainCanvas.width = 0;
            mainCanvas.height = 0;
            drawCanvas.width = 0;
            drawCanvas.height = 0;
            mainCanvas.style.width = '0';
            mainCanvas.style.height = '0';
            drawCanvas.style.width = '0';
            drawCanvas.style.height = '0';
            docInfoEl.textContent = '';
            statusSizeEl.textContent = '';
            document.getElementById('propDocName').textContent = '-';
            layersListEl.innerHTML = '';
            if (propSelectionColorsEl) propSelectionColorsEl.style.display = 'none';
            propLayerOpacityEl.style.display = 'none';
            renderTabs();
            return;
        } else {
            if (i < currentDocIndex) currentDocIndex--;
            currentDocIndex = Math.min(currentDocIndex, documents.length - 1);
        }
        loadDocFromStore(currentDocIndex);
        renderTabs();
    }

    function getCanvasRect() {
        const r = mainCanvas.getBoundingClientRect();
        return { left: r.left, top: r.top, width: r.width, height: r.height };
    }

    function screenToCanvas(sx, sy) {
        const r = getCanvasRect();
        if (r.width <= 0 || r.height <= 0) return { x: 0, y: 0 };
        return {
            x: Math.floor((sx - r.left) * (canvasWidth / r.width)),
            y: Math.floor((sy - r.top) * (canvasHeight / r.height))
        };
    }

    function createLayer(opt) {
        const layer = {
            id: nextLayerId++,
            type: opt.type || 'rect',
            x: opt.x ?? 0,
            y: opt.y ?? 0,
            w: opt.w ?? 100,
            h: opt.h ?? 100,
            opacity: opt.opacity ?? 1,
            fill: opt.fill ?? fillColor,
            stroke: opt.stroke ?? strokeColor,
            text: opt.text ?? '',
            imageData: opt.imageData ?? null,
            lineWidth: opt.lineWidth ?? 2,
            visible: true,
            points: opt.points ?? null,       // for path layers: [{rx,ry}, ...] relative 0-1
            pathCap: opt.pathCap ?? 'round',  // 'round' or 'square'
            pathJoin: opt.pathJoin ?? 'round'
        };
        layers.push(layer);
        return layer;
    }

    function render() {
        mainCanvas.width = canvasWidth;
        mainCanvas.height = canvasHeight;
        mainCanvas.style.width = canvasWidth * zoom + 'px';
        mainCanvas.style.height = canvasHeight * zoom + 'px';
        drawCanvas.width = canvasWidth;
        drawCanvas.height = canvasHeight;
        drawCanvas.style.width = canvasWidth * zoom + 'px';
        drawCanvas.style.height = canvasHeight * zoom + 'px';

        ctx.fillStyle = canvasColor;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        layers.forEach(layer => {
            if (!layer.visible) return;
            ctx.globalAlpha = layer.opacity * globalOpacity;
            if (layer.type === 'image' && layer.imageData) {
                var img = imageCache[layer.id];
                if (!img) {
                    img = new Image();
                    img._layerId = layer.id;
                    img.onload = function() { imageCache[this._layerId] = this; render(); };
                    img.src = layer.imageData;
                }
                if (img.complete && img.naturalWidth) ctx.drawImage(img, layer.x, layer.y, layer.w, layer.h);
            } else if (layer.type === 'rect') {
                ctx.fillStyle = layer.fill;
                ctx.fillRect(layer.x, layer.y, layer.w, layer.h);
                if (layer.stroke && (layer.lineWidth || 0) > 0) {
                    var lw = layer.lineWidth || 2, hlw = lw / 2;
                    ctx.strokeStyle = layer.stroke;
                    ctx.lineWidth = lw;
                    ctx.strokeRect(layer.x - hlw, layer.y - hlw, layer.w + lw, layer.h + lw);
                }
            } else if (layer.type === 'ellipse') {
                ctx.fillStyle = layer.fill;
                ctx.beginPath();
                const cx = layer.x + layer.w / 2, cy = layer.y + layer.h / 2;
                ctx.ellipse(cx, cy, layer.w / 2, layer.h / 2, 0, 0, Math.PI * 2);
                ctx.fill();
                if (layer.stroke && (layer.lineWidth || 0) > 0) {
                    var elw = layer.lineWidth || 2, ehlw = elw / 2;
                    ctx.strokeStyle = layer.stroke;
                    ctx.lineWidth = elw;
                    ctx.beginPath();
                    ctx.ellipse(cx, cy, layer.w / 2 + ehlw, layer.h / 2 + ehlw, 0, 0, Math.PI * 2);
                    ctx.stroke();
                }
            } else if (layer.type === 'text' && layer.text) {
                ctx.fillStyle = layer.fill;
                ctx.font = (layer.fontSize || 16) + 'px sans-serif';
                ctx.fillText(layer.text, layer.x, layer.y + (layer.fontSize || 16));
                if (layer.stroke && (layer.lineWidth || 0) > 0) {
                    ctx.strokeStyle = layer.stroke;
                    ctx.lineWidth = layer.lineWidth || 2;
                    ctx.strokeText(layer.text, layer.x, layer.y + (layer.fontSize || 16));
                }
            } else if (layer.type === 'line') {
                ctx.strokeStyle = layer.stroke || strokeColor;
                ctx.lineWidth = layer.lineWidth || 2;
                ctx.beginPath();
                ctx.moveTo(layer.x, layer.y);
                ctx.lineTo(layer.x + layer.w, layer.y + layer.h);
                ctx.stroke();
            } else if (layer.type === 'path' && layer.points && layer.points.length > 0) {
                ctx.strokeStyle = layer.fill || fillColor;
                ctx.lineWidth = layer.lineWidth || 2;
                ctx.lineCap = layer.pathCap || 'round';
                ctx.lineJoin = layer.pathJoin || 'round';
                ctx.beginPath();
                var pts = layer.points;
                ctx.moveTo(layer.x + pts[0].rx * layer.w, layer.y + pts[0].ry * layer.h);
                for (var pi = 1; pi < pts.length; pi++) {
                    ctx.lineTo(layer.x + pts[pi].rx * layer.w, layer.y + pts[pi].ry * layer.h);
                }
                ctx.stroke();
                ctx.lineCap = 'butt';
                ctx.lineJoin = 'miter';
            }
        });
        ctx.globalAlpha = 1;

        if (selectedLayerId) {
            const layer = layers.find(l => l.id === selectedLayerId);
            if (layer) {
                const b = getLayerBounds(layer, ctx);
                ctx.strokeStyle = '#0e639c';
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 4]);
                ctx.strokeRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4);
                ctx.setLineDash([]);
                const half = HANDLE_SIZE / 2;
                ctx.fillStyle = '#fff';
                ctx.strokeStyle = '#0e639c';
                ctx.lineWidth = 1;
                getResizeHandles(layer, ctx).forEach(h => {
                    ctx.fillRect(h.cx - half, h.cy - half, HANDLE_SIZE, HANDLE_SIZE);
                    ctx.strokeRect(h.cx - half, h.cy - half, HANDLE_SIZE, HANDLE_SIZE);
                });
            }
        }

        statusSizeEl.textContent = canvasWidth + ' x ' + canvasHeight;
        docInfoEl.textContent = docName + ' @ ' + Math.round(zoom * 100) + '%';
        renderLayersList();
        var selLayer = layers.find(l => l.id === selectedLayerId);
        if (selLayer) {
            propLayerOpacityEl.style.display = 'flex';
            layerOpacitySliderEl.value = Math.round(selLayer.opacity * 100);
            layerOpacityValEl.textContent = Math.round(selLayer.opacity * 100) + '%';
            var isVector = VECTOR_TYPES.indexOf(selLayer.type) >= 0;
            if (propSelectionColorsEl) {
                propSelectionColorsEl.style.display = 'block';
                if (propLayerFillEl && propLayerStrokeEl) {
                    propLayerFillEl.value = selLayer.fill || fillColor;
                    propLayerStrokeEl.value = selLayer.stroke || strokeColor;
                }
                var swEl = document.getElementById('propStrokeWidth');
                if (swEl) swEl.value = selLayer.lineWidth || 0;
                var ptEl = document.getElementById('propLayerType');
                if (ptEl) ptEl.textContent = selLayer.type + ' #' + selLayer.id;
                var pxEl = document.getElementById('propLayerX');
                var pyEl = document.getElementById('propLayerY');
                var pwEl = document.getElementById('propLayerW');
                var phEl = document.getElementById('propLayerH');
                if (pxEl) pxEl.value = Math.round(selLayer.x);
                if (pyEl) pyEl.value = Math.round(selLayer.y);
                if (pwEl) pwEl.value = Math.round(selLayer.w);
                if (phEl) phEl.value = Math.round(selLayer.h);
            }
        } else {
            propLayerOpacityEl.style.display = 'none';
            if (propSelectionColorsEl) propSelectionColorsEl.style.display = 'none';
        }
    }

    function renderLayersList() {
        layersListEl.innerHTML = '';
        [...layers].reverse().forEach(layer => {
            const li = document.createElement('li');
            li.className = selectedLayerId === layer.id ? 'active' : '';
            li.innerHTML = '<span>' + (layer.type + ' ' + layer.id) + '</span><span class="layer-opacity">' + Math.round(layer.opacity * 100) + '%</span>';
            li.onclick = () => { selectedLayerId = layer.id; render(); };
            layersListEl.appendChild(li);
        });
    }

    function getLayerAtWithCtx(x, y, measureCtx) {
        for (let i = layers.length - 1; i >= 0; i--) {
            const L = layers[i];
            if (!L.visible) continue;
            if (L.type === 'image' || L.type === 'rect' || L.type === 'ellipse') {
                if (x >= L.x && x <= L.x + L.w && y >= L.y && y <= L.y + L.h) return L;
            } else if (L.type === 'text') {
                measureCtx.font = (L.fontSize || 16) + 'px sans-serif';
                const tw = measureCtx.measureText(L.text).width;
                if (x >= L.x && x <= L.x + tw && y >= L.y - (L.fontSize || 16) && y <= L.y + 4) return L;
            } else if (L.type === 'line') {
                const dx = L.w, dy = L.h;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                const nx = -dy / len, ny = dx / len;
                const px = x - L.x, py = y - L.y;
                const dist = Math.abs(px * nx + py * ny);
                const t = (px * dx + py * dy) / (len * len);
                if (t >= 0 && t <= 1 && dist <= 6) return L;
            } else if (L.type === 'path' && L.points && L.points.length > 1) {
                // Check proximity to any segment of the path
                var hitDist = Math.max(6, (L.lineWidth || 2) / 2 + 4);
                var pts = L.points;
                for (var si = 0; si < pts.length - 1; si++) {
                    var ax = L.x + pts[si].rx * L.w, ay = L.y + pts[si].ry * L.h;
                    var bx = L.x + pts[si + 1].rx * L.w, by = L.y + pts[si + 1].ry * L.h;
                    var sdx = bx - ax, sdy = by - ay;
                    var slen = Math.sqrt(sdx * sdx + sdy * sdy) || 1;
                    var snx = -sdy / slen, sny = sdx / slen;
                    var spx = x - ax, spy = y - ay;
                    var segDist = Math.abs(spx * snx + spy * sny);
                    var t = (spx * sdx + spy * sdy) / (slen * slen);
                    if (t >= 0 && t <= 1 && segDist <= hitDist) return L;
                }
            }
        }
        return null;
    }

    function getLayerBounds(layer, measureCtx) {
        if (layer.type === 'line') {
            const left = Math.min(layer.x, layer.x + layer.w);
            const top = Math.min(layer.y, layer.y + layer.h);
            return { x: left, y: top, w: Math.abs(layer.w), h: Math.abs(layer.h) };
        }
        if (layer.type === 'text') {
            const fs = layer.fontSize || 16;
            const tw = measureCtx.measureText(layer.text || '').width;
            return { x: layer.x, y: layer.y - fs, w: Math.max(1, tw), h: fs };
        }
        return { x: layer.x, y: layer.y, w: layer.w, h: layer.h };
    }

    function getResizeHandles(layer, measureCtx) {
        const b = getLayerBounds(layer, measureCtx);
        const x = b.x, y = b.y, w = b.w, h = b.h;
        const hw = Math.max(0, w / 2), hh = Math.max(0, h / 2);
        return [
            { handle: 'nw', cx: x, cy: y },
            { handle: 'n', cx: x + hw, cy: y },
            { handle: 'ne', cx: x + w, cy: y },
            { handle: 'e', cx: x + w, cy: y + hh },
            { handle: 'se', cx: x + w, cy: y + h },
            { handle: 's', cx: x + hw, cy: y + h },
            { handle: 'sw', cx: x, cy: y + h },
            { handle: 'w', cx: x, cy: y + hh }
        ];
    }

    function getHandleAt(px, py) {
        if (!selectedLayerId) return null;
        const layer = layers.find(l => l.id === selectedLayerId);
        if (!layer) return null;
        const half = HANDLE_SIZE / 2;
        const handles = getResizeHandles(layer, ctx);
        for (let i = 0; i < handles.length; i++) {
            const h = handles[i];
            if (px >= h.cx - half && px <= h.cx + half && py >= h.cy - half && py <= h.cy + half)
                return { layer, handle: h.handle };
        }
        return null;
    }

    function applyResizeToLayer(layer, newX, newY, newW, newH) {
        const minSize = 1;
        newW = Math.max(minSize, newW);
        newH = Math.max(minSize, newH);
        if (layer.type === 'line') {
            layer.x = newX;
            layer.y = newY;
            layer.w = newW;
            layer.h = newH;
            return;
        }
        if (layer.type === 'text') {
            layer.x = newX;
            layer.y = newY + newH;
            layer.fontSize = Math.max(8, Math.round(newH));
            return;
        }
        layer.x = newX;
        layer.y = newY;
        layer.w = newW;
        layer.h = newH;
    }

    function redraw() {
        const sel = selectedLayerId;
        render();
        selectedLayerId = sel;
    }

    // ---- Tools ----
    document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
        btn.addEventListener('click', () => setTool(btn.dataset.tool));
    });

    document.getElementById('swapColors').addEventListener('click', () => {
        const t = fillColorEl.value;
        fillColorEl.value = strokeColorEl.value;
        strokeColorEl.value = t;
        fillColor = fillColorEl.value;
        strokeColor = strokeColorEl.value;
    });

    fillColorEl.addEventListener('input', () => { fillColor = fillColorEl.value; });
    fillColorEl.addEventListener('change', () => { fillColor = fillColorEl.value; });
    strokeColorEl.addEventListener('input', () => { strokeColor = strokeColorEl.value; });
    strokeColorEl.addEventListener('change', () => { strokeColor = strokeColorEl.value; });
    canvasColorEl.addEventListener('input', () => { if (!colorUndoPushed) { pushUndo(); colorUndoPushed = true; } canvasColor = canvasColorEl.value; render(); });
    canvasColorEl.addEventListener('change', () => { if (!colorUndoPushed) { pushUndo(); colorUndoPushed = true; } canvasColor = canvasColorEl.value; colorUndoPushed = false; render(); });
    if (brushSizeEl) {
        brushSizeEl.addEventListener('input', () => {
            brushSizePx = Math.max(1, Math.min(50, parseInt(brushSizeEl.value, 10) || 4));
            brushSizeEl.value = brushSizePx;
            if (brushSizeValEl) brushSizeValEl.textContent = brushSizePx;
        });
        if (brushSizeValEl) brushSizeValEl.textContent = brushSizePx;
    }
    document.querySelectorAll('.palette-swatch').forEach(btn => {
        btn.style.backgroundColor = btn.dataset.color;
        btn.addEventListener('click', (e) => {
            const c = btn.dataset.color;
            if (e.shiftKey) {
                strokeColor = c;
                strokeColorEl.value = c;
            } else {
                fillColor = c;
                fillColorEl.value = c;
            }
            render();
        });
    });
    globalOpacityEl.addEventListener('input', () => {
        globalOpacity = globalOpacityEl.value / 100;
        opacityValEl.textContent = globalOpacityEl.value + '%';
        render();
    });
    zoomInputEl.addEventListener('change', () => {
        zoom = Math.max(0.1, Math.min(4, zoomInputEl.value / 100));
        zoomInputEl.value = Math.round(zoom * 100);
        render();
    });

    function getPixelColorAt(cx, cy) {
        const imgData = ctx.getImageData(Math.max(0, Math.floor(cx)), Math.max(0, Math.floor(cy)), 1, 1);
        const r = imgData.data[0], g = imgData.data[1], b = imgData.data[2];
        return '#' + [r, g, b].map(x => ('0' + x.toString(16)).slice(-2)).join('');
    }

    // ---- Mouse on canvas ----
    function handleCanvasMouseDown(e) {
        const rect = getCanvasRect();
        const p = screenToCanvas(e.clientX, e.clientY);
        if (p.x < 0 || p.y < 0 || p.x > canvasWidth || p.y > canvasHeight) return;

        if (pickingCanvasColorMode) {
            hideEyedropperPreview();
            const hex = getPixelColorAt(p.x, p.y);
            if (pickingCanvasColorMode === 'dialog') {
                const canvasSizeBgColor = document.getElementById('canvasSizeBgColor');
                const hint = document.getElementById('canvasSizePickHint');
                if (canvasSizeBgColor) canvasSizeBgColor.value = hex;
                if (hint) hint.style.display = 'none';
                document.getElementById('canvasSizeOverlay').classList.add('visible');
            } else if (pickingCanvasColorMode === 'selection') {
                var layer = layers.find(l => l.id === selectedLayerId);
                if (layer && VECTOR_TYPES.indexOf(layer.type) >= 0) {
                    pushUndo();
                    layer.fill = hex;
                    if (propLayerFillEl) propLayerFillEl.value = hex;
                    fillColor = hex;
                    if (fillColorEl) fillColorEl.value = hex;
                    render();
                }
            } else {
                pushUndo();
                canvasColor = hex;
                canvasColorEl.value = hex;
                render();
            }
            pickingCanvasColorMode = null;
            statusCoordsEl.textContent = 'x: ' + p.x + ', y: ' + p.y;
            return;
        }

        if (currentTool === 'pointer') {
            // curăță eventualul dreptunghi de selecție anterior
            selectionStart = null;
            selectionRect = null;
            drawCtx.clearRect(0, 0, canvasWidth, canvasHeight);

            const handleHit = getHandleAt(p.x, p.y);
            if (handleHit) {
                // Pointer poate redimensiona prin mânere, dar nu mută obiectele
                pushUndo();
                const b = getLayerBounds(handleHit.layer, ctx);
                resizeStart = {
                    layer: handleHit.layer,
                    handle: handleHit.handle,
                    startX: p.x,
                    startY: p.y,
                    startBounds: { x: b.x, y: b.y, w: b.w, h: b.h }
                };
            } else {
                const layer = getLayerAtWithCtx(p.x, p.y, ctx);
                selectedLayerId = layer ? layer.id : null;
                // indiferent dacă ai dat click pe un layer sau pe gol, începem dreptunghiul de selecție
                selectionStart = { x: p.x, y: p.y };
                selectionRect = { x: p.x, y: p.y, w: 0, h: 0 };
                render();
            }
        } else if (currentTool === 'hand' || currentTool === 'subselect') {
            // Mânuța apucă și mută orice layer (inclusiv imagini bitmap)
            const layer = getLayerAtWithCtx(p.x, p.y, ctx);
            selectedLayerId = layer ? layer.id : null;
            if (layer) {
                pushUndo();
                dragStart = { layer, startX: p.x - layer.x, startY: p.y - layer.y };
                canvasWrap.style.cursor = 'grabbing';
                mainCanvas.style.cursor = 'grabbing';
                drawCanvas.style.cursor = 'grabbing';
                document.body.style.cursor = 'grabbing';
            } else {
                // Nu am dat pe un layer → pan (mută tot canvasul)
                dragStart = null;
                panStart = { startX: e.clientX, startY: e.clientY, startPanX: panX, startPanY: panY };
                canvasWrap.style.cursor = 'grabbing';
                mainCanvas.style.cursor = 'grabbing';
                drawCanvas.style.cursor = 'grabbing';
                document.body.style.cursor = 'grabbing';
            }
        } else if (currentTool === 'scale') {
            // Scale: selectare + mutare + redimensionare
            const handleHit = getHandleAt(p.x, p.y);
            if (handleHit) {
                pushUndo();
                const b = getLayerBounds(handleHit.layer, ctx);
                resizeStart = { layer: handleHit.layer, handle: handleHit.handle, startX: p.x, startY: p.y, startBounds: { x: b.x, y: b.y, w: b.w, h: b.h } };
            } else {
                const layer = getLayerAtWithCtx(p.x, p.y, ctx);
                selectedLayerId = layer ? layer.id : null;
                if (layer) {
                    pushUndo();
                    dragStart = { layer, startX: p.x - layer.x, startY: p.y - layer.y };
                }
                render();
            }
        } else if (currentTool === 'zoom') {
            // Zoom: click = zoom in, Alt+click = zoom out
            if (e.altKey) {
                zoom = Math.max(0.1, zoom / 1.25);
            } else {
                zoom = Math.min(4, zoom * 1.25);
            }
            zoomInputEl.value = Math.round(zoom * 100);
            render();
        } else if (currentTool === 'marquee') {
            // Marquee: selecție dreptunghiulară pe bitmap
            bitmapSelection = null;
            marqueeStart = { x: p.x, y: p.y };
            drawCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        } else if (currentTool === 'lasso') {
            // Lasso: selecție liberă
            bitmapSelection = null;
            lassoPoints = [{ x: p.x, y: p.y }];
            drawCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        } else if (currentTool === 'magicwand') {
            // Magic Wand: selectează pixeli similari conecți
            const imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
            const px0 = Math.floor(p.x), py0 = Math.floor(p.y);
            const target = (py0 * canvasWidth + px0) * 4;
            const r = imgData.data[target], g = imgData.data[target + 1], b = imgData.data[target + 2];
            const tol = 30;
            const visited = new Uint8Array(canvasWidth * canvasHeight);
            const stack = [[px0, py0]];
            visited[py0 * canvasWidth + px0] = 1;
            let minX = px0, minY = py0, maxX = px0, maxY = py0;
            while (stack.length) {
                const [cx, cy] = stack.pop();
                if (cx < minX) minX = cx; if (cx > maxX) maxX = cx;
                if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;
                [[cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]].forEach(([nx,ny]) => {
                    if (nx < 0 || nx >= canvasWidth || ny < 0 || ny >= canvasHeight) return;
                    const key = ny * canvasWidth + nx;
                    if (visited[key]) return;
                    const j = key * 4;
                    if (Math.abs(imgData.data[j]-r)<=tol && Math.abs(imgData.data[j+1]-g)<=tol && Math.abs(imgData.data[j+2]-b)<=tol) {
                        visited[key] = 1;
                        stack.push([nx, ny]);
                    }
                });
            }
            bitmapSelection = { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
            drawCtx.clearRect(0, 0, canvasWidth, canvasHeight);
            drawCtx.strokeStyle = '#ffffff';
            drawCtx.lineWidth = 1.5;
            drawCtx.setLineDash([5, 3]);
            drawCtx.strokeRect(bitmapSelection.x, bitmapSelection.y, bitmapSelection.w, bitmapSelection.h);
            drawCtx.setLineDash([]);
            statusCoordsEl.textContent = 'Selecție: ' + bitmapSelection.w + 'x' + bitmapSelection.h + ' (Delete = șterge)';
        } else if (currentTool === 'clone') {
            if (e.altKey) {
                // Alt+click: setează sursa
                cloneSource = { x: p.x, y: p.y };
                statusCoordsEl.textContent = 'Clone sursă setată la (' + p.x + ', ' + p.y + '). Acum pictează fără Alt.';
            } else if (cloneSource) {
                // Fără Alt: începe clonarea
                brushStart = { x: p.x, y: p.y };
            } else {
                statusCoordsEl.textContent = 'Clone: Alt+click pe canvas pentru a seta sursa';
            }
        } else if (currentTool === 'pen') {
            // Pen: adaugă puncte la cale
            penPoints.push({ x: p.x, y: p.y });
            drawCtx.clearRect(0, 0, canvasWidth, canvasHeight);
            drawCtx.strokeStyle = strokeColor;
            drawCtx.fillStyle = strokeColor;
            drawCtx.lineWidth = 2;
            drawCtx.beginPath();
            penPoints.forEach((pt, i) => { if (i === 0) drawCtx.moveTo(pt.x, pt.y); else drawCtx.lineTo(pt.x, pt.y); });
            drawCtx.stroke();
            penPoints.forEach(pt => { drawCtx.beginPath(); drawCtx.arc(pt.x, pt.y, 3, 0, Math.PI * 2); drawCtx.fill(); });
            if (penPoints.length >= 2) {
                statusCoordsEl.textContent = 'Pen: dublu-click sau Enter pentru a finaliza (' + penPoints.length + ' puncte)';
            }
        } else if (currentTool === 'crop') {
            cropStart = { x: p.x, y: p.y };
        } else if (currentTool === 'rect' || currentTool === 'ellipse' || currentTool === 'line') {
            shapeStart = { x: p.x, y: p.y };
        } else if (currentTool === 'text') {
            const text = window.prompt('Text:', '');
            if (text) {
                pushUndo();
                createLayer({ type: 'text', x: p.x, y: p.y, w: 0, h: 0, text, fill: fillColor, fontSize: 16 });
                render();
            }
        } else if (currentTool === 'eyedropper') {
            hideEyedropperPreview();
            const imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
            const i = (Math.floor(p.y) * canvasWidth + Math.floor(p.x)) * 4;
            const r = imgData.data[i], g = imgData.data[i + 1], b = imgData.data[i + 2];
            const hex = '#' + [r, g, b].map(x => ('0' + x.toString(16)).slice(-2)).join('');
            fillColorEl.value = hex;
            fillColor = hex;
            var layer = layers.find(l => l.id === selectedLayerId);
            if (layer && VECTOR_TYPES.indexOf(layer.type) >= 0) {
                pushUndo();
                layer.fill = hex;
                if (propLayerFillEl) propLayerFillEl.value = hex;
                render();
            }
        } else if (currentTool === 'brush' || currentTool === 'pencil' || currentTool === 'eraser') {
            fillColor = fillColorEl.value;
            strokeColor = strokeColorEl.value;
            brushStart = { x: p.x, y: p.y };
            brushPoints = [{ x: p.x, y: p.y }];
        } else if (currentTool === 'paintbucket') {
            pushUndo();
            const imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
            const target = (Math.floor(p.y) * canvasWidth + Math.floor(p.x)) * 4;
            const r = imgData.data[target], g = imgData.data[target + 1], b = imgData.data[target + 2];
            const fillR = parseInt(fillColor.slice(1, 3), 16), fillG = parseInt(fillColor.slice(3, 5), 16), fillB = parseInt(fillColor.slice(5, 7), 16);
            const stack = [[Math.floor(p.x), Math.floor(p.y)]];
            const seen = new Set([p.y * canvasWidth + p.x]);
            const tol = 30;
            while (stack.length) {
                const [cx, cy] = stack.pop();
                const i = (cy * canvasWidth + cx) * 4;
                imgData.data[i] = fillR;
                imgData.data[i + 1] = fillG;
                imgData.data[i + 2] = fillB;
                [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]].forEach(([nx, ny]) => {
                    if (nx < 0 || nx >= canvasWidth || ny < 0 || ny >= canvasHeight) return;
                    const key = ny * canvasWidth + nx;
                    if (seen.has(key)) return;
                    const j = key * 4;
                    if (Math.abs(imgData.data[j] - r) <= tol && Math.abs(imgData.data[j + 1] - g) <= tol && Math.abs(imgData.data[j + 2] - b) <= tol) {
                        seen.add(key);
                        stack.push([nx, ny]);
                    }
                });
            }
            ctx.putImageData(imgData, 0, 0);
            var flatUrl = mainCanvas.toDataURL('image/png');
            layers = [];
            nextLayerId = 1;
            createLayer({ type: 'image', x: 0, y: 0, w: canvasWidth, h: canvasHeight, imageData: flatUrl });
            selectedLayerId = null;
            render();
        }
        render();
    }

    function getResizeCursor(handle) {
        const cursors = { nw: 'nwse-resize', n: 'n-resize', ne: 'nesw-resize', e: 'e-resize', se: 'nwse-resize', s: 's-resize', sw: 'nesw-resize', w: 'w-resize' };
        return cursors[handle] || 'default';
    }

    function handleCanvasMouseMove(e) {
        const p = screenToCanvas(e.clientX, e.clientY);
        statusCoordsEl.textContent = 'x: ' + p.x + ', y: ' + p.y;

        // Eyedropper live preview
        if (currentTool === 'eyedropper' || pickingCanvasColorMode) {
            if (p.x >= 0 && p.y >= 0 && p.x < canvasWidth && p.y < canvasHeight) {
                var previewColor = getPixelColorAt(p.x, p.y);
                showEyedropperPreview(e.clientX, e.clientY, previewColor);
            } else {
                hideEyedropperPreview();
            }
        } else {
            hideEyedropperPreview();
        }

        if (panStart) {
            panX = panStart.startPanX + (e.clientX - panStart.startX);
            panY = panStart.startPanY + (e.clientY - panStart.startY);
            if (canvasInner) canvasInner.style.transform = 'translate(' + panX + 'px,' + panY + 'px)';
            canvasWrap.style.cursor = 'grabbing';
        } else if (resizeStart) {
            canvasWrap.style.cursor = getResizeCursor(resizeStart.handle);
            const rs = resizeStart;
            const dx = p.x - rs.startX, dy = p.y - rs.startY;
            let left = rs.startBounds.x, top = rs.startBounds.y, right = rs.startBounds.x + rs.startBounds.w, bottom = rs.startBounds.y + rs.startBounds.h;
            const minSize = 1;
            switch (rs.handle) {
                case 'nw': left += dx; top += dy; break;
                case 'n': top += dy; break;
                case 'ne': top += dy; right += dx; break;
                case 'e': right += dx; break;
                case 'se': right += dx; bottom += dy; break;
                case 's': bottom += dy; break;
                case 'sw': left += dx; bottom += dy; break;
                case 'w': left += dx; break;
            }
            let w = right - left, h = bottom - top;
            if (w < minSize) { w = minSize; if (rs.handle === 'w' || rs.handle === 'nw' || rs.handle === 'sw') left = right - minSize; else right = left + minSize; }
            if (h < minSize) { h = minSize; if (rs.handle === 'n' || rs.handle === 'nw' || rs.handle === 'ne') top = bottom - minSize; else bottom = top + minSize; }
            applyResizeToLayer(rs.layer, left, top, w, h);
            render();
        } else {
            if (currentTool === 'pointer' || currentTool === 'scale') {
                const handleHit = getHandleAt(p.x, p.y);
                const cur = handleHit ? getResizeCursor(handleHit.handle) : (currentTool === 'scale' ? 'move' : 'default');
                canvasWrap.style.cursor = cur;
                mainCanvas.style.cursor = cur;
                drawCanvas.style.cursor = cur;
            } else if (dragStart && (currentTool === 'hand' || currentTool === 'subselect')) {
                canvasWrap.style.cursor = 'grabbing';
                mainCanvas.style.cursor = 'grabbing';
                drawCanvas.style.cursor = 'grabbing';
                document.body.style.cursor = 'grabbing';
                dragStart.layer.x = p.x - dragStart.startX;
                dragStart.layer.y = p.y - dragStart.startY;
                render();
            } else if (currentTool === 'hand' || currentTool === 'subselect') {
                canvasWrap.style.cursor = 'grab';
                mainCanvas.style.cursor = 'grab';
                drawCanvas.style.cursor = 'grab';
                document.body.style.cursor = 'grab';
            } else {
                canvasWrap.style.cursor = 'default';
                mainCanvas.style.cursor = 'default';
                drawCanvas.style.cursor = 'default';
                if (document.body.style.cursor === 'grab' || document.body.style.cursor === 'grabbing') {
                    document.body.style.cursor = '';
                }
            }
        }
        if (!resizeStart && brushStart && (currentTool === 'brush' || currentTool === 'pencil' || currentTool === 'eraser')) {
            drawCtx.strokeStyle = currentTool === 'eraser' ? canvasColor : (fillColor = fillColorEl.value);
            drawCtx.lineWidth = currentTool === 'eraser' ? Math.max(4, brushSizePx * 2) : brushSizePx;
            drawCtx.lineCap = currentTool === 'pencil' ? 'square' : 'round';
            drawCtx.lineJoin = currentTool === 'pencil' ? 'miter' : 'round';
            drawCtx.globalAlpha = globalOpacity;
            drawCtx.beginPath();
            drawCtx.moveTo(brushStart.x, brushStart.y);
            drawCtx.lineTo(p.x, p.y);
            drawCtx.stroke();
            drawCtx.globalAlpha = 1;
            brushStart = { x: p.x, y: p.y };
            brushPoints.push({ x: p.x, y: p.y });
        } else if (selectionStart && currentTool === 'pointer') {
            // dreptunghi de selecție pentru pointer (marquee)
            drawCtx.clearRect(0, 0, canvasWidth, canvasHeight);
            const x = Math.min(selectionStart.x, p.x), y = Math.min(selectionStart.y, p.y);
            const w = Math.max(1, Math.abs(p.x - selectionStart.x)), h = Math.max(1, Math.abs(p.y - selectionStart.y));
            selectionRect = { x, y, w, h };
            drawCtx.strokeStyle = '#ffffff';
            drawCtx.lineWidth = 1.5;
            drawCtx.setLineDash([5, 3]);
            drawCtx.strokeRect(x, y, w, h);
            drawCtx.setLineDash([]);
        } else if (cropStart && currentTool === 'crop') {
            drawCtx.clearRect(0, 0, canvasWidth, canvasHeight);
            const x = Math.min(cropStart.x, p.x), y = Math.min(cropStart.y, p.y);
            const w = Math.max(1, Math.abs(p.x - cropStart.x)), h = Math.max(1, Math.abs(p.y - cropStart.y));
            drawCtx.strokeStyle = '#0e639c';
            drawCtx.lineWidth = 2;
            drawCtx.setLineDash([6, 4]);
            drawCtx.strokeRect(x, y, w, h);
            drawCtx.setLineDash([]);
            drawCtx.fillStyle = 'rgba(14, 99, 156, 0.15)';
            drawCtx.fillRect(x, y, w, h);
        } else if (shapeStart && (currentTool === 'rect' || currentTool === 'ellipse' || currentTool === 'line')) {
            drawCtx.clearRect(0, 0, canvasWidth, canvasHeight);
            drawCtx.strokeStyle = strokeColor;
            drawCtx.fillStyle = fillColor;
            drawCtx.globalAlpha = globalOpacity;
            const x = Math.min(shapeStart.x, p.x), y = Math.min(shapeStart.y, p.y);
            const w = Math.abs(p.x - shapeStart.x), h = Math.abs(p.y - shapeStart.y);
            if (currentTool === 'rect') {
                drawCtx.fillRect(x, y, w, h);
                drawCtx.strokeRect(x, y, w, h);
            } else if (currentTool === 'ellipse') {
                drawCtx.beginPath();
                drawCtx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
                drawCtx.fill();
                drawCtx.stroke();
            } else if (currentTool === 'line') {
                drawCtx.beginPath();
                drawCtx.moveTo(shapeStart.x, shapeStart.y);
                drawCtx.lineTo(p.x, p.y);
                drawCtx.stroke();
            }
            drawCtx.globalAlpha = 1;
        } else if (marqueeStart && currentTool === 'marquee') {
            drawCtx.clearRect(0, 0, canvasWidth, canvasHeight);
            const x = Math.min(marqueeStart.x, p.x), y = Math.min(marqueeStart.y, p.y);
            const w = Math.max(1, Math.abs(p.x - marqueeStart.x)), h = Math.max(1, Math.abs(p.y - marqueeStart.y));
            drawCtx.strokeStyle = '#ffffff';
            drawCtx.lineWidth = 1.5;
            drawCtx.setLineDash([5, 3]);
            drawCtx.strokeRect(x, y, w, h);
            drawCtx.setLineDash([]);
        } else if (lassoPoints.length && currentTool === 'lasso') {
            lassoPoints.push({ x: p.x, y: p.y });
            drawCtx.clearRect(0, 0, canvasWidth, canvasHeight);
            drawCtx.strokeStyle = '#ffffff';
            drawCtx.lineWidth = 1.5;
            drawCtx.setLineDash([5, 3]);
            drawCtx.beginPath();
            lassoPoints.forEach((pt, i) => { if (i === 0) drawCtx.moveTo(pt.x, pt.y); else drawCtx.lineTo(pt.x, pt.y); });
            drawCtx.stroke();
            drawCtx.setLineDash([]);
        } else if (brushStart && currentTool === 'clone' && cloneSource) {
            const offsetX = p.x - brushStart.x;
            const offsetY = p.y - brushStart.y;
            const srcX = cloneSource.x + offsetX;
            const srcY = cloneSource.y + offsetY;
            // Read from mainCanvas, paint on drawCanvas
            const size = brushSizePx;
            const srcData = ctx.getImageData(
                Math.max(0, Math.floor(srcX - size / 2)),
                Math.max(0, Math.floor(srcY - size / 2)),
                Math.min(size, canvasWidth),
                Math.min(size, canvasHeight)
            );
            drawCtx.putImageData(srcData,
                Math.floor(p.x - size / 2),
                Math.floor(p.y - size / 2)
            );
        } else if (dragStart && currentTool === 'scale') {
            dragStart.layer.x = p.x - dragStart.startX;
            dragStart.layer.y = p.y - dragStart.startY;
            render();
        }
    }

    function setTool(tool) {
        currentTool = tool;
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        const btn = document.querySelector('.tool-btn[data-tool="' + tool + '"]');
        if (btn) btn.classList.add('active');
        var drawTools = ['rect', 'ellipse', 'brush', 'pencil', 'eraser', 'line', 'crop', 'marquee', 'lasso', 'clone', 'pen'];
        canvasWrap.classList.toggle('has-draw', drawTools.indexOf(currentTool) >= 0);
        drawCanvas.style.pointerEvents = drawTools.indexOf(currentTool) >= 0 ? 'auto' : 'none';
        // Reset state from previous tool
        marqueeStart = null;
        lassoPoints = [];
        penPoints = [];
        brushStart = null;
        brushPoints = [];
        shapeStart = null;
        cropStart = null;
        drawCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        // Redraw bitmap selection if exists
        if (bitmapSelection) {
            drawCtx.strokeStyle = '#ffffff';
            drawCtx.lineWidth = 1.5;
            drawCtx.setLineDash([5, 3]);
            drawCtx.strokeRect(bitmapSelection.x, bitmapSelection.y, bitmapSelection.w, bitmapSelection.h);
            drawCtx.setLineDash([]);
        }
        const isGrabTool = (tool === 'hand' || tool === 'subselect');
        var cursorMap = {
            hand: 'grab', subselect: 'grab', zoom: 'zoom-in',
            brush: 'crosshair', pencil: 'crosshair', eraser: 'crosshair',
            eyedropper: 'crosshair', paintbucket: 'crosshair', clone: 'crosshair',
            marquee: 'crosshair', lasso: 'crosshair', magicwand: 'crosshair',
            crop: 'crosshair', pen: 'crosshair', scale: 'move'
        };
        var toolCursor = cursorMap[tool] || 'default';
        canvasWrap.style.cursor = toolCursor;
        mainCanvas.style.cursor = toolCursor;
        drawCanvas.style.cursor = toolCursor;
        document.body.style.cursor = isGrabTool ? 'grab' : '';
        var statusMsg = {
            crop: 'Crop: trage pe canvas pentru zona de păstrat, apoi eliberează',
            eyedropper: 'Eyedropper: click pe canvas pentru a prelua culoarea',
            marquee: 'Marquee: trage pentru selecție dreptunghiulară (Delete = șterge zona)',
            lasso: 'Lasso: trage liber pentru selecție (Delete = șterge zona)',
            magicwand: 'Magic Wand: click pentru a selecta pixeli similari (Delete = șterge)',
            clone: 'Clone: Alt+click = setează sursa, apoi pictează',
            pen: 'Pen: click = adaugă punct, dublu-click sau Enter = finalizează',
            scale: 'Scale: click = selectare + mutare, mânere = redimensionare',
            zoom: 'Zoom: click = mărire, Alt+click = micșorare'
        }[tool];
        if (statusMsg) statusCoordsEl.textContent = statusMsg;
    }

    function handleCanvasMouseUp(e) {
        if (selectionStart && currentTool === 'pointer') {
            // finalizăm doar dreptunghiul de selecție (marquee); rămâne desenat până la o nouă selecție
            selectionStart = null;
        } else if (shapeStart && (currentTool === 'rect' || currentTool === 'ellipse' || currentTool === 'line')) {
            const p = screenToCanvas(e.clientX, e.clientY);
            const x = Math.min(shapeStart.x, p.x), y = Math.min(shapeStart.y, p.y);
            const w = Math.max(1, Math.abs(p.x - shapeStart.x)), h = Math.max(1, Math.abs(p.y - shapeStart.y));
            pushUndo();
            let newLayer = null;
            if (currentTool === 'rect') newLayer = createLayer({ type: 'rect', x, y, w, h, fill: fillColor, stroke: strokeColor });
            else if (currentTool === 'ellipse') newLayer = createLayer({ type: 'ellipse', x, y, w, h, fill: fillColor, stroke: strokeColor });
            else if (currentTool === 'line') {
                newLayer = createLayer({ type: 'line', x: shapeStart.x, y: shapeStart.y, w: p.x - shapeStart.x, h: p.y - shapeStart.y });
            }
            shapeStart = null;
            drawCtx.clearRect(0, 0, canvasWidth, canvasHeight);
            if (newLayer) {
                selectedLayerId = newLayer.id;
            }
            render();
        }
        if (marqueeStart && currentTool === 'marquee') {
            const p = screenToCanvas(e.clientX, e.clientY);
            const x = Math.min(marqueeStart.x, p.x), y = Math.min(marqueeStart.y, p.y);
            const w = Math.max(1, Math.abs(p.x - marqueeStart.x)), h = Math.max(1, Math.abs(p.y - marqueeStart.y));
            bitmapSelection = { x: Math.floor(x), y: Math.floor(y), w: Math.floor(w), h: Math.floor(h) };
            marqueeStart = null;
            drawCtx.clearRect(0, 0, canvasWidth, canvasHeight);
            drawCtx.strokeStyle = '#ffffff';
            drawCtx.lineWidth = 1.5;
            drawCtx.setLineDash([5, 3]);
            drawCtx.strokeRect(bitmapSelection.x, bitmapSelection.y, bitmapSelection.w, bitmapSelection.h);
            drawCtx.setLineDash([]);
            statusCoordsEl.textContent = 'Selecție: ' + bitmapSelection.w + 'x' + bitmapSelection.h + ' (Delete = șterge)';
        }
        if (lassoPoints.length > 2 && currentTool === 'lasso') {
            // Close the path and compute bounding box
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            lassoPoints.forEach(pt => {
                if (pt.x < minX) minX = pt.x;
                if (pt.x > maxX) maxX = pt.x;
                if (pt.y < minY) minY = pt.y;
                if (pt.y > maxY) maxY = pt.y;
            });
            bitmapSelection = { x: Math.floor(minX), y: Math.floor(minY), w: Math.floor(maxX - minX + 1), h: Math.floor(maxY - minY + 1) };
            lassoPoints = [];
            drawCtx.clearRect(0, 0, canvasWidth, canvasHeight);
            drawCtx.strokeStyle = '#ffffff';
            drawCtx.lineWidth = 1.5;
            drawCtx.setLineDash([5, 3]);
            drawCtx.strokeRect(bitmapSelection.x, bitmapSelection.y, bitmapSelection.w, bitmapSelection.h);
            drawCtx.setLineDash([]);
            statusCoordsEl.textContent = 'Selecție: ' + bitmapSelection.w + 'x' + bitmapSelection.h + ' (Delete = șterge)';
        }
        if (brushStart && currentTool === 'clone') {
            // Flatten clone strokes to a layer
            pushUndo();
            createLayer({ type: 'image', x: 0, y: 0, w: canvasWidth, h: canvasHeight, imageData: drawCanvas.toDataURL('image/png') });
            drawCtx.clearRect(0, 0, canvasWidth, canvasHeight);
            brushStart = null;
            render();
        }
        resizeStart = null;
        dragStart = null;
        panStart = null;
        if (currentTool === 'hand' || currentTool === 'subselect') {
            // după drag, revenim la cursor de „grab” peste canvas
            canvasWrap.style.cursor = 'grab';
            mainCanvas.style.cursor = 'grab';
            drawCanvas.style.cursor = 'grab';
            document.body.style.cursor = 'grab';
        }
        if (cropStart && currentTool === 'crop') {
            const p = screenToCanvas(e.clientX, e.clientY);
            let x = Math.min(cropStart.x, p.x), y = Math.min(cropStart.y, p.y);
            let w = Math.max(1, Math.abs(p.x - cropStart.x)), h = Math.max(1, Math.abs(p.y - cropStart.y));
            x = Math.max(0, Math.min(x, canvasWidth - 1));
            y = Math.max(0, Math.min(y, canvasHeight - 1));
            w = Math.min(w, canvasWidth - x);
            h = Math.min(h, canvasHeight - y);
            if (w >= 1 && h >= 1) {
                pushUndo();
                var cropCanvas = document.createElement('canvas');
                cropCanvas.width = w;
                cropCanvas.height = h;
                var cropCtx = cropCanvas.getContext('2d');
                cropCtx.drawImage(mainCanvas, x, y, w, h, 0, 0, w, h);
                var dataUrl = cropCanvas.toDataURL('image/png');
                layers = [];
                nextLayerId = 1;
                imageCache = {};
                createLayer({ type: 'image', x: 0, y: 0, w: w, h: h, imageData: dataUrl });
                canvasWidth = w;
                canvasHeight = h;
                selectedLayerId = null;
                drawCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
            }
            cropStart = null;
            render();
        }
        cropStart = null;
        if (brushStart && (currentTool === 'brush' || currentTool === 'pencil' || currentTool === 'eraser')) {
            pushUndo();
            if (currentTool === 'eraser') {
                // Eraser stays as image layer (bitmap erase)
                var w = canvasWidth, h = canvasHeight;
                createLayer({ type: 'image', x: 0, y: 0, w: w, h: h, imageData: drawCanvas.toDataURL('image/png') });
            } else if (brushPoints.length >= 2) {
                // Create a path layer from collected points
                var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                var pad = brushSizePx; // padding for stroke width
                for (var bi = 0; bi < brushPoints.length; bi++) {
                    if (brushPoints[bi].x < minX) minX = brushPoints[bi].x;
                    if (brushPoints[bi].y < minY) minY = brushPoints[bi].y;
                    if (brushPoints[bi].x > maxX) maxX = brushPoints[bi].x;
                    if (brushPoints[bi].y > maxY) maxY = brushPoints[bi].y;
                }
                var bw = Math.max(1, maxX - minX);
                var bh = Math.max(1, maxY - minY);
                // Normalize points to relative coordinates (0-1)
                var relPoints = [];
                for (var bi2 = 0; bi2 < brushPoints.length; bi2++) {
                    relPoints.push({
                        rx: bw > 0 ? (brushPoints[bi2].x - minX) / bw : 0.5,
                        ry: bh > 0 ? (brushPoints[bi2].y - minY) / bh : 0.5
                    });
                }
                var newPathLayer = createLayer({
                    type: 'path',
                    x: minX, y: minY, w: bw, h: bh,
                    fill: fillColor, stroke: fillColor,
                    lineWidth: brushSizePx,
                    points: relPoints,
                    pathCap: currentTool === 'pencil' ? 'square' : 'round',
                    pathJoin: currentTool === 'pencil' ? 'miter' : 'round'
                });
                selectedLayerId = newPathLayer.id;
            }
            drawCtx.clearRect(0, 0, canvasWidth, canvasHeight);
            brushStart = null;
            brushPoints = [];
            render();
        }
    }

    canvasWrap.addEventListener('mousedown', handleCanvasMouseDown);
    canvasWrap.addEventListener('mousemove', handleCanvasMouseMove);
    canvasWrap.addEventListener('mouseup', handleCanvasMouseUp);
    canvasWrap.addEventListener('dblclick', function (e) {
        if (currentTool === 'pen' && penPoints.length >= 2) {
            finalizePen();
        }
    });
    canvasWrap.addEventListener('mouseleave', () => { shapeStart = null; dragStart = null; resizeStart = null; panStart = null; cropStart = null; brushStart = null; brushPoints = []; marqueeStart = null; lassoPoints = []; drawCtx.clearRect(0, 0, canvasWidth, canvasHeight); hideEyedropperPreview(); });

    function finalizePen() {
        if (penPoints.length < 2) return;
        pushUndo();
        // Draw pen path onto a temp canvas, create image layer
        var tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = canvasWidth;
        tmpCanvas.height = canvasHeight;
        var tmpCtx = tmpCanvas.getContext('2d');
        tmpCtx.strokeStyle = strokeColor;
        tmpCtx.lineWidth = 2;
        tmpCtx.lineCap = 'round';
        tmpCtx.lineJoin = 'round';
        tmpCtx.beginPath();
        penPoints.forEach(function (pt, i) { if (i === 0) tmpCtx.moveTo(pt.x, pt.y); else tmpCtx.lineTo(pt.x, pt.y); });
        tmpCtx.stroke();
        createLayer({ type: 'image', x: 0, y: 0, w: canvasWidth, h: canvasHeight, imageData: tmpCanvas.toDataURL('image/png') });
        penPoints = [];
        drawCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        setTool('pointer');
        render();
    }

    // ---- Canvas Size ----
    const canvasSizeOverlay = document.getElementById('canvasSizeOverlay');
    const canvasNewW = document.getElementById('canvasNewW');
    const canvasNewH = document.getElementById('canvasNewH');
    const anchorGrid = document.getElementById('anchorGrid');
    const canvasCurrentSize = document.getElementById('canvasCurrentSize');

    document.getElementById('btnCanvasSize').addEventListener('click', () => {
        canvasNewW.value = canvasWidth;
        canvasNewH.value = canvasHeight;
        canvasCurrentSize.textContent = canvasWidth + ' x ' + canvasHeight + ' pixels';
        document.getElementById('canvasSizeBgColor').value = canvasColor;
        document.getElementById('canvasSizePickHint').style.display = 'none';
        pickingCanvasColorMode = null;
        anchorGrid.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        anchorGrid.querySelector('[data-anchor="' + canvasAnchor + '"]').classList.add('active');
        canvasSizeOverlay.classList.add('visible');
    });
    document.getElementById('canvasSizeEyedropper').addEventListener('click', () => {
        canvasSizeOverlay.classList.remove('visible');
        pickingCanvasColorMode = 'dialog';
        document.getElementById('canvasSizePickHint').style.display = 'inline';
        statusCoordsEl.textContent = 'Click pe canvas pentru a alege culoarea fundalului';
    });
    document.getElementById('canvasColorEyedropper').addEventListener('click', () => {
        var layer = layers.find(l => l.id === selectedLayerId);
        if (layer && VECTOR_TYPES.indexOf(layer.type) >= 0) {
            pickingCanvasColorMode = 'selection';
            statusCoordsEl.textContent = 'Click pe imagine → culoarea se aplică la OBIECTUL selectat';
        } else {
            pickingCanvasColorMode = 'properties';
            statusCoordsEl.textContent = 'Click pe imagine → culoarea se aplică la FUNDALUL paginii';
        }
    });
    var propEyedropperFillEl = document.getElementById('propEyedropperFill');
    if (propEyedropperFillEl) {
        propEyedropperFillEl.addEventListener('click', () => {
            if (!selectedLayerId) return;
            var layer = layers.find(l => l.id === selectedLayerId);
            if (layer && VECTOR_TYPES.indexOf(layer.type) >= 0) {
                pickingCanvasColorMode = 'selection';
                statusCoordsEl.textContent = 'Click pe imagine → culoarea se aplică la OBIECTUL selectat';
            }
        });
    }
    anchorGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-anchor]');
        if (!btn) return;
        anchorGrid.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        canvasAnchor = btn.dataset.anchor;
    });
    document.getElementById('canvasSizeOk').addEventListener('click', () => {
        pushUndo();
        canvasColor = document.getElementById('canvasSizeBgColor').value;
        canvasColorEl.value = canvasColor;
        const newW = Math.max(1, parseInt(canvasNewW.value, 10));
        const newH = Math.max(1, parseInt(canvasNewH.value, 10));
        const dx = newW - canvasWidth, dy = newH - canvasHeight;
        const [ax, ay] = { nw: [0, 0], n: [0.5, 0], ne: [1, 0], w: [0, 0.5], c: [0.5, 0.5], e: [1, 0.5], sw: [0, 1], s: [0.5, 1], se: [1, 1] }[canvasAnchor];
        layers.forEach(layer => {
            layer.x += dx * (1 - ax);
            layer.y += dy * (1 - ay);
        });
        canvasWidth = newW;
        canvasHeight = newH;
        document.getElementById('canvasSizePickHint').style.display = 'none';
        pickingCanvasColorMode = null;
        canvasSizeOverlay.classList.remove('visible');
        render();
    });
    document.getElementById('canvasSizeCancel').addEventListener('click', () => {
        document.getElementById('canvasSizePickHint').style.display = 'none';
        pickingCanvasColorMode = null;
        canvasSizeOverlay.classList.remove('visible');
    });

    // ---- Image Size ----
    const imageSizeOverlay = document.getElementById('imageSizeOverlay');
    const imageNewW = document.getElementById('imageNewW');
    const imageNewH = document.getElementById('imageNewH');
    const constrainProportions = document.getElementById('constrainProportions');

    document.getElementById('btnImageSize').addEventListener('click', () => {
        imageNewW.value = canvasWidth;
        imageNewH.value = canvasHeight;
        imageSizeOverlay.classList.add('visible');
    });
    imageNewW.addEventListener('input', () => {
        if (constrainProportions.checked && canvasWidth) imageNewH.value = Math.round(canvasHeight * imageNewW.value / canvasWidth);
    });
    imageNewH.addEventListener('input', () => {
        if (constrainProportions.checked && canvasHeight) imageNewW.value = Math.round(canvasWidth * imageNewH.value / canvasHeight);
    });
    document.getElementById('imageSizeOk').addEventListener('click', () => {
        pushUndo();
        const newW = Math.max(1, parseInt(imageNewW.value, 10));
        const newH = Math.max(1, parseInt(imageNewH.value, 10));
        const scaleX = newW / canvasWidth, scaleY = newH / canvasHeight;
        layers.forEach(layer => {
            layer.x *= scaleX;
            layer.y *= scaleY;
            layer.w *= scaleX;
            layer.h *= scaleY;
            if (layer.fontSize) layer.fontSize = Math.round(layer.fontSize * Math.min(scaleX, scaleY));
        });
        canvasWidth = newW;
        canvasHeight = newH;
        imageSizeOverlay.classList.remove('visible');
        render();
    });
    document.getElementById('imageSizeCancel').addEventListener('click', () => imageSizeOverlay.classList.remove('visible'));

    document.getElementById('btnFitCanvas').addEventListener('click', () => {
        pushUndo();
        let minX = 0, minY = 0, maxX = canvasWidth, maxY = canvasHeight;
        layers.forEach(l => {
            minX = Math.min(minX, l.x);
            minY = Math.min(minY, l.y);
            maxX = Math.max(maxX, l.x + l.w);
            maxY = Math.max(maxY, l.y + l.h);
        });
        const pad = 20;
        const newW = Math.max(100, maxX - minX + pad * 2);
        const newH = Math.max(100, maxY - minY + pad * 2);
        layers.forEach(l => { l.x -= minX - pad; l.y -= minY - pad; });
        canvasWidth = newW;
        canvasHeight = newH;
        render();
    });

    layerOpacitySliderEl.addEventListener('mousedown', () => {
        var layer = layers.find(l => l.id === selectedLayerId);
        if (layer) pushUndo();
    });
    layerOpacitySliderEl.addEventListener('input', () => {
        var layer = layers.find(l => l.id === selectedLayerId);
        if (layer) {
            layer.opacity = layerOpacitySliderEl.value / 100;
            layerOpacityValEl.textContent = layerOpacitySliderEl.value + '%';
            render();
        }
    });

    function handlePropColorInput(el, prop) {
        var layer = layers.find(l => l.id === selectedLayerId);
        if (layer && VECTOR_TYPES.indexOf(layer.type) >= 0) {
            if (!colorUndoPushed) { pushUndo(); colorUndoPushed = true; }
            layer[prop] = el.value;
            render();
        }
    }
    if (propLayerFillEl) {
        propLayerFillEl.addEventListener('input', () => handlePropColorInput(propLayerFillEl, 'fill'));
        propLayerFillEl.addEventListener('change', () => { handlePropColorInput(propLayerFillEl, 'fill'); colorUndoPushed = false; });
    }
    if (propLayerStrokeEl) {
        propLayerStrokeEl.addEventListener('input', () => handlePropColorInput(propLayerStrokeEl, 'stroke'));
        propLayerStrokeEl.addEventListener('change', () => { handlePropColorInput(propLayerStrokeEl, 'stroke'); colorUndoPushed = false; });
    }
    var propStrokeWidthEl = document.getElementById('propStrokeWidth');
    if (propStrokeWidthEl) {
        var strokeWidthUndoPushed = false;
        propStrokeWidthEl.addEventListener('input', function () {
            var layer = layers.find(l => l.id === selectedLayerId);
            if (layer) {
                if (!strokeWidthUndoPushed) { pushUndo(); strokeWidthUndoPushed = true; }
                layer.lineWidth = Math.max(0, parseInt(propStrokeWidthEl.value, 10) || 0);
                render();
            }
        });
        propStrokeWidthEl.addEventListener('change', function () {
            strokeWidthUndoPushed = false;
        });
    }

    // ---- Position & dimension inputs in properties ----
    ['propLayerX', 'propLayerY', 'propLayerW', 'propLayerH'].forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        var propUndoPushed = false;
        el.addEventListener('input', function () {
            var layer = layers.find(function (l) { return l.id === selectedLayerId; });
            if (!layer) return;
            if (!propUndoPushed) { pushUndo(); propUndoPushed = true; }
            var val = parseInt(el.value, 10) || 0;
            if (id === 'propLayerX') layer.x = val;
            else if (id === 'propLayerY') layer.y = val;
            else if (id === 'propLayerW') layer.w = Math.max(1, val);
            else if (id === 'propLayerH') layer.h = Math.max(1, val);
            render();
        });
        el.addEventListener('change', function () { propUndoPushed = false; });
    });

    // ---- Layers ----
    document.getElementById('btnAddLayer').addEventListener('click', () => {
        pushUndo();
        var newL = createLayer({ type: 'rect', x: 50, y: 50, w: 100, h: 100, fill: fillColor, stroke: strokeColor });
        if (newL) selectedLayerId = newL.id;
        render();
    });

    // ---- Close confirm dialog ----
    document.getElementById('closeConfirmSave').addEventListener('click', () => doCloseTab(true));
    document.getElementById('closeConfirmDontSave').addEventListener('click', () => doCloseTab(false));
    document.getElementById('closeConfirmCancel').addEventListener('click', () => {
        pendingCloseIndex = null;
        document.getElementById('closeConfirmOverlay').classList.remove('visible');
    });

    // ---- New / Open / Save ----
    document.getElementById('btnNew').addEventListener('click', () => {
        if (documents.length > 0) saveCurrentDocToStore();
        documents.push({
            name: 'Untitled-' + (nextDocId++),
            layers: [],
            nextLayerId: 1,
            canvasWidth: 1161,
            canvasHeight: 900,
            canvasColor: '#ffffff',
            undoStack: [],
            redoStack: []
        });
        currentDocIndex = documents.length - 1;
        loadDocFromStore(currentDocIndex);
        renderTabs();
    });

    const fileInput = document.getElementById('fileInput');
    document.getElementById('btnOpen').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function () {
            const img = new Image();
            img.onload = function () {
                saveCurrentDocToStore();
                const c = document.createElement('canvas');
                c.width = img.width;
                c.height = img.height;
                c.getContext('2d').drawImage(img, 0, 0);
                const dataUrl = c.toDataURL('image/png');
                const newDoc = {
                    name: file.name.replace(/\.[^.]*$/, ''),
                    layers: [{
                        id: 1,
                        type: 'image',
                        x: 0,
                        y: 0,
                        w: img.width,
                        h: img.height,
                        opacity: 1,
                        fill: fillColor,
                        stroke: strokeColor,
                        text: '',
                        imageData: dataUrl,
                        visible: true
                    }],
                    nextLayerId: 2,
                    canvasWidth: img.width,
                    canvasHeight: img.height,
                    canvasColor: '#ffffff',
                    undoStack: [],
                    redoStack: []
                };
                documents.push(newDoc);
                currentDocIndex = documents.length - 1;
                loadDocFromStore(currentDocIndex);
                propDocNameEl.textContent = docName;
                renderTabs();
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
        fileInput.value = '';
    });

    document.getElementById('btnSave').addEventListener('click', () => {
        mainCanvas.width = canvasWidth;
        mainCanvas.height = canvasHeight;
        ctx.fillStyle = canvasColor;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        layers.forEach(layer => {
            if (!layer.visible) return;
            ctx.globalAlpha = layer.opacity * globalOpacity;
            if (layer.type === 'image' && layer.imageData) {
                const img = new Image();
                img.src = layer.imageData;
                ctx.drawImage(img, layer.x, layer.y, layer.w, layer.h);
            } else if (layer.type === 'rect') {
                ctx.fillStyle = layer.fill;
                ctx.fillRect(layer.x, layer.y, layer.w, layer.h);
                if (layer.stroke && (layer.lineWidth || 0) > 0) { var flw = layer.lineWidth || 2, fhlw = flw / 2; ctx.strokeStyle = layer.stroke; ctx.lineWidth = flw; ctx.strokeRect(layer.x - fhlw, layer.y - fhlw, layer.w + flw, layer.h + flw); }
            } else if (layer.type === 'ellipse') {
                ctx.fillStyle = layer.fill;
                ctx.beginPath();
                var ecx = layer.x + layer.w / 2, ecy = layer.y + layer.h / 2;
                ctx.ellipse(ecx, ecy, layer.w / 2, layer.h / 2, 0, 0, Math.PI * 2);
                ctx.fill();
                if (layer.stroke && (layer.lineWidth || 0) > 0) { var felw = layer.lineWidth || 2, fehlw = felw / 2; ctx.strokeStyle = layer.stroke; ctx.lineWidth = felw; ctx.beginPath(); ctx.ellipse(ecx, ecy, layer.w / 2 + fehlw, layer.h / 2 + fehlw, 0, 0, Math.PI * 2); ctx.stroke(); }
            } else if (layer.type === 'text' && layer.text) {
                ctx.fillStyle = layer.fill;
                ctx.font = (layer.fontSize || 16) + 'px sans-serif';
                ctx.fillText(layer.text, layer.x, layer.y + (layer.fontSize || 16));
            } else if (layer.type === 'line') {
                ctx.strokeStyle = layer.stroke || strokeColor;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(layer.x, layer.y);
                ctx.lineTo(layer.x + layer.w, layer.y + layer.h);
                ctx.stroke();
            }
        });
        ctx.globalAlpha = 1;
        const link = document.createElement('a');
        link.download = (docName || 'image') + '.png';
        link.href = mainCanvas.toDataURL('image/png');
        link.click();
        render();
    });

    // ---- Toolbar resize ----
    (function () {
        var resizeHandle = document.getElementById('toolbarResize');
        var toolbar = document.getElementById('toolbar');
        if (!resizeHandle || !toolbar) return;
        var minW = 80, maxW = 280;
        var startX = 0, startW = 0;

        function getToolbarWidth() {
            var w = getComputedStyle(document.documentElement).getPropertyValue('--toolbar-width').trim();
            return Math.max(minW, Math.min(maxW, parseInt(w, 10) || 80));
        }
        function setToolbarWidth(px) {
            document.documentElement.style.setProperty('--toolbar-width', Math.max(minW, Math.min(maxW, px)) + 'px');
        }

        resizeHandle.addEventListener('mousedown', function (e) {
            e.preventDefault();
            startX = e.clientX;
            startW = getToolbarWidth();
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            function onMove(e) {
                setToolbarWidth(startW + (e.clientX - startX));
            }
            function onUp() {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
    })();

    // ---- Undo / Redo buttons and keyboard ----
    document.getElementById('btnUndo').addEventListener('click', undo);
    document.getElementById('btnRedo').addEventListener('click', redo);
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'z') {
            e.preventDefault();
            if (e.shiftKey) redo();
            else undo();
        } else if (e.ctrlKey && e.key === 'y') {
            e.preventDefault();
            redo();
        } else if (e.key === 'Enter' && currentTool === 'pen' && penPoints.length >= 2) {
            e.preventDefault();
            finalizePen();
        } else if (e.key === 'Escape') {
            // Cancel current operation
            if (currentTool === 'pen' && penPoints.length) {
                penPoints = [];
                drawCtx.clearRect(0, 0, canvasWidth, canvasHeight);
                statusCoordsEl.textContent = 'Pen: anulat';
            }
            if (bitmapSelection) {
                bitmapSelection = null;
                drawCtx.clearRect(0, 0, canvasWidth, canvasHeight);
                statusCoordsEl.textContent = 'Selecție anulată';
            }
        } else if ((e.key === 'Delete' || e.key === 'Backspace')) {
            const active = document.activeElement;
            if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;
            e.preventDefault();
            if (bitmapSelection) {
                // Delete pixels in bitmap selection area
                pushUndo();
                // Flatten all to main, clear selection area with canvas color
                render(); // ensure mainCanvas is up to date
                var imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
                var cr = parseInt(canvasColor.slice(1, 3), 16), cg = parseInt(canvasColor.slice(3, 5), 16), cb = parseInt(canvasColor.slice(5, 7), 16);
                for (var sy = bitmapSelection.y; sy < bitmapSelection.y + bitmapSelection.h; sy++) {
                    for (var sx = bitmapSelection.x; sx < bitmapSelection.x + bitmapSelection.w; sx++) {
                        if (sx < 0 || sx >= canvasWidth || sy < 0 || sy >= canvasHeight) continue;
                        var idx = (sy * canvasWidth + sx) * 4;
                        imgData.data[idx] = cr;
                        imgData.data[idx + 1] = cg;
                        imgData.data[idx + 2] = cb;
                        imgData.data[idx + 3] = 255;
                    }
                }
                ctx.putImageData(imgData, 0, 0);
                var flatUrl = mainCanvas.toDataURL('image/png');
                layers = [];
                nextLayerId = 1;
                createLayer({ type: 'image', x: 0, y: 0, w: canvasWidth, h: canvasHeight, imageData: flatUrl });
                bitmapSelection = null;
                selectedLayerId = null;
                drawCtx.clearRect(0, 0, canvasWidth, canvasHeight);
                render();
                updateUndoRedoButtons();
            } else if (selectedLayerId) {
                pushUndo();
                layers = layers.filter(l => l.id !== selectedLayerId);
                selectedLayerId = null;
                render();
                updateUndoRedoButtons();
            }
        }
    });

    // ---- Menu dropdown system ----
    (function () {
        var menuItems = document.querySelectorAll('#mainMenu > .menu-item');
        var menuOpen = false;

        function closeAll() {
            menuItems.forEach(function (m) { m.classList.remove('open'); });
            menuOpen = false;
        }

        menuItems.forEach(function (mi) {
            mi.addEventListener('mousedown', function (e) {
                if (e.target.closest('.menu-entry')) return;
                e.preventDefault();
                if (mi.classList.contains('open')) { closeAll(); }
                else { closeAll(); mi.classList.add('open'); menuOpen = true; }
            });
            mi.addEventListener('mouseenter', function () {
                if (menuOpen) { closeAll(); mi.classList.add('open'); menuOpen = true; }
            });
        });

        document.addEventListener('mousedown', function (e) {
            if (!e.target.closest('#mainMenu')) closeAll();
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && menuOpen) closeAll();
        });

        // ---- Menu action dispatcher ----
        document.getElementById('mainMenu').addEventListener('click', function (e) {
            var entry = e.target.closest('.menu-entry');
            if (!entry) return;
            var action = entry.dataset.action;
            closeAll();
            if (action) handleMenuAction(action);
        });
    })();

    function flattenAllLayers() {
        if (layers.length === 0) return;
        pushUndo();
        render();
        var url = mainCanvas.toDataURL('image/png');
        layers = [];
        nextLayerId = 1;
        createLayer({ type: 'image', x: 0, y: 0, w: canvasWidth, h: canvasHeight, imageData: url });
        selectedLayerId = null;
        render();
    }

    function mergeDown() {
        if (!selectedLayerId) return;
        var idx = layers.findIndex(function (l) { return l.id === selectedLayerId; });
        if (idx <= 0) return;
        pushUndo();
        // Render just these two layers to a temp canvas
        var tmp = document.createElement('canvas');
        tmp.width = canvasWidth; tmp.height = canvasHeight;
        var tc = tmp.getContext('2d');
        [layers[idx - 1], layers[idx]].forEach(function (layer) {
            if (!layer.visible) return;
            tc.globalAlpha = layer.opacity;
            if (layer.type === 'image' && layer.imageData) {
                var img = new Image(); img.src = layer.imageData;
                if (img.complete) tc.drawImage(img, layer.x, layer.y, layer.w, layer.h);
            } else if (layer.type === 'rect') {
                tc.fillStyle = layer.fill; tc.fillRect(layer.x, layer.y, layer.w, layer.h);
                if (layer.stroke && (layer.lineWidth || 0) > 0) { tc.strokeStyle = layer.stroke; tc.lineWidth = layer.lineWidth; tc.strokeRect(layer.x, layer.y, layer.w, layer.h); }
            } else if (layer.type === 'ellipse') {
                tc.fillStyle = layer.fill; tc.beginPath(); tc.ellipse(layer.x + layer.w / 2, layer.y + layer.h / 2, layer.w / 2, layer.h / 2, 0, 0, Math.PI * 2); tc.fill();
                if (layer.stroke && (layer.lineWidth || 0) > 0) { tc.strokeStyle = layer.stroke; tc.lineWidth = layer.lineWidth; tc.stroke(); }
            } else if (layer.type === 'text' && layer.text) {
                tc.fillStyle = layer.fill; tc.font = (layer.fontSize || 16) + 'px sans-serif'; tc.fillText(layer.text, layer.x, layer.y + (layer.fontSize || 16));
            } else if (layer.type === 'line') {
                tc.strokeStyle = layer.stroke || '#000'; tc.lineWidth = layer.lineWidth || 2; tc.beginPath(); tc.moveTo(layer.x, layer.y); tc.lineTo(layer.x + layer.w, layer.y + layer.h); tc.stroke();
            }
        });
        tc.globalAlpha = 1;
        var merged = { type: 'image', id: layers[idx - 1].id, x: 0, y: 0, w: canvasWidth, h: canvasHeight, opacity: 1, fill: '#000', stroke: '#000', text: '', imageData: tmp.toDataURL('image/png'), visible: true };
        layers.splice(idx - 1, 2, merged);
        selectedLayerId = merged.id;
        render();
    }

    var clipboard = null;

    function copySelection() {
        if (!selectedLayerId) return;
        var layer = layers.find(function (l) { return l.id === selectedLayerId; });
        if (layer) clipboard = JSON.parse(JSON.stringify(layer));
    }

    function cutSelection() {
        if (!selectedLayerId) return;
        copySelection();
        pushUndo();
        layers = layers.filter(function (l) { return l.id !== selectedLayerId; });
        selectedLayerId = null;
        render();
    }

    // Hidden contenteditable element to receive native paste events
    var pasteTarget = document.createElement('div');
    pasteTarget.setAttribute('contenteditable', 'true');
    pasteTarget.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;';
    document.body.appendChild(pasteTarget);

    function pasteImageBlob(blob) {
        var reader = new FileReader();
        reader.onload = function (ev) {
            var img = new Image();
            img.onload = function () {
                pushUndo();
                // Expand canvas if pasted image is larger, but never shrink
                if (img.width > canvasWidth) canvasWidth = img.width;
                if (img.height > canvasHeight) canvasHeight = img.height;
                createLayer({ type: 'image', x: 0, y: 0, w: img.width, h: img.height, imageData: ev.target.result });
                selectedLayerId = layers[layers.length - 1].id;
                render();
                renderLayersList();
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(blob);
    }

    function pasteSelection() {
        if (clipboard) {
            pushUndo();
            var pasted = JSON.parse(JSON.stringify(clipboard));
            pasted.id = nextLayerId++;
            pasted.x += 10; pasted.y += 10;
            layers.push(pasted);
            selectedLayerId = pasted.id;
            render();
            return;
        }
        // Focus the hidden contenteditable and trigger a native paste
        // so the browser fires the 'paste' event with clipboard image data
        pasteTarget.innerHTML = '';
        pasteTarget.focus();
        document.execCommand('paste');
    }

    function duplicateSelection() {
        if (!selectedLayerId) return;
        var layer = layers.find(function (l) { return l.id === selectedLayerId; });
        if (!layer) return;
        pushUndo();
        var dup = JSON.parse(JSON.stringify(layer));
        dup.id = nextLayerId++;
        dup.x += 10; dup.y += 10;
        layers.push(dup);
        selectedLayerId = dup.id;
        render();
    }

    function setZoomLevel(z) {
        zoom = Math.max(0.1, Math.min(4, z));
        zoomInputEl.value = Math.round(zoom * 100);
        render();
    }

    function applyFilterToSelected(filterFn) {
        if (!selectedLayerId) return;
        var layer = layers.find(function (l) { return l.id === selectedLayerId; });
        if (!layer || layer.type !== 'image' || !layer.imageData) { alert('Selecteaza un layer de tip imagine.'); return; }
        pushUndo();
        var img = new Image(); img.src = layer.imageData;
        var tmp = document.createElement('canvas'); tmp.width = layer.w; tmp.height = layer.h;
        var tc = tmp.getContext('2d'); tc.drawImage(img, 0, 0, layer.w, layer.h);
        var imgData = tc.getImageData(0, 0, tmp.width, tmp.height);
        filterFn(imgData);
        tc.putImageData(imgData, 0, 0);
        layer.imageData = tmp.toDataURL('image/png');
        imageCache = {};
        render();
    }

    function handleMenuAction(action) {
        var fileInput = document.getElementById('fileInput');
        switch (action) {
            // ---- FILE ----
            case 'newDoc': document.getElementById('btnNew').click(); break;
            case 'open': document.getElementById('btnOpen').click(); break;
            case 'close':
                var tab = document.querySelector('.doc-tab.active .doc-tab-close');
                if (tab) tab.click();
                break;
            case 'save': document.getElementById('btnSave').click(); break;
            case 'saveAs': document.getElementById('btnSave').click(); break;
            case 'importFile': fileInput.click(); break;
            case 'exportFile': document.getElementById('btnSave').click(); break;
            case 'print': window.print(); break;

            // ---- EDIT ----
            case 'undo': undo(); break;
            case 'redo': redo(); break;
            case 'cut': cutSelection(); break;
            case 'copy': copySelection(); break;
            case 'paste': pasteSelection(); break;
            case 'clear':
                if (selectedLayerId) { pushUndo(); layers = layers.filter(function (l) { return l.id !== selectedLayerId; }); selectedLayerId = null; render(); }
                break;
            case 'duplicate': duplicateSelection(); break;
            case 'cloneLayer': duplicateSelection(); break;
            case 'selectAll':
                if (layers.length > 0) selectedLayerId = layers[layers.length - 1].id;
                render();
                break;
            case 'deselectAll': selectedLayerId = null; bitmapSelection = null; drawCtx.clearRect(0, 0, canvasWidth, canvasHeight); render(); break;
            case 'invertSelection': break;
            case 'preferences': break;

            // ---- VIEW ----
            case 'zoomIn': setZoomLevel(zoom + 0.25); break;
            case 'zoomOut': setZoomLevel(zoom - 0.25); break;
            case 'zoom50': setZoomLevel(0.5); break;
            case 'zoom100': setZoomLevel(1); break;
            case 'zoom200': setZoomLevel(2); break;
            case 'zoom300': setZoomLevel(3); break;
            case 'zoom400': setZoomLevel(4); break;
            case 'fitAll':
                var wrap = document.getElementById('canvasWrap');
                var fitZ = Math.min(wrap.clientWidth / canvasWidth, wrap.clientHeight / canvasHeight, 4);
                setZoomLevel(fitZ);
                break;
            case 'fitWidth':
                var wrap2 = document.getElementById('canvasWrap');
                setZoomLevel(Math.min(wrap2.clientWidth / canvasWidth, 4));
                break;
            case 'toggleGrid': break;
            case 'toggleGuides': break;
            case 'toggleRulers': break;

            // ---- SELECT ----
            case 'selectMarquee': setTool('marquee'); break;
            case 'selectLasso': setTool('lasso'); break;
            case 'selectMagicWand': setTool('magicwand'); break;
            case 'selectExpand': break;
            case 'selectContract': break;
            case 'selectSmooth': break;
            case 'selectSaveAsMask': break;
            case 'selectRestoreFromMask': break;

            // ---- MODIFY ----
            case 'canvasSize': document.getElementById('btnCanvasSize').click(); break;
            case 'imageSize': document.getElementById('btnImageSize').click(); break;
            case 'fitCanvas': document.getElementById('btnFitCanvas').click(); break;
            case 'trimCanvas': document.getElementById('btnFitCanvas').click(); break;
            case 'flattenLayers': flattenAllLayers(); break;
            case 'mergeDown': mergeDown(); break;
            case 'transformScale': break;
            case 'transformRotate90CW':
                applyFilterToSelected(function (imgData) {
                    // Handled differently - rotate canvas of the layer
                });
                if (selectedLayerId) {
                    var layer = layers.find(function (l) { return l.id === selectedLayerId; });
                    if (layer && layer.type === 'image' && layer.imageData) {
                        pushUndo();
                        var img = new Image(); img.src = layer.imageData;
                        var tmp = document.createElement('canvas'); tmp.width = layer.h; tmp.height = layer.w;
                        var tc = tmp.getContext('2d'); tc.translate(tmp.width, 0); tc.rotate(Math.PI / 2); tc.drawImage(img, 0, 0, layer.w, layer.h);
                        var oldW = layer.w; layer.w = layer.h; layer.h = oldW;
                        layer.imageData = tmp.toDataURL('image/png'); imageCache = {}; render();
                    }
                }
                break;
            case 'transformRotate90CCW':
                if (selectedLayerId) {
                    var layer = layers.find(function (l) { return l.id === selectedLayerId; });
                    if (layer && layer.type === 'image' && layer.imageData) {
                        pushUndo();
                        var img = new Image(); img.src = layer.imageData;
                        var tmp = document.createElement('canvas'); tmp.width = layer.h; tmp.height = layer.w;
                        var tc = tmp.getContext('2d'); tc.translate(0, tmp.height); tc.rotate(-Math.PI / 2); tc.drawImage(img, 0, 0, layer.w, layer.h);
                        var oldW = layer.w; layer.w = layer.h; layer.h = oldW;
                        layer.imageData = tmp.toDataURL('image/png'); imageCache = {}; render();
                    }
                }
                break;
            case 'transformRotate180':
                if (selectedLayerId) {
                    var layer = layers.find(function (l) { return l.id === selectedLayerId; });
                    if (layer && layer.type === 'image' && layer.imageData) {
                        pushUndo();
                        var img = new Image(); img.src = layer.imageData;
                        var tmp = document.createElement('canvas'); tmp.width = layer.w; tmp.height = layer.h;
                        var tc = tmp.getContext('2d'); tc.translate(tmp.width, tmp.height); tc.rotate(Math.PI); tc.drawImage(img, 0, 0, layer.w, layer.h);
                        layer.imageData = tmp.toDataURL('image/png'); imageCache = {}; render();
                    }
                }
                break;
            case 'transformFlipH':
                if (selectedLayerId) {
                    var layer = layers.find(function (l) { return l.id === selectedLayerId; });
                    if (layer && layer.type === 'image' && layer.imageData) {
                        pushUndo();
                        var img = new Image(); img.src = layer.imageData;
                        var tmp = document.createElement('canvas'); tmp.width = layer.w; tmp.height = layer.h;
                        var tc = tmp.getContext('2d'); tc.translate(tmp.width, 0); tc.scale(-1, 1); tc.drawImage(img, 0, 0, layer.w, layer.h);
                        layer.imageData = tmp.toDataURL('image/png'); imageCache = {}; render();
                    }
                }
                break;
            case 'transformFlipV':
                if (selectedLayerId) {
                    var layer = layers.find(function (l) { return l.id === selectedLayerId; });
                    if (layer && layer.type === 'image' && layer.imageData) {
                        pushUndo();
                        var img = new Image(); img.src = layer.imageData;
                        var tmp = document.createElement('canvas'); tmp.width = layer.w; tmp.height = layer.h;
                        var tc = tmp.getContext('2d'); tc.translate(0, tmp.height); tc.scale(1, -1); tc.drawImage(img, 0, 0, layer.w, layer.h);
                        layer.imageData = tmp.toDataURL('image/png'); imageCache = {}; render();
                    }
                }
                break;
            case 'arrangeForward':
                if (selectedLayerId) {
                    var idx = layers.findIndex(function (l) { return l.id === selectedLayerId; });
                    if (idx < layers.length - 1) { pushUndo(); var t = layers[idx]; layers[idx] = layers[idx + 1]; layers[idx + 1] = t; render(); }
                }
                break;
            case 'arrangeFront':
                if (selectedLayerId) {
                    var idx = layers.findIndex(function (l) { return l.id === selectedLayerId; });
                    if (idx < layers.length - 1) { pushUndo(); var t = layers.splice(idx, 1)[0]; layers.push(t); render(); }
                }
                break;
            case 'arrangeBackward':
                if (selectedLayerId) {
                    var idx = layers.findIndex(function (l) { return l.id === selectedLayerId; });
                    if (idx > 0) { pushUndo(); var t = layers[idx]; layers[idx] = layers[idx - 1]; layers[idx - 1] = t; render(); }
                }
                break;
            case 'arrangeBack':
                if (selectedLayerId) {
                    var idx = layers.findIndex(function (l) { return l.id === selectedLayerId; });
                    if (idx > 0) { pushUndo(); var t = layers.splice(idx, 1)[0]; layers.unshift(t); render(); }
                }
                break;

            // ---- TEXT ----
            case 'textTool': setTool('text'); break;
            case 'textBold':
            case 'textItalic':
            case 'textSizeUp':
            case 'textSizeDown':
                break;

            // ---- FILTERS ----
            case 'filterInvert':
                applyFilterToSelected(function (d) { for (var i = 0; i < d.data.length; i += 4) { d.data[i] = 255 - d.data[i]; d.data[i + 1] = 255 - d.data[i + 1]; d.data[i + 2] = 255 - d.data[i + 2]; } });
                break;
            case 'filterGrayscale':
                applyFilterToSelected(function (d) { for (var i = 0; i < d.data.length; i += 4) { var g = d.data[i] * 0.299 + d.data[i + 1] * 0.587 + d.data[i + 2] * 0.114; d.data[i] = d.data[i + 1] = d.data[i + 2] = g; } });
                break;
            case 'filterSepia':
                applyFilterToSelected(function (d) { for (var i = 0; i < d.data.length; i += 4) { var r = d.data[i], g = d.data[i + 1], b = d.data[i + 2]; d.data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189); d.data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168); d.data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131); } });
                break;
            case 'filterBlur':
                applyFilterToSelected(function (d) {
                    var w = d.width, h = d.height, src = new Uint8ClampedArray(d.data);
                    var r = 2;
                    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
                        var rr = 0, gg = 0, bb = 0, aa = 0, cnt = 0;
                        for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) {
                            var nx = x + dx, ny = y + dy;
                            if (nx >= 0 && nx < w && ny >= 0 && ny < h) { var si = (ny * w + nx) * 4; rr += src[si]; gg += src[si + 1]; bb += src[si + 2]; aa += src[si + 3]; cnt++; }
                        }
                        var di = (y * w + x) * 4; d.data[di] = rr / cnt; d.data[di + 1] = gg / cnt; d.data[di + 2] = bb / cnt; d.data[di + 3] = aa / cnt;
                    }
                });
                break;
            case 'filterSharpen':
                applyFilterToSelected(function (d) {
                    var w = d.width, h = d.height, src = new Uint8ClampedArray(d.data);
                    var kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
                    for (var y = 1; y < h - 1; y++) for (var x = 1; x < w - 1; x++) {
                        for (var c = 0; c < 3; c++) {
                            var sum = 0, ki = 0;
                            for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { sum += src[((y + dy) * w + (x + dx)) * 4 + c] * kernel[ki++]; }
                            d.data[(y * w + x) * 4 + c] = Math.max(0, Math.min(255, sum));
                        }
                    }
                });
                break;
            case 'filterBrightness':
                var val = prompt('Brightness (-100 to 100):', '20');
                if (val === null) break;
                val = parseInt(val, 10) || 0;
                applyFilterToSelected(function (d) { for (var i = 0; i < d.data.length; i += 4) { d.data[i] = Math.max(0, Math.min(255, d.data[i] + val)); d.data[i + 1] = Math.max(0, Math.min(255, d.data[i + 1] + val)); d.data[i + 2] = Math.max(0, Math.min(255, d.data[i + 2] + val)); } });
                break;
            case 'filterHueSaturation':
                var sat = prompt('Saturation multiplier (0 = gray, 1 = normal, 2 = vivid):', '1.5');
                if (sat === null) break;
                sat = parseFloat(sat) || 1;
                applyFilterToSelected(function (d) { for (var i = 0; i < d.data.length; i += 4) { var g = d.data[i] * 0.299 + d.data[i + 1] * 0.587 + d.data[i + 2] * 0.114; d.data[i] = Math.max(0, Math.min(255, g + (d.data[i] - g) * sat)); d.data[i + 1] = Math.max(0, Math.min(255, g + (d.data[i + 1] - g) * sat)); d.data[i + 2] = Math.max(0, Math.min(255, g + (d.data[i + 2] - g) * sat)); } });
                break;
            case 'filterNoise':
                var amt = prompt('Noise amount (1-100):', '20');
                if (amt === null) break;
                amt = parseInt(amt, 10) || 20;
                applyFilterToSelected(function (d) { for (var i = 0; i < d.data.length; i += 4) { var n = (Math.random() - 0.5) * amt * 2; d.data[i] = Math.max(0, Math.min(255, d.data[i] + n)); d.data[i + 1] = Math.max(0, Math.min(255, d.data[i + 1] + n)); d.data[i + 2] = Math.max(0, Math.min(255, d.data[i + 2] + n)); } });
                break;
            case 'filterPixelate':
                var ps = prompt('Pixel size (2-50):', '8');
                if (ps === null) break;
                ps = Math.max(2, parseInt(ps, 10) || 8);
                applyFilterToSelected(function (d) {
                    var w = d.width, h = d.height;
                    for (var y = 0; y < h; y += ps) for (var x = 0; x < w; x += ps) {
                        var rr = 0, gg = 0, bb = 0, cnt = 0;
                        for (var dy = 0; dy < ps && y + dy < h; dy++) for (var dx = 0; dx < ps && x + dx < w; dx++) { var si = ((y + dy) * w + (x + dx)) * 4; rr += d.data[si]; gg += d.data[si + 1]; bb += d.data[si + 2]; cnt++; }
                        rr = rr / cnt; gg = gg / cnt; bb = bb / cnt;
                        for (var dy = 0; dy < ps && y + dy < h; dy++) for (var dx = 0; dx < ps && x + dx < w; dx++) { var di = ((y + dy) * w + (x + dx)) * 4; d.data[di] = rr; d.data[di + 1] = gg; d.data[di + 2] = bb; }
                    }
                });
                break;

            // ---- WINDOW ----
            case 'toggleProperties': document.getElementById('propertiesPanel').style.display = document.getElementById('propertiesPanel').style.display === 'none' ? '' : 'none'; break;
            case 'toggleLayers': document.getElementById('layersPanel').style.display = document.getElementById('layersPanel').style.display === 'none' ? '' : 'none'; break;
            case 'toggleToolbar': document.getElementById('toolbar').style.display = document.getElementById('toolbar').style.display === 'none' ? '' : 'flex'; break;
            case 'toggleStatusBar':
                var sb = document.querySelector('.status-bar');
                sb.style.display = sb.style.display === 'none' ? '' : 'flex';
                break;
        }
        updateUndoRedoButtons();
    }

    // ---- Additional keyboard shortcuts for menu actions ----
    document.addEventListener('keydown', function (e) {
        // Ctrl+N
        if (e.ctrlKey && !e.shiftKey && e.key === 'n') { e.preventDefault(); handleMenuAction('newDoc'); }
        // Ctrl+O
        else if (e.ctrlKey && !e.shiftKey && e.key === 'o') { e.preventDefault(); handleMenuAction('open'); }
        // Ctrl+S
        else if (e.ctrlKey && !e.shiftKey && e.key === 's') { e.preventDefault(); handleMenuAction('save'); }
        // Ctrl+Shift+S
        else if (e.ctrlKey && e.shiftKey && e.key === 'S') { e.preventDefault(); handleMenuAction('saveAs'); }
        // Ctrl+W
        else if (e.ctrlKey && e.key === 'w') { e.preventDefault(); handleMenuAction('close'); }
        // Ctrl+X
        else if (e.ctrlKey && e.key === 'x') { e.preventDefault(); handleMenuAction('cut'); }
        // Ctrl+C
        else if (e.ctrlKey && e.key === 'c') { e.preventDefault(); handleMenuAction('copy'); }
        // Ctrl+V
        else if (e.ctrlKey && e.key === 'v') {
            if (clipboard) {
                e.preventDefault();
                handleMenuAction('paste');
            } else {
                // Focus hidden contenteditable so the native paste event fires
                // Do NOT preventDefault — let the browser handle it
                pasteTarget.innerHTML = '';
                pasteTarget.focus();
            }
        }
        // Ctrl+A
        else if (e.ctrlKey && e.key === 'a') { e.preventDefault(); handleMenuAction('selectAll'); }
        // Ctrl+D
        else if (e.ctrlKey && !e.shiftKey && e.key === 'd') { e.preventDefault(); handleMenuAction('deselectAll'); }
        // Ctrl+E
        else if (e.ctrlKey && e.key === 'e') { e.preventDefault(); handleMenuAction('mergeDown'); }
        // Ctrl+=
        else if (e.ctrlKey && (e.key === '=' || e.key === '+')) { e.preventDefault(); handleMenuAction('zoomIn'); }
        // Ctrl+-
        else if (e.ctrlKey && e.key === '-') { e.preventDefault(); handleMenuAction('zoomOut'); }
        // Ctrl+0
        else if (e.ctrlKey && e.key === '0') { e.preventDefault(); handleMenuAction('fitAll'); }
        // Ctrl+1
        else if (e.ctrlKey && e.key === '1') { e.preventDefault(); handleMenuAction('zoom100'); }
    });

    // Handle native paste event (for system clipboard images like screenshots)
    // This also works as fallback when Ctrl+V fires natively (e.g. from contenteditable)
    document.addEventListener('paste', function (e) {
        var cd = e.clipboardData;
        if (!cd) return;
        // Check items first
        if (cd.items) {
            for (var i = 0; i < cd.items.length; i++) {
                if (cd.items[i].type.indexOf('image/') === 0) {
                    e.preventDefault();
                    var blob = cd.items[i].getAsFile();
                    if (blob) { pasteImageBlob(blob); return; }
                }
            }
        }
        // Fallback: check files
        if (cd.files) {
            for (var j = 0; j < cd.files.length; j++) {
                if (cd.files[j].type.indexOf('image/') === 0) {
                    e.preventDefault();
                    pasteImageBlob(cd.files[j]);
                    return;
                }
            }
        }
    });

    // Init
    updateUndoRedoButtons();
    render();
    if (documents.length === 0) {
        documents = [getDocState()];
        currentDocIndex = 0;
        renderTabs();
    }
})();
