
import subprocess
import time
import os
from playwright.sync_api import sync_playwright

CHROME_DEBUG_URL = "http://127.0.0.1:9222"
FILE_PATH = r"d:\EUNHEE\mcp\MoneyFact_Project_Brief.md"
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
USER_DATA_DIR = r"C:\ChromeDebug"

def run():
    print("🚀 Launching Chrome and Uploading...")
    
    # 1. Launch Chrome
    try:
        subprocess.Popen([
            CHROME_PATH,
            "--remote-debugging-port=9222",
            f"--user-data-dir={USER_DATA_DIR}",
            "https://notebooklm.google.com/"
        ])
        print("✅ Chrome Launched!")
        time.sleep(5) # Wait for browser to open
    except Exception as e:
        print(f"❌ Failed to launch Chrome: {e}")
        return

    # 2. Connect and Upload
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
            
            print(f"✅ Connected to Page: {page.title()}")
            
            # 3. Create New Notebook
            print("kte Clicking 'New Notebook Button'...")
            try:
                # Based on user feedback, try generic 'New' or 'Create' related terms
                # Or try finding by structure: usually a big card
                page.click("text=새로 만들기", timeout=3000)
            except:
                print("⚠️ Retrying with flexible match...")
                # Try finding by class or structure if text fails
                # Often main dashboard has grid of cards. First one is 'New'
                # Let's try clicking the first card in the grid if possible
                try:
                   page.click("div[role='button']:has-text('새로 만들기')")
                except:
                   print("❌ Button click failed. Please click manually!")

            # 4. Upload File
            print("qc Uploading File...")
            try:
                # Wait for modal to appear
                page.wait_for_timeout(2000)
                
                # Check if we are in the source selection modal
                # Look for '파일 업로드' button
                print("kte Clicking '파일 업로드' button...")
                
                # We need to handle the file chooser event triggered by clicking the button
                with page.expect_file_chooser() as fc_info:
                    try:
                        page.click("text=파일 업로드", timeout=3000)
                    except:
                        # Fallback: maybe it's icon based or different text
                        page.click("div[role='button']:has-text('파일 업로드')")
                
                file_chooser = fc_info.value
                file_chooser.set_files(FILE_PATH)
                print("🎉 File Uploaded via Chooser!")
                
            except Exception as e:
                print(f"❌ Upload failed: {e}")
                print("⚠️ Trying input fallback...")
                try:
                    page.set_input_files("input[type='file']", FILE_PATH)
                    print("🎉 File Uploaded via Input fallback!")
                except:
                    print("❌ Complete failure. Drag manually!")

            print("✅ Process Finished! Check browser.")
            browser.disconnect()
            
        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    run()
