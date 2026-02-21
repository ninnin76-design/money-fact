
import subprocess
import time
import os
from playwright.sync_api import sync_playwright

CHROME_DEBUG_URL = "http://127.0.0.1:9222"
FILE_PATH = r"d:\EUNHEE\mcp\MoneyFact_Dev_Resources.md"
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
USER_DATA_DIR = r"C:\ChromeDebug"

def run():
    print("🚀 Launching Chrome to Add Resources...")
    
    # 1. Launch Chrome
    try:
        subprocess.Popen([
            CHROME_PATH,
            "--remote-debugging-port=9222",
            f"--user-data-dir={USER_DATA_DIR}",
            "https://notebooklm.google.com/"
        ])
        print("✅ Chrome Launched!")
        time.sleep(5) 
    except Exception as e:
        print(f"❌ Failed to launch Chrome: {e}")
        return

    # 2. Connect and Upload to existing notebook
    with sync_playwright() as p:
        try:
            browser = p.chromium.connect_over_cdp(CHROME_DEBUG_URL)
            default_context = browser.contexts[0]
            
            page = None
            for p_instance in default_context.pages:
                if "notebooklm.google.com" in p_instance.url:
                    page = p_instance
                    break
            
            if not page:
                page = default_context.pages[0]
                page.goto("https://notebooklm.google.com/")
            
            print(f"✅ Connected to Page: {page.title()}")
            page.wait_for_timeout(3000)

            # 3. Enter the most recent notebook (Untitled notebook)
            print("kte Entering the first notebook...")
            # Usually the first notebook after 'New' card is at a specific index
            # Let's try to find a card with 'Untitled notebook' text
            try:
                page.click("text=Untitled notebook", timeout=5000)
            except:
                print("⚠️ 'Untitled notebook' not found by text. Clicking the first available notebook card...")
                # Try clicking any element that looks like a notebook card (often has a specific class or structure)
                # From debug, cards are divs. Let's try the one next to '새로 만들기'
                page.click("div[role='link'] >> nth=0") # Usually the first real notebook

            page.wait_for_timeout(5000) # Wait for notebook to load
            print(f"✅ Entered Notebook: {page.title()}")

            # 4. Add Source
            print("kte Clicking '소스 추가' (Add Source)...")
            # In English it's 'Add source', in Korean it might be '소스 추가' or just a + button
            try:
                page.click("text=소스 추가", timeout=5000)
            except:
                try:
                    page.click("aria-label='소스 추가'")
                except:
                    # Look for the plus icon or text in the side panel
                    page.click("button:has-text('추가')")

            # 5. Upload File
            print("qc Uploading New Resource File...")
            try:
                # Wait for the modal/input
                with page.expect_file_chooser() as fc_info:
                    page.click("text=파일 업로드", timeout=5000)
                
                file_chooser = fc_info.value
                file_chooser.set_files(FILE_PATH)
                print("🎉 Additional Resource Uploaded!")
            except Exception as e:
                print(f"❌ Upload failed: {e}")
                # Try direct input as fallback
                try:
                    page.set_input_files("input[type='file']", FILE_PATH)
                    print("🎉 Uploaded via Input fallback!")
                except:
                    print("❌ Complete failure. Check browser UI.")

            print("✅ Mission Accomplished! Closing in 5s...")
            page.wait_for_timeout(5000)
            browser.disconnect()
            
        except Exception as e:
            print(f"❌ Error during automation: {e}")

if __name__ == "__main__":
    run()
