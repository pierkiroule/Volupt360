import {test,expect} from '@playwright/test';
test('sixteen sensory choices produce a rich cosmos with bounded GPU layers and valid music',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&/WebGL|shader|GL_INVALID|THREE/i.test(m.text()))errors.push(m.text());});
  await page.route('https://api.polyhaven.com/**',r=>r.abort());
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'Mon CosmoSensoriel •°'})).toBeVisible();
  const scores=await page.evaluate(async()=>{
    const m=await import('/src/weather/weatherModel.ts');
    const {weatherScore}=await import('/src/weather/weatherScore.ts');
    const zones=m.WEATHER.map((w,i)=>({id:'s'+i,kind:w.id,x:Math.sin(i)*.6,y:Math.cos(i)*.6,size:.2+i*.009,opacity:.8,seed:i+41}));
    localStorage.setItem(m.STORAGE_KEY,JSON.stringify({version:1,zones}));
    return zones.map(z=>weatherScore([z]));
  });
  expect(scores).toHaveLength(16);
  expect(scores.every(s=>Number.isFinite(s.density)&&Number.isInteger(s.seed))).toBe(true);
  await page.reload();
  await expect(page.locator('.weather-disk')).toHaveAttribute('data-zones','16');
  await page.getByRole('button',{name:'Entrer dans mon cosmos ↗'}).click();
  const canvas=page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-cosmos','sensory',{timeout:20000});
  await expect(canvas).toHaveAttribute('data-particles','1000');
  await expect(canvas).toHaveAttribute('data-zones','16');
  await page.getByRole('button',{name:'Pause',exact:true}).click();
  await page.screenshot({path:'test-results/cosmos-sensory-palette.png'});
  expect(errors).toEqual([]);
});
test('repeated return preserves the sensory composition and animation remains pausable',async({page})=>{
  await page.route('https://api.polyhaven.com/**',r=>r.abort());
  await page.goto('/');
  await page.getByRole('button',{name:'Espace intérieur',exact:true}).click();
  const b=await page.locator('.weather-disk').boundingBox();
  await page.mouse.click(b.x+b.width*.5,b.y+b.height*.5);
  for(let i=0;i<3;i++){
    await page.getByRole('button',{name:'Entrer dans mon cosmos ↗'}).click();
    await expect(page.locator('canvas')).toHaveAttribute('data-cosmos','sensory');
    await page.getByRole('button',{name:'Pause',exact:true}).click();
    const time=await page.locator('canvas').getAttribute('data-cosmo-time');
    await page.waitForTimeout(180);
    expect(await page.locator('canvas').getAttribute('data-cosmo-time')).toBe(time);
    await page.getByRole('button',{name:'← Disque',exact:true}).click();
    await expect(page.locator('.weather-disk')).toHaveAttribute('data-zones','1');
  }
});
