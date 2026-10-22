import {test,expect} from '@playwright/test';
test('entering gyro stops travel, preserves position and keeps a level view',async({page})=>{
  await page.addInitScript(()=>Object.defineProperty(window,'DeviceOrientationEvent',{configurable:true,value:class extends Event{static async requestPermission(){return 'granted';}}}));
  await page.route('https://api.polyhaven.com/**',r=>r.abort());
  await page.goto('/');
  await page.getByRole('button',{name:'Chaleur douce',exact:true}).click();
  const b=await page.locator('.weather-disk').boundingBox();await page.mouse.click(b.x+b.width/2,b.y+b.height/2);
  await page.getByRole('button',{name:'Entrer dans mon cosmos ↗'}).click();
  const canvas=page.locator('canvas');await expect(canvas).toHaveAttribute('data-cosmos','sensory',{timeout:20000});
  await page.getByRole('button',{name:'360°',exact:true}).click();
  await expect(page.getByRole('button',{name:'Voyager',exact:true})).toBeVisible();
  await expect(canvas).toHaveAttribute('data-gyro','waiting');
  const position=await canvas.getAttribute('data-position');
  const pose=(alpha,beta,gamma)=>page.evaluate(p=>{const e=new Event('deviceorientation');Object.assign(e,p);window.dispatchEvent(e);},{alpha,beta,gamma});
  await pose(20,45,10);await expect(canvas).toHaveAttribute('data-gyro','tracking');
  const before=await canvas.getAttribute('data-heading');
  for(let a=30;a<=110;a+=10){await pose(a,45,10);await page.waitForTimeout(45);}
  await expect.poll(()=>canvas.getAttribute('data-heading')).not.toBe(before);
  expect(await canvas.getAttribute('data-position')).toBe(position);
  const roll=await page.evaluate(async()=>{const {Euler,Quaternion}=await import('/node_modules/three/build/three.module.js');return new Euler().setFromQuaternion(new Quaternion(...document.querySelector('canvas').dataset.heading.split(',').map(Number)),'YXZ').z;});
  expect(Math.abs(roll)).toBeLessThan(.001);
  await expect(canvas).toHaveAttribute('data-phenomena','sunflower');
  const beforeScreen=await canvas.getAttribute('data-heading');
  await page.evaluate(()=>Object.defineProperty(screen.orientation,'angle',{configurable:true,value:90}));
  await pose(110,45,10);
  await page.waitForTimeout(250);
  const jump=await page.evaluate(async previous=>{
    const {Quaternion}=await import('/node_modules/three/build/three.module.js');
    const before=new Quaternion(...previous.split(',').map(Number));
    const after=new Quaternion(...document.querySelector('canvas').dataset.heading.split(',').map(Number));
    return before.angleTo(after);
  },beforeScreen);
  expect(jump).toBeLessThan(.25);
  expect(await canvas.getAttribute('data-position')).toBe(position);
});
test('a pole crossing does not reverse heading and sensor spikes are speed bounded',async({page})=>{
  await page.goto('/');
  const values=await page.evaluate(async()=>{
    const {HorizonGyro,angleDelta,smoothGyroHeading}=await import('/src/weather/HorizonGyro.ts');
    const {Quaternion,Euler}=await import('/node_modules/three/build/three.module.js');
    const h=new HorizonGyro();let last=0,max=0;
    for(const pitch of [0,1.1,1.4,1.55,1.6,1.75,2,2.2]){
      const look=h.update(new Quaternion().setFromEuler(new Euler(pitch,0,0,'YXZ')),0,0);
      max=Math.max(max,Math.abs(angleDelta(look.yaw-last)));last=look.yaw;
    }
    return {max,last,spike:Math.abs(smoothGyroHeading(0,Math.PI,.016))};
  });
  expect(values.max).toBeLessThan(.2);
  expect(values.spike).toBeLessThanOrEqual(2.2*.016);
});
