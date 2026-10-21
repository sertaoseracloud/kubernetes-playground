import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { abrir, medirEstouro, PRIMEIRO, TEMAS } from './apoio.js';

const YAML = `apiVersion: v1
kind: Pod
metadata:
  name: web
  labels:
    app: web
spec:
  containers:
    - name: web
      image: nginx:alpine
---
apiVersion: v1
kind: Service
metadata:
  name: entrada
spec:
  selector:
    app: web
  ports:
    - port: 80
`;

async function editar(page, codigo) {
  await page.locator('.cm-content').first().click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.insertText(codigo);
}

test('arquitetura mostra relações do YAML e mantém explicação do simulador', async ({ page }, testInfo) => {
  await abrir(page, `p/${PRIMEIRO.id}/`);
  await editar(page, YAML);
  await page.locator('[data-saida="arquitetura"]').click();
  const painel = page.locator('#saida-arquitetura');
  await expect(painel.locator('image[href$="k8s-pod.svg"]')).toBeVisible();
  await expect(painel.locator('image[href$="k8s-svc.svg"]')).toBeVisible();
  await expect(painel.locator('.arq-ligacao')).toHaveCount(1);
  await expect(painel).toContainText('Como o simulador funciona');
  await painel.screenshot({ path: testInfo.outputPath('arquitetura-kubernetes.png') });
  for (const imagem of await painel.locator('image').all()) {
    const url = new URL(await imagem.getAttribute('href'), page.url());
    expect(url.origin).toBe(new URL(page.url()).origin);
    expect((await page.request.get(url.href)).ok()).toBe(true);
  }
  await editar(page, 'kind: [');
  await expect(painel.locator('[role="status"]')).toContainText('Corrija o código');
  await expect(painel.locator('svg')).toHaveCount(0);
});

test('arquitetura é acessível nos temas e na largura de celular', async ({ page }) => {
  await abrir(page, `p/${PRIMEIRO.id}/`);
  await editar(page, YAML);
  await page.locator('[data-saida="arquitetura"]').click();
  await expect(page.locator('#saida-arquitetura svg')).toBeVisible();
  for (const tema of TEMAS) {
    await page.evaluate((valor) => { document.documentElement.dataset.tema = valor; }, tema);
    await page.waitForTimeout(300);
    const { violations } = await new AxeBuilder({ page }).include('#saida-arquitetura')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(violations.map((v) => v.id)).toEqual([]);
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await page.locator('.arq-rolagem').focus();
  await expect(page.locator('.arq-rolagem')).toBeFocused();
  expect(await medirEstouro(page)).toEqual([]);
});
