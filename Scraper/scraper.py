import asyncio
import json
import platform
import random
import re
from datetime import datetime

import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from supabase import create_client

# -----------------------------
# CONFIG
# -----------------------------
URL = "https://www.ivasms.com/portal/live/my_sms"

SUPABASE_URL = "https://dbpbeuyrvsagptqwllrr.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRicGJldXlydnNhZ3B0cXdsbHJyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQ4MzQzMCwiZXhwIjoyMDg0MDU5NDMwfQ.FulpG5B-IyXdCV_dULVrPFFeQgFFTMdPcunTjuQ6CE0"

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# -----------------------------
# JS OBSERVER
# -----------------------------
JS_INJECT = """(function(){
if(window.__sms_monitor_installed) return;
window.__sms_monitor_installed=true;
window.__newSmsQueue=[];
function extractRowData(tr){
  try {
    const numberEl = tr.querySelector("p.CopyText");
    const number = numberEl ? numberEl.innerText.trim() : null;
    const sidEl = tr.querySelector("td:nth-child(2)");
    const sid = sidEl ? sidEl.innerText.trim() : null;
    const messageEl = tr.querySelector("td:nth-child(5)");
    const message = messageEl ? messageEl.innerText.trim() : null;
    return {number, sid, message};
  } catch(e){ return null; }
}
function observe(){
  const tbody = document.querySelector("#LiveTestSMS");
  if(!tbody) return;
  const mo = new MutationObserver(muts=>{
    muts.forEach(m=>{
      m.addedNodes.forEach(node=>{
        if(node.nodeType===1 && node.tagName==="TR"){
          const data = extractRowData(node);
          if(data && data.number) window.__newSmsQueue.push(data);
        }
      });
    });
  });
  mo.observe(tbody,{childList:true});
}
if(document.readyState==="complete") observe();
else window.addEventListener("load", observe);
})();"""

# -----------------------------
# SCRAPER TASK
# -----------------------------
async def scraper_task(driver):
    while True:
        try:
            items = driver.execute_script(
                "return (window.__newSmsQueue || []).splice(0);"
            )

            for item in items:
                clean_number = re.sub(r"\D", "", item["number"])
                message = item.get("message", "")
                sid = item.get("sid", "")

                # OTP extraction (simple)
                otp_match = re.search(r"\b\d{4,8}\b", message)
                otp = otp_match.group(0) if otp_match else None

                supabase.table("sms_messages").insert({
                    "number": clean_number,
                    "provider": sid,
                    "message": message,
                    "otp": otp,
                    "received_at": datetime.utcnow().isoformat()
                }).execute()

                print(f"📥 SMS Inserted: {clean_number}")

            await asyncio.sleep(0.5)

        except Exception as e:
            print(f"⚠️ Scraper Error: {e}")
            await asyncio.sleep(3)

# -----------------------------
# KEEP ALIVE (ANTI-BOT)
# -----------------------------
async def keep_alive(driver):
    while True:
        try:
            driver.execute_script(
                f"window.scrollTo(0, {random.randint(100, 800)});"
            )
            await asyncio.sleep(random.randint(20, 40))
        except:
            break

# -----------------------------
# MAIN
# -----------------------------
async def main():
    options = uc.ChromeOptions()
    options.add_argument("--disable-blink-features=AutomationControlled")

    driver = uc.Chrome(options=options)
    print(f"🔗 Opening {URL}")
    driver.get(URL)

    WebDriverWait(driver, 60).until(
        EC.presence_of_element_located((By.ID, "LiveTestSMS"))
    )

    driver.execute_script(JS_INJECT)
    print("✅ IVASMS Monitor Active")

    await asyncio.gather(
        scraper_task(driver),
        keep_alive(driver)
    )

if __name__ == "__main__":
    if platform.system() == "Windows":
        asyncio.set_event_loop_policy(
            asyncio.WindowsSelectorEventLoopPolicy()
        )
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("🛑 Stopped")
