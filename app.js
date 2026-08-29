const state={rows:[],filtered:[],selected:null,minRating:0};
const reviews=JSON.parse(localStorage.getItem('candidateReviews')||'{}');
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];

function parseCSV(text){
  const out=[];let row=[],cell='',quote=false;
  for(let i=0;i<text.length;i++){
    const c=text[i],n=text[i+1];
    if(c==='"'&&quote&&n==='"'){cell+='"';i++}
    else if(c==='"')quote=!quote;
    else if(c===','&&!quote){row.push(cell);cell=''}
    else if((c==='\n'||c==='\r')&&!quote){if(c==='\r'&&n==='\n')i++;row.push(cell);if(row.some(x=>x!==''))out.push(row);row=[];cell=''}
    else cell+=c;
  }
  if(cell||row.length){row.push(cell);out.push(row)}
  const headers=out.shift().map(h=>h.trim());
  return out.map(cols=>Object.fromEntries(headers.map((h,i)=>[h,(cols[i]||'').trim()])));
}
function reviewFor(id){return reviews[id]||{rating:0,status:'unreviewed',notes:''}}
function save(){localStorage.setItem('candidateReviews',JSON.stringify(reviews));updateCounts();renderList()}
function initials(name){return name.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase()}
function escapeHtml(s=''){return s.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function fitScore(r){
  const level={Advanced:4,Intermediate:3,Beginner:2,'No-experience':1,UNDEFINED:0};
  let s=(level[r['LEVEL OF EXPERIENCE (PYTHON)']]||0)*3+(level[r['LEVEL OF EXPERIENCE (SQL)']]||0)*2+(level[r['LEVEL OF EXPERIENCE (R)']]||0);
  s+=(r['COMPLETED COURSE'].match(/Data 100|CS 61B|STAT 134/gi)||[]).length*2;
  s+=(r['RELEVANT SKILLS'].match(/machine learning|pytorch|tensorflow|transformer|biolog|pipeline|research/gi)||[]).length;
  return s;
}
function chosen(name){return $$(`input[name="${name}"]:checked`).map(x=>x.value)}
function applyFilters(){
  const q=$('#searchInput').value.toLowerCase().trim(), statuses=chosen('status'), python=chosen('python'), courses=chosen('course');
  state.filtered=state.rows.filter(r=>{
    const rv=reviewFor(r.SN),hay=Object.values(r).join(' ').toLowerCase();
    return (!q||hay.includes(q))&&(!statuses.length||statuses.includes(rv.status))&&(!python.length||python.includes(r['LEVEL OF EXPERIENCE (PYTHON)']))&&(!courses.length||courses.some(c=>r['COMPLETED COURSE'].toLowerCase().includes(c.toLowerCase())))&&(!state.minRating||rv.rating>=state.minRating);
  });
  const sort=$('#sortSelect').value;
  state.filtered.sort((a,b)=>sort==='name'?a['STUDENT NAME'].localeCompare(b['STUDENT NAME']):sort==='rating'?reviewFor(b.SN).rating-reviewFor(a.SN).rating||fitScore(b)-fitScore(a):sort==='unreviewed'?(reviewFor(a.SN).status==='unreviewed'?-1:1):fitScore(b)-fitScore(a));
  renderList();
}
function stars(n){return [1,2,3,4,5].map(i=>`<span class="${i<=n?'filled':''}">★</span>`).join('')}
function renderList(){
  $('#resultCount').textContent=state.filtered.length;$('#emptyState').hidden=!!state.filtered.length;
  $('#candidateList').innerHTML=state.filtered.map(r=>{const rv=reviewFor(r.SN),py=r['LEVEL OF EXPERIENCE (PYTHON)'];return `<article class="candidate ${state.selected===r.SN?'active':''}" data-id="${r.SN}">
    <div class="candidate-top"><div class="avatar">${initials(r['STUDENT NAME'])}</div><div class="candidate-title"><h3>${escapeHtml(r['STUDENT NAME'])}</h3><p>${escapeHtml(r['STUDENT EMAIL'])}</p></div><button class="bookmark ${rv.status==='shortlisted'?'on':''}" data-bookmark="${r.SN}" title="Shortlist">${rv.status==='shortlisted'?'●':'○'}</button></div>
    <div class="tags"><span class="tag ${py==='Advanced'?'advanced':''}">Python · ${escapeHtml(py)}</span><span class="tag">SQL · ${escapeHtml(r['LEVEL OF EXPERIENCE (SQL)'])}</span></div>
    <p class="candidate-summary">${escapeHtml(r['RELEVANT SKILLS'])}</p><div class="candidate-foot"><div class="stars">${stars(rv.rating)}</div><span class="status-pill ${rv.status}">${rv.status}</span></div></article>`}).join('');
  $$('.candidate').forEach(el=>el.onclick=e=>{if(!e.target.closest('[data-bookmark]'))selectCandidate(el.dataset.id)});
  $$('[data-bookmark]').forEach(el=>el.onclick=e=>{e.stopPropagation();toggleShortlist(el.dataset.bookmark)});
}
function toggleShortlist(id){const rv=reviews[id]||reviewFor(id);rv.status=rv.status==='shortlisted'?'unreviewed':'shortlisted';reviews[id]=rv;save();if(state.selected===id)renderDetail()}
function selectCandidate(id){state.selected=id;renderList();renderDetail();$('#detailPanel').classList.add('open')}
function section(title,text){return `<div class="section"><h3>${title}</h3><p>${escapeHtml(text||'Not provided')}</p></div>`}
function renderDetail(){
  const r=state.rows.find(x=>x.SN===state.selected);if(!r)return;const rv=reviewFor(r.SN),portfolio=r['PORTFOLIO LINK'];
  $('#detailPanel').innerHTML=`<div class="detail-head"><div class="detail-person"><div class="avatar">${initials(r['STUDENT NAME'])}</div><div><h2>${escapeHtml(r['STUDENT NAME'])}</h2><a href="mailto:${escapeHtml(r['STUDENT EMAIL'])}">${escapeHtml(r['STUDENT EMAIL'])}</a></div></div>
  <div class="detail-actions"><a class="btn primary" href="${escapeHtml(r['APPLICATION LINK'])}" target="_blank">Open resume ↗</a><button class="btn" id="shortlistDetail">${rv.status==='shortlisted'?'Remove shortlist':'Shortlist'}</button><button class="btn" id="closeDetail">Close</button></div></div>
  <div class="detail-content"><div class="review-block"><label>Your overall rating</label><div class="detail-stars">${[1,2,3,4,5].map(i=>`<button data-rate="${i}" class="${i<=rv.rating?'on':''}">★</button>`).join('')}</div><textarea id="notes" placeholder="Add private review notes…">${escapeHtml(rv.notes)}</textarea></div>
  <div class="skill-grid">${['PYTHON','R','SQL'].map(k=>`<div class="skill"><span>${k}</span><strong>${escapeHtml(r[`LEVEL OF EXPERIENCE (${k})`])}</strong></div>`).join('')}</div>
  ${section('Relevant skills',r['RELEVANT SKILLS'])}${section('Project experience',r['PROJECT EXPERERINCE'])}${section('Why this project',r['PROJECT PARTICIPATION GOALS'])}${section('Completed coursework',r['COMPLETED COURSE'])}
  <div class="section"><h3>Application materials</h3><div class="links"><a class="link-card" target="_blank" href="${escapeHtml(r['APPLICATION LINK'])}">Resume / application ↗</a>${portfolio&&portfolio.toLowerCase()!=='n/a'?`<a class="link-card" target="_blank" href="${escapeHtml(portfolio)}">Portfolio ↗</a>`:''}</div></div></div>`;
  $$('[data-rate]').forEach(b=>b.onclick=()=>{const v=+b.dataset.rate;reviews[r.SN]={...rv,rating:rv.rating===v?0:v,status:rv.status==='unreviewed'?'reviewed':rv.status,notes:$('#notes').value};save();renderDetail()});
  $('#notes').oninput=e=>{reviews[r.SN]={...reviewFor(r.SN),notes:e.target.value};localStorage.setItem('candidateReviews',JSON.stringify(reviews))};
  $('#shortlistDetail').onclick=()=>toggleShortlist(r.SN);$('#closeDetail').onclick=()=>$('#detailPanel').classList.remove('open');
}
function updateCounts(){
  const vals=state.rows.map(r=>reviewFor(r.SN)),reviewed=vals.filter(x=>x.status!=='unreviewed').length,pct=state.rows.length?Math.round(reviewed/state.rows.length*100):0;
  $('#reviewedCount').textContent=reviewed;$('#remainingCount').textContent=state.rows.length-reviewed;$('#progressPct').textContent=pct+'%';$('#progressBar').style.width=pct+'%';
  $('#unreviewedN').textContent=vals.filter(x=>x.status==='unreviewed').length;$('#shortlistedN').textContent=vals.filter(x=>x.status==='shortlisted').length;$('#reviewedN').textContent=vals.filter(x=>x.status==='reviewed').length;
}
function toast(msg){$('#toast').textContent=msg;$('#toast').classList.add('show');setTimeout(()=>$('#toast').classList.remove('show'),1800)}
function exportReview(){
  const rows=state.rows.filter(r=>reviews[r.SN]).map(r=>[r['STUDENT NAME'],r['STUDENT EMAIL'],reviewFor(r.SN).status,reviewFor(r.SN).rating,reviewFor(r.SN).notes]);
  const csv=[['Student Name','Email','Status','Rating','Notes'],...rows].map(row=>row.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='candidate-review.csv';a.click();URL.revokeObjectURL(a.href);toast('Review exported');
}
async function importReview(file){
  try{
    const imported=parseCSV(await file.text());let matched=0;
    imported.forEach(row=>{
      const candidate=state.rows.find(r=>r['STUDENT EMAIL'].toLowerCase()===String(row.Email||'').toLowerCase());
      if(!candidate)return;
      const rating=Math.max(0,Math.min(5,Number(row.Rating)||0));
      const status=['unreviewed','reviewed','shortlisted'].includes(row.Status)?row.Status:(rating?'reviewed':'unreviewed');
      reviews[candidate.SN]={status,rating,notes:row.Notes||''};matched++;
    });
    if(!matched)throw Error('No matching candidates');
    localStorage.setItem('candidateReviews',JSON.stringify(reviews));updateCounts();applyFilters();if(state.selected)renderDetail();toast(`${matched} reviews restored`);
  }catch(err){toast('Could not import that review file')}
  $('#importFile').value='';
}
async function init(){
  try{const res=await fetch('applications.csv');if(!res.ok)throw Error();state.rows=parseCSV(await res.text());state.filtered=[...state.rows];updateCounts();applyFilters()}
  catch{document.querySelector('.candidate-panel').innerHTML='<div class="empty"><h3>Could not open applications.csv</h3><p>Start a local server in this folder with: python3 -m http.server 8000</p></div>'}
}
$('#searchInput').oninput=applyFilters;$('#sortSelect').onchange=applyFilters;$$('input[type="checkbox"]').forEach(x=>x.onchange=applyFilters);
$('#clearFilters').onclick=()=>{$('#searchInput').value='';$$('input[type="checkbox"]').forEach(x=>x.checked=false);state.minRating=0;$$('#ratingFilter button').forEach(x=>x.classList.remove('active'));applyFilters()};
$$('#ratingFilter button').forEach(b=>b.onclick=()=>{const v=+b.dataset.value;state.minRating=state.minRating===v?0:v;$$('#ratingFilter button').forEach(x=>x.classList.toggle('active',+x.dataset.value<=state.minRating));applyFilters()});
$('#exportBtn').onclick=exportReview;
$('#importBtn').onclick=()=>$('#importFile').click();
$('#importFile').onchange=e=>{if(e.target.files[0])importReview(e.target.files[0])};
init();
