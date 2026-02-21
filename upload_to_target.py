
import subprocess
import time
import os
from playwright.sync_api import sync_playwright

CHROME_DEBUG_URL = "http://127.0.0.1:9222"
TARGET_URL = "https://notebooklm.google.com/notebook/aebd1cd1-8049-49ac-8a68-7fde57fa7900"
FILE_PATH = r"d:\EUNHEE\mcp\MoneyFact_Advanced_Features.md"
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
USER_DATA_DIR = r"C:\ChromeDebug"

def run():
    print(f"🚀 Launching Chrome and Heading to Target: {TARGET_URL}")
    
    # 1. Launch Chrome if not running (or just try to connect)
    try:
        subprocess.Popen([
            CHROME_PATH,
            "--remote-debugging-port=9222",
            f"--user-data-dir={USER_DATA_DIR}",
            TARGET_URL
        ])
        print("✅ Chrome Launched and Navigating...")
        time.sleep(7) # Wait for page to load
    except Exception as e:
        print(f"❌ Failed to launch: {e}")
        return

    # 2. Connect and Upload
    with sync_playwright() as p:
        try:
            browser = p.chromium.connect_over_cdp(CHROME_DEBUG_URL)
            default_context = browser.contexts[0]
            
            # Find the specific NotebookLM page
            page = None
            for p_instance in default_context.pages:
                if TARGET_URL in p_instance.url or "aebd1cd1-8049" in p_instance.url:
                    page = p_instance
                    break
            
            if not page:
                print("⚠️ Target tab not found. Navigating the first tab...")
                page = default_context.pages[0]
                page.goto(TARGET_URL)
            
            print(f"✅ Connected to Target Notebook: {page.title()}")
            page.wait_for_timeout(5000)

            # 3. Look for 'Add Source' (+) button or '파일 업로드' directly
            # NotebookLM UI check: Inside a notebook, sources are on the left.
            print("kte Triggering File Upload...")
            
            try:
                # Try clicking '소스 추가' or the '+' button related to sources
                # Using broad search for '추가'
                page.click("button:has-text('추가')", timeout=5000)
                page.wait_for_timeout(2000)
            except:
                print("⚠️ '추가' button not found or already open. Proceeding to find '파일 업로드'...")

            # 4. Handle File Chooser for '파일 업로드'
            try:
                print("kte Clicking '파일 업로드' button...")
                with page.expect_file_chooser() as fc_info:
                    # Look for specific button text from previous debug
                    page.click("text=파일 업로드", timeout=5000)
                
                file_chooser = fc_info.value
                file_chooser.set_files(FILE_PATH)
                print("🎉 Additional Resources Uploaded Successfully!")
            except Exception as e:
                print(f"❌ Upload failed: {e}")
                # Try setting input directly
                try:
                    page.set_input_files("input[type='file']", FILE_PATH)
                    print("🎉 Uploaded via input tag!")
                except:
                    print("❌ Final failure. Please guide manually.")

            print("✅ All-in-one process finished! Check your notebook.")
            page.wait_for_timeout(5000)
            browser.disconnect()
            
        except Exception as e:
            print(f"❌ Automation Error: {e}")

if __name__ == "__main__":
    run()
