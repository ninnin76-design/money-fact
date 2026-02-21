
import asyncio
from playwright.sync_api import sync_playwright

# 1. Config
FILE_PATH = r"d:\EUNHEE\mcp\MoneyFact_Project_Brief.md"
CHROME_DEBUG_URL = "http://127.0.0.1:9222"

def run():
    print("🚀 Connecting to Existing Chrome (Port 9222)...")
    
    with sync_playwright() as p:
        try:
            # Connect to the browser we just launched
            browser = p.chromium.connect_over_cdp(CHROME_DEBUG_URL)
            default_context = browser.contexts[0]
            
            # Find the NotebookLM page
            page = None
            for p_instance in default_context.pages:
                if "notebooklm.google.com" in p_instance.url:
                    page = p_instance
                    break
            
            if not page:
                print("⚠️ NotebookLM tab not found. Using the first tab...")
                page = default_context.pages[0]
                page.goto("https://notebooklm.google.com/")
            
            print(f"✅ Connected to Page: {page.title()}")
            
            # 2. Check Login (Look for 'New Notebook' button)
            try:
                # Wait for main dashboard (Increase timeout just in case)
                page.wait_for_selector("text=New Notebook", timeout=10000)
                print("✅ Login Confirmed!")
            except:
                print("❌ Login check failed. Please log in manually and re-run!")
                return

            # 3. Create New Notebook
            print("kte Clicking '새로 만들기'...")
            # Found via debug: 'add\n새로 만들기' or span with '새로 만들기'
            try:
                # Try clicking the distinct text '새로 만들기'
                # Use strict mode false to match partial text inside button
                page.click("text=새로 만들기", timeout=3000)
            except:
                # If text fail, try aria-label or just 'add' icon button if needed
                # But '새로 만들기' appeared in debug, so likely works.
                print("⚠️ Retrying with flexible match...")
                page.click("button:has-text('새로 만들기')")
            
            # Wait for notebook creation (URL change or UI change)
            page.wait_for_timeout(3000)
            
            # 4. Upload File
            print("qc Uploading File...")
            # NotebookLM upload input is tricky. Let's try to find any file input.
            # Sometimes it's hidden or created dynamically.
            # Strategy: Click 'Add source' -> 'Upload source' -> then set input
            
            # Wait for notebook to load
            page.wait_for_timeout(3000) 
            
            # Find file input
            # If not present, we might need to click "Add source" first if it's a new UI
            # But usually on empty notebook, there are big cards.
            
            try:
                # Try setting input directly first
                page.wait_for_selector("input[type='file']", timeout=5000)
                page.set_input_files("input[type='file']", FILE_PATH)
                print("🎉 File Uploaded via Input!")
            except:
                print("⚠️ File input not found directly. Trying UI clicks...")
                # Maybe click 'PDF / Text file' card? 
                # Or 'Upload source' button
                # Let's try flexible text search
                # page.click("text=Source") ...
                print("❌ Auto-upload failed. Please drag-and-drop the file manually!")

            print("✅ Script Finished! Check your browser.")
            # Do NOT close browser, let user see result
            browser.disconnect()
            
        except Exception as e:
            print(f"❌ Connection Error: {e}")
            print("Make sure Chrome is running with --remote-debugging-port=9222")

if __name__ == "__main__":
    run()
