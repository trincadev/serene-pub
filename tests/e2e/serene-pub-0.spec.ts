import { expect, test, type Page } from "@playwright/test"

test('serene-pub-0.spec', async ({ page }: { page: Page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Serene Pub.*/);
    await expect(page.getByRole('heading')).toContainText('Welcome to Serene Pub!');

    await expect( page.getByRole('img', { name: 'Serene Pub Logo' }) ).toBeVisible();
    await expect(page.getByRole('banner')).toMatchAriaSnapshot(`
      - navigation "Left navigation":
        - button "Open Sampling panel"
        - button "Open Connections panel"
        - button "Open Ollama Manager panel":
          - img
        - button "Open Contexts panel"
        - button "Open Prompts panel"
        - button "Open Settings panel"
      - link "Serene Pub - Home":
        - /url: /
      - navigation "Right navigation":
        - button "Open Tags panel"
        - button "Open Personas panel"
        - button "Open Characters panel"
        - button "Open Lorebooks+ panel"
        - button "Open Chats panel"
      `);
      await expect(page.locator('summary')).toMatchAriaSnapshot(`- text: Advanced Setup (Manual Configuration)`);
      await page.getByText('Advanced Setup (Manual').click();
      await expect(page.getByRole('group')).toMatchAriaSnapshot(`
        - group:
          - text: Advanced Setup (Manual Configuration)
          - button "Manage Connections":
            - img
          - button "Manage Characters":
            - img
          - button "Manage Personas":
            - img
        `);
    await page.close();
})