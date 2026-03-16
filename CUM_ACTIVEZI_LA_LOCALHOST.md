# Cum deschizi Bebe Image Editor la localhost FĂRĂ să muți fișierele

Ai deja localhost setat să deschidă aplicația de autentificare / HTML Editor. Ca **http://localhost/bebe/** să meargă, Alias-ul trebuie pus **în VirtualHost-ul care servește localhost**, nu doar în httpd.conf.

## Pas 1: Deschide fișierul de VirtualHost-uri

1. Deschide în Notepad (ca Administrator):  
   **C:\xampp\apache\conf\extra\httpd-vhosts.conf**
2. Dacă nu există, deschide **C:\xampp\apache\conf\httpd.conf** și caută în el după `VirtualHost` sau `DocumentRoot`.

## Pas 2: Găsește blocul pentru localhost

Caută un bloc care arată similar cu:

```apache
<VirtualHost *:80>
    ServerName localhost
    DocumentRoot "d:/Teste cursor/HTML Editor"
    ...
</VirtualHost>
```

(Sau DocumentRoot poate fi alt path – acela unde știi că e aplicația ta.)

## Pas 3: Adaugă Alias ÎNĂUNTRUL acelui bloc

**Înăuntrul** acelui `<VirtualHost>...</VirtualHost>`, după `DocumentRoot` / `<Directory>`, adaugă exact:

```apache
Alias /bebe "d:/Teste cursor/Bebe Image Editor"
<Directory "d:/Teste cursor/Bebe Image Editor">
    Options Indexes FollowSymLinks
    AllowOverride All
    Require all granted
    DirectoryIndex index.php
</Directory>
```

Poți copia blocul din **Apache-Alias-IN-VHOST.conf** (fără liniile de comentariu #).

## Pas 4: Salvează și repornește Apache

1. Salvează fișierul.
2. XAMPP Control Panel → **Stop** Apache → **Start** Apache.

## Pas 5: Testează în browser

- **http://localhost/** → rămâne aplicația ta (autentificare / HTML Editor).
- **http://localhost/bebe/** → trebuie să se încarce Bebe Image Editor.

---

## Dacă tot nu merge

- Verifică în **C:\xampp\apache\logs\error.log** dacă apare vreo eroare la restart Apache sau la accesarea `/bebe/`.
- Încearcă și **http://127.0.0.1/bebe/** (uneori localhost și 127.0.0.1 sunt servite de VirtualHost-uri diferite).
- Asigură-te că în **d:\Teste cursor\Bebe Image Editor\** există fișierul **index.php**.
