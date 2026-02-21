
import subprocess
import os
import time

# Chrome Path (Standard Windows Path)
chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
user_data_dir = r"C:\ChromeDebug"

# Command
cmd = [
    chrome_path,
    "--remote-debugging-port=9222",
    f"--user-data-dir={user_data_dir}",
    "https://notebooklm.google.com/"
]

print("🚀 Launching Chrome with Debug Port 9222...")
try:
    # Use Popen to run non-blocking
    subprocess.Popen(cmd)
    print("✅ Chrome Launched! Please Log In manually if needed.")
except Exception as e:
    print(f"❌ Failed to launch Chrome: {e}")
