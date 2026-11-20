const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));let toastTimer;
function toast(t){$('#toast').textContent=t;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2800)}

function data(){return Engine.all()}
function br(d){return d?d.split('-').reverse().join('/'):'—'}
function showView(v){document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active',x.id===v));document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x.dataset.view===v));$('#crumb').textContent=({dashboard:'Visão geral',resources:'Equipamentos',categoryDetail:currentCategory==='Chromebook'?'Chromebooks':'Tablets',reservations:'Agendamentos'})[v]||'Equipamentos';render()}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>showView(b.dataset.view));
function render(){
 const d=data(); renderAvailability();
 $('#total').textContent=(d.inventory?.Chromebook||40)+(d.inventory?.Tablet||30);
 $('#available').textContent=((d.inventory?.Chromebook||0)+(d.inventory?.Tablet||0))+' unidades';
 $('#upcoming').textContent=d.reservations.filter(x=>x.status==='Agendado').length;
 $('#maintenance').textContent='—';
 let future=d.reservations.filter(x=>x.status==='Agendado').sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
 $('#recent').innerHTML=future.length?table(future.slice(0,5),false):'<div class="empty">Nenhum agendamento cadastrado.</div>';
 renderResources();renderCategoryDetail();renderReservations();
}
function table(items,actions){return `<table><thead><tr><th>Equipamento</th><th>Responsável</th><th>Data e horário</th><th>Turma / setor</th><th>Status</th>${actions?'<th>Ações</th>':''}</tr></thead><tbody>${items.map(a=>`<tr><td>${esc(a.equipmentType||'Equipamento')} · ${Number(a.quantity||0)} unidade(s)</td><td>${esc(a.person)}</td><td>${br(a.date)} · ${esc(a.time)}</td><td>${esc(a.group||'—')}</td><td>${esc(a.status)}</td>${actions?`<td>${['Agendado','Em utilização'].includes(a.status)?`<button class="small" onclick="cancel('${a.id}')">Cancelar</button>`:'—'}</td>`:''}</tr>`).join('')}</tbody></table>`}
let currentCategory = 'Chromebook';
function renderResources(){
 if(!$('#resourceList'))return;
 const d=data();
 const stockCards=['Chromebook','Tablet'].map(type=>`<article class="card category-card" role="button" tabindex="0" onclick="openCategory('${type}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openCategory('${type}')}"><span class="pill">Estoque compartilhado</span><h3>${type==='Chromebook'?'Chromebooks':'Tablets'}</h3><div class="muted">${d.inventory[type]||0} unidades no total</div><p>Clique para consultar a lista de equipamentos e gerenciar o patrimônio.</p><span class="category-open">Abrir lista →</span></article>`).join('');
 $('#resourceList').innerHTML=stockCards;
}
function openCategory(type){
 if(!['Chromebook','Tablet'].includes(type))return;
 currentCategory=type;
 $('#categoryTitle').textContent=type==='Chromebook'?'Chromebooks':'Tablets';
 $('#categorySubtitle').textContent=`${data().inventory[type]||0} unidades no estoque. Consulte os patrimônios cadastrados.`;
 $('#categorySearch').value='';
 showView('categoryDetail');
}
function openResourceForCurrentCategory(){
 if(authorizeAdmin('cadastrar equipamento'))openModal('resource');
}
function renderCategoryDetail(){
 const host=$('#categoryEquipmentList');if(!host)return;
 const d=data(),q=($('#categorySearch')?.value||'').toLowerCase();
 const list=(d.resources||[]).filter(r=>r.category===currentCategory&&(`${r.code||''} ${r.description||''}`).toLowerCase().includes(q));
 host.innerHTML=list.length?list.map(r=>`<article class="card equipment-item"><span class="pill">${r.generated?'Identificação provisória':'Patrimônio cadastrado'}</span><h3>${esc(r.code||'Sem identificação')}</h3><div class="muted">${currentCategory==='Chromebook'?'Chromebook':'Tablet'}</div><p>${esc(r.description||'Sem descrição adicional')}</p><div class="resource-actions"><button class="small danger" onclick="deleteResource('${esc(r.id)}')">Excluir</button></div></article>`).join(''):'<div class="empty">Nenhum equipamento nesta categoria.</div>';
 $('#categorySubtitle').textContent=`${d.inventory[currentCategory]||0} unidades no estoque. ${list.length} patrimônio(s) cadastrado(s) nesta lista.`;
}
function renderReservations(){
 if(!$('#reservationList'))return;
 let q=($('#asearch')?.value||'').toLowerCase(),f=$('#afilter')?.value||'all';
 let list=data().reservations.filter(a=>(a.person+' '+a.equipmentType+' '+a.group).toLowerCase().includes(q)&&(f==='all'||a.status===f)).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
 $('#reservationList').innerHTML=list.length?table(list,true):'<div class="empty">Nenhum agendamento encontrado.</div>';
}
function renderAvailability(){
 const el=$('#availabilityGrid');if(!el)return;
 const d=data(),days=['Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira'],lessons=[['1ª aula','07:30–08:20'],['2ª aula','08:20–09:10'],['3ª aula','09:10–10:00'],['4ª aula','10:15–11:05'],['5ª aula','11:05–11:55'],['6ª aula','11:55–12:45']];
 const free=d.slots||[];
 const fixedTeachers={
  '1-2':'Elen','1-3':'Elen','1-4':'Elen','1-5':'Caroline','1-6':'Renan',
  '2-1':'Caroline','2-3':'André','2-4':'André','2-5':'Edna','2-6':'Edna',
  '3-1':'Renan','3-2':'Renan','3-3':'André','3-4':'Silvia',
  '4-1':'Lilian','4-2':'André','4-3':'André','4-4':'Esmera / Juliana','4-5':'Edna','4-6':'Edna',
  '5-1':'André','5-2':'Fabiana','5-3':'Elen','5-4':'Fabiana','5-5':'Fabiana','5-6':'Elen'
 };
 el.innerHTML=`<div class="availability-row availability-head"><span>Aula / horário</span>${days.map(x=>`<b>${x.replace('-feira','')}</b>`).join('')}</div>`+lessons.map((l,li)=>`<div class="availability-row"><span class="lesson-label"><b>${l[0]}</b><small>${l[1]}</small></span>${days.map((day,di)=>{
  const slot=free.find(s=>s.dayIndex===di+1&&s.lesson===l[0]);
  if(!slot)return `<span class="slot-locked">${fixedTeachers[`${di+1}-${li+1}`]||'Indisponível'}</span>`;
  const c=Engine.availability('Chromebook',nextDateForDay(slot.dayIndex),slot.id),t=Engine.availability('Tablet',nextDateForDay(slot.dayIndex),slot.id);
  return `<button class="slot-free" onclick="openReservation('${slot.id}')">＋ Agendar<small>Chromebook: ${c.available}/${c.total} · Tablet: ${t.available}/${t.total}</small></button>`;
 }).join('')}</div>`).join('');
}
function nextDateForDay(dayIndex){
 const d=new Date();let delta=(dayIndex-d.getDay()+7)%7;if(delta===0)delta=7;d.setDate(d.getDate()+delta);
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function openModal(type,slotId){
 $('#shade').classList.add('open');$('#resourceForm').classList.toggle('active',type==='resource');$('#reservationForm').classList.toggle('active',type==='reservation');
 $('#modalTitle').textContent=type==='resource'?'Cadastrar equipamento':'Novo agendamento';
 if(type==='reservation'){
  const selected=data().slots.find(s=>s.id===slotId);
  if(!selected){toast('Selecione um horário disponível na grade.');return;}
  $('#slotChoice').value=selected.id;
  $('#reservationDate').value=nextDateForDay(selected.dayIndex);
  $('#quantityInput').value=1;updateStockPreview();
 }
}
const ADMIN_PASSWORD = '915668';
function authorizeAdmin(action){
 const entered = window.prompt(`Digite a senha do responsável para ${action}:`);
 if(entered === null) return false;
 if(entered !== ADMIN_PASSWORD){toast('Senha incorreta. Operação não autorizada.');return false;}
 return true;
}
function openResource(){if(authorizeAdmin('cadastrar equipamento'))openModal('resource')}
function openReservation(slotId){openModal('reservation',slotId)}
function closeModal(){$('#shade').classList.remove('open');$('#resourceForm').reset();$('#reservationForm').reset()}
function updateStockPreview(){
 const type=$('#equipmentType').value,slotId=$('#slotChoice').value,date=$('#reservationDate').value;
 const stock=Engine.availability(type,date,slotId);
 $('#stockPreview').innerHTML=`<div><b>${type==='Chromebook'?'Chromebooks':'Tablets'} neste horário</b><strong>${stock.reserved} reservados</strong></div><div class="stock-numbers"><span>${stock.available}</span><small>de ${stock.total} disponíveis</small></div>`;
 $('#quantityInput').max=stock.available;$('#quantityInput').setCustomValidity(Number($('#quantityInput').value)>stock.available?'Quantidade maior que o estoque disponível.':'');
}
$('#equipmentType').addEventListener('change',updateStockPreview);
$('#quantityInput').addEventListener('input',updateStockPreview);
$('#resourceForm').onsubmit=e=>{e.preventDefault();const form=Object.fromEntries(new FormData(e.target));form.category=currentCategory;try{Engine.addResource(form);closeModal();showView('categoryDetail');toast('Equipamento cadastrado e estoque atualizado.')}catch(err){toast(err.message)}};
$('#reservationForm').onsubmit=e=>{
 e.preventDefault();const form=Object.fromEntries(new FormData(e.target));
 try{Engine.addReservation(form);closeModal();showView('reservations');toast('Agendamento realizado com sucesso.')}
 catch(err){toast(err.message);updateStockPreview()}
};
function toggleResource(id){let r=data().resources.find(x=>x.id===id);Engine.status(id,r.status==='Manutenção'?'Disponível':'Manutenção');render();toast('Status atualizado.')}
function deleteResource(id){
 if(!authorizeAdmin('excluir equipamento'))return;
 if(confirm('Excluir este equipamento? O estoque desta categoria será reduzido em uma unidade.'))
  try{Engine.remove(id);render();toast('Equipamento excluído e estoque atualizado.')}catch(e){toast(e.message)}
}
function finish(id){Engine.reservationStatus(id,'Concluído');render();toast('Agendamento concluído.')}
function cancel(id){if(confirm('Cancelar este agendamento?')){Engine.reservationStatus(id,'Cancelado');render();toast('Agendamento cancelado.')}} 
// Atualiza os status automaticamente enquanto a tela estiver aberta.
// A regra também é recalculada ao abrir/atualizar o sistema.
setInterval(()=>{render();},30000);
$('#shade').onclick=e=>{if(e.target.id==='shade')closeModal()};
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
render();