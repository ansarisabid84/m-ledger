#!/usr/bin/env python3
"""
make_preview.py — Capture Google Play Store assets from the Vite dev server.

Output:
    screenshots/
        feature_graphic/feature_graphic.png   (1024 × 500)
        phone/                                 (1080 × 1920 — 9:16)
        tablet_7inch/                          (1080 × 1920 — 9:16)
        tablet_10inch/                         (1080 × 1920 — 9:16, both sides ≥ 1080)

Requirements:
    pip install playwright && playwright install chromium

Usage (from project root):
    python resources/make_preview.py
"""

import subprocess
import time
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

# ── config ────────────────────────────────────────────────────────────────────

ROOT    = Path(__file__).parent.parent.resolve()
DEV_URL = "http://localhost:5173"

# CSS breakpoint (from index.css: @media (max-width: 760px) shows botnav)
MOBILE_BREAKPOINT = 760

# Tabs to capture — (slug, mobile botnav label, desktop sidenav label)
# Mobile nav uses "More" for Settings; desktop nav uses "Settings".
TABS = [
    ("01_dashboard", "Home",    "Home"),
    ("02_history",   "History", "History"),
    ("03_goals",     "Goals",   "Goals"),
    ("04_debts",     "Debts",   "Debts"),
    ("05_settings",  "More",    "Settings"),
]

# Each device config produces its output dimensions via viewport × dpr.
# All three screenshot sizes come out to 1080 × 1920 px (9:16 portrait).
DEVICES = [
    {
        "dir":      "phone",
        "label":    "Phone (1080 × 1920)",
        "viewport": {"width": 540,  "height": 960},
        "dpr":      2,     # 540×2=1080, 960×2=1920
    },
    {
        "dir":      "tablet_7inch",
        "label":    "7-inch tablet (1080 × 1920)",
        "viewport": {"width": 720,  "height": 1280},
        "dpr":      1.5,   # 720×1.5=1080, 1280×1.5=1920
    },
    {
        "dir":      "tablet_10inch",
        "label":    "10-inch tablet (1080 × 1920)",
        "viewport": {"width": 1080, "height": 1920},
        "dpr":      1,     # full-size; both sides ≥ 1080 px ✓
    },
]

# ── feature-graphic HTML (1024 × 500) ─────────────────────────────────────────
# Rendered once by Playwright; no dev server needed for this asset.

FEATURE_GRAPHIC_HTML = """\
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&family=Inter:wght@400;500&display=swap" rel="stylesheet">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  width: 1024px; height: 500px;
  background: linear-gradient(135deg, #091511 0%, #0d1a15 55%, #0f2018 100%);
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 72px; overflow: hidden; position: relative;
}
.glow {
  position: absolute; width: 600px; height: 600px;
  background: radial-gradient(circle, rgba(14,159,110,0.18) 0%, transparent 65%);
  top: -100px; right: 80px; pointer-events: none;
}
.glow2 {
  position: absolute; width: 300px; height: 300px;
  background: radial-gradient(circle, rgba(14,159,110,0.10) 0%, transparent 65%);
  bottom: -60px; left: 40px; pointer-events: none;
}
.text { display: flex; flex-direction: column; gap: 18px; flex-shrink: 0; }
.eyebrow {
  font-size: 11px; letter-spacing: 0.24em; text-transform: uppercase;
  color: #0E9F6E; font-family: 'Inter', system-ui, sans-serif; font-weight: 500;
}
h1 {
  font-size: 88px; font-weight: 700; color: #edf5f2; line-height: 1;
  letter-spacing: -0.03em; font-family: 'Space Grotesk', system-ui, sans-serif;
}
h1 .dot { color: #0E9F6E; }
.sub {
  font-size: 16px; color: #7aada0; line-height: 1.6; max-width: 340px;
  font-family: 'Inter', system-ui, sans-serif;
}
/* Decorative mini UI card */
.preview {
  flex-shrink: 0;
  display: flex; flex-direction: column; gap: 12px;
  transform: perspective(800px) rotateY(-10deg) rotateX(4deg);
}
.card {
  background: #132920; border-radius: 18px; padding: 18px 22px;
  border: 1px solid rgba(14,159,110,0.18);
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  font-family: 'Inter', system-ui, sans-serif;
}
.balance-label { font-size: 10px; color: #5a8a7e; letter-spacing: 0.12em; text-transform: uppercase; }
.balance-val { font-size: 36px; font-weight: 700; color: #edf5f2; margin-top: 4px; letter-spacing: -0.02em; }
.balance-val .cur { font-size: 20px; color: #0E9F6E; }
.stats { display: flex; gap: 28px; margin-top: 14px; }
.stat-item { display: flex; flex-direction: column; gap: 3px; }
.stat-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; margin-right: 5px; }
.stat-label { font-size: 9px; color: #5a8a7e; letter-spacing: 0.1em; text-transform: uppercase; }
.stat-val { font-size: 16px; font-weight: 600; color: #edf5f2; }
.row-card {
  background: #132920; border-radius: 14px; padding: 13px 18px;
  border: 1px solid rgba(14,159,110,0.12);
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
  display: flex; align-items: center; gap: 14px; width: 320px;
}
.tx-icon {
  width: 36px; height: 36px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0;
}
.tx-info { flex: 1; }
.tx-name { font-size: 13px; font-weight: 500; color: #d4ede6; font-family: 'Inter', system-ui, sans-serif; }
.tx-cat { font-size: 10px; color: #5a8a7e; margin-top: 2px; }
.tx-amt { font-size: 14px; font-weight: 700; font-family: 'Inter', system-ui, sans-serif; }
.inc { color: #0E9F6E; }
.exp { color: #f06a5a; }
</style>
</head>
<body>
<div class="glow"></div>
<div class="glow2"></div>

<div class="text">
  <div class="eyebrow">Personal Finance Tracker</div>
  <h1>Ledger<span class="dot">.</span></h1>
  <div class="sub">Track income, expenses &amp; debts.<br>Stay on top of your money, every day.</div>
</div>

<div class="preview">
  <!-- Balance card -->
  <div class="card" style="width:320px">
    <div class="balance-label">Total Balance · June</div>
    <div class="balance-val"><span class="cur">₹</span>24,580.00</div>
    <div class="stats">
      <div class="stat-item">
        <div class="stat-label"><span class="stat-dot" style="background:#0E9F6E"></span>Income</div>
        <div class="stat-val inc">₹52,000</div>
      </div>
      <div class="stat-item">
        <div class="stat-label"><span class="stat-dot" style="background:#f06a5a"></span>Expense</div>
        <div class="stat-val exp">₹27,420</div>
      </div>
    </div>
  </div>

  <!-- Transaction rows -->
  <div class="row-card">
    <div class="tx-icon" style="background:rgba(14,159,110,0.15)">🏠</div>
    <div class="tx-info">
      <div class="tx-name">Rent received</div>
      <div class="tx-cat">Housing · UPI</div>
    </div>
    <div class="tx-amt inc">+₹8,000</div>
  </div>

  <div class="row-card">
    <div class="tx-icon" style="background:rgba(240,106,90,0.12)">🛒</div>
    <div class="tx-info">
      <div class="tx-name">Groceries</div>
      <div class="tx-cat">Food · Card</div>
    </div>
    <div class="tx-amt exp">−₹1,240</div>
  </div>
</div>

</body>
</html>"""

# ── helpers ───────────────────────────────────────────────────────────────────

def _wait_for_server(url: str, timeout: int = 30) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            urllib.request.urlopen(url, timeout=1)
            return
        except Exception:
            time.sleep(0.3)
    raise RuntimeError(f"Dev server did not start at {url} within {timeout}s")


def _start_dev_server() -> subprocess.Popen:
    proc = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=ROOT,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    print("Waiting for Vite dev server …", flush=True)
    _wait_for_server(DEV_URL)
    print(f"Server ready at {DEV_URL}\n")
    return proc


def _capture_tabs(browser, device: dict, out_root: Path) -> int:
    out_dir = out_root / device["dir"]
    out_dir.mkdir(parents=True, exist_ok=True)

    ctx = browser.new_context(
        viewport=device["viewport"],
        device_scale_factor=device["dpr"],
        color_scheme="dark",
    )
    page = ctx.new_page()
    page.goto(DEV_URL)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1000)

    # Viewport width determines which nav is rendered (CSS breakpoint: 760px)
    is_mobile = device["viewport"]["width"] <= MOBILE_BREAKPOINT

    for slug, mobile_label, desktop_label in TABS:
        if is_mobile:
            page.locator(f"nav.botnav button.nav-item:has-text('{mobile_label}')").click()
        else:
            page.locator(f"nav.sidenav button:has-text('{desktop_label}')").click()
        page.wait_for_timeout(600)
        path = out_dir / f"{slug}.png"
        page.screenshot(path=str(path), full_page=False)
        print(f"    {path.relative_to(ROOT)}")

    ctx.close()
    return len(TABS)


def _capture_feature_graphic(browser, out_root: Path) -> None:
    out_dir = out_root / "feature_graphic"
    out_dir.mkdir(parents=True, exist_ok=True)

    ctx = browser.new_context(
        viewport={"width": 1024, "height": 500},
        device_scale_factor=1,
    )
    page = ctx.new_page()
    page.set_content(FEATURE_GRAPHIC_HTML)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(800)   # let web fonts render

    path = out_dir / "feature_graphic.png"
    page.screenshot(path=str(path), full_page=False)
    print(f"    {path.relative_to(ROOT)}")
    ctx.close()


# ── main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    out_root = ROOT / "screenshots"
    out_root.mkdir(exist_ok=True)

    server = _start_dev_server()
    total = 0

    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch()

            # Feature graphic (no dev server required, but browser is already up)
            print("Feature graphic (1024 × 500):")
            _capture_feature_graphic(browser, out_root)
            total += 1

            # App screenshots for each device class
            for device in DEVICES:
                print(f"\n{device['label']}:")
                total += _capture_tabs(browser, device, out_root)

            browser.close()
    finally:
        server.terminate()
        server.wait()
        print("\nDev server stopped.")

    print(f"\n{total} assets saved to screenshots/")
    print(
        "\nGoogle Play Console upload paths:\n"
        "  Main store listing → Graphics\n"
        "    Feature graphic       ← screenshots/feature_graphic/\n"
        "  Main store listing → Screenshots\n"
        "    Phone                 ← screenshots/phone/\n"
        "    7-inch tablet         ← screenshots/tablet_7inch/\n"
        "    10-inch tablet        ← screenshots/tablet_10inch/"
    )


if __name__ == "__main__":
    main()
