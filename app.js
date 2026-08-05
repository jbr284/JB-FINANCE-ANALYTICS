// === INICIALIZAÇÃO FIREBASE ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, setDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCNHOPKa320_cY0KUY8vBVVYRmcYkmWo0Y",
    authDomain: "bd-saripan.firebaseapp.com",
    projectId: "bd-saripan",
    storageBucket: "bd-saripan.firebasestorage.app",
    messagingSenderId: "545578993360",
    appId: "1:545578993360:web:d410a5cbedd914ad3800d5"
};

const appFire = initializeApp(firebaseConfig);
const db = getFirestore(appFire);
const auth = getAuth(appFire);

window.registros = []; 
window.registrosModular = []; 
window.registrosExtra = []; 
window.chartsAtivos = []; 
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const iconeOlhoAberto = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
const iconeOlhoFechado = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

window.togglePrivacidade = () => {
    const isHidden = document.body.classList.toggle('modo-privacidade');
    localStorage.setItem('saripan_privacidade', isHidden);
    document.getElementById('btn-privacidade').innerHTML = isHidden ? iconeOlhoFechado : iconeOlhoAberto;
};

auth.onAuthStateChanged((user) => {
    if (user) {
        document.getElementById('tela-login').classList.add('hidden');
        document.getElementById('tela-hub').classList.remove('hidden');
        document.getElementById('app').classList.add('hidden');
        carregarTodosOsDados();
    } else {
        document.getElementById('tela-login').classList.remove('hidden');
        document.getElementById('tela-hub').classList.add('hidden');
        document.getElementById('app').classList.add('hidden');
    }
});

window.fazerLogin = async () => {
    const email = document.getElementById('emailLogin').value;
    const senha = document.getElementById('senhaLogin').value;
    if (!email || !senha) return alert("Preencha e-mail e senha.");
    const btn = document.querySelector('#tela-login .btn-action');
    btn.innerText = "Entrando...";
    try { await signInWithEmailAndPassword(auth, email, senha); } 
    catch (e) { alert("Credenciais inválidas."); } 
    finally { btn.innerText = "Entrar"; }
};

window.sairApp = async () => { if (confirm("Deseja sair?")) await signOut(auth); };

window.abrirModulo = (modulo) => {
    document.getElementById('tela-hub').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    const titulos = { 'saripan': 'SARIPAN', 'modular': 'MODULAR', 'geral': 'VISÃO GERAL' };
    document.getElementById('app-title').innerText = titulos[modulo];
    document.querySelectorAll('.master-module').forEach(m => m.classList.remove('active'));
    document.getElementById(`module-${modulo}`).classList.add('active');
    
    if (modulo === 'saripan') { window.mudarAba('registrar'); window.atualizarRodapeDinamico(); }
    if (modulo === 'modular') renderizarHistoricoModular();
    if (modulo === 'geral') { renderizarHistoricoExtra(); renderizarDashboardGeral(); }
};

window.voltarAoHub = () => {
    document.getElementById('app').classList.add('hidden');
    document.getElementById('tela-hub').classList.remove('hidden');
};

window.mudarAba = (aba) => { 
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`btn-tab-${aba}`).classList.add('active');
    document.getElementById(`painel-${aba}`).classList.add('active');
    if (aba === 'financeiro') renderizarFinanceiroSaripan(); 
};

function mostrarToast(mensagem = "✅ Operação realizada com sucesso!") {
    const toast = document.getElementById("toast");
    toast.innerText = mensagem;
    toast.className = "show";
    setTimeout(() => toast.className = toast.className.replace("show", ""), 2900);
}

// BUCANDO AS 3 TABELAS
async function carregarTodosOsDados() {
    try {
        const snapSari = await getDocs(collection(db, "apontamentos"));
        window.registros = snapSari.docs.map(doc => doc.data());
        
        const snapMod = await getDocs(collection(db, "renda_modular"));
        window.registrosModular = snapMod.docs.map(doc => doc.data());

        const snapExtra = await getDocs(collection(db, "renda_extra"));
        window.registrosExtra = snapExtra.docs.map(doc => doc.data());

        renderizarApontamentosSaripan(); window.atualizarRodapeDinamico(); 
    } catch (e) { console.error(e); }
}

function obterPeriodo(dataStr) {
    const dateObj = new Date(dataStr);
    return { ano: dateObj.getUTCFullYear(), mes: dateObj.getUTCMonth(), dia: dateObj.getUTCDate(), quinzena: dateObj.getUTCDate() <= 15 ? 1 : 2 };
}

window.atualizarPreview = () => {
    const base = parseFloat(document.getElementById('valorBase').value) || 0;
    const carga = parseInt(document.getElementById('tipoCarga').value);
    const tipoDia = parseInt(document.getElementById('tipoDia').value);
    const pesoDia = (tipoDia === 3 || tipoDia === 2) ? 2 : 1;
    const multiplicador = (pesoDia === 2 && carga === 2) ? 4 : (carga * pesoDia);
    document.getElementById('previewValor').value = `R$ ${(base * multiplicador).toFixed(2)}`;
};

window.atualizarRodapeDinamico = () => {
    const d = document.getElementById('dataServico').value;
    if (!d) return;
    const p = obterPeriodo(d);
    let qtd = 0, tot = 0;
    window.registros.forEach(r => { if(r.ano === p.ano && r.mes === p.mes && r.quinzena === p.quinzena) { qtd += r.multiplicador; tot += r.total; }});
    document.getElementById('rodape-qtd').innerText = qtd;
    document.getElementById('rodape-total').innerText = tot.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
    document.getElementById('rodape-ref').innerText = `Referência: ${p.quinzena}ª Quinz. de ${MESES[p.mes]} ${p.ano}`;
};

// ==========================================
// MÓDULO SARIPAN
// ==========================================
window.adicionarRegistro = async () => {
    const d = document.getElementById('dataServico').value;
    if (!d) return alert("Data inválida!");
    const base = parseFloat(document.getElementById('valorBase').value);
    const carga = parseInt(document.getElementById('tipoCarga').value);
    const tipoDia = parseInt(document.getElementById('tipoDia').value);
    const p = obterPeriodo(d);
    const pesoDia = (tipoDia === 3 || tipoDia === 2) ? 2 : 1;
    const multiplicador = (pesoDia === 2 && carga === 2) ? 4 : (carga * pesoDia);
    const total = base * multiplicador;
    const idUnico = Date.now().toString(); 
    const novoReg = { id: idUnico, data: d, ano: p.ano, mes: p.mes, quinzena: p.quinzena, carga, tipoDia, valorBase: base, multiplicador, total };
    try {
        await setDoc(doc(db, "apontamentos", idUnico), novoReg);
        window.registros.push(novoReg);
        renderizarApontamentosSaripan(); window.atualizarRodapeDinamico(); mostrarToast(); 
    } catch(e) { console.error(e); }
};

window.excluirRegistro = async (id) => {
    if (!confirm("Excluir?")) return;
    try {
        await deleteDoc(doc(db, "apontamentos", id.toString()));
        window.registros = window.registros.filter(r => r.id.toString() !== id.toString());
        renderizarApontamentosSaripan(); window.atualizarRodapeDinamico();
    } catch(e) { console.error(e); }
};

window.excluirQuinzena = async (chaveGrupo) => {
    if (!confirm("Excluir TUDO desta quinzena?")) return;
    const [ano, mes, q] = chaveGrupo.split('-').map(Number);
    const itens = window.registros.filter(r => r.ano === ano && r.mes === mes && r.quinzena === q);
    try {
        for (const item of itens) { await deleteDoc(doc(db, "apontamentos", item.id.toString())); }
        window.registros = window.registros.filter(r => !(r.ano === ano && r.mes === mes && r.quinzena === q));
        renderizarApontamentosSaripan(); window.atualizarRodapeDinamico();
    } catch(e) { console.error(e); }
};

function renderizarApontamentosSaripan() {
    const container = document.getElementById('lista-quinzenas-container');
    container.innerHTML = "";
    if (window.registros.length === 0) { document.getElementById('msg-sem-dados').style.display = 'block'; return; }
    document.getElementById('msg-sem-dados').style.display = 'none';
    const grupos = {};
    window.registros.forEach(reg => {
        const c = `${reg.ano}-${reg.mes}-${reg.quinzena}`;
        if (!grupos[c]) grupos[c] = { ano: reg.ano, mes: reg.mes, quinzena: reg.quinzena, itens: [], totalValor: 0 };
        grupos[c].itens.push(reg); grupos[c].totalValor += reg.total;
    });
    const chaves = Object.keys(grupos).sort((a, b) => {
        const [aA, aM, aQ] = a.split('-').map(Number); const [bA, bM, bQ] = b.split('-').map(Number);
        if (aA !== bA) return bA - aA; if (aM !== bM) return bM - aM; return bQ - aQ;
    });
    chaves.forEach((chave, index) => {
        const g = grupos[chave];
        g.itens.sort((a, b) => new Date(a.data) - new Date(b.data));
        const totalFormatado = g.totalValor.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
        const openStr = index === 0 ? 'open' : '';
        const actStr = index === 0 ? 'active' : '';
        let htmlRows = g.itens.map(i => {
            const [, mes, dia] = i.data.split('-');
            const diasSemana = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
            const dObj = new Date(i.data + 'T12:00:00');
            const diaDaSemana = diasSemana[dObj.getDay()];
            return `<tr><td>${dia}/${mes}</td><td>${diaDaSemana}</td><td>${i.carga === 1 ? 'Normal' : 'Dupla'}</td><td>${i.tipoDia === 1 ? 'Útil' : i.tipoDia === 2 ? 'Dom' : 'Fer'}</td><td class="td-valor esconder-valor">R$ ${i.total.toFixed(2)}</td><td class="td-acao"><span style="color:red; cursor:pointer;" onclick="window.excluirRegistro('${i.id}')">✖</span></td></tr>`;
        }).join('');
        const div = document.createElement('div');
        div.className = 'accordion-group';
        
        const btnZap = `<button class="btn-icon" style="color:#25D366; font-size: 20px; padding: 5px; margin-right: 5px;" onclick="event.stopPropagation(); window.compartilharRelatorio('${chave}')">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16"><path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/></svg>
        </button>`;

        div.innerHTML = `<div class="accordion-header ${actStr}" onclick="this.classList.toggle('active'); this.nextElementSibling.classList.toggle('open');"><div><div class="accordion-title">${g.quinzena}ª Quinzena - ${MESES[g.mes]} ${g.ano}</div><div class="accordion-meta">${g.itens.length} registros</div></div><div class="accordion-actions" style="display:flex; align-items:center;">${btnZap}<button class="btn-icon" style="color:#d32f2f; font-size:20px; padding:5px;" onclick="event.stopPropagation(); window.excluirQuinzena('${chave}')">🗑️</button></div></div><div class="accordion-content ${openStr}"><table><thead><tr><th>Data</th><th>Dia</th><th>Tipo</th><th>Detalhes</th><th style="text-align:right">Valor</th><th></th></tr></thead><tbody>${htmlRows}<tr class="total-row"><td colspan="3">Total</td><td class="td-valor esconder-valor">${totalFormatado}</td><td></td></tr></tbody></table></div>`;
        container.appendChild(div);
    });
}

window.compartilharRelatorio = async (chaveGrupo) => {
    const [ano, mes, q] = chaveGrupo.split('-').map(Number);
    const itens = window.registros
        .filter(r => r.ano === ano && r.mes === mes && r.quinzena === q)
        .sort((a, b) => new Date(a.data) - new Date(b.data));
    if (itens.length === 0) return;
    let cntNormal = 0, cntDupla = 0, totalDinheiro = 0, totalMult = 0, tbodyHtml = '';
    itens.forEach(i => {
        totalDinheiro += i.total; totalMult += i.multiplicador;
        if (i.carga === 1) cntNormal++; else cntDupla++;
        const dataStr = i.data.split('-').reverse().join('/');
        const tipo = i.carga === 1 ? 'Normal' : 'Dupla';
        const detalhes = i.tipoDia === 1 ? 'Dia Útil' : (i.tipoDia === 2 ? 'Domingo' : 'Feriado');
        const diasSemana = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
        const dObj = new Date(i.data + 'T12:00:00');
        const diaDaSemana = diasSemana[dObj.getDay()];
        tbodyHtml += `<tr><td style="padding: 10px 12px; border: 1px solid #ddd; color: #333;">${dataStr}</td><td style="padding: 10px 12px; border: 1px solid #ddd; color: #333;">${diaDaSemana}</td><td style="padding: 10px 12px; border: 1px solid #ddd; color: #333;">${tipo}</td><td style="padding: 10px 12px; border: 1px solid #ddd; color: #333;">${detalhes}</td><td style="padding: 10px 12px; border: 1px solid #ddd; color: #333;">R$ ${i.total.toFixed(2)}</td></tr>`;
    });
    document.getElementById('print-ref').innerText = `Referência: ${q}ª Quinzena de ${MESES[mes]} ${ano}`;
    let resumoText = '';
    if(cntNormal > 0) resumoText += `- ${cntNormal} diária(s) normal<br>`;
    if(cntDupla > 0) resumoText += `- ${cntDupla} diária(s) dupla<br>`;
    document.getElementById('print-resumo').innerHTML = resumoText;
    document.getElementById('print-total-diarias').innerText = `Total: ${totalMult} diárias a receber`;
    document.getElementById('print-tbody').innerHTML = tbodyHtml;
    document.getElementById('print-valor-total').innerText = `R$ ${totalDinheiro.toFixed(2)}`;
    mostrarToast("Gerando imagem, aguarde...");
    try {
        const template = document.getElementById('print-template');
        const canvas = await html2canvas(template, { scale: 2, backgroundColor: '#ffffff', logging: false });
        canvas.toBlob(async (blob) => {
            const fileName = `Saripan_${MESES[mes]}_Q${q}_${ano}.png`;
            const file = new File([blob], fileName, { type: 'image/png' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try { await navigator.share({ title: 'Relatório Saripan', files: [file] }); } catch (err) { console.log(err); }
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = fileName;
                document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
                alert("O WhatsApp direto não suportado. Imagem baixada.");
            }
        }, 'image/png');
    } catch (e) { console.error(e); alert("Erro ao gerar a imagem."); }
};

function limparGraficos() { window.chartsAtivos.forEach(c => c.destroy()); window.chartsAtivos = []; }

function renderizarFinanceiroSaripan() {
    limparGraficos();
    const container = document.getElementById('financeiro-content');
    const dadosMes = {}, totaisAnuais = {};
    window.registros.forEach(reg => {
        const chaveMes = `${reg.ano}-${reg.mes}`;
        if (!dadosMes[chaveMes]) dadosMes[chaveMes] = { ano: reg.ano, mes: reg.mes, q1: 0, q2: 0 };
        reg.quinzena === 1 ? dadosMes[chaveMes].q1 += reg.total : dadosMes[chaveMes].q2 += reg.total;
        totaisAnuais[reg.ano] = (totaisAnuais[reg.ano] || 0) + reg.total;
    });
    const chavesMes = Object.keys(dadosMes).sort((a,b) => {
         const [aA, aM] = a.split('-').map(Number); const [bA, bM] = b.split('-').map(Number);
         if (aA !== bA) return bA - aA; return bM - aM;
    });
    const anosOrdenados = Object.keys(totaisAnuais).sort((a,b) => b-a); 
    if (chavesMes.length === 0) { container.innerHTML = "<p style='text-align:center;'>Sem dados.</p>"; return; }
    let htmlFinal = '';
    const hoje = new Date();
    const anoAtual = hoje.getFullYear(), mesAtual = hoje.getMonth(), diaAtual = hoje.getDate(); 
    anosOrdenados.forEach(ano => {
        const mesesDesteAno = chavesMes.filter(k => k.startsWith(`${ano}-`));
        let totalAcumuladoAno = 0, totalFechadoAno = 0, qtdMesesFechados = 0;
        const labels = [], dadosQ1 = [], dadosQ2 = [];
        let htmlTabela = `<table class="fin-table" style="margin-bottom:30px;"><thead><tr><th>Mês</th><th style="text-align:right">1ª Q.</th><th style="text-align:right">2ª Q.</th><th style="text-align:right; background:#003c8f; color:white;">Total</th></tr></thead><tbody>`;
        mesesDesteAno.forEach(k => {
            const d = dadosMes[k]; const totalDoMes = d.q1 + d.q2; totalAcumuladoAno += totalDoMes;
            if (d.ano < anoAtual || (d.ano === anoAtual && d.mes < mesAtual)) { totalFechadoAno += totalDoMes; qtdMesesFechados++; }
            labels.push(MESES[d.mes].substring(0, 3)); dadosQ1.push(d.q1); dadosQ2.push(d.q2);
            htmlTabela += `<tr><td>${MESES[d.mes]}</td><td style="text-align:right" class="esconder-valor">R$ ${d.q1.toFixed(2)}</td><td style="text-align:right" class="esconder-valor">R$ ${d.q2.toFixed(2)}</td><td style="text-align:right" class="fin-row-total esconder-valor">R$ ${totalDoMes.toFixed(2)}</td></tr>`;
        });
        htmlTabela += `</tbody></table>`;
        const mediaTotal = qtdMesesFechados > 0 ? (totalFechadoAno / qtdMesesFechados) : 0;
        let divisorProporcional = mesesDesteAno.length; 
        if (Number(ano) === anoAtual) { divisorProporcional = mesAtual + (diaAtual / 30); }
        const mediaParcial = divisorProporcional > 0 ? (totalAcumuladoAno / divisorProporcional) : 0;
        htmlFinal += `<h4 style="margin-top: 10px; color: #555; border-bottom: 2px solid #ddd; padding-bottom: 5px; text-transform: uppercase;">Resumo Saripan ${ano}</h4><div style="display: flex; gap: 10px; margin-bottom: 15px;"><div class="year-summary" style="flex: 1; padding: 10px;"><h4>RENDIMENTO ANUAL</h4><div class="year-total-value esconder-valor" style="font-size: 17px; margin-top: 10px;">${totalAcumuladoAno.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</div></div><div class="year-summary" style="flex: 1.8; padding: 10px; background: #e3f2fd; border-color: #90caf9;"><h4 style="color: #1565c0; font-size: 11px; margin-bottom: 10px;">Média Salarial</h4><div style="display: flex; justify-content: space-around; font-size: 14px; color: #0d47a1;"><div style="text-align: center;"><span style="font-size: 10px; font-weight: bold;">PARCIAL</span><br><strong class="esconder-valor" style="font-size: 15px;">${mediaParcial.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</strong></div><div style="width: 1px; background: #bbdefb; margin: 0 5px;"></div><div style="text-align: center;"><span style="font-size: 10px; font-weight: bold;">TOTAL</span><br><strong class="esconder-valor" style="font-size: 15px;">${mediaTotal.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</strong></div></div></div></div><div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #ddd; margin-bottom: 15px;"><div style="position: relative; height: 220px; width: 100%;"><canvas id="grafico-sari-${ano}" class="esconder-valor"></canvas></div></div>${htmlTabela}`;
        setTimeout(() => {
            const ctx = document.getElementById(`grafico-sari-${ano}`);
            if (ctx) {
                const myChart = new Chart(ctx, { type: 'bar', data: { labels: labels, datasets: [ { label: '1ª Quinzena', data: dadosQ1, backgroundColor: '#81c784', borderRadius: 4 }, { label: '2ª Quinzena', data: dadosQ2, backgroundColor: '#2e7d32', borderRadius: 4 } ] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8, font: { size: 11 } } } }, scales: { y: { beginAtZero: true } } } });
                window.chartsAtivos.push(myChart); 
            }
        }, 100);
    });
    container.innerHTML = htmlFinal;
}

// ==========================================
// MÓDULO MODULAR
// ==========================================
window.adicionarRegistroModular = async () => {
    const mesStr = document.getElementById('mesModular').value; 
    
    const adiantamentoTela = parseFloat(document.getElementById('valorAdiantamento').value) || 0;
    const salarioTela = parseFloat(document.getElementById('valorSalario').value) || 0;
    const outrasTela = parseFloat(document.getElementById('valorOutras').value) || 0;
    const nomeOutras = document.getElementById('nomeOutras').value.trim() || 'Extra';
    
    if (!mesStr) return alert("Selecione o mês.");
    
    const [ano, mesNum] = mesStr.split('-').map(Number);
    const idUnico = `MOD-${ano}-${mesNum}`; 

    let registroExistente = window.registrosModular.find(r => r.id === idUnico);

    const adiantamentoFinal = adiantamentoTela > 0 ? adiantamentoTela : (registroExistente ? registroExistente.adiantamento : 0);
    const salarioFinal = salarioTela > 0 ? salarioTela : (registroExistente ? registroExistente.salario : 0);
    const outrasFinal = outrasTela > 0 ? outrasTela : (registroExistente ? registroExistente.outras : 0);
    
    const totalFinal = adiantamentoFinal + salarioFinal + outrasFinal; 
    
    const novoReg = { 
        id: idUnico, 
        ano: ano, 
        mes: mesNum - 1, 
        adiantamento: adiantamentoFinal, 
        salario: salarioFinal, 
        outras: outrasFinal, 
        nomeOutras, 
        total: totalFinal 
    };

    try {
        await setDoc(doc(db, "renda_modular", idUnico), novoReg, { merge: true });
        
        window.registrosModular = window.registrosModular.filter(r => r.id !== idUnico);
        window.registrosModular.push(novoReg);
        
        renderizarHistoricoModular(); 
        mostrarToast();
        
        document.getElementById('valorAdiantamento').value = '';
        document.getElementById('valorSalario').value = '';
        document.getElementById('valorOutras').value = '';

    } catch(e) { 
        console.error(e); 
    }
};

window.excluirRegistroModular = async (id) => {
    if (!confirm("Excluir?")) return;
    try {
        await deleteDoc(doc(db, "renda_modular", id));
        window.registrosModular = window.registrosModular.filter(r => r.id !== id);
        renderizarHistoricoModular();
    } catch(e) { console.error(e); }
};

function renderizarHistoricoModular() {
    const container = document.getElementById('lista-modular-container');
    container.innerHTML = "";
    const regs = [...window.registrosModular].sort((a, b) => a.ano !== b.ano ? b.ano - a.ano : b.mes - a.mes);
    if (regs.length === 0) { container.innerHTML = "<p style='text-align:center;'>Sem dados.</p>"; return; }
    let tableHtml = `<table><thead><tr><th>Período</th><th style="text-align:right">Adiant.</th><th style="text-align:right">Sal. Líq.</th><th style="text-align:right">Extras</th><th style="text-align:right; background:#002f6c; color:white;">Total</th><th></th></tr></thead><tbody>`;
    regs.forEach(r => {
        const extrasStr = (r.outras && r.outras > 0) ? `<div style="font-size:10px; color:#666;">${r.nomeOutras}</div>R$ ${r.outras.toFixed(2)}` : "-";
        tableHtml += `<tr><td>${MESES[r.mes]} ${r.ano}</td><td class="esconder-valor" style="text-align:right">R$ ${r.adiantamento.toFixed(2)}</td><td class="esconder-valor" style="text-align:right">R$ ${r.salario.toFixed(2)}</td><td class="esconder-valor" style="text-align:right; color:#1565c0;">${extrasStr}</td><td class="esconder-valor" style="text-align:right; font-weight:bold; color:#0d47a1;">R$ ${r.total.toFixed(2)}</td><td style="text-align:center;"><span style="color:red; cursor:pointer;" onclick="window.excluirRegistroModular('${r.id}')">✖</span></td></tr>`;
    });
    tableHtml += `</tbody></table>`;
    container.innerHTML = tableHtml;
}

// ==========================================
// MÓDULO: RENDA EXTRA AVULSA (SANFONA ÚNICA)
// ==========================================
window.adicionarRegistroExtra = async () => {
    const d = document.getElementById('dataExtra').value;
    const desc = document.getElementById('descExtra').value.trim() || 'Renda Extra';
    const valor = parseFloat(document.getElementById('valorExtra').value);
    
    if (!d || isNaN(valor) || valor <= 0) return alert("Preencha a data e um valor válido.");
    
    const p = obterPeriodo(d);
    const idUnico = `EXT-${Date.now()}`;
    const novoReg = { id: idUnico, data: d, ano: p.ano, mes: p.mes, descricao: desc, total: valor };

    try {
        await setDoc(doc(db, "renda_extra", idUnico), novoReg);
        window.registrosExtra.push(novoReg);
        renderizarHistoricoExtra();
        renderizarDashboardGeral();
        mostrarToast("Renda Extra registrada!");
        document.getElementById('descExtra').value = '';
        document.getElementById('valorExtra').value = '';
    } catch(e) { console.error(e); }
};

window.excluirRegistroExtra = async (id) => {
    if (!confirm("Deseja excluir esta Renda Extra?")) return;
    try {
        await deleteDoc(doc(db, "renda_extra", id));
        window.registrosExtra = window.registrosExtra.filter(r => r.id !== id);
        renderizarHistoricoExtra();
        renderizarDashboardGeral();
    } catch(e) { console.error(e); }
};

function renderizarHistoricoExtra() {
    const container = document.getElementById('lista-extra-container');
    container.innerHTML = "";

    const regs = [...window.registrosExtra].sort((a, b) => new Date(b.data) - new Date(a.data));

    if (regs.length === 0) {
        container.innerHTML = "<p style='text-align:center; font-size:13px; color:#999;'>Nenhuma renda extra registrada ainda.</p>";
        return;
    }

    let totalSoma = 0;
    let htmlRows = regs.map(r => {
        totalSoma += r.total;
        const dataFmt = r.data.split('-').reverse().join('/');
        return `<tr>
            <td>${dataFmt}</td>
            <td>${r.descricao}</td>
            <td class="td-valor esconder-valor" style="color:#f57c00; font-weight:bold;">R$ ${r.total.toFixed(2)}</td>
            <td class="td-acao" style="text-align:center;"><span style="color:red; cursor:pointer;" onclick="window.excluirRegistroExtra('${r.id}')">✖</span></td>
        </tr>`;
    }).join('');

    const totalFormatado = totalSoma.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});

    const div = document.createElement('div');
    div.className = 'accordion-group';
    
    // REMOVIDA A CLASSE 'active' do header E A CLASSE 'open' do content para nascer fechada!
    div.innerHTML = `
        <div class="accordion-header" onclick="this.classList.toggle('active'); this.nextElementSibling.classList.toggle('open');" style="border-left: 5px solid #f57c00;">
            <div>
                <div class="accordion-title">Todos os Registros</div>
                <div class="accordion-meta">${regs.length} registro(s)</div>
            </div>
            <div class="accordion-actions" style="display:flex; align-items:center;">
                <span style="font-weight:bold; color:#f57c00; font-size: 16px; margin-right: 10px;" class="esconder-valor">${totalFormatado}</span>
            </div>
        </div>
        <div class="accordion-content">
            <table>
                <thead>
                    <tr><th>Data</th><th>Origem</th><th style="text-align:right">Valor</th><th></th></tr>
                </thead>
                <tbody>
                    ${htmlRows}
                </tbody>
            </table>
        </div>
    `;
    container.appendChild(div);
}

// ==========================================
// VISÃO GERAL (DASHBOARD)
// ==========================================
function renderizarDashboardGeral() {
    limparGraficos();
    const container = document.getElementById('dashboard-geral-content');
    const dadosGerais = {}; 
    let anosEncontrados = new Set();
    
    const initData = (ano, mes) => {
        const k = `${ano}-${mes}`; 
        anosEncontrados.add(ano);
        if(!dadosGerais[k]) dadosGerais[k] = { ano: ano, mes: mes, saripan: 0, modular: 0, extra: 0 };
        return k;
    };

    // Soma os 3 pilares
    window.registros.forEach(r => { const k = initData(r.ano, r.mes); dadosGerais[k].saripan += r.total; });
    window.registrosModular.forEach(r => { const k = initData(r.ano, r.mes); dadosGerais[k].modular += r.total; });
    window.registrosExtra.forEach(r => { const k = initData(r.ano, r.mes); dadosGerais[k].extra += r.total; });

    const anosOrdenados = Array.from(anosEncontrados).sort((a,b) => b-a);
    if(anosOrdenados.length === 0) { container.innerHTML = "<p style='text-align:center;'>Sem dados.</p>"; return; }
    
    let htmlFinal = '';
    
    anosOrdenados.forEach(ano => {
        const mesesDoAno = Object.values(dadosGerais).filter(d => d.ano === ano).sort((a,b) => a.mes - b.mes);
        let totalAno = 0; 
        const labels = [], dataSari = [], dataMod = [], dataExtra = [];
        
        let htmlTabela = `<table class="fin-table" style="margin-top:20px; margin-bottom:30px; font-size: 12px;"><thead><tr><th>Mês</th><th style="text-align:right">Saripan</th><th style="text-align:right">Modular</th><th style="text-align:right; color:#ffb74d;">Extra</th><th style="text-align:right; background:#003c8f; color:white;">Total</th></tr></thead><tbody>`;
        
        mesesDoAno.forEach(m => {
            labels.push(MESES[m.mes].substring(0,3)); 
            dataSari.push(m.saripan); 
            dataMod.push(m.modular); 
            dataExtra.push(m.extra);
            
            const totalMes = m.saripan + m.modular + m.extra; 
            totalAno += totalMes;
            
            // Formatado sem os centavos (toFixed(0)) para caber perfeito na tela do celular
            htmlTabela += `<tr>
                <td>${MESES[m.mes].substring(0,3)}</td>
                <td class="esconder-valor" style="text-align:right">R$ ${m.saripan.toFixed(0)}</td>
                <td class="esconder-valor" style="text-align:right">R$ ${m.modular.toFixed(0)}</td>
                <td class="esconder-valor" style="text-align:right; color:#f57c00;">R$ ${m.extra.toFixed(0)}</td>
                <td class="esconder-valor fin-row-total" style="text-align:right">R$ ${totalMes.toFixed(0)}</td>
            </tr>`;
        });
        htmlTabela += `</tbody></table>`;
        
        const media = mesesDoAno.length > 0 ? (totalAno / mesesDoAno.length) : 0;
        htmlFinal += `<div style="margin-bottom: 30px;">
            <h4 style="color: #f57c00; border-bottom: 2px solid #ffe0b2; padding-bottom: 5px;">JB ANALYTICS ${ano}</h4>
            <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                <div class="year-summary" style="flex: 1; padding: 10px;">
                    <h4>RENDA TOTAL</h4>
                    <div class="year-total-value esconder-valor" style="font-size: 17px; margin-top: 10px;">${totalAno.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</div>
                </div>
                <div class="year-summary" style="flex: 1; padding: 10px; background: #e3f2fd; border-color: #90caf9;">
                    <h4>MÉDIA MENSAL</h4>
                    <div class="year-total-value esconder-valor" style="font-size: 17px; color: #0d47a1; margin-top: 10px;">${media.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</div>
                </div>
            </div>
            <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #ddd;">
                <div style="position: relative; height: 250px; width: 100%;">
                    <canvas id="grafico-geral-${ano}" class="esconder-valor"></canvas>
                </div>
            </div>
            ${htmlTabela}
        </div>`;

        setTimeout(() => {
            const ctx = document.getElementById(`grafico-geral-${ano}`);
            if(ctx) {
                const chart = new Chart(ctx, { 
                    type: 'bar', 
                    data: { 
                        labels: labels, 
                        datasets: [ 
                            { label: 'Modular', data: dataMod, backgroundColor: '#1565c0' }, 
                            { label: 'Saripan', data: dataSari, backgroundColor: '#43a047' },
                            { label: 'Extras', data: dataExtra, backgroundColor: '#fbc02d' }
                        ] 
                    }, 
                    options: { 
                        responsive: true, 
                        maintainAspectRatio: false, 
                        scales: { x: { stacked: true }, y: { stacked: true } }, 
                        plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } } } 
                    } 
                });
                window.chartsAtivos.push(chart);
            }
        }, 100);
    });
    
    container.innerHTML = htmlFinal;
}

function definirDatasAtuais() {
    const d = new Date();
    const ano = d.getFullYear(), mes = String(d.getMonth() + 1).padStart(2, '0'), dia = String(d.getDate()).padStart(2, '0');
    if(document.getElementById('dataServico')) document.getElementById('dataServico').value = `${ano}-${mes}-${dia}`;
    if(document.getElementById('mesModular')) document.getElementById('mesModular').value = `${ano}-${mes}`;
    if(document.getElementById('dataExtra')) document.getElementById('dataExtra').value = `${ano}-${mes}-${dia}`;
}

window.addEventListener('DOMContentLoaded', () => {
    const privSalva = localStorage.getItem('saripan_privacidade') === 'true';
    if(privSalva) document.body.classList.add('modo-privacidade');
    definirDatasAtuais();
    ['valorBase', 'tipoCarga', 'tipoDia'].forEach(id => document.getElementById(id)?.addEventListener('input', window.atualizarPreview));
    window.atualizarPreview();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
});
