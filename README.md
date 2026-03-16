# Bebe Image Editor

Editor de imagini inspirat din **Macromedia Fireworks**, construit cu PHP + HTML5 Canvas.

## Cerințe
- PHP 7+ (pentru a rula local) sau orice server web care servește PHP
- Browser modern (Chrome, Firefox, Edge) cu suport Canvas

## Rulare

### Cu XAMPP (recomandat dacă ai XAMPP)
1. Pornește **Apache** din **XAMPP Control Panel**.
2. Copiază folderul **Bebe Image Editor** în **`C:\xampp\htdocs\`**.
3. Deschide în browser: **http://localhost/Bebe%20Image%20Editor/**  
   Detalii: vezi **XAMPP.md**.

### Fără XAMPP (PHP built-in server)
1. Dublu-clic pe **start-server.bat** (pornește serverul pe http://127.0.0.1:8765). Păstrează fereastra deschisă.
2. Deschide în browser: **http://127.0.0.1:8765**
3. Dacă vezi **Connection Refused**: serverul nu rulează – rulează `start-server.bat` sau verifică XAMPP (vezi XAMPP.md).

## Funcționalități
- **Select**: Pointer (muta layer-e), Subselection, Scale, Crop
- **Bitmap**: Marquee, Lasso, Magic Wand, Brush, Pencil, Eraser, Eyedropper, Paint Bucket, Clone
- **Vector**: Pen, Rectangle, Ellipse, Text, Line
- **Culori**: Fill, Stroke, Swap, Opacity globală și per layer
- **View**: Hand, Zoom
- **Canvas Size**: dimensiune nouă + anchor (9 puncte)
- **Image Size**: redimensionare cu păstrare proporții și resample
- **Fit Canvas**: ajustează canvas la conținut
- **Layers**: listă, add layer, opacitate per layer
- **File**: New, Open (imagine), Save (descarcă PNG)

## Structură
- `index.php` – interfața principală
- `css/editor.css` – stiluri
- `js/editor.js` – logică canvas, instrumente, layere
- `api/save.php` – salvare pe server (opțional)
