
import asyncio
import json
import os
from playwright.sync_api import sync_playwright

# 1. Configuration
FILE_PATH = r"d:\EUNHEE\mcp\MoneyFact_Project_Brief.md"
AUTH_FILE = r"C:\Users\ninni\.notebooklm-mcp\auth.json"

def run():
    print("🚀 Starting NotebookLM Upload Automation...")

    # Load Auth Tokens
    if not os.path.exists(AUTH_FILE):
        print(f"❌ Auth file not found at {AUTH_FILE}")
        return

    with open(AUTH_FILE, 'r') as f:
        auth_data = json.load(f)

    cookies = []
    # Convert cookie format for Playwright
    # auth.json format: {"cookies": {"name": "value", ...}}
    if "cookies" in auth_data:
        for name, value in auth_data["cookies"].items():
            cookie = {
                "name": name,
                "value": value,
                "domain": ".google.com",
                "path": "/",
                "httpOnly": True,
                "secure": True,
                "sameSite": "None"
            }
            # Handle specific host cookies
            if name.startswith("__Host-"):
                cookie["domain"] = "notebooklm.google.com" 
                del cookie["httpOnly"] # Sometimes causes issues with Host cookies? try flexible
            
            cookies.append(cookie)
    
    with sync_playwright() as p:
        # Launch Browser (Visible mode to debug)
        print("🌐 Launching Chromium...")
        browser = p.chromium.launch(headless=False, slow_mo=500) 
        context = browser.new_context()

        # Inject Cookies
        print(f"🍪 Injecting {len(cookies)} cookies...")
        context.add_cookies(cookies)

        page = context.new_page()

        # 2. Go to NotebookLM
        print("🔗 Navigating to NotebookLM...")
        page.goto("https://notebooklm.google.com/")
        
        # Wait for load
        try:
            page.wait_for_selector("text=New Notebook", timeout=10000)
            print("✅ Logged in successfully!")
        except:
             print("⚠️ Login check timeout. Check browser window.")
        
        # 3. Create New Notebook
        print("kte Create New Notebook...")
        # Clicking the "New Notebook" card (usually a big plus button)
        # We try to find it by text or aria-label
        page.click("text=New Notebook")

        # 4. Upload File
        print("qc Uploading File...")
        # Wait for the upload area/input
        # The input type='file' is usually hidden, we need to find it and set input files
        page.wait_for_selector("input[type='file']")
        
        with page.expect_file_chooser() as fc_info:
            # We trigger the file chooser by clicking the upload area if needed, 
            # OR we can directly set input files if the input is present.
            # NotebookLM usually has a 'hidden' input. Let's try direct setting.
            page.set_input_files("input[type='file']", FILE_PATH)

        print("🎉 File Upload Triggered!")
        
        # Wait a bit for upload to process
        page.wait_for_timeout(10000)
        
        print("✅ Upload process finished (Check browser). Closing in 5s...")
        page.wait_for_timeout(5000)
        browser.close()

if __name__ == "__main__":
    run()
