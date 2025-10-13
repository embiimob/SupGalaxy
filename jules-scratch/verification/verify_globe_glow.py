
import os
from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()

    try:
        # Navigate to the local file
        page.goto(f"file://{os.getcwd()}/index.html")

        # Log in
        page.fill("#worldNameInput", "KANYE")
        page.fill("#userInput", "embiitbot")
        page.click("#startBtn")

        # Wait for the HUD to be visible, might take a while due to world generation
        expect(page.locator("#hud")).to_be_visible(timeout=60000)

        # Mock pending offers and display the modal
        page.evaluate("""() => {
            window.pendingOffers = [{
                clientUser: 'testuser',
                offer: { sdp: 'fake-sdp', type: 'offer' },
                iceCandidates: [],
                transactionId: 'local_123',
                timestamp: Date.now(),
                profile: { URN: 'testuser', Creators: [null] }
            }];
            setupPendingModal();
            document.getElementById('pendingModal').style.display = 'block';
        }""")

        # Use JavaScript to click the checkbox
        page.evaluate("document.querySelector('.selectOffer').click()")

        # Click the accept button. This will activate host mode and show the join script modal.
        page.locator("#acceptPending").click(force=True)

        # Wait for the next modal and then close it to reveal the HUD again
        expect(page.locator("#joinScriptModal")).to_be_visible()
        page.locator("#closeJoinScript").click(force=True)
        expect(page.locator("#joinScriptModal")).to_be_hidden()

        # The globe icon should now have the 'hosting' class.
        users_button = page.locator("#usersBtn")
        expect(users_button).to_have_class("hosting")

        # Take a screenshot of the globe icon for visual confirmation.
        users_button.screenshot(path="jules-scratch/verification/verification.png")

        print("Screenshot taken successfully.")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
