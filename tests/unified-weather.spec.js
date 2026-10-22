import { test, expect } from '@playwright/test';
test('one weather composition creates reproducible terrain, objects and localized relief', async ({page}) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { composeWeatherWorld, WeatherTerrain } = await import('/src/weather/WeatherWorldComposer.ts');
    const { TerrainGenerator } = await import('/src/landscape/TerrainGenerator.ts');
    const a={id:'a',kind:'storm',x:.5,y:.4,size:.3,opacity:.8,seed:42};
    const b={...a,id:'b',kind:'rain',x:-.6,seed:51};
    const first=composeWeatherWorld([a,b]), same=composeWeatherWorld([a,b]);
    const changed=composeWeatherWorld([{...a,kind:'sun'},b]);
    const terrain=new WeatherTerrain([a]), base=new TerrainGenerator(terrain.settings);
    const at=(x,z)=>terrain.height(x,z)-base.height(x,z);
    return {same:JSON.stringify(first.objects)===JSON.stringify(same.objects),count:first.objects.length,
      changed:JSON.stringify(first.objects)!==JSON.stringify(changed.objects),
      local:at(14,11.2),remote:at(-40,-40),
      clearance:first.camera[1]-first.terrain.height(first.camera[0],first.camera[2]),
      heights:first.objects.every(p=>Math.abs(p.y-(first.terrain.height(p.x,p.z)-.03))<.001)};
  });
  expect(result.same).toBe(true); expect(result.count).toBeGreaterThan(30);
  expect(result.changed).toBe(true); expect(result.heights).toBe(true);
  expect(result.local).toBeGreaterThan(result.remote+1);
  expect(result.clearance).toBeGreaterThan(4);
});
test('network failure still renders a single complete world and preserves the disk', async ({page}) => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://api.polyhaven.com/**',r=>r.abort());
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  for(const [kind,x,y] of [['Cotonneux',.3,.4],['Ruissellement',.7,.6]]) {
    await page.getByRole('button',{name:kind,exact:true}).click();
    const b=await page.locator('.weather-disk').boundingBox();
    await page.mouse.click(b.x+b.width*x,b.y+b.height*y);
  }
  await page.getByRole('button',{name:'Entrer dans mon cosmos ↗'}).click();
  const canvas=page.locator('canvas');
  await expect(canvas).toHaveCount(1);
  await expect(canvas).toHaveAttribute('data-landscape','sensory-cosmos');
  await expect(canvas).toHaveAttribute('data-skydome','watercolor');
  await expect(canvas).toHaveAttribute('data-zones','2');
  await expect(canvas).toHaveAttribute('data-render-style','filaments');
  await page.getByRole('button',{name:'Contempler',exact:true}).click();
  await page.getByRole('button',{name:'Pause',exact:true}).click();
  const position=await canvas.getAttribute('data-position');
  await page.waitForTimeout(300);
  expect(await canvas.getAttribute('data-position')).toBe(position);
  await page.screenshot({path:'test-results/unified-weather-mobile.png'});
  await page.getByRole('button',{name:'← Disque',exact:true}).click();
  await expect(page.locator('.weather-disk')).toHaveAttribute('data-zones','2');
  expect(errors).toEqual([]);
});
