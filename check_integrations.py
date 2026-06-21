import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        # Listen for console messages
        console_logs = []
        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
        page.on("pageerror", lambda err: console_logs.append(f"[pageerror] {err.message}\n{err.stack}"))

        print("Navigating to localhost:5173/?view=integrations...")
        try:
            await page.goto("http://localhost:5173/?view=integrations", timeout=10000)
            print("Page loaded successfully.")
        except Exception as e:
            print(f"Failed to load page: {e}")
            await browser.close()
            return

        # Wait a moment for rendering
        await page.wait_for_timeout(2000)
        
        print("\n--- Console logs during initial load ---")
        for log in console_logs:
            print(log)
        console_logs.clear()

        # Click the "Business Integrations" button
        print("\nClicking 'Business Integrations' navigation link...")
        try:
            # Let's find button containing "Business Integrations"
            btn = page.locator("button:has-text('Business Integrations')")
            if await btn.count() > 0:
                await btn.click()
                print("Clicked!")
            else:
                print("Business Integrations link not found!")
        except Exception as e:
            print(f"Error clicking button: {e}")

        # Wait for potential errors or state updates to process
        await page.wait_for_timeout(3000)

        print("\n--- Console logs and page errors after click ---")
        if not console_logs:
            print("No new logs or errors captured.")
        else:
            for log in console_logs:
                print(log)

        # Check if the page is blank or has content
        body_html = await page.evaluate("document.body.innerHTML")
        print(f"\nBody inner HTML length: {len(body_html)}")
        
        # Take a screenshot to visualize
        screenshot_path = "integrations_view.png"
        await page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
