import { test, expect } from '@playwright/test';

test('página inicial carrega com título correto', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Kubernetes/i);
});

test('editor YAML está visível na página inicial', async ({ page }) => {
  await page.goto('/');
  const editor = page.locator('textarea, [role="textbox"], .editor, #yaml-editor').first();
  await expect(editor).toBeVisible({ timeout: 10_000 });
});