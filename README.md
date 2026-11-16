# ✦ AuraCalc — Modern Scientific Calculator

A sleek, responsive, glassmorphic scientific calculator web application built with modern web technologies, fully ready for desktop, web, and Android mobile.

---

## 📱 How to Get the Android APK / Mobile App

To use AuraCalc on your Android phone, you have 3 quick and convenient options:

### 🌟 Option 1: Instant PWA Install (No APK sideloading required!)
AuraCalc is fully configured as a **Progressive Web App (PWA)** with an offline Service Worker and Web Manifest:
1. Host the project (or run `python server.py` and open your computer's local IP, e.g. `http://192.168.1.X:3000`, in Chrome on your phone).
2. Tap the three dots (⋮) in Chrome and select **"Add to Home Screen"** or **"Install App"**.
3. It installs an authentic standalone app icon on your phone's home screen that launches full-screen and works 100% offline.

---

### ⚡ Option 2: 1-Click APK via Free GitHub Actions (Automated Cloud Build)
Because compiling an Android `.apk` locally requires ~3 GB of Android SDK tools, we have included a ready-to-run GitHub Actions workflow:
1. Push this folder to a GitHub repository.
2. Go to the **Actions** tab on your GitHub repository.
3. The included workflow (`.github/workflows/build-apk.yml`) will automatically run on GitHub's Android runners, compile the code with Capacitor and Gradle, and generate `AuraCalc-debug.apk`.
4. Download the `.apk` directly from the **Artifacts** section!

---

### 🛠️ Option 3: Instant Web-to-APK (PWABuilder)
1. Use the pre-packaged zip bundle located at:
   `C:\Users\Sujitha RK\.gemini\antigravity\scratch\calculator-app\auracalc-app.zip`
2. Go to [PWABuilder](https://www.pwabuilder.com) (created by Microsoft).
3. Upload your project or enter your hosted URL, then click **"Package for Android"** to download your signed `.apk` or `.aab` file instantly.

---

### 💻 Option 4: Local Build via Android Studio
If you have Android Studio installed:
```bash
npm install
npx cap add android
npx cap open android
```
Then click **Build > Build Bundle(s) / APK(s) > Build APK(s)** inside Android Studio.

---

## 🚀 Desktop Quick Start

### Direct File
Double-click `index.html` to open it directly in Chrome, Edge, Firefox, or Safari.

### Local Python Server
```bash
python server.py
```
This serves the app at `http://localhost:3000` and opens your browser.

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
| --- | --- |
| `0` - `9` | Input numbers |
| `.` | Decimal point |
| `+`, `-`, `*`, `/` | Basic operators |
| `^` | Power ($x^y$) |
| `%` | Percentage |
| `(` / `)` | Parentheses |
| `Enter` or `=` | Calculate result |
| `Backspace` | Delete last digit |
| `Escape` | Clear All (`AC`) |
