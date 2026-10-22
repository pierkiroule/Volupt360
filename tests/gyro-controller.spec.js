import {test,expect} from '@playwright/test';
test('rolling a tilted phone does not change where its camera looks',async({page})=>{
  await page.goto('/');
  const drift=await page.evaluate(async()=>{
    const {HorizonGyro}=await import('/src/weather/HorizonGyro.ts');
    const {Euler,Quaternion}=await import('/node_modules/three/build/three.module.js');
    const tracker=new HorizonGyro();let drift=0;
    for(let i=0;i<=90;i++){
      const q=new Quaternion().setFromEuler(new Euler(.65,.4,i/90*Math.PI,'YXZ'));
      const result=tracker.update(q,.4,.2,i*20);
      drift=Math.max(drift,Math.abs(result.yaw-.4));
    }
    return drift;
  });
  expect(drift).toBeLessThan(.001);
});
test('continuous yaw turns remain complete across heading wrap and pole crossings',async({page})=>{
  await page.goto('/');
  const result=await page.evaluate(async()=>{
    const {HorizonGyro}=await import('/src/weather/HorizonGyro.ts');
    const {Euler,Quaternion}=await import('/node_modules/three/build/three.module.js');
    const tracker=new HorizonGyro();
    for(let i=0;i<=360;i++)tracker.update(new Quaternion().setFromEuler(new Euler(.5,i/180*Math.PI,Math.sin(i*.05)*.4,'YXZ')),0,0,i*20);
    const full=tracker.yaw;
    const pole=new HorizonGyro();let max=0;
    for(let i=0;i<=180;i++){
      const p=pole.update(new Quaternion().setFromEuler(new Euler(i/180*Math.PI,0,0,'YXZ')),0,0,i*20);
      max=Math.max(max,Math.abs(p.yaw));
    }
    return {full,max};
  });
  expect(result.full).toBeCloseTo(Math.PI*2,2);expect(result.max).toBeLessThan(.01);
});
test('a compass reset or suspended stream reanchors to the visible view',async({page})=>{
  await page.goto('/');
  const values=await page.evaluate(async()=>{
    const {HorizonGyro}=await import('/src/weather/HorizonGyro.ts');
    const {Euler,Quaternion}=await import('/node_modules/three/build/three.module.js');
    const tracker=new HorizonGyro(),q=y=>new Quaternion().setFromEuler(new Euler(.2,y,0,'YXZ'));
    tracker.update(q(0),.1,.2,0);tracker.update(q(.02),.1,.2,20);
    const normal=tracker.yaw;
    tracker.update(q(2),normal,.2,40);const spike=tracker.yaw;
    tracker.update(q(-1),.35,.2,3000);const resumed=tracker.yaw;
    return {normal,spike,resumed};
  });
  expect(values.normal).toBeGreaterThan(.1);expect(values.spike).toBeCloseTo(values.normal,6);expect(values.resumed).toBeCloseTo(.35,6);
});
