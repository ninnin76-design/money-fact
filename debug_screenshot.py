
import asyncio
from playwright.sync_api import sync_playwright

CHROME_DEBUG_URL = "http://127.0.0.1:9222"

def run():
    print("🚀 Capturing NotebookLM Screen (To find button)...")
    
    with sync_playwright() as p:
        try:
            browser = p.chromium.connect_over_cdp(CHROME_DEBUG_URL)
            default_context = browser.contexts[0]
            
            # Find page
            page = None
            for p_instance in default_context.pages:
                if "notebooklm.google.com" in p_instance.url:
                    page = p_instance
                    break
            
            if not page:
                page = default_context.pages[0]
                page.goto("https://notebooklm.google.com/")
            
            print(f"✅ Scanning Page: {page.title()}")
            page.wait_for_timeout(3000)

            # Capture Screenshot
            screenshot_path = r"d:\EUNHEE\mcp\notebooklm_screen.png"
            page.screenshot(path=screenshot_path)
            print(f"📸 Screenshot saved to: {screenshot_path}")

            browser.disconnect()
            
        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    run()
