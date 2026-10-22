import {test,expect} from '@playwright/test';
test('a vertical drag followed by a stationary finger must not keep tilting the 360 view down',async({page})=>{
  await page.addInitScript(()=>Object.defineProperty(window,'DeviceOrientationEvent',{configurable:true,value:class extends Event{static async requestPermission(){return 'granted';}}}));
  await page.setViewportSize({width:390,height:844});
  await page.route('https://api.polyhaven.com/**',r=>r.abort());
  await page.goto('/');
  const b=await page.locator('.weather-disk').boundingBox();await page.mouse.click(b.x+b.width/2,b.y+b.height/2);
  await page.getByRole('button',{name:'Entrer dans mon cosmos ↗'}).click();
  await expect(page.locator('canvas')).toHaveAttribute('data-cosmos','sensory',{timeout:20000});
  await page.getByRole('button',{name:'360°',exact:true}).click();
  await expect(page.locator('canvas')).toHaveAttribute('data-gyro','waiting');
  const pump=await page.evaluate(()=>setInterval(()=>{const e=new Event('deviceorientation');Object.assign(e,{alpha:20,beta:70,gamma:0});window.dispatchEvent(e);},60));
  await expect(page.locator('canvas')).toHaveAttribute('data-gyro','tracking');
  const pitch=()=>page.evaluate(async()=>{const {Euler,Quaternion}=await import('/node_modules/three/build/three.module.js');return new Euler().setFromQuaternion(new Quaternion(...document.querySelector('canvas').dataset.heading.split(',').map(Number)),'YXZ').x;});
  await page.mouse.move(200,300);await page.mouse.down();await page.mouse.move(200,345,{steps:5});
  await page.waitForTimeout(1200);const settled=await pitch();
  await page.waitForTimeout(2200);const held=await pitch();
  await page.evaluate(id=>clearInterval(id),pump);
  const before=await page.locator('canvas').getAttribute('data-heading');
  await page.evaluate(()=>{const e=new Event('deviceorientation');Object.assign(e,{alpha:30,beta:70,gamma:0});window.dispatchEvent(e);});
  await expect.poll(()=>page.locator('canvas').getAttribute('data-heading')).not.toBe(before);
  await page.mouse.up();
  // Recentring has no new permission prompt and restores the vertical reference.
  const again=await page.evaluate(()=>setInterval(()=>{const e=new Event('deviceorientation');Object.assign(e,{alpha:30,beta:70,gamma:0});window.dispatchEvent(e);},60));
  await page.getByRole('button',{name:'Recentrer l’horizon',exact:true}).click();
  await expect.poll(async()=>Math.abs(await pitch())).toBeLessThan(.03);
  await page.evaluate(id=>clearInterval(id),again);
  expect(Math.abs(held-settled)).toBeLessThan(.05);
});
