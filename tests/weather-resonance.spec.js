import { test, expect } from '@playwright/test';
test('weather score uses weighted choices and stays reproducible', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { weatherScore } = await import('/src/weather/weatherScore.ts');
    const sun = {id:'a',kind:'sun',size:.3,opacity:.8,x:0,y:0,seed:42};
    const storm = {...sun,id:'b',kind:'storm',size:.45,seed:71};
    return {sun:weatherScore([sun]),storm:weatherScore([storm]),
      mix:weatherScore([sun,storm]),reverse:weatherScore([storm,sun])};
  });
  expect(result.sun.biome).toBe('coast');
  expect(result.storm.biome).toBe('mountain');
  expect(result.mix).toEqual(result.reverse);
  expect(result.mix.seed).not.toBe(result.sun.seed);
});
test('default mobile disk palette, bird flight, silent exploration and return', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('.meteo-ring button')).toHaveCount(16);
  for (const button of await page.locator('.meteo-ring button').all()) {
    const b=await button.boundingBox(); expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x+b.width).toBeLessThanOrEqual(390);
  }
  await page.getByRole('button',{name:'Ruissellement',exact:true}).click();
  const b=await page.locator('.weather-disk').boundingBox();
  await page.mouse.click(b.x+b.width*.5,b.y+b.height*.5);
  await page.getByRole('button',{name:'Entrer dans mon cosmos ↗'}).click();
  await expect(page.locator('canvas')).toHaveAttribute('data-zones','1');
  const position=await page.locator('canvas').getAttribute('data-position');
  await expect.poll(()=>page.locator('canvas').getAttribute('data-position')).not.toBe(position);
  await expect(page.locator('.meteo-sound')).toHaveCount(0);
  await page.getByRole('button',{name:'← Disque'}).click();
  await expect(page.locator('.weather-disk')).toHaveAttribute('data-zones','1');
  expect(errors).toEqual([]);
});
