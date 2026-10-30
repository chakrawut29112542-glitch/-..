const KEY="tuition_registry_w257_v1";
let db = JSON.parse(localStorage.getItem(KEY) || "null") || {rights:[], children:[], claims:[], rates:DEFAULT_RATES.map(x=>({...x}))};

const $=id=>document.getElementById(id);
const money=n=>Number(n||0).toLocaleString("th-TH",{minimumFractionDigits:2,maximumFractionDigits:2});
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
function save(){localStorage.setItem(KEY,JSON.stringify(db)); renderAll();}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function modal(title,body){$("modalTitle").textContent=title;$("modalBody").innerHTML=body;$("modal").classList.add("show")}
function closeModal(){$("modal").classList.remove("show")}
$("modal").addEventListener("click",e=>{if(e.target.id==="modal")closeModal()});

document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".panel").forEach(x=>x.classList.remove("active"));b.classList.add("active");$(b.dataset.tab).classList.add("active")});

function renderAll(){renderStats();renderDashboard();renderRights();renderChildren();renderClaims();renderRates()}
function renderStats(){
 $("statRights").textContent=db.rights.length;$("statChildren").textContent=db.children.length;$("statClaims").textContent=db.claims.length;
 $("statTotal").textContent=money(db.claims.reduce((a,c)=>a+Number(c.claim||0),0))+" บาท";
 $("statOver").textContent=db.children.filter(c=>getSummary(c.id).status==="เกินอัตรา").length;
}
function getRate(child){
 let exact=db.rates.find(r=>r.type===child.schoolType&&r.level===child.level&&r.subsidy===child.subsidy&&(!r.field||r.field===child.field));
 if(exact)return exact;
 return db.rates.find(r=>r.type===child.schoolType&&r.level===child.level&&r.subsidy===child.subsidy&&(!r.field||!child.field)) || null;
}
function getSummary(childId,year){
 const child=db.children.find(c=>c.id===childId); if(!child)return {cap:0,paid:0,claim:0,balance:0,status:""};
 const rate=getRate(child); const cap=Number(rate?.cap||0);
 const claims=db.claims.filter(c=>c.childId===childId && (!year||c.year===year));
 const claim=claims.reduce((a,c)=>a+Number(c.claim||0),0);
 const paid=claims.reduce((a,c)=>a+Number(c.paid||0),0);
 const eligible=rate?.method?.startsWith("50%") ? Math.min(cap,paid/2) : Math.min(cap,paid);
 const balance=cap-claim;
 const status=claim>cap ? "เกินอัตรา" : (cap>0 && claim>=cap*.8 ? "ใกล้เต็ม":"ปกติ");
 return {cap,paid,claim,balance,status,eligible,rate};
}
function badge(s){return `<span class="badge ${s==="เกินอัตรา"?"over":s==="ใกล้เต็ม"?"warn":"ok"}">${esc(s)}</span>`}

function renderDashboard(){
 const q=($("globalSearch").value||"").toLowerCase(), sf=$("statusFilter").value;
 const rows=[];
 db.children.forEach(ch=>{
   const r=db.rights.find(x=>x.id===ch.rightId), s=getSummary(ch.id);
   const text=[r?.name,ch.name,ch.school,ch.level].join(" ").toLowerCase();
   if(q&&!text.includes(q))return;if(sf&&s.status!==sf)return;
   const latest=db.claims.filter(c=>c.childId===ch.id).sort((a,b)=>b.date.localeCompare(a.date))[0];
   rows.push(`<tr><td>${esc(r?.name||"-")}</td><td>${esc(ch.name)}</td><td>${esc(ch.school)}</td><td>${esc(latest?.year||"-")} / ${esc(latest?.term||"-")}</td><td>${money(s.cap)}</td><td>${money(s.claim)}</td><td>${money(s.balance)}</td><td>${badge(s.status)}</td><td><button class="action" title="เพิ่มรายการเบิก" onclick="openClaimModal('${ch.id}')">➕</button></td></tr>`);
 });
 $("dashboardBody").innerHTML=rows.join("")||`<tr><td colspan="9" class="empty">ยังไม่มีข้อมูล</td></tr>`;
}
function renderRights(){
 $("rightsBody").innerHTML=db.rights.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.name)}</td><td>${esc(r.org||"")}</td><td>${esc(r.position||"")}</td><td>${db.children.filter(c=>c.rightId===r.id).length}</td><td><button class="action" onclick="openRightModal('${r.id}')">✏️</button><button class="action" onclick="delRight('${r.id}')">🗑️</button></td></tr>`).join("")||`<tr><td colspan="6" class="empty">ยังไม่มีข้อมูล</td></tr>`;
}
function renderChildren(){
 $("childrenBody").innerHTML=db.children.map(c=>`<tr><td>${esc(db.rights.find(r=>r.id===c.rightId)?.name||"-")}</td><td>${esc(c.name)}</td><td>${esc(c.school)}</td><td>${esc(c.schoolType)} / ${esc(c.subsidy)}</td><td>${esc(c.level)}</td><td>${esc(c.classLevel||"")} ${c.field?"/ "+esc(c.field):""}</td><td><button class="action" onclick="openChildModal('${c.id}')">✏️</button><button class="action" onclick="delChild('${c.id}')">🗑️</button></td></tr>`).join("")||`<tr><td colspan="7" class="empty">ยังไม่มีข้อมูล</td></tr>`;
}
function renderClaims(){
 $("claimsBody").innerHTML=db.claims.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(c=>{
  const ch=db.children.find(x=>x.id===c.childId),r=db.rights.find(x=>x.id===ch?.rightId),s=getSummary(c.childId,c.year);
  const maxThis=Math.max(0,s.eligible-(db.claims.filter(x=>x.childId===c.childId&&x.year===c.year&&x.id!==c.id).reduce((a,x)=>a+Number(x.claim||0),0)));
  const st=Number(c.claim)>maxThis?"เกินอัตรา": "ปกติ";
  return `<tr><td>${esc(c.date)}</td><td>${esc(r?.name||"-")}</td><td>${esc(ch?.name||"-")}</td><td>${esc(c.year)}/${esc(c.term)}</td><td>${money(c.paid)}</td><td>${money(maxThis)}</td><td>${money(c.claim)}</td><td>${badge(st)}</td><td><button class="action" onclick="openClaimModal(null,'${c.id}')">✏️</button><button class="action" onclick="delClaim('${c.id}')">🗑️</button></td></tr>`
 }).join("")||`<tr><td colspan="9" class="empty">ยังไม่มีรายการ</td></tr>`;
}
function renderRates(){
 $("ratesBody").innerHTML=db.rates.map(r=>`<tr><td>${esc(r.type)}</td><td>${esc(r.level)}</td><td>${esc(r.subsidy)}</td><td>${esc(r.field)}</td><td>${money(r.cap)}</td><td>${esc(r.method)}</td><td>${esc(r.ref)}</td><td><button class="action" onclick="openRateModal('${r.id}')">✏️</button></td></tr>`).join("");
}

function openRightModal(id){
 const r=db.rights.find(x=>x.id===id)||{name:"",org:"",position:""};
 modal(id?"แก้ไขผู้มีสิทธิ":"เพิ่มผู้มีสิทธิ",`<form class="form" onsubmit="saveRight(event,'${id||""}')">
 <div class="field full"><label>ชื่อ-สกุลผู้มีสิทธิ *</label><input name="name" required value="${esc(r.name)}"></div>
 <div class="field"><label>หน่วยงาน</label><input name="org" value="${esc(r.org)}"></div>
 <div class="field"><label>ตำแหน่ง</label><input name="position" value="${esc(r.position)}"></div>
 <div class="form-actions"><button type="button" class="btn light" onclick="closeModal()">ยกเลิก</button><button class="btn">บันทึก</button></div></form>`);
}
function saveRight(e,id){e.preventDefault();const f=new FormData(e.target);const x={id:id||uid(),name:f.get("name"),org:f.get("org"),position:f.get("position")};if(id)db.rights[db.rights.findIndex(r=>r.id===id)]=x;else db.rights.push(x);save();closeModal()}
function delRight(id){if(db.children.some(c=>c.rightId===id))return alert("ลบไม่ได้ เพราะมีทะเบียนบุตรที่ผูกกับผู้มีสิทธิรายนี้");if(confirm("ยืนยันการลบ?")){db.rights=db.rights.filter(r=>r.id!==id);save()}}

function openChildModal(id){
 const c=db.children.find(x=>x.id===id)||{rightId:"",name:"",school:"",schoolType:"ราชการ",subsidy:"-",level:"ประถมศึกษาหรือเทียบเท่า",classLevel:"",field:""};
 const rights=db.rights.map(r=>`<option value="${r.id}" ${r.id===c.rightId?"selected":""}>${esc(r.name)}</option>`).join("");
 modal(id?"แก้ไขบุตร":"เพิ่มบุตร",`<form class="form" onsubmit="saveChild(event,'${id||""}')">
 <div class="field full"><label>ผู้มีสิทธิ *</label><select name="rightId" required><option value="">-- เลือก --</option>${rights}</select></div>
 <div class="field"><label>ชื่อ-สกุลบุตร *</label><input name="name" required value="${esc(c.name)}"></div>
 <div class="field"><label>โรงเรียน *</label><input name="school" required value="${esc(c.school)}"></div>
 <div class="field"><label>ประเภทสถานศึกษา</label><select name="schoolType"><option ${c.schoolType==="ราชการ"?"selected":""}>ราชการ</option><option ${c.schoolType==="เอกชน"?"selected":""}>เอกชน</option></select></div>
 <div class="field"><label>รับเงินอุดหนุน</label><select name="subsidy"><option ${c.subsidy==="-"?"selected":""}>-</option><option ${c.subsidy==="รับเงินอุดหนุน"?"selected":""}>รับเงินอุดหนุน</option><option ${c.subsidy==="ไม่รับเงินอุดหนุน"?"selected":""}>ไม่รับเงินอุดหนุน</option><option ${c.subsidy==="ทุกกรณี"?"selected":""}>ทุกกรณี</option></select></div>
 <div class="field"><label>ระดับ/หลักสูตร *</label><select name="level" required>
  ${["อนุบาลหรือเทียบเท่า","ประถมศึกษาหรือเทียบเท่า","มัธยมศึกษาตอนต้นหรือเทียบเท่า","มัธยมศึกษาตอนปลายหรือเทียบเท่า","ปวช.หรือเทียบเท่า","อนุปริญญาหรือเทียบเท่า","ปวส./ปวท.หรือเทียบเท่า","ปริญญาตรี"].map(x=>`<option ${x===c.level?"selected":""}>${x}</option>`).join("")}</select></div>
 <div class="field"><label>ชั้น/หลักสูตร</label><input name="classLevel" value="${esc(c.classLevel)}"></div>
 <div class="field full"><label>ประเภทวิชา/สายวิชา (กรณีอาชีวศึกษา)</label><input name="field" value="${esc(c.field)}" placeholder="เช่น พาณิชยกรรม/บริหารธุรกิจ"></div>
 <div class="form-actions"><button type="button" class="btn light" onclick="closeModal()">ยกเลิก</button><button class="btn">บันทึก</button></div></form>`);
}
function saveChild(e,id){e.preventDefault();const f=new FormData(e.target);const x={id:id||uid(),rightId:f.get("rightId"),name:f.get("name"),school:f.get("school"),schoolType:f.get("schoolType"),subsidy:f.get("subsidy"),level:f.get("level"),classLevel:f.get("classLevel"),field:f.get("field")};if(!getRate(x))alert("⚠️ ยังไม่พบอัตราตรงกับข้อมูลนี้ ระบบจะให้เพดานเป็น 0 จนกว่าจะกำหนดอัตรา");if(id)db.children[db.children.findIndex(c=>c.id===id)]=x;else db.children.push(x);save();closeModal()}
function delChild(id){if(db.claims.some(c=>c.childId===id))return alert("ลบไม่ได้ เพราะมีรายการเบิกผูกอยู่");if(confirm("ยืนยันการลบ?")){db.children=db.children.filter(c=>c.id!==id);save()}}

function openClaimModal(childId=null,claimId=null){
 const old=db.claims.find(x=>x.id===claimId)||{childId:childId||"",date:new Date().toISOString().slice(0,10),year:String(new Date().getFullYear()+543),term:"1",paid:"",claim:""};
 const opts=db.children.map(c=>`<option value="${c.id}" ${c.id===old.childId?"selected":""}>${esc(c.name)} — ${esc(c.school)}</option>`).join("");
 modal(claimId?"แก้ไขรายการเบิก":"เพิ่มรายการเบิก",`<form class="form" onsubmit="saveClaim(event,'${claimId||""}')">
 <div class="field full"><label>บุตร *</label><select name="childId" required onchange="previewClaimLimit(this.value,'limitBox')"><option value="">-- เลือก --</option>${opts}</select></div>
 <div id="limitBox" class="notice full">เลือกบุตรเพื่อดูอัตรา</div>
 <div class="field"><label>วันที่เบิก *</label><input type="date" name="date" required value="${esc(old.date)}"></div>
 <div class="field"><label>ปีการศึกษา *</label><input name="year" required value="${esc(old.year)}" placeholder="เช่น 2569"></div>
 <div class="field"><label>ภาคเรียน</label><select name="term"><option ${old.term==="1"?"selected":""}>1</option><option ${old.term==="2"?"selected":""}>2</option><option ${old.term==="ทั้งปี"?"selected":""}>ทั้งปี</option></select></div>
 <div class="field"><label>จำนวนที่จ่ายจริง *</label><input type="number" step="0.01" min="0" name="paid" required value="${esc(old.paid)}"></div>
 <div class="field"><label>จำนวนที่ขอเบิก *</label><input type="number" step="0.01" min="0" name="claim" required value="${esc(old.claim)}"></div>
 <div class="field full"><label>หมายเหตุ</label><input name="note" value="${esc(old.note||"")}"></div>
 <div class="form-actions"><button type="button" class="btn light" onclick="closeModal()">ยกเลิก</button><button class="btn">บันทึก</button></div></form>`);
 if(old.childId)previewClaimLimit(old.childId,"limitBox");
}
function previewClaimLimit(cid,target){
 const ch=db.children.find(c=>c.id===cid), box=$(target);if(!ch){box.textContent="เลือกบุตรเพื่อดูอัตรา";return}
 const s=getSummary(cid), rate=s.rate;
 box.innerHTML=rate?`อัตรา: <b>${money(s.cap)} บาท/ปี</b> · วิธี: ${esc(rate.method)} · เบิกสะสมแล้ว: <b>${money(s.claim)} บาท</b> · คงเหลือ: <b>${money(s.balance)} บาท</b>`:"⚠️ ไม่พบอัตราที่ตรงกัน กรุณาตรวจข้อมูลหรือเพิ่มอัตรา";
}
function saveClaim(e,id){
 e.preventDefault();const f=new FormData(e.target);const x={id:id||uid(),childId:f.get("childId"),date:f.get("date"),year:f.get("year"),term:f.get("term"),paid:Number(f.get("paid")||0),claim:Number(f.get("claim")||0),note:f.get("note")};
 const ch=db.children.find(c=>c.id===x.childId), s=getSummary(x.childId,x.year);
 const previous=db.claims.filter(c=>c.childId===x.childId&&c.year===x.year&&c.id!==id).reduce((a,c)=>a+Number(c.claim||0),0);
 const rate=getRate(ch);const eligible=rate?.method?.startsWith("50%")?Math.min(Number(rate.cap||0),x.paid/2):Math.min(Number(rate?.cap||0),x.paid);
 if(x.claim>eligible || previous+x.claim>(Number(rate?.cap||0))) {
   if(!confirm(`รายการนี้อาจเกินอัตราที่กำหนด\nเพดาน: ${money(rate?.cap||0)} บาท\nยอดเดิมปีนี้: ${money(previous)} บาท\nขอเบิกครั้งนี้: ${money(x.claim)} บาท\nต้องการบันทึกไว้เพื่อแก้ไขหรือไม่?`))return;
 }
 if(id)db.claims[db.claims.findIndex(c=>c.id===id)]=x;else db.claims.push(x);save();closeModal();
}
function delClaim(id){if(confirm("ยืนยันการลบรายการเบิก?")){db.claims=db.claims.filter(c=>c.id!==id);save()}}

function openRateModal(id){
 const r=db.rates.find(x=>x.id===id)||{type:"เอกชน",level:"",subsidy:"ทุกกรณี",field:"",cap:"",method:"จ่ายจริงไม่เกินเพดาน",ref:"กำหนดเอง"};
 modal(id?"แก้ไขอัตรา":"เพิ่มอัตรา",`<form class="form" onsubmit="saveRate(event,'${id||""}')">
 <div class="field"><label>ประเภทสถานศึกษา</label><select name="type"><option ${r.type==="ราชการ"?"selected":""}>ราชการ</option><option ${r.type==="เอกชน"?"selected":""}>เอกชน</option></select></div>
 <div class="field"><label>ระดับ/หลักสูตร</label><input name="level" required value="${esc(r.level)}"></div>
 <div class="field"><label>สถานะเงินอุดหนุน</label><input name="subsidy" value="${esc(r.subsidy)}"></div>
 <div class="field"><label>สายวิชา</label><input name="field" value="${esc(r.field)}"></div>
 <div class="field"><label>เพดานต่อปี (บาท)</label><input type="number" step="0.01" min="0" name="cap" required value="${esc(r.cap)}"></div>
 <div class="field"><label>วิธีคำนวณ</label><select name="method"><option ${r.method==="จ่ายจริงไม่เกินเพดาน"?"selected":""}>จ่ายจริงไม่เกินเพดาน</option><option ${r.method==="50% ของจ่ายจริง ไม่เกินเพดาน"?"selected":""}>50% ของจ่ายจริง ไม่เกินเพดาน</option></select></div>
 <div class="field full"><label>อ้างอิง</label><input name="ref" value="${esc(r.ref)}"></div>
 <div class="form-actions"><button type="button" class="btn light" onclick="closeModal()">ยกเลิก</button><button class="btn">บันทึก</button></div></form>`);
}
function saveRate(e,id){e.preventDefault();const f=new FormData(e.target);const x={id:id||uid(),type:f.get("type"),level:f.get("level"),subsidy:f.get("subsidy"),field:f.get("field"),cap:Number(f.get("cap")),method:f.get("method"),ref:f.get("ref")};if(id)db.rates[db.rates.findIndex(r=>r.id===id)]=x;else db.rates.push(x);save();closeModal()}

function exportExcel(){
 const wb=XLSX.utils.book_new();
 const rights=db.rights.map((r,i)=>({ลำดับ:i+1,"ชื่อ-สกุล":r.name,"หน่วยงาน":r.org,"ตำแหน่ง":r.position}));
 const children=db.children.map(c=>({"ผู้มีสิทธิ":db.rights.find(r=>r.id===c.rightId)?.name||"","ชื่อบุตร":c.name,"โรงเรียน":c.school,"ประเภทสถานศึกษา":c.schoolType,"เงินอุดหนุน":c.subsidy,"ระดับ":c.level,"ชั้น/หลักสูตร":c.classLevel,"สายวิชา":c.field}));
 const claims=db.claims.map(c=>{const ch=db.children.find(x=>x.id===c.childId),s=getSummary(c.childId,c.year);return({"วันที่":c.date,"ผู้มีสิทธิ":db.rights.find(r=>r.id===ch?.rightId)?.name||"","บุตร":ch?.name||"","โรงเรียน":ch?.school||"","ปีการศึกษา":c.year,"ภาคเรียน":c.term,"จ่ายจริง":c.paid,"อัตราสูงสุด":s.cap,"ขอเบิก":c.claim,"สถานะ":s.status,"หมายเหตุ":c.note||""})});
 const rates=db.rates.map(r=>({"ประเภท":r.type,"ระดับ":r.level,"เงินอุดหนุน":r.subsidy,"สายวิชา":r.field,"เพดาน":r.cap,"วิธีคำนวณ":r.method,"อ้างอิง":r.ref}));
 [rights,children,claims,rates].forEach((data,i)=>XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(data),["ผู้มีสิทธิ","บุตร","รายการเบิก","อัตรา"][i]));
 XLSX.writeFile(wb,"ทะเบียนคุมค่าเล่าเรียนบุตร.xlsx");
}
function backupData(){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(db,null,2)],{type:"application/json"}));a.download="backup_ทะเบียนคุมค่าเล่าเรียนบุตร.json";a.click()}
function restoreData(e){const file=e.target.files[0];if(!file)return;const rd=new FileReader();rd.onload=()=>{try{const x=JSON.parse(rd.result);if(!x.rights||!x.children||!x.claims||!x.rates)throw Error();db=x;save();alert("นำเข้าข้อมูลสำเร็จ")}catch(err){alert("ไฟล์ไม่ถูกต้อง")}};rd.readAsText(file)}

renderAll();
