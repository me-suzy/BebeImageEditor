# Rulare Bebe Image Editor cu XAMPP

Dacă folosești **XAMPP**, nu mai ai nevoie de `start-server.bat` sau de portul 8765. Apache din XAMPP servește direct PHP.

## Pași

### 1. Pornește XAMPP
- Deschide **XAMPP Control Panel**
- Pornește **Apache** (buton Start). Dacă e verde, Apache rulează pe portul 80.

### 2. Copiază proiectul în htdocs
Copiază întregul folder **Bebe Image Editor** în folderul unde XAMPP servește paginile:

- Locație tipică: **`C:\xampp\htdocs\`**
- Rezultat: **`C:\xampp\htdocs\Bebe Image Editor\`**  
  (sau redenumește în **`BebeImageEditor`** ca să eviți spațiul în URL)

### 3. Deschide în Firefox
- Dacă folderul se numește **Bebe Image Editor**:
  - **http://localhost/Bebe%20Image%20Editor/**
  - sau: **http://localhost/Bebe Image Editor/**
- Dacă l-ai redenumit în **BebeImageEditor**:
  - **http://localhost/BebeImageEditor/**

### 4. Dacă tot nu merge
- Verifică în XAMPP că **Apache** este pornit (verde).
- Verifică dacă alt program (IIS, alt server) nu folosește deja portul 80.
- Încearcă și: **http://127.0.0.1/Bebe%20Image%20Editor/**

## Config (config.php)

În proiect există `config.php`. Când rulezi prin XAMPP, nu e nevoie să schimbi nimic pentru conexiune; aplicația folosește URL-uri relative. Poți folosi `config.php` pentru alte setări (de ex. unde se salvează fișierele pe server).
