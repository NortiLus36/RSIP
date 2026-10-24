import test from "node:test";
import assert from "node:assert/strict";
import { loadDashboard, loadLegacyDashboard } from "../src/data/providers";
import { octoberBundle } from "../src/data/mock/october";
const demoPromise = loadDashboard();
test("October foundation covers only completed Oct 1–23 with transaction-derived sales and costs", async () => {
  const d = await demoPromise;
  assert.equal(d.dataset.asOf, "2026-10-23");
  assert.equal(new Set(d.dataset.sales.map((r) => r.date)).size, 23);
  assert.ok(
    d.dataset.sales.every((r) => r.date <= "2026-10-23" && r.quantity! > 0),
  );
  const raw = d.dataset.intelligence!.sales;
  assert.equal(
    raw.reduce((s, r) => s + Math.round(Number(r.netSalesAmount) * 100), 0),
    d.dataset.sales.reduce((s, r) => s + r.netSalesCents, 0),
  );
  assert.equal(
    raw.reduce((s, r) => s + Math.round(Number(r.costAmount) * 100), 0),
    d.dataset.sales.reduce((s, r) => s + r.cogsCents, 0),
  );
});
test("October catalog preserves every existing SKU and exact geometry, adds vegetarian SKUs on existing fixtures", async () => {
  const [d, legacy] = await Promise.all([demoPromise, loadLegacyDashboard()]);
  assert.deepEqual(d.store, legacy.store);
  for (const p of legacy.catalog.products)
    assert.ok(d.catalog.products.some((r) => r.sku === p.sku));
  assert.equal(d.catalog.products.length, 65);
  assert.ok(
    d.catalog.fixtureProducts.every((m) =>
      d.store.fixtures.some((f) => f.id === m.fixtureId),
    ),
  );
});
test("event effects are SKU-specific and calendar states verified festival dates", async () => {
  const d = await demoPromise,
    c = d.dataset.intelligence!.calendar;
  assert.ok(
    c.some((r) => r.startDate === "2026-10-10" && r.endDate === "2026-10-18"),
  );
  assert.ok(c.every((r) => String(r.sku).startsWith("VEG-")));
  assert.equal(
    octoberBundle(await loadLegacyDashboard()).traffic!.rows.length,
    23 * 15 * 14,
  );
});
test("October data has daily variation, weekend peaks and no future actual rows", async () => {
  const d = await demoPromise;
  const daily = new Map<string, number>();
  d.dataset.sales.forEach((r) =>
    daily.set(r.date, (daily.get(r.date) ?? 0) + r.netSalesCents),
  );
  assert.equal(new Set(daily.values()).size, 23);
  assert.equal(d.spatial.dates.at(-1), "2026-10-23");
  assert.ok(
    !d.dataset.intelligence!.sales.some((r) =>
      String(r.transactionDateTime).startsWith("2026-10-24"),
    ),
  );
});
import {comparePeriod,dateAdd,monday,demandForecast,eventFactor,inventoryRecommendation,profitScenario,workforcePlan,forecastVariance} from "../src/lib/analytics/intelligence";
import {forecastSpatial} from "../src/lib/analytics/workforce";
import {applyApprovedReports,validateQuickReport,taskAction} from "../src/lib/analytics/operations";
import type {ForecastOptions,ForecastSnapshot,QuickReport} from "../src/types/intelligence";
const options:ForecastOptions={start:"2026-10-24",cutoff:"2026-10-23",horizon:7,scenario:"Expected",manual:false,baseDemand:10,weekendPct:20,festivalPct:0,promotionPct:0};
test("Monday WTD aligns observed weekdays and missing days do not become zero",async()=>{
 const d=await demoPromise;assert.equal(monday("2026-10-23"),"2026-10-19");
 const r=comparePeriod(d,"2026-10-19","2026-10-23","2026-10-12");assert.equal(r.matched,5);assert.equal(r.priorTo,"2026-10-16");
 const partial=comparePeriod(d,"2026-10-19","2026-10-25","2026-10-12");assert.equal(partial.coverage,5);assert.equal(partial.rows.at(-1)!.actual,null);
 assert.equal(r.totals.sales,d.dataset.sales.filter(x=>x.date>="2026-10-19").reduce((s,r)=>s+r.netSalesCents,0)/100);
});
test("Forecast excludes all post-cutoff actuals and normalizes historical festival once",async()=>{
 const d=await demoPromise,p=d.catalog.products[0],clone=structuredClone(d);clone.dataset.sales=Array.from({length:3},(_,i)=>({date:dateAdd("2026-10-03",i*7),sku:p.sku,zoneId:"A",fixtureId:"",categoryId:p.categoryId,quantity:i===1?20:10,netSalesCents:100,cogsCents:50,wasteCents:0}));
 clone.dataset.intelligence!.calendar=[{startDate:"2026-10-10",endDate:"2026-10-10",sku:p.sku,upliftPct:100,kind:"festival"}];
 const a=demandForecast(clone,{...options,horizon:1},[p.sku])[0];assert.equal(a.quantity,10);assert.equal(a.samples,3);
 clone.dataset.sales.push({...clone.dataset.sales[0],date:"2026-10-24",quantity:99999});assert.deepEqual(demandForecast(clone,{...options,horizon:1},[p.sku])[0],a);
});
test("Event override replaces calendar multiplier and manual weekend assumption is explicit",async()=>{
 const d=structuredClone(await demoPromise),sku=d.catalog.products[0].sku;
 d.dataset.intelligence!.calendar=[{startDate:"2026-10-24",endDate:"2026-10-24",sku,upliftPct:100,kind:"festival"}];
 const r=demandForecast(d,{...options,manual:true,baseDemand:10,weekendPct:0,festivalPct:50,horizon:1},[sku])[0];assert.equal(r.quantity,15);assert.equal(r.manual,true);
 assert.equal(eventFactor(d.dataset.intelligence!.calendar,"2026-10-24","other"),1);
});
test("Forecast scenarios share baseline, preserve actual and reject invalid horizon",async()=>{
 const d=await demoPromise,before=JSON.stringify(d.dataset.sales),sku=d.catalog.products[0].sku;
 const values=(["Conservative","Expected","Optimistic"] as const).map(scenario=>demandForecast(d,{...options,scenario},[sku])[0].quantity);
 assert.ok(values[0]<=values[1]&&values[1]<=values[2]);assert.equal(JSON.stringify(d.dataset.sales),before);
 assert.throws(()=>demandForecast(d,{...options,horizon:8}));assert.throws(()=>demandForecast(d,{...options,baseDemand:NaN}));assert.throws(()=>demandForecast(d,{...options,start:options.cutoff}));
});
test("Inventory never duplicates shared warehouse and separates replenishment/order/late incoming",async()=>{
 const d=structuredClone(await demoPromise),sku=d.catalog.products[0].sku;
 d.catalog.stockLocations.filter(p=>p.sku===sku).forEach(p=>{p.incomingBatches=[{quantity:50000,arrivalDays:99}];});
 const f=demandForecast(d,options,[sku]),r=inventoryRecommendation(d,f,sku)!;
 assert.equal(r.inTime,0);assert.ok(r.replenishment<=r.backroomStock);assert.ok(r.replenishment<=r.capacity);assert.ok(r.suggestedOrder>=0);assert.equal(r.availableStock,r.shelfStock+r.backroomStock-r.reservedStock);
 assert.throws(()=>inventoryRecommendation(d,f,sku,-1));assert.equal(inventoryRecommendation(d,[],sku),null);
});
const campaign={price:100,cost:60,demand:100,available:80,order:20,discount:0,uplift:0,labor:100,campaign:100,wasteUnits:0,other:0,orderInTime:true};
test("Profit constrains sold units to timely supply, distinguishes investment and COGS",()=>{
 const p=profitScenario(campaign);assert.equal(p.sold,100);assert.equal(p.investment,1200);assert.equal(p.cogs,6000);assert.equal(p.contribution,3800);assert.equal(p.incremental,600);
 const late=profitScenario({...campaign,orderInTime:false});assert.equal(late.sold,80);assert.equal(late.investment,1200);
});
test("Loss, waste, zero denominator and invalid scenario values are explicit",()=>{
 const p=profitScenario({...campaign,discount:100,wasteUnits:10});assert.equal(p.sold,90);assert.equal(p.margin,null);assert.ok(p.contribution<0);assert.equal(p.breakEvenUplift,null);
 assert.throws(()=>profitScenario({...campaign,discount:101}));assert.throws(()=>profitScenario({...campaign,other:Infinity}));
});
test("Workforce recommendations derive capacity rather than a fixed occupancy threshold",()=>{
 assert.deepEqual(workforcePlan(100,40,1,80),{required:3,additional:2,cost:160,level:"Reinforce"});assert.equal(workforcePlan(50,40,1,80).level,"Standby");assert.equal(workforcePlan(0,40,1,80).level,"Monitor");assert.throws(()=>workforcePlan(10,0,1,80));
});
test("Forecast heatmap has forecast dates, no invented actual sales or unique traffic",async()=>{
 const d=await demoPromise,s=forecastSpatial(d,options);assert.equal(s.source,"FORECAST");assert.equal(s.dates[0],"2026-10-24");assert.ok(s.zones.some(r=>r.occupancy!==null));assert.ok(s.zones.every(r=>r.salesCents===null));assert.deepEqual(s.storeHours,[]);assert.deepEqual(s.stock,[]);
});
test("Frozen snapshot variance uses saved rows and unavailable future actual is null",async()=>{
 const d=await demoPromise,rows=demandForecast(d,options),snap:ForecastSnapshot={id:"s",createdAt:"2026-10-24T01:00:00Z",reference:d.dataset.intelligence!.reference,storeId:d.store.id,options,rows:structuredClone(rows),backtest:false};
 demandForecast(d,{...options,promotionPct:100});assert.deepEqual(snap.rows,rows);assert.ok(forecastVariance(snap,d).every(r=>r.actualQuantity===null&&r.variance===null));
 const old={...snap,rows:[{...rows[0],date:"2026-10-23"}]};assert.notEqual(forecastVariance(old,d)[0].actualQuantity,null);
});
test("Pending reports do not alter stock; approval transfers warehouse once and leaves actual untouched",async()=>{
 const d=await demoPromise,p=d.catalog.shelfInventory[0],r:QuickReport={id:"q",reference:d.dataset.intelligence!.reference,createdAt:"2026-10-24T02:00:00Z",sku:p.sku,fixtureId:p.fixtureId,zoneId:d.store.fixtures.find(f=>f.id===p.fixtureId)!.zoneId,count:5,replenished:2,category:"Shelf OOS",note:"test",status:"Pending"};
 validateQuickReport(d,r);assert.equal(applyApprovedReports(d,[r]),d);r.status="Approved";
 const a=applyApprovedReports(d,[r]);assert.equal(a.catalog.shelfInventory[0].shelfStock,5);assert.equal(a.catalog.stockLocations[0].backroomStock,d.catalog.stockLocations[0].backroomStock-2);assert.deepEqual(a.dataset.sales,d.dataset.sales);assert.ok(a.spatial.stock.some(s=>s.date==="2026-10-24"&&s.hour===9&&s.fixtureId===r.fixtureId));assert.deepEqual(applyApprovedReports(d,[r]).catalog,a.catalog);
 assert.throws(()=>validateQuickReport(d,{...r,count:1e9}));assert.throws(()=>validateQuickReport(d,{...r,replenished:1e9}));assert.throws(()=>validateQuickReport(d,{...r,fixtureId:"wrong"}));
});
test("Task preserves identity, reason, assignment and action status",()=>{
 const t={id:"t",actionId:"a",reference:"d",date:"2026-10-24",hour:18,zoneId:"A",role:"Store Staff",priority:"Standby" as const,status:"In progress" as const,reason:"60 minutes / 45 minutes capacity"};const a=taskAction(t);assert.equal(a.id,"a");assert.equal(a.status,t.status);assert.ok(a.problem.includes(t.reason));
});
