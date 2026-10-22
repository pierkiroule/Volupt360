import {test,expect} from '@playwright/test';
test('phenomena follow choices, surprises rest and seed paths remain finite',async({page})=>{
  await page.goto('/');
  const result=await page.evaluate(async()=>{
    const m=await import('/src/weather/phenomenaConfig.ts');
    const zone={id:'a',kind:'sun',x:0,y:0,size:.3,opacity:.8,seed:17};
    const all=m.selectPhenomena([zone,{...zone,id:'b',kind:'wave'},{...zone,id:'c',kind:'stone'}]);
    const state={time:4.1,next:4,birth:-100,events:0};
    const first=m.advanceSurprise(state,5), repeated=m.advanceSurprise(state,5);
    state.time=28.2;const second=m.advanceSurprise(state,5);
    const paths=Array.from({length:111},(_,i)=>m.seedFlight(i/10,[.8,.5,.2],1,[3,2,1]));
    return {all:all.map(c=>c.kind),single:m.selectPhenomena([zone]).map(c=>c.kind),first,repeated,second,events:state.events,finite:paths.flat().every(Number.isFinite),
      maximum:Math.max(...paths.flat().map(Math.abs)),same:JSON.stringify(m.selectPhenomena([zone]))===JSON.stringify(m.selectPhenomena([zone]))};
  });
  expect(result.all).toEqual(['sunflower','current','stone-feathers']);
  expect(result.single).toEqual(['sunflower']);expect(result.same).toBe(true);
  expect(result.first).toBe(true);expect(result.repeated).toBe(false);expect(result.second).toBe(true);expect(result.events).toBe(2);
  expect(result.finite).toBe(true);expect(result.maximum).toBeLessThan(15);
});
test('three sensations render as filaments, freeze and survive re-entry',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.route('https://api.polyhaven.com/**',r=>r.abort());
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&/WebGL|shader|GL_INVALID|THREE/i.test(m.text()))errors.push(m.text());});
  await page.goto('/');
  await page.evaluate(()=>localStorage.setItem('emotional-weather.saved.v1',JSON.stringify({version:1,zones:[
    {id:'sun',kind:'sun',x:0,y:0,size:.35,opacity:.8,seed:17},
    {id:'wave',kind:'wave',x:.3,y:.1,size:.3,opacity:.8,seed:23},
    {id:'stone',kind:'stone',x:-.3,y:-.1,size:.3,opacity:.8,seed:31}
  ]})));
  await page.reload();
  for(let i=0;i<2;i++){
    await page.getByRole('button',{name:'Entrer dans mon cosmos ↗'}).click();
    const canvas=page.locator('canvas');
    await expect(canvas).toHaveAttribute('data-render-style','filaments');
    await page.getByRole('button',{name:'Pause',exact:true}).click();
    const state=await canvas.getAttribute('data-cosmo-time');
    await page.waitForTimeout(250);expect(await canvas.getAttribute('data-cosmo-time')).toBe(state);
    if(i===0)await page.screenshot({path:'test-results/living-phenomena.png'});
    await page.getByRole('button',{name:'← Disque',exact:true}).click();
    await expect(page.locator('.weather-disk')).toHaveAttribute('data-zones','3');
  }
  expect(errors).toEqual([]);
});
