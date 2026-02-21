
import asyncio
from playwright.sync_api import sync_playwright

CHROME_DEBUG_URL = "http://127.0.0.1:9222"

def run():
    print("🚀 Debugging NotebookLM UI (Looking for 'New Notebook' button)...")
    
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

            # 1. Dump all buttons text
            print("\n--- [All Buttons] ---")
            buttons = page.query_selector_all("button")
            for i, btn in enumerate(buttons):
                txt = btn.inner_text()
                print(f"Button {i}: '{txt}'")

            # 2. Dump all divs with 'New' or '새' text
            print("\n--- [Divs with 'New'/'새'] ---")
            # This might be huge, let's limit to elements with short text
            elements = page.query_selector_all("div, span")
            count = 0
            for el in elements:
                try:
                    txt = el.inner_text().strip()
                    if txt and len(txt) < 30 and ("New" in txt or "새" in txt):
                        print(f"Element: '{txt}' (Tag: {el.evaluate('el => el.tagName')})")
                        count += 1
                        if count > 20: break 
                except: pass

            print("\n✅ Debug Scan Finished!")
            browser.disconnect()
            
        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    run()
