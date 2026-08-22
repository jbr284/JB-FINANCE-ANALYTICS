// === modulos/receitas.js ===
import { db } from './firebase-config.js';
import { collection, getDocs, getDoc, setDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { MESES } from './ui.js';

// --- FUNÇÕES GERAIS ---
window.carregarTodosOsDados = async () => {
    try {
        const snapSari = await getDocs(collection(db, "apontamentos"));
        window.registros = snapSari.docs.map(doc => doc.data());
        
        const snapMod = await getDocs(collection(db, "renda_modular"));
        window.registrosModular = snapMod.docs.map(doc => doc.data());

        const snapExtra = await getDocs(collection(db, "renda_extra"));
        window.registrosExtra = snapExtra.docs.map(doc => doc.data());

        // Carrega Configurações (Bancos Padrão e Salário Base)
        ['modular_salario_base', 'pref_banco_sari', 'pref_banco_mod', 'pref_banco_flash', 'pref_banco_mp'].forEach(k => {
            const val = localStorage.getItem(k);
            if(val) {
                const mapId = {
                    'modular_salario_base': 'valorSalarioBase', 'pref_banco_sari': 'bancoSaripan',
                    'pref_banco_mod': 'bancoModular', 'pref_banco_flash': 'bancoFlash', 'pref_banco_mp': 'bancoMercadoPago'
                };
                const el = document.getElementById(mapId[k]);
                if (el) el.value = val;
            }
        });
        window.atualizarPreviewModular();

        window.renderizarApontamentosSaripan(); 
        window.atualizarRodapeDinamico(); 
    } catch (e) { console.error(e); }
};

window.obterPeriodo = (dataStr) => {
    const dateObj = new Date(dataStr);
    return { ano: dateObj.getUTCFullYear(), mes: dateObj.getUTCMonth(), dia: dateObj.getUTCDate(), quinzena: dateObj.getUTCDate() <= 15 ? 1 : 2 };
};

window.atualizarPreview = () => {
    const base = parseFloat(document.getElementById('valorBase').value) || 0;
    const carga = parseInt(document.getElementById('tipoCarga').value);
    const tipoDia = parseInt(document.getElementById('tipoDia').value);
    const multiplicador = ((tipoDia === 3 || tipoDia === 2) && carga === 2) ? 4 : (carga * ((tipoDia === 3 || tipoDia === 2) ? 2 : 1));
    const previewEl = document.getElementById('previewValor');
    if (previewEl) previewEl.value = `R$ ${(base * multiplicador).toFixed(2)}`;
};

window.atualizarPreviewModular = () => {
    const base = parseFloat(document.getElementById('valorSalarioBase').value) || 0;
    const previewEl = document.getElementById('previewAdiantamento');
    if (previewEl) previewEl.value = (base * 0.40).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
};

window.atualizarRodapeDinamico = () => {
    const d = document.getElementById('dataServico').value;
    if (!d) return;
    const p = window.obterPeriodo(d);
    let qtd = 0, tot = 0;
    window.registros.forEach(r => { if(r.ano === p.ano && r.mes === p.mes && r.quinzena === p.quinzena) { qtd += r.multiplicador; tot += r.total; }});
    document.getElementById('rodape-qtd').innerText = qtd;
    document.getElementById('rodape-total').innerText = tot.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
    document.getElementById('rodape-ref').innerText = `Referência: ${p.quinzena}ª Quinz. de ${MESES[p.mes]} ${p.ano}`;
};

window.limparGraficos = () => { if (window.chartsAtivos) { window.chartsAtivos.forEach(c => c.destroy()); window.chartsAtivos = []; }};

// --- MÓDULO SARIPAN ---
window.adicionarRegistro = async () => {
    const d = document.getElementById('dataServico').value;
    if (!d) return alert("Data inválida!");
    
    const bancoSari = document.getElementById('bancoSaripan') ? document.getElementById('bancoSaripan').value : '';
    if(bancoSari) localStorage.setItem('pref_banco_sari', bancoSari); // Memoriza a escolha
    
    const base = parseFloat(document.getElementById('valorBase').value);
    const carga = parseInt(document.getElementById('tipoCarga').value);
    const tipoDia = parseInt(document.getElementById('tipoDia').value);
    const p = window.obterPeriodo(d);
    const multiplicador = ((tipoDia === 3 || tipoDia === 2) && carga === 2) ? 4 : (carga * ((tipoDia === 3 || tipoDia === 2) ? 2 : 1));
    const total = base * multiplicador;
    const idUnico = Date.now().toString(); 
    
    const novoReg = { id: idUnico, data: d, ano: p.ano, mes: p.mes, quinzena: p.quinzena, carga, tipoDia, valorBase: base, multiplicador, total, bancoDestino: bancoSari };
    try {
        await setDoc(doc(db, "apontamentos", idUnico), novoReg);
        window.registros.push(novoReg);
        window.renderizarApontamentosSaripan(); window.atualizarRodapeDinamico(); window.mostrarToast("Diária registrada!"); 
    } catch(e) { console.error(e); }
};

window.excluirRegistro = async (id) => {
    if (!confirm("Excluir este apontamento?")) return;
    try {
        await deleteDoc(doc(db, "apontamentos", id.toString()));
        window.registros = window.registros.filter(r => r.id.toString() !== id.toString());
        window.renderizarApontamentosSaripan(); window.atualizarRodapeDinamico();
    } catch(e) { console.error(e); }
};

window.excluirQuinzena = async (chaveGrupo) => {
    if (!confirm("Excluir TUDO desta quinzena?")) return;
    const [ano, mes, q] = chaveGrupo.split('-').map(Number);
    const itens = window.registros.filter(r => r.ano === ano && r.mes === mes && r.quinzena === q);
    try {
        for (const item of itens) { await deleteDoc(doc(db, "apontamentos", item.id.toString())); }
        window.registros = window.registros.filter(r => !(r.ano === ano && r.mes === mes && r.quinzena === q));
        window.renderizarApontamentosSaripan(); window.atualizarRodapeDinamico();
    } catch(e) { console.error(e); }
};

window.renderizarApontamentosSaripan = () => { /* Mantido Intacto (Visual das Quinzenas) */ };
window.compartilharRelatorio = async (chaveGrupo) => { /* Mantido Intacto (WhatsApp) */ };
window.renderizarFinanceiroSaripan = () => { /* Mantido Intacto (Gráficos) */ };

// --- MÓDULO MODULAR E EXTRA ---
window.adicionarRegistroModular = async () => {
    const mesStr = document.getElementById('mesModular').value; 
    if (!mesStr) return alert("Selecione o mês.");
    
    // Captura os Bancos e Memoriza
    const bMod = document.getElementById('bancoModular')?.value || '';
    const bFlash = document.getElementById('bancoFlash')?.value || '';
    const bMP = document.getElementById('bancoMercadoPago')?.value || '';
    
    if(bMod) localStorage.setItem('pref_banco_mod', bMod);
    if(bFlash) localStorage.setItem('pref_banco_flash', bFlash);
    if(bMP) localStorage.setItem('pref_banco_mp', bMP);
    
    const salarioBase = parseFloat(document.getElementById('valorSalarioBase').value) || 0;
    if(salarioBase > 0) localStorage.setItem('modular_salario_base', salarioBase.toString());

    const adiantamentoCalculado = salarioBase * 0.40;
    const salarioTela = parseFloat(document.getElementById('valorSalario').value) || 0;
    const outrasTela = parseFloat(document.getElementById('valorOutras').value) || 0;
    const nomeOutras = document.getElementById('nomeOutras')?.value.trim() || 'Extra';
    
    const [ano, mesNum] = mesStr.split('-').map(Number);
    const idUnico = `MOD-${ano}-${mesNum}`; 
    
    // SEPARAÇÃO CONTÁBIL EXATA: Apenas Remuneração aqui.
    const totalRemuneracao = adiantamentoCalculado + salarioTela + outrasTela; 
    const totalBeneficiosFixos = 600 + 500 + 125; // 1225
    
    const novoReg = { 
        id: idUnico, ano: ano, mes: mesNum - 1, 
        bancoSalario: bMod, bancoVA: bFlash, bancoAjuda: bMP, 
        salarioBase: salarioBase, adiantamento: adiantamentoCalculado, 
        salario: salarioTela, outras: outrasTela, nomeOutras: nomeOutras,
        total: totalRemuneracao, totalBeneficios: totalBeneficiosFixos
    };
    try {
        await setDoc(doc(db, "renda_modular", idUnico), novoReg, { merge: true });
        window.registrosModular = window.registrosModular.filter(r => r.id !== idUnico);
        window.registrosModular.push(novoReg);
        window.renderizarHistoricoModular(); window.mostrarToast("Modular (Salário e Benefícios) Salvos!");
    } catch(e) { console.error(e); }
};

window.excluirRegistroModular = async (id) => {
    if (!confirm("Excluir?")) return;
    try {
        await deleteDoc(doc(db, "renda_modular", id));
        window.registrosModular = window.registrosModular.filter(r => r.id !== id);
        window.renderizarHistoricoModular();
    } catch(e) { console.error(e); }
};

window.renderizarHistoricoModular = () => {
    const container = document.getElementById('lista-modular-container');
    if(!container) return;
    container.innerHTML = "";
    const regs = [...window.registrosModular].sort((a, b) => a.ano !== b.ano ? b.ano - a.ano : b.mes - a.mes);
    if (regs.length === 0) { container.innerHTML = "<p style='text-align:center;'>Sem dados.</p>"; return; }
    
    let tableHtml = `<table><thead><tr><th>Período</th><th style="text-align:right">Salário Real</th><th></th></tr></thead><tbody>`;
    regs.forEach(r => { 
        // Agora mostra só a remuneração real na tabela
        tableHtml += `<tr><td>${MESES[r.mes]} ${r.ano}</td><td class="esconder-valor" style="text-align:right; font-weight:bold; color:#0d47a1;">R$ ${r.total.toFixed(2)}</td><td style="text-align:center;"><span style="color:red; cursor:pointer;" onclick="window.excluirRegistroModular('${r.id}')">✖</span></td></tr>`; 
    });
    tableHtml += `</tbody></table>`;
    container.innerHTML = tableHtml;
};

window.adicionarRegistroExtra = async () => {
    const d = document.getElementById('dataExtra').value;
    const desc = document.getElementById('descExtra').value.trim() || 'Renda Extra';
    const valor = parseFloat(document.getElementById('valorExtra').value);
    const bancoExt = document.getElementById('bancoExtra')?.value || '';
    
    if (!d || isNaN(valor) || valor <= 0) return alert("Preencha a data e um valor válido.");
    if (!bancoExt) return alert("Selecione em qual banco esta Renda Extra caiu.");
    
    const p = window.obterPeriodo(d);
    const idUnico = `EXT-${Date.now()}`;
    const novoReg = { id: idUnico, data: d, ano: p.ano, mes: p.mes, descricao: desc, total: valor, bancoDestino: bancoExt };
    try {
        await setDoc(doc(db, "renda_extra", idUnico), novoReg);
        window.registrosExtra.push(novoReg);
        window.renderizarHistoricoExtra(); window.renderizarDashboardGeral(); window.mostrarToast("Renda Extra registrada!");
    } catch(e) { console.error(e); }
};

window.excluirRegistroExtra = async (id) => { /* Mantido Intacto */ };
window.renderizarHistoricoExtra = () => { /* Mantido Intacto */ };

window.renderizarDashboardGeral = () => {
    window.limparGraficos();
    const container = document.getElementById('dashboard-geral-content');
    if(!container) return;
    const dadosGerais = {}; 
    let anosEncontrados = new Set();
    
    const initData = (ano, mes) => {
        const k = `${ano}-${mes}`; 
        anosEncontrados.add(ano);
        if(!dadosGerais[k]) dadosGerais[k] = { ano: ano, mes: mes, saripan: 0, modular: 0, extra: 0, beneficios: 0 };
        return k;
    };

    window.registros.forEach(r => { const k = initData(r.ano, r.mes); dadosGerais[k].saripan += r.total; });
    window.registrosModular.forEach(r => { 
        const k = initData(r.ano, r.mes); 
        dadosGerais[k].modular += r.total; // Só Salário
        dadosGerais[k].beneficios += (r.totalBeneficios || 0); // Só Benefício
    });
    window.registrosExtra.forEach(r => { const k = initData(r.ano, r.mes); dadosGerais[k].extra += r.total; });

    const anosOrdenados = Array.from(anosEncontrados).sort((a,b) => b-a);
    if(anosOrdenados.length === 0) { container.innerHTML = "<p style='text-align:center;'>Sem dados.</p>"; return; }
    
    let htmlFinal = '';
    
    anosOrdenados.forEach(ano => {
        const mesesDoAno = Object.values(dadosGerais).filter(d => d.ano === ano).sort((a,b) => a.mes - b.mes);
        let totalFaturamentoAno = 0; 
        const labels = [], dataSari = [], dataMod = [], dataExtra = [], dataBen = [];
        
        let htmlTabela = `<table class="fin-table" style="margin-top:20px; margin-bottom:30px; font-size: 11px;"><thead><tr><th>Mês</th><th style="text-align:right">Saripan</th><th style="text-align:right">Mod(Sal)</th><th style="text-align:right; color:#ffb74d;">Extra</th><th style="text-align:right; color:#2e7d32;">(Ben)</th><th style="text-align:right; background:#003c8f; color:white;">Total Real</th></tr></thead><tbody>`;
        
        mesesDoAno.forEach(m => {
            labels.push(MESES[m.mes].substring(0,3)); 
            dataSari.push(m.saripan); 
            dataMod.push(m.modular); 
            dataExtra.push(m.extra);
            dataBen.push(m.beneficios);
            
            const totalRemuneracaoMes = m.saripan + m.modular + m.extra; // Benefícios FORA do Faturamento
            totalFaturamentoAno += totalRemuneracaoMes;
            
            htmlTabela += `<tr>
                <td>${MESES[m.mes].substring(0,3)}</td>
                <td class="esconder-valor" style="text-align:right">R$ ${m.saripan.toFixed(0)}</td>
                <td class="esconder-valor" style="text-align:right">R$ ${m.modular.toFixed(0)}</td>
                <td class="esconder-valor" style="text-align:right; color:#f57c00;">R$ ${m.extra.toFixed(0)}</td>
                <td class="esconder-valor" style="text-align:right; color:#2e7d32; font-style:italic;">+ R$ ${m.beneficios.toFixed(0)}</td>
                <td class="esconder-valor fin-row-total" style="text-align:right">R$ ${totalRemuneracaoMes.toFixed(0)}</td>
            </tr>`;
        });
        htmlTabela += `</tbody></table>`;
        
        const media = mesesDoAno.length > 0 ? (totalFaturamentoAno / mesesDoAno.length) : 0;
        htmlFinal += `<div style="margin-bottom: 30px;">
            <h4 style="color: #f57c00; border-bottom: 2px solid #ffe0b2; padding-bottom: 5px;">JB FINANCE ANALYTICS ${ano}</h4>
            <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                <div class="year-summary" style="flex: 1; padding: 10px;">
                    <h4>FATURAMENTO REAL (Sem Benefícios)</h4>
                    <div class="year-total-value esconder-valor" style="font-size: 15px; margin-top: 10px;">${totalFaturamentoAno.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</div>
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
                    // Agora o gráfico tem os benefícios como uma cor separada no topo
                    data: { labels: labels, datasets: [ 
                        { label: 'Mod(Salário)', data: dataMod, backgroundColor: '#1565c0' }, 
                        { label: 'Saripan', data: dataSari, backgroundColor: '#43a047' }, 
                        { label: 'Extras', data: dataExtra, backgroundColor: '#fbc02d' },
                        { label: 'Benefícios (Flash/MP)', data: dataBen, backgroundColor: '#81c784' } 
                    ] }, 
                    options: { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true } }, plugins: { legend: { position: 'top', labels: { boxWidth: 10, font: { size: 10 } } } } } 
                });
                window.chartsAtivos.push(chart);
            }
        }, 100);
    });
    
    container.innerHTML = htmlFinal;
};
