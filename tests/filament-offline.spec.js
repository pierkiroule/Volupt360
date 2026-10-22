import {test,expect} from '@playwright/test';
test('production warms the app without bulk textures and caches images on demand',async({page,context})=>{
  const url=process.env.FILAMENT_PROD_URL;test.skip(!url,'Requires a production preview');
  const textures=[];page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/textures/'))textures.push(r.url());});
  await page.goto(url);
  await expect.poll(()=>page.evaluate(()=>Boolean(navigator.serviceWorker.controller))).toBe(true);
  await page.evaluate(()=>navigator.serviceWorker.ready);
  expect(textures).toEqual([]);
  const image='/textures/emojis/souffle/01-base.jpg';
  const bytes=await page.evaluate(async path=>(await (await fetch(path)).arrayBuffer()).byteLength,image);
  expect(bytes).toBeGreaterThan(0);
  const b=await page.locator('.weather-disk').boundingBox();await page.mouse.click(b.x+b.width/2,b.y+b.height/2);
  await page.getByRole('button',{name:'Enregistrer',exact:true}).click();
  await context.setOffline(true);await page.reload();
  await expect(page.locator('.weather-disk')).toHaveAttribute('data-zones','1');
  expect(await page.evaluate(async path=>(await (await fetch(path)).arrayBuffer()).byteLength,image)).toBe(bytes);
  await page.getByRole('button',{name:'Entrer dans mon cosmos ↗'}).click();
  await expect(page.locator('canvas')).toHaveAttribute('data-render-style','filaments',{timeout:20000});
});
