// === app.js (O Monólito JB Analytics) ===

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, getDocs, getDoc, setDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// !!! COLOQUE A SUA CONFIGURAÇÃO DO FIREBASE AQUI !!!
  const firebaseConfig = {
  apiKey: "AIzaSyCNHOPKa320_cY0KUY8vBVVYRmcYkmWo0Y",
  authDomain: "bd-saripan.firebaseapp.com",
  projectId: "bd-saripan",
  storageBucket: "bd-saripan.firebasestorage.app",
  messagingSenderId: "545578993360",
  appId: "1:545578993360:web:d410a5cbedd914ad3800d5"
  // cole as suas chaves do firebase
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

window.db = db;
window.registros = [];
window.registrosModular = [];
window.registrosExtra = [];
window.chartsAtivos = [];

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const BENEFICIOS_FIXOS = 1225; // 600 VA + 500 Mob + 125 Ajuda

// ==========================================
// 1. CARREGADOR E ROBÔ AUTOMÁTICO
// ==========================================
window.carregarTodosOsDados = async () => {
    try {
        const snapSari = await getDocs(collection(db, "apontamentos"));
        window.registros = snapSari.docs.map(d => d.data());
        
        const snapMod = await getDocs(collection(db, "renda_modular"));
        window.registrosModular = snapMod.docs.map(d => d.data());

        const snapExtra = await getDocs(collection(db, "renda_extra"));
        window.registrosExtra = snapExtra.docs.map(d => d.data());

        // Carrega Configuração do Salário Base
        try {
            const confSnap = await getDoc(doc(db, "configuracoes", "modular_base"));
            if (confSnap.exists() && confSnap.data().salarioBase) {
                const base = parseFloat(confSnap.data().salarioBase);
                localStorage.setItem('modular_salario_base', base);
                const inputBase = document.getElementById('configSalarioBase');
                if (inputBase) inputBase.value = base;
            }
        } catch (e) { console.log("Aviso config modular:", e); }

        // Ativa o Robô do Adiantamento Automático!
        await verificarEGerarAdiantamentoAutomatico();

        if (window.renderizarApontamentosSaripan) window.renderizarApontamentosSaripan(); 
        if (window.atualizarRodapeDinamico) window.atualizarRodapeDinamico(); 
        if (window.renderizarFinanceiroSaripan) window.renderizarFinanceiroSaripan();
        if (window.preencherFormularioModular) window.preencherFormularioModular();
        if (window.renderizarHistoricoModular) window.renderizarHistoricoModular();
        if (window.renderizarHistoricoExtra) window.renderizarHistoricoExtra();
        if (window.renderizarDashboardGeral) window.renderizarDashboardGeral();

    } catch (e) { console.error(e); }
};

// O ROBÔ DO DIA 15
async function verificarEGerarAdiantamentoAutomatico() {
    const baseVal = parseFloat(localStorage.getItem('modular_salario_base')) || 0;
    if (baseVal <= 0) return; 

    const hoje = new Date();
    if (hoje.getDate() < 15) return; 

    const ano = hoje.getFullYear();
    const mes = hoje.getMonth(); 
    const mesReal = mes + 1;
    const idUnico = `MOD-${ano}-${mesReal}`;

    const existe = window.registrosModular.find(r => r.id === idUnico);
    
    if (!existe) {
        const adiantamento = baseVal * 0.40;
        
        const novoReg = {
            id: idUnico, ano: ano, mes: mes,
            salarioBase: baseVal,
            adiantamento: adiantamento,
            salario: 0,
            outras: 0,
            nomeOutras: '',
            beneficios: BENEFICIOS_FIXOS,
            totalRemunerativo: adiantamento, 
            totalGeral: adiantamento + BENEFICIOS_FIXOS,
            geradoAutomaticamente: true
        };

        await setDoc(doc(db, "renda_modular", idUnico), novoReg);
        window.registrosModular.push(novoReg);
        console.log("Robô: Adiantamento gerado automaticamente para o dia 15!");
    }
}

// ==========================================
// 2. MÓDULO MODULAR (MATEMÁTICA AVANÇADA)
// ==========================================
window.salvarSalarioBase = async () => {
    const base = parseFloat(document.getElementById('configSalarioBase').value) || 0;
    if (base <= 0) return alert("Digite um valor válido para o Salário Base.");

    try {
        await setDoc(doc(db, "configuracoes", "modular_base"), { salarioBase: base }, { merge: true });
        localStorage.setItem('modular_salario_base', base);
        window.preencherFormularioModular();
        window.mostrarToast("Salário Base salvo! O robô usará este valor.");
    } catch(e) { console.error(e); alert("Erro ao salvar Salário Base"); }
};

window.preencherFormularioModular = () => {
    const mesStr = document.getElementById('mesModular').value;
    if (!mesStr) return;
    
    const [anoStr, mesStrNum] = mesStr.split('-');
    const idUnico = `MOD-${anoStr}-${parseInt(mesStrNum)}`;
    
    const reg = window.registrosModular.find(r => r.id === idUnico);
    const salarioBase = parseFloat(localStorage.getItem('modular_salario_base')) || 0;
    const adiantCalculado = salarioBase * 0.40;

    if (reg) {
        document.getElementById('viewAdiantamento').value = `R$ ${reg.adiantamento.toFixed(2)}`;
        document.getElementById('inputSalarioLiquido').value = reg.salario > 0 ? reg.salario : '';
        document.getElementById('inputExtras').value = reg.outras > 0 ? reg.outras : '';
        document.getElementById('descExtras').value = reg.nomeOutras || '';
    } else {
        document.getElementById('viewAdiantamento').value = `R$ ${adiantCalculado.toFixed(2)}`;
        document.getElementById('inputSalarioLiquido').value = '';
        document.getElementById('inputExtras').value = '';
        document.getElementById('descExtras').value = '';
    }
};

window.salvarMesModular = async () => {
    const mesStr = document.getElementById('mesModular').value;
    if (!mesStr) return alert("Selecione o mês de referência.");

    const salarioBase = parseFloat(localStorage.getItem('modular_salario_base')) || 0;
    if (salarioBase <= 0) return alert("Configure e salve o seu Salário Base primeiro!");

    const [anoStr, mesStrNum] = mesStr.split('-');
    const ano = parseInt(anoStr);
    const mes = parseInt(mesStrNum) - 1;
    const idUnico = `MOD-${ano}-${mes + 1}`;

    const adiantamento = salarioBase * 0.40;
    const salarioLiq = parseFloat(document.getElementById('inputSalarioLiquido').value) || 0;
    const extras = parseFloat(document.getElementById('inputExtras').value) || 0;
    const descExtras = document.getElementById('descExtras').value || '';

    const totalRemunerativo = adiantamento + salarioLiq + extras;
    const totalGeral = totalRemunerativo + BENEFICIOS_FIXOS;

    const novoReg = {
        id: idUnico, ano: ano, mes: mes,
        salarioBase: salarioBase,
        adiantamento: adiantamento,
        salario: salarioLiq,
        outras: extras,
        nomeOutras: descExtras,
        beneficios: BENEFICIOS_FIXOS,
        totalRemunerativo: totalRemunerativo,
        totalGeral: totalGeral,
        geradoAutomaticamente: false
    };

    try {
        await setDoc(doc(db, "renda_modular", idUnico), novoReg, { merge: true });
        window.registrosModular = window.registrosModular.filter(r => r.id !== idUnico);
        window.registrosModular.push(novoReg);
        window.renderizarHistoricoModular();
        window.renderizarDashboardGeral();
        window.mostrarToast("Fechamento mensal salvo com sucesso!");
    } catch(e) { console.error(e); }
};

window.excluirRegistroModular = async (id) => {
    if (!confirm("Excluir este registo do Modular?")) return;
    try {
        await deleteDoc(doc(db, "renda_modular", id));
        window.registrosModular = window.registrosModular.filter(r => r.id !== id);
        window.renderizarHistoricoModular();
        window.renderizarDashboardGeral();
    } catch(e) { console.error(e); }
};

window.renderizarHistoricoModular = () => {
    const container = document.getElementById('lista-modular-container');
    if(!container) return;
    container.innerHTML = "";
    
    const regs = [...window.registrosModular].sort((a, b) => a.ano !== b.ano ? b.ano - a.ano : b.mes - a.mes);
    if (regs.length === 0) { container.innerHTML = "<p style='text-align:center;'>Sem dados.</p>"; return; }
    
    let tableHtml = `<div style="overflow-x: auto; background: white; border-radius: 8px; border: 1px solid #cfd8dc;">
        <table style="width: 100%; min-width: 600px; font-size: 11px; border-collapse: collapse; text-align: center;">
        <thead>
            <tr style="background: #e3f2fd; border-bottom: 2px solid #90caf9;">
                <th style="padding: 10px 5px; text-align: left;">Mês/Ano</th>
                <th style="padding: 10px 5px;">Adiant.</th>
                <th style="padding: 10px 5px;">Sal. Líq.</th>
                <th style="padding: 10px 5px; color:#2e7d32;">Benef.</th>
                <th style="padding: 10px 5px;">Extras</th>
                <th style="padding: 10px 5px; background: #bbdefb;">Total Rem.</th>
                <th style="padding: 10px 5px; background: #c8e6c9;">T. Rem + Ben</th>
                <th></th>
            </tr>
        </thead><tbody>`;
        
    regs.forEach(r => { 
        const tr = r.totalRemunerativo || 0;
        const tg = r.totalGeral || 0;
        tableHtml += `
            <tr style="border-bottom: 1px solid #eceff1;">
                <td style="padding: 10px 5px; text-align: left; font-weight: bold; color: #455a64;">${MESES[r.mes]} ${r.ano}</td>
                <td class="esconder-valor" style="padding: 10px 5px;">R$ ${r.adiantamento.toFixed(2)}</td>
                <td class="esconder-valor" style="padding: 10px 5px;">R$ ${r.salario.toFixed(2)}</td>
                <td class="esconder-valor" style="padding: 10px 5px; color:#2e7d32; font-style: italic;">R$ ${r.beneficios.toFixed(2)}</td>
                <td class="esconder-valor" style="padding: 10px 5px;" title="${r.nomeOutras || ''}">R$ ${r.outras.toFixed(2)}</td>
                <td class="esconder-valor" style="padding: 10px 5px; background: #e3f2fd; font-weight: bold; color: #1565c0;">R$ ${tr.toFixed(2)}</td>
                <td class="esconder-valor" style="padding: 10px 5px; background: #e8f5e9; font-weight: bold; color: #1b5e20;">R$ ${tg.toFixed(2)}</td>
                <td style="padding: 10px 5px;"><span style="color:red; cursor:pointer; font-size:14px;" onclick="window.excluirRegistroModular('${r.id}')">✖</span></td>
            </tr>`; 
    });
    tableHtml += `</tbody></table></div>`;
    container.innerHTML = tableHtml;
};

// ==========================================
// 3. VISÃO GERAL (DASHBOARD)
// ==========================================
window.renderizarDashboardGeral = () => {
    const container = document.getElementById('dashboard-geral-content');
    if(!container) return;
    
    const dadosGerais = {}; 
    let anosEncontrados = new Set();
    
    const initData = (ano, mes) => {
        const k = `${ano}-${mes}`; 
        anosEncontrados.add(ano);
        if(!dadosGerais[k]) dadosGerais[k] = { ano: ano, mes: mes, saripan: 0, modularRem: 0, modularBen: 0, extra: 0 };
        return k;
    };

    window.registros.forEach(r => { const k = initData(r.ano, r.mes); dadosGerais[k].saripan += r.total; });
    window.registrosModular.forEach(r => { 
        const k = initData(r.ano, r.mes); 
        dadosGerais[k].modularRem += (r.totalRemunerativo || 0); 
        dadosGerais[k].modularBen += (r.beneficios || 0); 
    });
    window.registrosExtra.forEach(r => { const k = initData(r.ano, r.mes); dadosGerais[k].extra += r.total; });

    const anosOrdenados = Array.from(anosEncontrados).sort((a,b) => b-a);
    if(anosOrdenados.length === 0) { container.innerHTML = "<p style='text-align:center;'>Sem dados.</p>"; return; }
    
    let htmlFinal = '';
    
    anosOrdenados.forEach(ano => {
        const mesesDoAno = Object.values(dadosGerais).filter(d => d.ano === ano).sort((a,b) => a.mes - b.mes);
        let totalAcumuladoAno = 0; 
        const labels = [], dataSari = [], dataModRem = [], dataBen = [], dataExtra = [];
        
        mesesDoAno.forEach(m => {
            labels.push(MESES[m.mes].substring(0,3)); 
            dataSari.push(m.saripan); 
            dataModRem.push(m.modularRem); 
            dataBen.push(m.modularBen);
            dataExtra.push(m.extra);
            totalAcumuladoAno += (m.saripan + m.modularRem + m.modularBen + m.extra);
        });
        
        const media = mesesDoAno.length > 0 ? (totalAcumuladoAno / mesesDoAno.length) : 0;
        htmlFinal += `<div style="margin-bottom: 30px;">
            <h4 style="color: #f57c00; border-bottom: 2px solid #ffe0b2; padding-bottom: 5px;">ANÁLISE FINANCEIRA ${ano}</h4>
            <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                <div class="year-summary" style="flex: 1; padding: 10px; border-color: #ffcc80;">
                    <h4>PODER DE COMPRA REAL</h4>
                    <div class="year-total-value esconder-valor" style="font-size: 15px; margin-top: 10px; color: #e65100;">${totalAcumuladoAno.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</div>
                </div>
                <div class="year-summary" style="flex: 1; padding: 10px; background: #e3f2fd; border-color: #90caf9;">
                    <h4>MÉDIA MENSAL</h4>
                    <div class="year-total-value esconder-valor" style="font-size: 15px; color: #0d47a1; margin-top: 10px;">${media.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</div>
                </div>
            </div>
            <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #ddd;">
                <div style="position: relative; height: 250px; width: 100%;">
                    <canvas id="grafico-geral-${ano}" class="esconder-valor"></canvas>
                </div>
            </div>
        </div>`;

        setTimeout(() => {
            const ctx = document.getElementById(`grafico-geral-${ano}`);
            if(ctx) {
                const chart = new Chart(ctx, { 
                    type: 'bar', 
                    data: { labels: labels, datasets: [ 
                        { label: 'Mod (Remunerativo)', data: dataModRem, backgroundColor: '#1565c0' }, 
                        { label: 'Mod (Benefícios)', data: dataBen, backgroundColor: '#4dd0e1' }, 
                        { label: 'Saripan', data: dataSari, backgroundColor: '#43a047' }, 
                        { label: 'Extras', data: dataExtra, backgroundColor: '#fbc02d' }
                    ] }, 
                    options: { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true } }, plugins: { legend: { position: 'top', labels: { boxWidth: 10, font: { size: 10 } } } } } 
                });
                if (!window.chartsAtivos) window.chartsAtivos = [];
                window.chartsAtivos.push(chart);
            }
        }, 100);
    });
    
    container.innerHTML = htmlFinal;
};

// ==========================================
// 4. MÓDULO EXTRA
// ==========================================
window.adicionarRegistroExtra = async () => {
    const d = document.getElementById('dataExtra').value;
    const desc = document.getElementById('descExtra').value.trim() || 'Renda Extra';
    const valor = parseFloat(document.getElementById('valorExtra').value);
    
    if (!d || isNaN(valor) || valor <= 0) return alert("Preencha a data e um valor válido.");
    
    const dateObj = new Date(d);
    const p = { ano: dateObj.getUTCFullYear(), mes: dateObj.getUTCMonth() };
    const idUnico = `EXT-${Date.now()}`;
    const novoReg = { id: idUnico, data: d, ano: p.ano, mes: p.mes, descricao: desc, total: valor };
    try {
        await setDoc(doc(db, "renda_extra", idUnico), novoReg);
        window.registrosExtra.push(novoReg);
        window.renderizarHistoricoExtra(); 
        window.renderizarDashboardGeral(); 
        window.mostrarToast("Renda Extra registrada!");
    } catch(e) { console.error(e); }
};

window.excluirRegistroExtra = async (id) => { 
    if (!confirm("Deseja excluir esta Renda Extra?")) return;
    try {
        await deleteDoc(doc(db, "renda_extra", id));
        window.registrosExtra = window.registrosExtra.filter(r => r.id !== id);
        window.renderizarHistoricoExtra(); 
        window.renderizarDashboardGeral();
    } catch(e) { console.error(e); }
};

window.renderizarHistoricoExtra = () => {
    const container = document.getElementById('lista-extra-container');
    if(!container) return;
    container.innerHTML = "";
    const regs = [...window.registrosExtra].sort((a, b) => new Date(b.data) - new Date(a.data));
    if (regs.length === 0) { container.innerHTML = "<p style='text-align:center; font-size:13px; color:#999;'>Nenhuma renda extra registrada ainda.</p>"; return; }
    
    let htmlRows = regs.map(r => {
        const dataFmt = r.data.split('-').reverse().join('/');
        return `<tr><td style="padding: 10px;">${dataFmt}</td><td style="padding: 10px;">${r.descricao}</td><td class="td-valor esconder-valor" style="color:#f57c00; font-weight:bold; padding: 10px;">R$ ${r.total.toFixed(2)}</td><td style="padding: 10px; text-align:center;"><span style="color:red; cursor:pointer;" onclick="window.excluirRegistroExtra('${r.id}')">✖</span></td></tr>`;
    }).join('');
    
    container.innerHTML = `<div style="background: white; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;"><table style="width:100%; border-collapse:collapse; font-size: 13px;"><tbody>${htmlRows}</tbody></table></div>`;
};


// ==========================================
// 5. MÓDULO SARIPAN (MANTIDO NA ÍNTEGRA E EXPANDIDO)
// ==========================================
window.obterPeriodo = (dataStr) => {
    const dateObj = new Date(dataStr);
    return {
        ano: dateObj.getUTCFullYear(),
        mes: dateObj.getUTCMonth(),
        dia: dateObj.getUTCDate(),
        quinzena: dateObj.getUTCDate() <= 15 ? 1 : 2
    };
};

window.atualizarPreview = () => {
    const base = parseFloat(document.getElementById('valorBase').value) || 0;
    const carga = parseInt(document.getElementById('tipoCarga').value);
    const tipoDia = parseInt(document.getElementById('tipoDia').value);
    let multiplicador = 1;
    if (tipoDia === 3 || tipoDia === 2) {
        multiplicador = carga === 2 ? 4 : 2;
    } else {
        multiplicador = carga;
    }
    const previewEl = document.getElementById('previewValor');
    if (previewEl) previewEl.value = `R$ ${(base * multiplicador).toFixed(2)}`;
};

window.atualizarRodapeDinamico = () => {
    const dataInput = document.getElementById('dataServico').value;
    if (!dataInput) return;
    const p = window.obterPeriodo(dataInput);
    let qtdDiarias = 0;
    let totalDinheiro = 0;

    window.registros.forEach(r => {
        if (r.ano === p.ano && r.mes === p.mes && r.quinzena === p.quinzena) {
            qtdDiarias += r.multiplicador;
            totalDinheiro += r.total;
        }
    });

    const rodapeQtd = document.getElementById('rodape-qtd');
    const rodapeTotal = document.getElementById('rodape-total');
    const rodapeRef = document.getElementById('rodape-ref');

    if(rodapeQtd) rodapeQtd.innerText = qtdDiarias;
    if(rodapeTotal) rodapeTotal.innerText = totalDinheiro.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
    if(rodapeRef) rodapeRef.innerText = `Referência: ${p.quinzena}ª Quinz. de ${MESES[p.mes]} ${p.ano}`;
};

window.adicionarRegistro = async () => {
    const dataInput = document.getElementById('dataServico').value;
    if (!dataInput) return alert("Selecione uma data!");
    
    const base = parseFloat(document.getElementById('valorBase').value);
    const carga = parseInt(document.getElementById('tipoCarga').value);
    const tipoDia = parseInt(document.getElementById('tipoDia').value);
    const p = window.obterPeriodo(dataInput);
    
    let multiplicador = 1;
    if (tipoDia === 3 || tipoDia === 2) {
        multiplicador = carga === 2 ? 4 : 2;
    } else {
        multiplicador = carga;
    }
    
    const total = base * multiplicador;
    const idUnico = Date.now().toString();
    
    const novoRegistro = {
        id: idUnico,
        data: dataInput,
        ano: p.ano,
        mes: p.mes,
        quinzena: p.quinzena,
        carga: carga,
        tipoDia: tipoDia,
        valorBase: base,
        multiplicador: multiplicador,
        total: total
    };

    try {
        await setDoc(doc(db, "apontamentos", idUnico), novoRegistro);
        window.registros.push(novoRegistro);
        window.renderizarApontamentosSaripan();
        window.atualizarRodapeDinamico();
        window.renderizarFinanceiroSaripan();
        window.renderizarDashboardGeral();
        window.mostrarToast("Apontamento salvo com sucesso!");
    } catch (e) { console.error("Erro ao salvar", e); alert("Erro ao salvar!"); }
};

window.excluirRegistro = async (id) => {
    if (!confirm("Deseja realmente excluir este apontamento?")) return;
    try {
        await deleteDoc(doc(db, "apontamentos", id.toString()));
        window.registros = window.registros.filter(r => r.id.toString() !== id.toString());
        window.renderizarApontamentosSaripan();
        window.atualizarRodapeDinamico();
        window.renderizarFinanceiroSaripan();
        window.renderizarDashboardGeral();
    } catch (e) { console.error("Erro ao excluir", e); alert("Erro ao excluir!"); }
};

window.excluirQuinzena = async (chaveGrupo) => {
    if (!confirm("ATENÇÃO: Deseja realmente excluir TODOS os registros desta quinzena?")) return;
    
    const [anoStr, mesStr, quinzenaStr] = chaveGrupo.split('-');
    const ano = parseInt(anoStr);
    const mes = parseInt(mesStr);
    const quinzena = parseInt(quinzenaStr);

    const itensParaExcluir = window.registros.filter(r => r.ano === ano && r.mes === mes && r.quinzena === quinzena);

    try {
        for (const item of itensParaExcluir) {
            await deleteDoc(doc(db, "apontamentos", item.id.toString()));
        }
        window.registros = window.registros.filter(r => !(r.ano === ano && r.mes === mes && r.quinzena === quinzena));
        window.renderizarApontamentosSaripan();
        window.atualizarRodapeDinamico();
        window.renderizarFinanceiroSaripan();
        window.renderizarDashboardGeral();
        window.mostrarToast("Quinzena inteira excluída!");
    } catch (e) { console.error("Erro ao excluir quinzena", e); alert("Erro ao excluir quinzena"); }
};

window.renderizarApontamentosSaripan = () => {
    const container = document.getElementById('lista-quinzenas-container');
    if(!container) return;
    container.innerHTML = "";

    const msgVazia = document.getElementById('msg-sem-dados');

    if (window.registros.length === 0) {
        if(msgVazia) msgVazia.style.display = 'block';
        return;
    }
    if(msgVazia) msgVazia.style.display = 'none';

    const grupos = {};
    window.registros.forEach(reg => {
        const chave = `${reg.ano}-${reg.mes}-${reg.quinzena}`;
        if (!grupos[chave]) {
            grupos[chave] = { ano: reg.ano, mes: reg.mes, quinzena: reg.quinzena, itens: [], totalValor: 0 };
        }
        grupos[chave].itens.push(reg);
        grupos[chave].totalValor += reg.total;
    });

    const chavesOrdenadas = Object.keys(grupos).sort((a, b) => {
        const [anoA, mesA, qA] = a.split('-').map(Number);
        const [anoB, mesB, qB] = b.split('-').map(Number);
        if (anoA !== anoB) return anoB - anoA;
        if (mesA !== mesB) return mesB - mesA;
        return qB - qA;
    });

    chavesOrdenadas.forEach((chave, index) => {
        const grupo = grupos[chave];
        grupo.itens.sort((a, b) => new Date(a.data) - new Date(b.data));

        const isPrimeiro = index === 0;
        const activeClass = isPrimeiro ? 'active' : '';
        const openClass = isPrimeiro ? 'open' : '';

        const totalFormatado = grupo.totalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        let htmlRows = '';
        grupo.itens.forEach(item => {
            const [, mes, dia] = item.data.split('-');
            const dataFmt = `${dia}/${mes}`;
            const tipoStr = item.carga === 1 ? 'Normal' : 'Dupla';
            const diaStr = item.tipoDia === 1 ? 'Útil' : (item.tipoDia === 2 ? 'Dom' : 'Fer');
            const totalItemFmt = `R$ ${item.total.toFixed(2)}`;
            
            const diasSemana = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
            const dObj = new Date(item.data + 'T12:00:00');
            const diaDaSemana = diasSemana[dObj.getDay()];

            htmlRows += `
                <tr>
                    <td>${dataFmt}</td>
                    <td>${diaDaSemana}</td>
                    <td>${tipoStr}</td>
                    <td>${diaStr}</td>
                    <td class="td-valor esconder-valor">${totalItemFmt}</td>
                    <td class="td-acao">
                        <span style="color:red; cursor:pointer;" onclick="window.excluirRegistro('${item.id}')">✖</span>
                    </td>
                </tr>
            `;
        });

        const btnPrint = `
            <button class="btn-icon" style="color:#25D366; font-size: 20px; padding: 5px; margin-right: 5px;" onclick="event.stopPropagation(); window.compartilharRelatorio('${chave}')">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16"><path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/></svg>
            </button>
        `;

        const btnExcluirGrupo = `
            <button class="btn-icon" style="color:#d32f2f; font-size:20px; padding:5px;" onclick="event.stopPropagation(); window.excluirQuinzena('${chave}')">
                🗑️
            </button>
        `;

        const div = document.createElement('div');
        div.className = 'accordion-group';
        div.innerHTML = `
            <div class="accordion-header ${activeClass}" onclick="this.classList.toggle('active'); this.nextElementSibling.classList.toggle('open');">
                <div>
                    <div class="accordion-title">${grupo.quinzena}ª Quinzena - ${MESES[grupo.mes]} ${grupo.ano}</div>
                    <div class="accordion-meta">${grupo.itens.length} registros</div>
                </div>
                <div class="accordion-actions" style="display:flex; align-items:center;">
                    ${btnPrint}
                    ${btnExcluirGrupo}
                </div>
            </div>
            <div class="accordion-content ${openClass}">
                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Dia</th>
                            <th>Tipo</th>
                            <th>Detalhes</th>
                            <th style="text-align:right">Valor</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${htmlRows}
                        <tr class="total-row">
                            <td colspan="3">Total</td>
                            <td colspan="2" class="td-valor esconder-valor">${totalFormatado}</td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
        container.appendChild(div);
    });
};

window.compartilharRelatorio = async (chaveGrupo) => {
    const [anoStr, mesStr, quinzenaStr] = chaveGrupo.split('-');
    const ano = parseInt(anoStr);
    const mes = parseInt(mesStr);
    const quinzena = parseInt(quinzenaStr);

    const itens = window.registros
        .filter(r => r.ano === ano && r.mes === mes && r.quinzena === quinzena)
        .sort((a, b) => new Date(a.data) - new Date(b.data));

    if (itens.length === 0) return;

    let qtdNormal = 0;
    let qtdDupla = 0;
    let totalDinheiro = 0;
    let totalMultiplicador = 0;

    let tbodyHtml = '';
    itens.forEach(item => {
        totalDinheiro += item.total;
        totalMultiplicador += item.multiplicador;
        if (item.carga === 1) qtdNormal++; else qtdDupla++;

        const dataArr = item.data.split('-');
        const dataFmt = `${dataArr[2]}/${dataArr[1]}/${dataArr[0]}`;
        const tipoStr = item.carga === 1 ? 'Normal' : 'Dupla';
        const detalhesStr = item.tipoDia === 1 ? 'Dia Útil' : (item.tipoDia === 2 ? 'Domingo' : 'Feriado');
        const valorFmt = `R$ ${item.total.toFixed(2)}`;

        const diasSemana = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
        const dObj = new Date(item.data + 'T12:00:00');
        const diaDaSemana = diasSemana[dObj.getDay()];

        tbodyHtml += `
            <tr>
                <td style="padding: 10px 12px; border: 1px solid #ddd; color: #333;">${dataFmt}</td>
                <td style="padding: 10px 12px; border: 1px solid #ddd; color: #333;">${diaDaSemana}</td>
                <td style="padding: 10px 12px; border: 1px solid #ddd; color: #333;">${tipoStr}</td>
                <td style="padding: 10px 12px; border: 1px solid #ddd; color: #333;">${detalhesStr}</td>
                <td style="padding: 10px 12px; border: 1px solid #ddd; color: #333;">${valorFmt}</td>
            </tr>
        `;
    });

    document.getElementById('print-ref').innerText = `Referência: ${quinzena}ª Quinzena de ${MESES[mes]} ${ano}`;

    let resumoStr = '';
    if(qtdNormal > 0) resumoStr += `- ${qtdNormal} diária(s) normal<br>`;
    if(qtdDupla > 0) resumoStr += `- ${qtdDupla} diária(s) dupla<br>`;
    document.getElementById('print-resumo').innerHTML = resumoStr;

    document.getElementById('print-total-diarias').innerText = `Total: ${totalMultiplicador} diárias a receber`;

    document.getElementById('print-tbody').innerHTML = tbodyHtml;
    document.getElementById('print-valor-total').innerText = `R$ ${totalDinheiro.toFixed(2)}`;

    window.mostrarToast("Gerando imagem, por favor aguarde...");

    try {
        const template = document.getElementById('print-template');
        const canvas = await html2canvas(template, {
            scale: 2,
            backgroundColor: '#ffffff',
            logging: false
        });

        canvas.toBlob(async (blob) => {
            const fileName = `Relatorio_Saripan_${MESES[mes]}_Q${quinzena}_${ano}.png`;
            const file = new File([blob], fileName, { type: 'image/png' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        title: 'Relatório Saripan',
                        files: [file]
                    });
                } catch (err) {
                    console.log("Compartilhamento cancelado ou falhou", err);
                }
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                alert("O seu navegador não suporta compartilhamento direto para o WhatsApp. A imagem foi baixada para o seu dispositivo.");
            }
        }, 'image/png');

    } catch (e) {
        console.error(e);
        alert("Ocorreu um erro ao gerar a imagem.");
    }
};

window.renderizarFinanceiroSaripan = () => {
    const container = document.getElementById('financeiro-content');
    if(!container) return;

    const dadosPorMes = {};
    const totaisAnuais = {};

    window.registros.forEach(reg => {
        const chaveMes = `${reg.ano}-${reg.mes}`;
        if (!dadosPorMes[chaveMes]) {
            dadosPorMes[chaveMes] = { ano: reg.ano, mes: reg.mes, totalQ1: 0, totalQ2: 0 };
        }
        if (reg.quinzena === 1) {
            dadosPorMes[chaveMes].totalQ1 += reg.total;
        } else {
            dadosPorMes[chaveMes].totalQ2 += reg.total;
        }

        if (!totaisAnuais[reg.ano]) totaisAnuais[reg.ano] = 0;
        totaisAnuais[reg.ano] += reg.total;
    });

    const chavesOrdenadasMes = Object.keys(dadosPorMes).sort((a, b) => {
        const [anoA, mesA] = a.split('-').map(Number);
        const [anoB, mesB] = b.split('-').map(Number);
        if (anoA !== anoB) return anoB - anoA;
        return mesB - mesA;
    });

    const anosOrdenados = Object.keys(totaisAnuais).sort((a,b) => b-a);

    if (chavesOrdenadasMes.length === 0) {
        container.innerHTML = "<p style='text-align:center; padding: 20px; color:#999;'>Sem dados financeiros para exibir.</p>";
        return;
    }

    let htmlFinal = '';

    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth();
    const diaAtual = hoje.getDate();

    anosOrdenados.forEach(anoStr => {
        const ano = parseInt(anoStr);
        const chavesDesteAno = chavesOrdenadasMes.filter(k => k.startsWith(`${ano}-`));
        
        let totalAcumuladoDoAno = 0;
        let totalMesesFechados = 0;
        let qtdMesesFechados = 0;

        const labels = [];
        const dadosQ1 = [];
        const dadosQ2 = [];
        const dadosTotalMes = [];

        let htmlTabelaCorpo = '';

        chavesDesteAno.forEach(k => {
            const d = dadosPorMes[k];
            const totalMes = d.totalQ1 + d.totalQ2;
            totalAcumuladoDoAno += totalMes;

            if (d.ano < anoAtual || (d.ano === anoAtual && d.mes < mesAtual)) {
                totalMesesFechados += totalMes;
                qtdMesesFechados++;
            }

            labels.push(MESES[d.mes].substring(0, 3));
            dadosQ1.push(d.totalQ1);
            dadosQ2.push(d.totalQ2);
            dadosTotalMes.push(totalMes);

            htmlTabelaCorpo += `
                <tr>
                    <td>${MESES[d.mes]}</td>
                    <td style="text-align:right" class="esconder-valor">R$ ${d.totalQ1.toFixed(2)}</td>
                    <td style="text-align:right" class="esconder-valor">R$ ${d.totalQ2.toFixed(2)}</td>
                    <td style="text-align:right" class="fin-row-total esconder-valor">R$ ${totalMes.toFixed(2)}</td>
                </tr>
            `;
        });

        const mediaParcialFechada = qtdMesesFechados > 0 ? (totalMesesFechados / qtdMesesFechados) : 0;
        
        let divisorProporcional = chavesDesteAno.length;
        if (ano === anoAtual) {
            divisorProporcional = mesAtual + (diaAtual / 30);
        }
        const mediaTotalProporcional = divisorProporcional > 0 ? (totalAcumuladoDoAno / divisorProporcional) : 0;

        let htmlTabela = `
            <table class="fin-table" style="margin-bottom: 30px;">
                <thead>
                    <tr>
                        <th>Mês</th>
                        <th style="text-align:right">1ª Q.</th>
                        <th style="text-align:right">2ª Q.</th>
                        <th style="text-align:right; background:#003c8f; color:white;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${htmlTabelaCorpo}
                </tbody>
            </table>
        `;

        htmlFinal += `
            <h4 style="margin-top: 10px; color: #555; border-bottom: 2px solid #ddd; padding-bottom: 5px; text-transform: uppercase;">Resumo Saripan ${ano}</h4>
            
            <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                <div class="year-summary" style="flex: 1; padding: 10px;">
                    <h4>RENDIMENTO ANUAL</h4>
                    <div class="year-total-value esconder-valor" style="font-size: 17px; margin-top: 10px;">${totalAcumuladoDoAno.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</div>
                </div>

                <div class="year-summary" style="flex: 1.8; padding: 10px; background: #e3f2fd; border-color: #90caf9;">
                    <h4 style="color: #1565c0; font-size: 11px; margin-bottom: 10px;">Média Salarial</h4>
                    <div style="display: flex; justify-content: space-around; font-size: 14px; color: #0d47a1;">
                        <div style="text-align: center;">
                            <span style="font-size: 10px; font-weight: bold;">PARCIAL</span><br>
                            <strong class="esconder-valor" style="font-size: 15px;">${mediaParcialFechada.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</strong>
                        </div>
                        <div style="width: 1px; background: #bbdefb; margin: 0 5px;"></div>
                        <div style="text-align: center;">
                            <span style="font-size: 10px; font-weight: bold;">TOTAL</span><br>
                            <strong class="esconder-valor" style="font-size: 15px;">${mediaTotalProporcional.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</strong>
                        </div>
                    </div>
                </div>
            </div>

            <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #ddd; margin-bottom: 15px;">
                <h5 style="margin-bottom: 10px; color: #333; font-size: 12px; text-align: center;">Rendimento Mensal Consolidado</h5>
                <div style="position: relative; height: 200px; width: 100%; margin-bottom: 20px;">
                    <canvas id="grafico-sari-bar-${ano}" class="esconder-valor"></canvas>
                </div>
                
                <h5 style="margin-bottom: 10px; color: #333; font-size: 12px; text-align: center; border-top: 1px dashed #eee; padding-top: 15px;">Comparativo Quinzenal (Q1 vs Q2)</h5>
                <div style="position: relative; height: 200px; width: 100%;">
                    <canvas id="grafico-sari-line-${ano}" class="esconder-valor"></canvas>
                </div>
            </div>
            
            ${htmlTabela}
        `;

        setTimeout(() => {
            const ctxBar = document.getElementById(`grafico-sari-bar-${ano}`);
            if (ctxBar) {
                const chartBar = new Chart(ctxBar, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                label: 'Rendimento Mensal Total',
                                data: dadosTotalMes,
                                backgroundColor: '#1b5e20',
                                borderRadius: 6
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8, font: { size: 11 } } }
                        },
                        scales: { y: { beginAtZero: true } }
                    }
                });
                if (!window.chartsAtivos) window.chartsAtivos = [];
                window.chartsAtivos.push(chartBar);
            }

            const ctxLine = document.getElementById(`grafico-sari-line-${ano}`);
            if (ctxLine) {
                const chartLine = new Chart(ctxLine, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                label: '1ª Quinzena',
                                data: dadosQ1,
                                borderColor: '#81c784',
                                backgroundColor: 'rgba(129, 199, 132, 0.1)',
                                fill: true,
                                tension: 0.4,
                                pointRadius: 4,
                                pointHoverRadius: 6
                            },
                            {
                                label: '2ª Quinzena',
                                data: dadosQ2,
                                borderColor: '#2e7d32',
                                backgroundColor: 'rgba(46, 125, 50, 0.1)',
                                fill: true,
                                tension: 0.4,
                                pointRadius: 4,
                                pointHoverRadius: 6
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8, font: { size: 11 } } }
                        },
                        scales: { y: { beginAtZero: true } }
                    }
                });
                if (!window.chartsAtivos) window.chartsAtivos = [];
                window.chartsAtivos.push(chartLine);
            }
        }, 100);
    });

    container.innerHTML = htmlFinal;
};

// ==========================================
// 6. UI, NAVEGAÇÃO E AUTENTICAÇÃO
// ==========================================
window.mudarAba = (aba) => {
    document.querySelectorAll('#module-saripan .panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('#module-saripan .tab-btn').forEach(b => b.classList.remove('active'));
    const panel = document.getElementById(`painel-${aba}`);
    const btn = document.getElementById(`btn-tab-${aba}`);
    if (panel) panel.classList.add('active');
    if (btn) btn.classList.add('active');
    if (aba === 'financeiro' && window.renderizarFinanceiroSaripan) window.renderizarFinanceiroSaripan();
};

window.abrirModulo = (modulo) => {
    document.getElementById('tela-hub').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.querySelectorAll('.master-module').forEach(m => m.classList.remove('active'));
    const modEl = document.getElementById(`module-${modulo}`);
    if (modEl) modEl.classList.add('active');
    
    const titulos = {
        'saripan': 'Módulo SARIPAN',
        'modular': 'Módulo MODULAR',
        'geral': 'Visão Geral (Evolução)'
    };
    document.getElementById('app-title').innerText = titulos[modulo] || 'JB Finance Analytics';
    
    if (modulo === 'geral' && window.renderizarDashboardGeral) window.renderizarDashboardGeral();
    if (modulo === 'modular') {
        if (window.preencherFormularioModular) window.preencherFormularioModular();
        if (window.renderizarHistoricoModular) window.renderizarHistoricoModular();
    }
    if (modulo === 'saripan' && window.renderizarApontamentosSaripan) window.renderizarApontamentosSaripan();
};

window.voltarAoHub = () => {
    document.getElementById('app').classList.add('hidden');
    document.getElementById('tela-hub').classList.remove('hidden');
};

window.mostrarToast = (msg) => {
    const t = document.getElementById('toast');
    if (!t) return;
    t.innerText = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
};

window.togglePrivacidade = () => {
    document.body.classList.toggle('modo-privacidade');
    localStorage.setItem('saripan_privacidade', document.body.classList.contains('modo-privacidade'));
};

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

auth.onAuthStateChanged((user) => {
    if (user) {
        document.getElementById('tela-login').classList.add('hidden');
        document.getElementById('tela-hub').classList.remove('hidden');
        if (window.carregarTodosOsDados) window.carregarTodosOsDados();
    } else {
        document.getElementById('tela-login').classList.remove('hidden');
        document.getElementById('tela-hub').classList.add('hidden');
        document.getElementById('app').classList.add('hidden');
    }
});

window.addEventListener('DOMContentLoaded', () => {
    const privSalva = localStorage.getItem('saripan_privacidade') === 'true';
    if(privSalva) document.body.classList.add('modo-privacidade');
    
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    
    if (document.getElementById('dataServico')) document.getElementById('dataServico').value = `${ano}-${mes}-${dia}`;
    if (document.getElementById('dataExtra')) document.getElementById('dataExtra').value = `${ano}-${mes}-${dia}`;
    if (document.getElementById('mesModular')) document.getElementById('mesModular').value = `${ano}-${mes}`;
    
    ['valorBase', 'tipoCarga', 'tipoDia'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', window.atualizarPreview);
    });
});
