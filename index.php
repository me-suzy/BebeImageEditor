<?php
/**
 * Bebe Image Editor - Editor de imagini inspirat din Macromedia Fireworks
 * PHP + HTML5 Canvas. Toate instrumentele rulează în browser.
 */
$title = 'Bebe Image Editor';
$docRoot = str_replace('\\', '/', __DIR__);
?>
<!DOCTYPE html>
<html lang="ro">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?php echo htmlspecialchars($title); ?></title>
    <link rel="icon" type="image/x-icon" href="favicon.ico">
    <link rel="icon" type="image/png" sizes="32x32" href="favicon-32.png">
    <link rel="icon" type="image/png" sizes="256x256" href="favicon-256.png">
    <link rel="shortcut icon" href="favicon.ico">
    <link rel="manifest" href="manifest.json">
    <meta name="theme-color" content="#2b2b3d">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-title" content="Bebe Editor">
    <link rel="stylesheet" href="css/editor.css?v=<?php echo filemtime(__DIR__.'/css/editor.css'); ?>">
</head>
<body>
    <div id="app">
        <!-- Menu bar -->
        <header class="menu-bar">
            <span class="app-title">Bebe Image Editor</span>
            <nav class="menu" id="mainMenu">
                <div class="menu-item" tabindex="0">File
                    <div class="menu-dropdown">
                        <div class="menu-entry" data-action="newDoc"><span>New</span><span class="shortcut">Ctrl+N</span></div>
                        <div class="menu-entry" data-action="open"><span>Open...</span><span class="shortcut">Ctrl+O</span></div>
                        <div class="menu-separator"></div>
                        <div class="menu-entry" data-action="close"><span>Close</span><span class="shortcut">Ctrl+W</span></div>
                        <div class="menu-separator"></div>
                        <div class="menu-entry" data-action="save"><span>Save (Export PNG)</span><span class="shortcut">Ctrl+S</span></div>
                        <div class="menu-entry" data-action="saveAs"><span>Save As...</span><span class="shortcut">Ctrl+Shift+S</span></div>
                        <div class="menu-separator"></div>
                        <div class="menu-entry" data-action="importFile"><span>Import...</span><span class="shortcut">Ctrl+R</span></div>
                        <div class="menu-entry" data-action="exportFile"><span>Export...</span><span class="shortcut">Ctrl+Shift+R</span></div>
                        <div class="menu-separator"></div>
                        <div class="menu-entry" data-action="print"><span>Print...</span><span class="shortcut">Ctrl+P</span></div>
                    </div>
                </div>
                <div class="menu-item" tabindex="0">Edit
                    <div class="menu-dropdown">
                        <div class="menu-entry" data-action="undo"><span>Undo</span><span class="shortcut">Ctrl+Z</span></div>
                        <div class="menu-entry" data-action="redo"><span>Redo</span><span class="shortcut">Ctrl+Y</span></div>
                        <div class="menu-separator"></div>
                        <div class="menu-entry" data-action="cut"><span>Cut</span><span class="shortcut">Ctrl+X</span></div>
                        <div class="menu-entry" data-action="copy"><span>Copy</span><span class="shortcut">Ctrl+C</span></div>
                        <div class="menu-entry" data-action="paste"><span>Paste</span><span class="shortcut">Ctrl+V</span></div>
                        <div class="menu-entry" data-action="clear"><span>Clear</span><span class="shortcut">Backspace</span></div>
                        <div class="menu-separator"></div>
                        <div class="menu-entry" data-action="duplicate"><span>Duplicate</span><span class="shortcut">Ctrl+Alt+D</span></div>
                        <div class="menu-entry" data-action="cloneLayer"><span>Clone</span><span class="shortcut">Ctrl+Shift+D</span></div>
                        <div class="menu-separator"></div>
                        <div class="menu-entry" data-action="selectAll"><span>Select All</span><span class="shortcut">Ctrl+A</span></div>
                        <div class="menu-entry" data-action="deselectAll"><span>Deselect</span><span class="shortcut">Ctrl+D</span></div>
                        <div class="menu-separator"></div>
                        <div class="menu-entry" data-action="preferences"><span>Preferences...</span><span class="shortcut">Ctrl+U</span></div>
                    </div>
                </div>
                <div class="menu-item" tabindex="0">View
                    <div class="menu-dropdown">
                        <div class="menu-entry" data-action="zoomIn"><span>Zoom In</span><span class="shortcut">Ctrl+=</span></div>
                        <div class="menu-entry" data-action="zoomOut"><span>Zoom Out</span><span class="shortcut">Ctrl+-</span></div>
                        <div class="menu-separator"></div>
                        <div class="menu-entry" data-action="zoom50"><span>50%</span></div>
                        <div class="menu-entry" data-action="zoom100"><span>100%</span><span class="shortcut">Ctrl+1</span></div>
                        <div class="menu-entry" data-action="zoom200"><span>200%</span></div>
                        <div class="menu-entry" data-action="zoom300"><span>300%</span></div>
                        <div class="menu-entry" data-action="zoom400"><span>400%</span></div>
                        <div class="menu-separator"></div>
                        <div class="menu-entry" data-action="fitAll"><span>Fit All</span><span class="shortcut">Ctrl+0</span></div>
                        <div class="menu-entry" data-action="fitWidth"><span>Fit Width</span></div>
                        <div class="menu-separator"></div>
                        <div class="menu-entry" data-action="toggleGrid"><span>Grid</span></div>
                        <div class="menu-entry" data-action="toggleGuides"><span>Guides</span></div>
                        <div class="menu-entry" data-action="toggleRulers"><span>Rulers</span></div>
                    </div>
                </div>
                <div class="menu-item" tabindex="0">Select
                    <div class="menu-dropdown">
                        <div class="menu-entry" data-action="selectAll"><span>Select All</span><span class="shortcut">Ctrl+A</span></div>
                        <div class="menu-entry" data-action="deselectAll"><span>Deselect</span><span class="shortcut">Ctrl+D</span></div>
                        <div class="menu-entry" data-action="invertSelection"><span>Invert Selection</span><span class="shortcut">Ctrl+Shift+I</span></div>
                        <div class="menu-separator"></div>
                        <div class="menu-entry" data-action="selectMarquee"><span>Marquee Tool</span><span class="shortcut">M</span></div>
                        <div class="menu-entry" data-action="selectLasso"><span>Lasso Tool</span><span class="shortcut">L</span></div>
                        <div class="menu-entry" data-action="selectMagicWand"><span>Magic Wand Tool</span><span class="shortcut">W</span></div>
                        <div class="menu-separator"></div>
                        <div class="menu-entry" data-action="selectExpand"><span>Expand Selection...</span></div>
                        <div class="menu-entry" data-action="selectContract"><span>Contract Selection...</span></div>
                        <div class="menu-entry" data-action="selectSmooth"><span>Smooth Selection...</span></div>
                        <div class="menu-separator"></div>
                        <div class="menu-entry" data-action="selectSaveAsMask"><span>Save as Mask</span></div>
                        <div class="menu-entry" data-action="selectRestoreFromMask"><span>Restore from Mask</span></div>
                    </div>
                </div>
                <div class="menu-item" tabindex="0">Modify
                    <div class="menu-dropdown">
                        <div class="menu-entry" data-action="canvasSize"><span>Canvas Size...</span></div>
                        <div class="menu-entry" data-action="imageSize"><span>Image Size...</span></div>
                        <div class="menu-entry" data-action="fitCanvas"><span>Fit Canvas</span></div>
                        <div class="menu-entry" data-action="trimCanvas"><span>Trim Canvas</span></div>
                        <div class="menu-separator"></div>
                        <div class="menu-entry" data-action="flattenLayers"><span>Flatten Layers</span><span class="shortcut">Ctrl+Shift+Z</span></div>
                        <div class="menu-entry" data-action="mergeDown"><span>Merge Down</span><span class="shortcut">Ctrl+E</span></div>
                        <div class="menu-separator"></div>
                        <div class="menu-entry" data-action="transformScale"><span>Scale...</span></div>
                        <div class="menu-entry" data-action="transformRotate90CW"><span>Rotate 90° CW</span></div>
                        <div class="menu-entry" data-action="transformRotate90CCW"><span>Rotate 90° CCW</span></div>
                        <div class="menu-entry" data-action="transformRotate180"><span>Rotate 180°</span></div>
                        <div class="menu-separator"></div>
                        <div class="menu-entry" data-action="transformFlipH"><span>Flip Horizontal</span></div>
                        <div class="menu-entry" data-action="transformFlipV"><span>Flip Vertical</span></div>
                        <div class="menu-separator"></div>
                        <div class="menu-entry" data-action="arrangeForward"><span>Bring Forward</span></div>
                        <div class="menu-entry" data-action="arrangeFront"><span>Bring to Front</span></div>
                        <div class="menu-entry" data-action="arrangeBackward"><span>Send Backward</span></div>
                        <div class="menu-entry" data-action="arrangeBack"><span>Send to Back</span></div>
                    </div>
                </div>
                <div class="menu-item" tabindex="0">Text
                    <div class="menu-dropdown">
                        <div class="menu-entry" data-action="textTool"><span>Text Tool</span><span class="shortcut">T</span></div>
                        <div class="menu-separator"></div>
                        <div class="menu-entry" data-action="textBold"><span>Bold</span><span class="shortcut">Ctrl+B</span></div>
                        <div class="menu-entry" data-action="textItalic"><span>Italic</span><span class="shortcut">Ctrl+I</span></div>
                        <div class="menu-separator"></div>
                        <div class="menu-entry" data-action="textSizeUp"><span>Increase Size</span></div>
                        <div class="menu-entry" data-action="textSizeDown"><span>Decrease Size</span></div>
                    </div>
                </div>
                <div class="menu-item" tabindex="0">Filters
                    <div class="menu-dropdown">
                        <div class="menu-entry" data-action="filterBlur"><span>Blur...</span></div>
                        <div class="menu-entry" data-action="filterSharpen"><span>Sharpen...</span></div>
                        <div class="menu-separator"></div>
                        <div class="menu-entry" data-action="filterBrightness"><span>Brightness / Contrast...</span></div>
                        <div class="menu-entry" data-action="filterHueSaturation"><span>Hue / Saturation...</span></div>
                        <div class="menu-entry" data-action="filterInvert"><span>Invert Colors</span></div>
                        <div class="menu-entry" data-action="filterGrayscale"><span>Grayscale</span></div>
                        <div class="menu-entry" data-action="filterSepia"><span>Sepia</span></div>
                        <div class="menu-separator"></div>
                        <div class="menu-entry" data-action="filterNoise"><span>Add Noise...</span></div>
                        <div class="menu-entry" data-action="filterPixelate"><span>Pixelate...</span></div>
                    </div>
                </div>
                <div class="menu-item" tabindex="0">Window
                    <div class="menu-dropdown">
                        <div class="menu-entry" data-action="toggleProperties"><span>Properties</span></div>
                        <div class="menu-entry" data-action="toggleLayers"><span>Layers</span></div>
                        <div class="menu-separator"></div>
                        <div class="menu-entry" data-action="toggleToolbar"><span>Toolbar</span></div>
                        <div class="menu-entry" data-action="toggleStatusBar"><span>Status Bar</span></div>
                    </div>
                </div>
            </nav>
            <div class="doc-tabs" id="docTabs">
                <!-- tabs rendered by JS -->
            </div>
            <div class="edit-buttons">
                <button type="button" class="btn-header" id="btnUndo" title="Undo (Ctrl+Z)" disabled>Undo</button>
                <button type="button" class="btn-header" id="btnRedo" title="Redo (Ctrl+Y)" disabled>Redo</button>
            </div>
            <div class="doc-info" id="docInfo">Untitled-1 @ 100%</div>
        </header>

        <!-- Toolbar (stânga) -->
        <aside class="toolbar" id="toolbar">
            <div class="toolbar-scroll" id="toolbarScroll">
                <!-- Select -->
                <div class="tool-group">
                    <div class="tool-group-label">Select</div>
                    <button class="tool-btn active" data-tool="pointer" title="Pointer – selectare și redimensionare">↖</button>
                    <button class="tool-btn" data-tool="subselect" title="Mână – mută obiecte sau panează canvasul">✋</button>
                    <button class="tool-btn" data-tool="scale" title="Scale – selectare, mutare și redimensionare obiect">&#8645;</button>
                    <button class="tool-btn" data-tool="crop" title="Crop – trage pe canvas apoi eliberează pentru a decupa">✂</button>
                </div>
                <!-- Bitmap -->
                <div class="tool-group">
                    <div class="tool-group-label">Bitmap</div>
                    <button class="tool-btn" data-tool="marquee" title="Marquee – selecție dreptunghiulară pe bitmap">&#9723;</button>
                    <button class="tool-btn" data-tool="lasso" title="Lasso – selecție liberă pe bitmap">&#9093;</button>
                    <button class="tool-btn" data-tool="magicwand" title="Magic Wand – selectează pixeli similari ca și culoare">&#10038;</button>
                    <button class="tool-btn" data-tool="brush" title="Brush">&#9998;</button>
                    <button class="tool-btn" data-tool="pencil" title="Pencil">&#9999;</button>
                    <button class="tool-btn" data-tool="eraser" title="Eraser">&#10008;</button>
                    <button class="tool-btn" data-tool="eyedropper" title="Eyedropper – click pe canvas pentru a prelua culoarea">&#128068;</button>
                    <button class="tool-btn" data-tool="paintbucket" title="Paint Bucket">&#128703;</button>
                    <button class="tool-btn" data-tool="clone" title="Clone – Alt+click setează sursa, apoi pictează copiind pixeli">&#128203;</button>
                </div>
                <!-- Vector / Shapes -->
                <div class="tool-group">
                    <div class="tool-group-label">Vector</div>
                    <button class="tool-btn" data-tool="pen" title="Pen – click pentru puncte, dublu-click finalizează">&#10002;</button>
                    <button class="tool-btn" data-tool="rect" title="Rectangle">&#9724;</button>
                    <button class="tool-btn" data-tool="ellipse" title="Ellipse">&#9711;</button>
                    <button class="tool-btn" data-tool="text" title="Text">A</button>
                    <button class="tool-btn" data-tool="line" title="Line">&#8212;</button>
                </div>
                <!-- Colors -->
                <div class="tool-group">
                    <div class="tool-group-label">Colors</div>
                    <div class="color-row color-row-labeled">
                        <span class="color-label" title="Fundal (brush)">&#9998;</span>
                        <input type="color" id="fillColor" value="#000000" title="Fundal">
                        <span class="color-label" title="Chenar (creion)">&#9999;</span>
                        <input type="color" id="strokeColor" value="#ff0000" title="Chenar">
                    </div>
                    <div class="color-palette" id="colorPalette">
                        <button type="button" class="palette-swatch" data-color="#000000" title="Negru"></button>
                        <button type="button" class="palette-swatch" data-color="#ffffff" title="Alb"></button>
                        <button type="button" class="palette-swatch" data-color="#ff0000" title="Roșu"></button>
                        <button type="button" class="palette-swatch" data-color="#00ff00" title="Verde"></button>
                        <button type="button" class="palette-swatch" data-color="#0000ff" title="Albastru"></button>
                        <button type="button" class="palette-swatch" data-color="#ffff00" title="Galben"></button>
                        <button type="button" class="palette-swatch" data-color="#ff00ff" title="Magenta"></button>
                        <button type="button" class="palette-swatch" data-color="#00ffff" title="Cyan"></button>
                        <button type="button" class="palette-swatch" data-color="#808080" title="Gri"></button>
                        <button type="button" class="palette-swatch" data-color="#ff69b4" title="Roz"></button>
                    </div>
                    <button class="tool-btn" id="swapColors" title="Schimbă fundal cu chenar">&#8644;</button>
                    <label class="opacity-row">
                        Grosime (Pencil/Brush): <input type="range" id="brushSize" min="1" max="50" value="4" title="Grosime"> <span id="brushSizeVal">4</span>
                    </label>
                    <label class="opacity-row">
                        Opacity: <input type="range" id="globalOpacity" min="0" max="100" value="100"> <span id="opacityVal">100%</span>
                    </label>
                </div>
                <!-- View -->
                <div class="tool-group">
                    <div class="tool-group-label">View</div>
                    <button class="tool-btn" data-tool="hand" title="Mână – mută întreaga imagine (pan)">&#9758;</button>
                    <button class="tool-btn" data-tool="zoom" title="Zoom – click = zoom in, Alt+click = zoom out">&#128269;</button>
                    <input type="number" id="zoomInput" value="100" min="10" max="400" step="10" class="zoom-input"> %
                </div>
            </div>
            <div class="toolbar-resize" id="toolbarResize" title="Trage pentru a lărgi/îngusta panoul"></div>
        </aside>

        <!-- Main: Canvas + Panels -->
        <main class="workspace">
            <div class="canvas-wrap" id="canvasWrap">
                <div class="canvas-inner" id="canvasInner">
                    <canvas id="mainCanvas"></canvas>
                    <canvas id="drawCanvas"></canvas>
                </div>
            </div>

            <!-- Properties panel -->
            <aside class="panel properties-panel" id="propertiesPanel">
                <div class="panel-header">&#9660; Properties</div>
                <div class="panel-body">
                    <div class="prop-row">
                        <span>Document</span>
                        <span id="propDocName">Untitled-1</span>
                    </div>
                    <div class="prop-row prop-selection-colors" id="propSelectionColors" style="display:none">
                        <div class="prop-selection-header">Obiect selectat: <span id="propLayerType">-</span></div>
                        <div class="prop-dims-row" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px;font-size:11px;color:#aaa;">
                            <label style="display:flex;align-items:center;gap:2px;">X: <input type="number" id="propLayerX" value="0" style="width:50px;padding:2px;background:#333;border:1px solid #555;color:#eee;font-size:11px;"></label>
                            <label style="display:flex;align-items:center;gap:2px;">Y: <input type="number" id="propLayerY" value="0" style="width:50px;padding:2px;background:#333;border:1px solid #555;color:#eee;font-size:11px;"></label>
                            <label style="display:flex;align-items:center;gap:2px;">W: <input type="number" id="propLayerW" value="0" min="1" style="width:50px;padding:2px;background:#333;border:1px solid #555;color:#eee;font-size:11px;"></label>
                            <label style="display:flex;align-items:center;gap:2px;">H: <input type="number" id="propLayerH" value="0" min="1" style="width:50px;padding:2px;background:#333;border:1px solid #555;color:#eee;font-size:11px;"></label>
                        </div>
                        <div class="prop-color-row">
                            <label title="Fundal obiect">&#9998; Fundal <input type="color" id="propLayerFill" value="#000000"></label>
                            <label title="Chenar obiect">&#9999; Chenar <input type="color" id="propLayerStroke" value="#ff0000"></label>
                            <button type="button" class="btn-small btn-eyedropper" id="propEyedropperFill" title="Alege culoare din imagine">&#128068;</button>
                        </div>
                        <div class="prop-color-row" style="margin-top:6px">
                            <label title="Grosime chenar" style="display:flex;align-items:center;gap:4px;font-size:11px;color:#aaa;">
                                Grosime chenar: <input type="number" id="propStrokeWidth" value="0" min="0" max="50" step="1" style="width:48px;padding:2px;background:#333;border:1px solid #555;color:#eee;font-size:11px;">
                            </label>
                        </div>
                    </div>
                    <div class="prop-row">
                        <span>Fundal pagină:</span>
                        <input type="color" id="canvasColor" value="#ffffff" title="Doar fundalul paginii, nu obiectele">
                        <button type="button" class="btn-small btn-eyedropper" id="canvasColorEyedropper" title="Eyedropper: dacă ai obiect selectat → schimbă obiectul; altfel → fundal pagină">&#128068;</button>
                        <button type="button" class="btn-small" id="btnCanvasSize">Canvas Size...</button>
                    </div>
                    <div class="prop-row">
                        <button type="button" class="btn-small" id="btnImageSize">Image Size...</button>
                    </div>
                    <div class="prop-row">
                        <button type="button" class="btn-small" id="btnFitCanvas">Fit Canvas</button>
                    </div>
                    <div class="prop-row prop-layer-opacity" id="propLayerOpacity" style="display:none">
                        <span>Layer opacity:</span>
                        <input type="range" id="layerOpacitySlider" min="0" max="100" value="100" style="width:80px">
                        <span id="layerOpacityVal">100%</span>
                    </div>
                </div>
            </aside>

            <!-- Layers panel -->
            <aside class="panel layers-panel" id="layersPanel">
                <div class="panel-header">&#9660; Layers</div>
                <div class="panel-body">
                    <ul id="layersList"></ul>
                    <button type="button" class="btn-small" id="btnAddLayer">+ Add layer</button>
                </div>
            </aside>
        </main>

        <!-- Status bar -->
        <footer class="status-bar">
            <span id="statusCoords">x: 0, y: 0</span>
            <span id="statusSize">1161 x 900</span>
        </footer>
    </div>

    <!-- Dialog: Canvas Size -->
    <div class="dialog-overlay" id="canvasSizeOverlay">
        <div class="dialog" id="canvasSizeDialog">
            <h3>Canvas Size</h3>
            <div class="dialog-section">
                <label>New size</label>
                <div class="size-row">
                    <label>W: <input type="number" id="canvasNewW" value="1161" min="1"></label>
                    <label>H: <input type="number" id="canvasNewH" value="900" min="1"></label>
                    <select id="canvasUnit"><option>Pixels</option></select>
                </div>
                <label>Anchor</label>
                <div class="anchor-grid" id="anchorGrid">
                    <button type="button" data-anchor="nw">&#8598;</button><button type="button" data-anchor="n">&#8593;</button><button type="button" data-anchor="ne">&#8599;</button>
                    <button type="button" data-anchor="w">&#8592;</button><button type="button" data-anchor="c" class="active">&#8853;</button><button type="button" data-anchor="e">&#8594;</button>
                    <button type="button" data-anchor="sw">&#8601;</button><button type="button" data-anchor="s">&#8595;</button><button type="button" data-anchor="se">&#8600;</button>
                </div>
            </div>
            <div class="dialog-section">
                <label>Current size</label>
                <p id="canvasCurrentSize">1161 x 900 pixels</p>
            </div>
            <div class="dialog-section">
                <label>Culoare fundal canvas</label>
                <div class="color-pick-row">
                    <input type="color" id="canvasSizeBgColor" value="#ffffff" title="Culoare fundal">
                    <button type="button" class="btn-ghost btn-eyedropper" id="canvasSizeEyedropper" title="Alege culoare din imagine">&#128068;</button>
                    <span class="pick-hint" id="canvasSizePickHint" style="display:none;">Click pe canvas pentru a alege culoarea</span>
                </div>
            </div>
            <div class="dialog-actions">
                <button type="button" class="btn-primary" id="canvasSizeOk">OK</button>
                <button type="button" class="btn-ghost" id="canvasSizeCancel">Cancel</button>
            </div>
        </div>
    </div>

    <!-- Dialog: Close document - Save? -->
    <div class="dialog-overlay" id="closeConfirmOverlay">
        <div class="dialog dialog-small">
            <h3>Salvezi modificările?</h3>
            <p class="close-confirm-msg">Salvezi modificările la „<span id="closeConfirmDocName"></span>” înainte de închidere?</p>
            <div class="dialog-actions">
                <button type="button" class="btn-primary" id="closeConfirmSave">Salvează</button>
                <button type="button" class="btn-ghost" id="closeConfirmDontSave">Nu salva</button>
                <button type="button" class="btn-ghost" id="closeConfirmCancel">Anulare</button>
            </div>
        </div>
    </div>

    <!-- Dialog: Image Size -->
    <div class="dialog-overlay" id="imageSizeOverlay">
        <div class="dialog" id="imageSizeDialog">
            <h3>Image Size</h3>
            <div class="dialog-section">
                <label>Pixel dimensions</label>
                <div class="size-row">
                    <label>Width: <input type="number" id="imageNewW" value="1161" min="1"> Pixels</label>
                    <span class="lock" id="imageLock">&#128274;</span>
                    <label>Height: <input type="number" id="imageNewH" value="900" min="1"> Pixels</label>
                </div>
            </div>
            <div class="dialog-section">
                <label><input type="checkbox" id="constrainProportions" checked> Constrain proportions</label>
            </div>
            <div class="dialog-section">
                <label><input type="checkbox" id="resampleImage" checked> Resample image</label>
                <select id="resampleMethod"><option>Bicubic</option><option>Bilinear</option><option>Nearest</option></select>
            </div>
            <div class="dialog-actions">
                <button type="button" class="btn-primary" id="imageSizeOk">OK</button>
                <button type="button" class="btn-ghost" id="imageSizeCancel">Cancel</button>
            </div>
        </div>
    </div>

    <!-- File: New / Open / Save (simplu) -->
    <div class="top-actions">
        <button type="button" class="btn-top" id="btnNew">New</button>
        <button type="button" class="btn-top" id="btnOpen">Open</button>
        <button type="button" class="btn-top" id="btnSave">Save</button>
        <input type="file" id="fileInput" accept="image/*" style="display:none">
    </div>

    <script src="js/editor.js?v=<?php echo filemtime(__DIR__.'/js/editor.js'); ?>"></script>
    <script>
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(function() {});
        }
    </script>
</body>
</html>
