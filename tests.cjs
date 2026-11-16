/* Run with Node 18+: node tests.cjs. No dependencies. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
async function run(){
const root=__dirname,ctx={crypto:require('node:crypto').webcrypto,structuredClone,Blob,TextEncoder,console};vm.createContext(ctx);for(const file of ['core.js','exports.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});const C=ctx.FlowCore,X=ctx.FlowExport;let passed=0;const check=(name,fn)=>{try{fn();passed++;}catch(e){throw Error(name+': '+e.message,{cause:e});}};
const task=(id,start='2026-11-16',end='2026-11-17',deps=[])=>({id,name:id,start,end,deps,color:'#7455d8',status:'未開始',progress:0,owner:'Alex',notes:'',hours:8});
const project=ts=>({id:'p',name:'專案',groups:[{id:'g',name:'群組',tasks:ts,collapsed:false}]});
const fresh=ts=>C.normalize({version:1,projects:[project(ts)]});
const calendar=C.defaults(),work={...C.defaults(),useWorkdays:true,holidays:['2026-11-17']};
check('Sunday and year boundaries',()=>{for(const [d,label]of [['2026-01-01','W601'],['2026-01-03','W601'],['2026-01-04','W602'],['2026-12-31','W653'],['2027-01-01','W701'],['2027-01-03','W702']])assert.equal(C.period(C.date(d),'week').label,label);});
check('ten-day month quarter leap year',()=>{for(const [d,mode,label]of [['2026-11-10','submonth','M611 B'],['2026-11-11','submonth','M611 M'],['2026-11-21','submonth','M611 E'],['2028-02-29','month','M802'],['2027-01-01','quarter','Q71']])assert.equal(C.period(C.date(d),mode).label,label);assert.equal(C.iso(C.period(C.date('2028-02-29'),'submonth').b),'2028-03-01');});
check('legacy data migrate',()=>{const t=task('a');delete t.deps;delete t.hours;const d=fresh([t]);assert.equal(d.version,2);assert.equal(d.projects[0].groups[0].tasks[0].hours,8);assert.equal(d.templates.length,0);});
check('unscheduled accepts empty dates',()=>assert.equal(fresh([task('a','','')]).projects[0].groups[0].tasks[0].start,''));
check('end without start rejects',()=>assert.throws(()=>fresh([task('a','','2026-11-17')])));
check('invalid leap day rejects',()=>assert.throws(()=>fresh([task('a','2027-02-29','')])));
check('date bounds reject',()=>assert.throws(()=>fresh([task('a','2200-01-01','')])));
check('cycle rejects',()=>assert.throws(()=>fresh([task('a',undefined,undefined,['b']),task('b',undefined,undefined,['a'])])));
check('missing dependency rejects',()=>assert.throws(()=>fresh([task('a',undefined,undefined,['missing'])])));
check('duplicate IDs reject',()=>assert.throws(()=>fresh([task('a'),task('a')])));
check('invalid color rejects',()=>{const t=task('a');t.color='red';assert.throws(()=>fresh([t]));});
check('no working days rejects',()=>{const d=fresh([task('a')]);d.settings.workdays=[];assert.throws(()=>C.normalize(d));});
check('calendar shift',()=>assert.equal(C.shift('2026-11-16',-2,calendar),'2026-11-14'));
check('holiday shift',()=>assert.equal(C.shift('2026-11-16',1,work),'2026-11-18'));
check('weekend skip',()=>assert.equal(C.shift('2026-11-20',1,work),'2026-11-23'));
check('negative workday shift',()=>assert.equal(C.shift('2026-11-23',-1,work),'2026-11-20'));
check('duration preserved across workdays',()=>{const t=task('a','2026-11-18','2026-11-20');C.moveTo(t,'2026-11-20',work);assert.equal(t.end,'2026-11-24');});
check('dependency cascade',()=>{const p=project([task('a','2026-11-16','2026-11-18'),task('b','2026-11-16','2026-11-17',['a']),task('c','2026-11-16','',['b'])]);assert.equal(C.schedule(p,calendar),2);assert.equal(p.groups[0].tasks[1].start,'2026-11-19');assert.equal(p.groups[0].tasks[1].end,'2026-11-20');assert.equal(p.groups[0].tasks[2].start,'2026-11-21');});
check('dependency holiday and weekend',()=>{const p=project([task('a','2026-11-19','2026-11-20'),task('b','2026-11-16','',['a'])]);C.schedule(p,work);assert.equal(p.groups[0].tasks[1].start,'2026-11-23');});
check('unscheduled predecessor warns',()=>{const p=project([task('a','',''),task('b',undefined,undefined,['a'])]);assert.equal(C.schedule(p,calendar),0);assert.ok(C.warnings(p,calendar).some(w=>w.text.includes('未排程')));});
check('unscheduled successor stays undated',()=>{const p=project([task('a'),task('b','','',['a'])]);C.schedule(p,calendar);assert.equal(p.groups[0].tasks[1].start,'');});
check('does not pull earlier',()=>{const p=project([task('a'),task('b','2026-12-01','',['a'])]);C.schedule(p,calendar);assert.equal(p.groups[0].tasks[1].start,'2026-12-01');});
check('baseline remains stable',()=>{const p=project([task('a')]);C.captureBaseline(p,'2026-11-16');p.groups[0].tasks[0].end='2026-11-20';assert.equal(C.variance(p.groups[0].tasks[0],p),3);assert.equal(p.baseline.tasks.a.end,'2026-11-17');});
check('copy remaps dependencies and baseline',()=>{const p=project([task('a'),task('b',undefined,undefined,['a'])]);C.captureBaseline(p,'now');const q=C.cloneProject(p);assert.notEqual(q.id,p.id);assert.equal(q.groups[0].tasks[1].deps[0],q.groups[0].tasks[0].id);assert.ok(q.baseline.tasks[q.groups[0].tasks[0].id]);});
check('group copy internal and external dependencies',()=>{const g={id:'g',name:'g',tasks:[task('a',undefined,undefined,['outside']),task('b',undefined,undefined,['a'])]},q=C.cloneGroup(g);assert.equal(q.tasks[1].deps[0],q.tasks[0].id);assert.equal(q.tasks[0].deps[0],'outside');});
check('delete cleans dependency links',()=>{const p=project([task('a'),task('b',undefined,undefined,['a'])]);C.removeTasks(p,new Set(['a']));assert.equal(C.all(p).length,1);assert.equal(C.all(p)[0].deps.length,0);});
check('workload detects daily overload excludes done and holiday',()=>{const p=project([task('a','2026-11-16','2026-11-18'),task('b','2026-11-16','2026-11-16'),{...task('done'),status:'已完成'}]),l=C.workload([p],work);assert.equal(l.owners.get('Alex').get('2026-11-16').hours,16);assert.equal(l.owners.get('Alex').has('2026-11-17'),false);assert.equal(l.owners.get('Alex').get('2026-11-18').hours,8);});
check('xlsx uses literal strings against formula injection',()=>{const sheets=X.projectSheets([project([{...task('a'),name:'=HYPERLINK("x")'}])],calendar);assert.equal(sheets[0].rows[1][2],'=HYPERLINK("x")');assert.ok(sheets[1].rows.length>1);});
const blob=X.workbook(X.projectSheets([project([task('a'),task('b',undefined,undefined,['a'])])],calendar));const bytes=Buffer.from(await blob.arrayBuffer());check('xlsx zip signatures',()=>{assert.equal(bytes.readUInt32LE(0),0x04034b50);assert.equal(bytes.readUInt32LE(bytes.length-22),0x06054b50);});
const entries={};for(let i=0;bytes.readUInt32LE(i)===0x04034b50;){const size=bytes.readUInt32LE(i+18),len=bytes.readUInt16LE(i+26),extra=bytes.readUInt16LE(i+28),name=bytes.subarray(i+30,i+30+len).toString(),start=i+30+len+extra;entries[name]=bytes.subarray(start,start+size).toString();i=start+size;}
check('xlsx required files and escaped Chinese',()=>{assert.ok(entries['xl/workbook.xml'].includes('任務清單'));assert.ok(entries['xl/worksheets/sheet1.xml'].includes('專案'));assert.equal(Object.keys(entries).length,7);});
// App integration in a deterministic DOM stub; this does not replace browser QA.
const els=new Map();function el(s){if(!els.has(s))els.set(s,{value:'',style:{setProperty(){}},dataset:{},clientWidth:1200,scrollHeight:500,offsetTop:100,innerHTML:'',textContent:'',getBoundingClientRect(){return {width:330,left:0}},addEventListener(){},append(){},prepend(){},focus(){},showModal(){this.open=true},close(){this.open=false}});return els.get(s);}
Object.assign(ctx,{location:{hash:''},localStorage:{getItem(){return null},setItem(){}},document:{querySelector:el,querySelectorAll(){return []},addEventListener(){},createElement(){return el('new')},createElementNS(){return {...el('svg'),setAttribute(){}}}},window:{addEventListener(){},history:{replaceState(){}},print(){}},setTimeout(){return 1},clearTimeout(){},confirm(){return true}});
vm.runInContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),ctx,{filename:'app.js'});
function app(code){return vm.runInContext(code,ctx);}
check('app empty boot',()=>assert.ok(el('#title').textContent.includes('第一個')));
check('app cross-year timeline render and collapse',()=>{ctx.fixture=project([task('a','2026-12-28','2027-01-06')]);app("change(()=>{db.projects.push(fixture);active='p';});");assert.equal(app('timeline.cols.length'),3);app('project().groups[0].collapsed=true;render();');assert.ok(el('#grid').innerHTML.includes('data-bar="a"'));});
check('app undo redo',()=>{app('travel(history,future)');assert.equal(app('db.projects.length'),0);app('travel(future,history)');assert.equal(app('db.projects.length'),1);});
check('app cycle rollback transaction',()=>{const before=app('JSON.stringify(db)');assert.equal(app("change(()=>{tasks(project())[0].deps=['a'];})"),false);assert.equal(app('JSON.stringify(db)'),before);});
check('app baseline date range',()=>{app("change(()=>{C.captureBaseline(project(),'now');tasks(project())[0].start='2027-02-01';tasks(project())[0].end='2027-02-02';});");assert.equal(app('iso(timeline.min)'),'2026-12-28');});
check('app two-tier submonth header',()=>{app("scale='submonth';render();");assert.ok(el('#grid').innerHTML.includes('monthHeaders'));assert.ok(el('#grid').innerHTML.includes('>M612</div>'));assert.ok(el('#grid').innerHTML.includes('>E</div>'));});
check('app unscheduled lane',()=>{app("change(()=>{tasks(project())[0].start='';tasks(project())[0].end='';});");assert.ok(el('#unscheduled').innerHTML.includes('data-backlog="a"'));});
check('app overview and workload render',()=>{app("view='overview';render();");assert.ok(el('#grid').innerHTML.includes('專案 / 里程碑'));app("view='workload';render();");assert.ok(el('#special').innerHTML.includes('尚無可計算'));});
check('app palette preserves custom color',()=>{assert.ok(app("colorPalette('#123456')").includes('value="#123456"'));assert.equal((app('colorPalette()').match(/type="radio"/g)||[]).length,13);});
check('template anchor aligns working-day offsets',()=>{ctx.copyFixture=project([task('a','2026-11-16','2026-11-18'),task('b','2026-11-20','')]);app("db.settings.useWorkdays=true;shiftCopy(copyFixture,'2026-12-07');");assert.equal(ctx.copyFixture.groups[0].tasks[0].start,'2026-12-07');assert.equal(ctx.copyFixture.groups[0].tasks[0].end,'2026-12-09');assert.equal(ctx.copyFixture.groups[0].tasks[1].start,'2026-12-11');});
check('long daily timeline coarsens safely',()=>{ctx.longTasks=[task('a','1900-01-01','2199-12-31')];app("scale='day';makeTimeline(longTasks);");assert.equal(app('scale'),'quarter');});
check('file write serializes and clears pending state',()=>{assert.equal(typeof app('writeFile'),'function');assert.equal(app('pendingWrites'),0);});
check('unsupported-range dependency warns without crashing',()=>{const p=project([task('a','2199-12-31',''),task('b','','',['a'])]);assert.ok(C.warnings(p,calendar).length);assert.equal(C.schedule(p,calendar),0);});
// Exercise form submissions and atomic rollback using the same handlers as the UI.
ctx.FormData=class{constructor(target){this.entries=target.entries;}[Symbol.iterator](){return this.entries[Symbol.iterator]();}getAll(k){return this.entries.filter(([key])=>key===k).map(([,v])=>v);}has(k){return this.entries.some(([key])=>key===k);}};
function submit(data){ctx.eventFixture={preventDefault(){},target:{entries:Object.entries(data)}};app("document.querySelector('#form').onsubmit(eventFixture)");}
check('task form saves dependency and custom color',()=>{app("view='project';active='p';db.settings.useWorkdays=false;editing={kind:'task',gid:'g',tid:'a'};");submit({name:'新任務',group:'g',start:'2026-11-16',end:'2026-11-18',owner:'A',status:'進行中',progress:'25',hours:'4',color:'#2563eb',notes:'測試'});assert.equal(app("tasks(project())[0].color"),'#2563eb');assert.equal(app('tasks(project())[0].hours'),4);});
check('batch shifts and updates owner progress color',()=>{app("selected=new Set(['a']);editing={kind:'batch'};");submit({shift:'2',owner:'B',status:'進行中',progress:'60',group:'',color:'#16a34a'});assert.equal(app('tasks(project())[0].start'),'2026-11-18');assert.equal(app('tasks(project())[0].end'),'2026-11-20');assert.equal(app('tasks(project())[0].progress'),60);assert.equal(app('tasks(project())[0].owner'),'B');});
check('invalid settings roll back completely',()=>{const before=app('JSON.stringify(db)');app("editing={kind:'settings'};");submit({holidays:'bad-date',hoursPerDay:'8'});assert.equal(app('JSON.stringify(db)'),before);});
check('baseline toggle leaves original dates intact',()=>{app("C.captureBaseline(project(),'now');project().showBaseline=false;render();");assert.ok(!el('#grid').innerHTML.includes('class="baselineBar"'));assert.ok(app('project().baseline.tasks.a.start'));});
check('template submission remaps identities',()=>{app("editing={kind:'saveTemplate'};");submit({name:'Reusable'});assert.equal(app('db.templates.length'),1);assert.notEqual(app('tasks(db.templates[0])[0].id'),'a');assert.equal(app('tasks(db.templates[0])[0].progress'),0);});
// Verify actual asynchronous write ordering, not just helper presence.
const writes=[];let inFlight=0,maxInFlight=0;ctx.handleFixture={name:'test.json',async createWritable(){inFlight++;maxInFlight=Math.max(maxInFlight,inFlight);return {async write(payload){await Promise.resolve();writes.push(JSON.parse(payload));},async close(){inFlight--;},async abort(){inFlight--;}};}};
app('fileHandle=handleFixture;');const first=app('writeFile()');app("db.projects[0].name='after';");const second=app('writeFile()');await Promise.all([first,second]);
check('local file writes stay ordered',()=>{assert.equal(writes.length,2);assert.notEqual(writes[0].projects[0].name,writes[1].projects[0].name);assert.equal(writes[1].projects[0].name,'after');assert.equal(maxInFlight,1);assert.equal(app('pendingWrites'),0);assert.equal(app('fileTimer'),null);});
ctx.failHandle={name:'fail.json',async createWritable(){throw Error('permission denied');}};app('fileHandle=failHandle');await app('writeFile()');
check('file permission failure preserves browser state',()=>{assert.equal(app('fileHandle'),null);assert.equal(app('db.projects[0].name'),'after');assert.equal(app('pendingWrites'),0);assert.ok(el('#fileState').textContent.includes('同步失敗'));});
return {passed,xlsx:bytes,entries};
}
module.exports=run;
if(require.main===module)run().then(r=>console.log(`${r.passed} checks passed`)).catch(e=>{console.error(e);process.exitCode=1;});
