import {test,expect} from '@playwright/test';
test('filament buffers are reproducible and bounded across 32 zones',async({page})=>{
  await page.goto('/');
  const result=await page.evaluate(async()=>{
    const {buildFilaments}=await import('/src/weather/FilamentGeometry.ts');
    const {WEATHER}=await import('/src/weather/weatherModel.ts');
    const zones=Array.from({length:32},(_,i)=>({id:String(i),kind:WEATHER[i%16].id,x:Math.sin(i)*.5,y:Math.cos(i)*.5,size:.25,opacity:.8,seed:i+20}));
    const a=buildFilaments(zones,true),b=buildFilaments(zones,true),desktop=buildFilaments(zones,false);
    return {same:a.positions.every((v,i)=>v===b.positions[i]),finite:[...a.positions,...a.colors].every(Number.isFinite),mobile:a.selected.length,desktop:desktop.selected.length,bytes:a.positions.byteLength+a.colors.byteLength+a.phases.byteLength};
  });
  expect(result.same).toBe(true);expect(result.finite).toBe(true);
  expect(result.mobile).toBe(6);expect(result.desktop).toBe(8);expect(result.bytes).toBeLessThan(200000);
});
test('mobile cosmos has a small render budget and no Poly Haven network traffic',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const remote=[],errors=[];
  page.on('request',r=>{if(/polyhaven\.(com|org)/i.test(r.url()))remote.push(r.url());});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&/WebGL|shader|GL_INVALID|THREE/i.test(m.text()))errors.push(m.text());});
  await page.goto('/');
  await page.evaluate(()=>localStorage.setItem('emotional-weather.saved.v1',JSON.stringify({version:1,zones:Array.from({length:16},(_,i)=>({id:'f'+i,kind:['sun','cloud','rain','storm','wind','fog','snow','dusk','aurora','dream','prism','fire','stone','spark','wave','space'][i],x:Math.sin(i)*.5,y:Math.cos(i)*.5,size:.3,opacity:.8,seed:i+1}))})));
  await page.reload();await page.getByRole('button',{name:'Entrer dans mon cosmos ↗'}).click();
  const canvas=page.locator('canvas');await expect(canvas).toHaveAttribute('data-render-style','filaments',{timeout:20000});
  await expect(canvas).toHaveAttribute('data-particles','120');
  await expect.poll(async()=>Number(await canvas.getAttribute('data-draw-calls'))).toBeGreaterThan(0);
  expect(Number(await canvas.getAttribute('data-draw-calls'))).toBeLessThanOrEqual(8);
  expect(Number(await canvas.getAttribute('data-triangles'))).toBeLessThan(4500);
  console.log('Mobile GPU budget:',await canvas.getAttribute('data-draw-calls'),'calls,',await canvas.getAttribute('data-triangles'),'triangles');
  await page.screenshot({path:'test-results/filament-cosmos.png'});
  await page.getByRole('button',{name:'← Disque',exact:true}).click();
  await expect(page.locator('.weather-disk')).toHaveAttribute('data-zones','16');
  await page.goto('/?paysage');await page.getByRole('button',{name:'Générer un paysage',exact:true}).click();
  await expect(page.locator('canvas')).toHaveAttribute('data-biome',/./);
  expect(remote).toEqual([]);expect(errors).toEqual([]);
});
