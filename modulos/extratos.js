// === modulos/extratos.js ===
import { db } from './firebase-config.js';
import { collection, getDocs, setDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const CATEGORIAS_PADRAO = [
    "Outros",
    "Supermercado",
    "Açougue",
    "Fastfood",
    "Posto de Combustível",
    "Lazer",
    "Doações",
    "Contas de Consumo",
    "Educação"
];

// Memória Global da Aba
window.transacoesExtratoAtual = [];
window.listaLancamentosExtratos = [];
window.chartPizzaInstance = null;
window.mapaNomesBancos = {};

// 1. CARREGADOR DE DADOS DO FIREBASE
window.carregarLancamentosExtratos = async () => {
    try {
        const snap = await getDocs(collection(db, "extratos_lancamentos"));
        window.listaLancamentosExtratos = snap.docs.map(d => d.data());
        if (window.renderizarRelatoriosConsolidados) window.renderizarRelatoriosConsolidados();
    } catch (e) {
        console.error("Erro ao carregar extratos_lancamentos:", e);
    }
};

// 2. ROBÔ LEITOR DE ARQUIVOS (Papa Parse Universal)
window.processarCSV = () => {
    const bancoSelecionado = document.getElementById('bancoExtratoUpload').value;
    const fileInput = document.getElementById('arquivoCSV');

    if (!bancoSelecionado) return alert("Por favor, selecione para qual banco este extrato pertence.");
    if (!fileInput.files.length) return alert("Por favor, selecione um arquivo CSV do seu banco.");

    const file = fileInput.files[0];

    Papa.parse(file, {
        encoding: "ISO-8859-1", 
        skipEmptyLines: true,
        complete: function(results) {
            analisarDadosBancarios(results.data, bancoSelecionado);
        },
        error: function(err) {
            alert("Erro ao ler o arquivo: " + err);
        }
    });
};

function analisarDadosBancarios(linhasArray, idBanco) {
    let transacoesExtraidas = [];

    const parseValor = (val) => {
        if (!val || typeof val !== 'string') return 0;
        let str = val.replace(/R\$/g, '').trim();
        if (str === "" || str === "-" || str === "0,00" || str === "0.00") return 0;
        str = str.replace(/\./g, '').replace(',', '.');
        return parseFloat(str) || 0;
    };

    const autoCategorizar = (desc) => {
        const d = desc.toUpperCase();
        if (d.includes('MERCADO') || d.includes('SUPER') || d.includes('ATACAD') || d.includes('HIPER') || d.includes('HORTI')) return 'Supermercado';
        if (d.includes('ACOUGUE') || d.includes('CARNE') || d.includes('FRIGO')) return 'Açougue';
        if (d.includes('IFOOD') || d.includes('RESTAURANTE') || d.includes('PIZZA') || d.includes('LANCHONETE') || d.includes('PADARIA') || d.includes('MC DONALDS') || d.includes('BURGER')) return 'Fastfood';
        if (d.includes('POSTO') || d.includes('SHELL') || d.includes('IPIRANGA') || d.includes('PETRO') || d.includes('COMBUSTIVEL')) return 'Posto de Combustível';
        if (d.includes('NETFLIX') || d.includes('SPOTIFY') || d.includes('UBER') || d.includes('99') || d.includes('CINEMA')) return 'Lazer';
        if (d.includes('LUZ') || d.includes('AGUA') || d.includes('ENERGIA') || d.includes('TELEFONE') || d.includes('INTERNET') || d.includes('CLARO') || d.includes('VIVO') || d.includes('TIM')) return 'Contas de Consumo';
        if (d.includes('ESCOLA') || d.includes('FACULDADE') || d.includes('CURSO') || d.includes('LIVRO')) return 'Educação';
        return 'Outros';
    };

    for (let i = 0; i < linhasArray.length; i++) {
        const colunas = linhasArray[i];
        if (!colunas || colunas.length === 0) continue;

        let dataStr = colunas[0] ? colunas[0].trim() : "";
        
        if (dataStr.match(/^\d{2}\/\d{2}\/\d{2}/)) {
            let historico = colunas[1] ? colunas[1].trim() : "Sem descrição";
            let valorFinal = 0;
            let tipoTransacao = "credito";

            // Se for Banco Tradicional / Bradesco (5 colunas)
            if (colunas.length >= 5) {
                if (i + 1 < linhasArray.length) {
                    let proximaLinha = linhasArray[i + 1];
                    let proximaData = proximaLinha[0] ? proximaLinha[0].trim() : "";
                    if (!proximaData.match(/^\d{2}\/\d{2}\/\d{2}/)) {
                        let complemento = proximaLinha[1] || proximaLinha[0];
                        if (complemento && complemento.trim() !== "") {
                            historico += " - " + complemento.trim();
                        }
                    }
                }
                let valCredito = parseValor(colunas[3]);
                let valDebito = parseValor(colunas[4]);
                if (valCredito > 0) { valorFinal = valCredito; tipoTransacao = "credito"; } 
                else if (valDebito !== 0) { valorFinal = -Math.abs(valDebito); tipoTransacao = "debito"; }
            } 
            // Se for Digital / Mercado Pago (3 colunas)
            else {
                let valUnico = parseValor(colunas[2]);
                if (valUnico !== 0) {
                    valorFinal = valUnico;
                    tipoTransacao = valUnico < 0 ? "debito" : "credito";
                }
            }

            if (valorFinal !== 0) {
                let categoriaSugerida = tipoTransacao === 'debito' ? autoCategorizar(historico) : 'Entrada';
                transacoesExtraidas.push({
                    data: dataStr,
                    descricao: historico,
                    valor: valorFinal,
                    tipo: tipoTransacao,
                    categoriaSugerida: categoriaSugerida,
                    idBanco: idBanco
                });
            }
        }
    }

    window.transacoesExtratoAtual = transacoesExtraidas;
    renderizarTabelaConciliacao(transacoesExtraidas);
}

function renderizarTabelaConciliacao(transacoes) {
    const container = document.getElementById('tabela-conciliacao-container');
    if (transacoes.length === 0) {
        container.innerHTML = `<p style="color: red; text-align: center; font-weight: bold; background: #ffebee; padding: 15px; border-radius: 8px;">Nenhuma transação válida encontrada.</p>`;
        return;
    }

    let html = `
        <h4 style="color:#002f6c; margin-bottom: 10px; margin-top: 20px;">Pré-visualização do Extrato (${transacoes.length} transações encontradas)</h4>
        <p style="font-size: 12px; color: #666; margin-bottom: 15px;">Os <b>Créditos</b> são entradas. Classifique as suas <b>Despesas (Débitos)</b> abaixo.</p>
        <div style="background: white; border: 1px solid #cfd8dc; border-radius: 8px; overflow-x: auto; max-height: 400px;">
        <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
            <thead>
                <tr style="background: #eceff1; border-bottom: 2px solid #b0bec5; position: sticky; top: 0;">
                    <th style="padding: 10px 5px; text-align: left;">Data</th>
                    <th style="padding: 10px 5px; text-align: left;">Descrição Original Completa</th>
                    <th style="padding: 10px 5px; text-align:right">Valor</th>
                    <th style="padding: 10px 5px; text-align:center;">Categoria (Sugerida)</th>
                </tr>
            </thead>
            <tbody>
    `;

    transacoes.forEach((t) => {
        const corValor = t.tipo === 'debito' ? '#d32f2f' : '#2e7d32'; 
        const iconTipo = t.tipo === 'debito' ? '🔻' : '🟢';
        let selectCategorias = `<select class="select-categoria" style="width: 100%; padding: 6px; border-radius: 4px; border: 1px solid #b0bec5; background: #fafafa;">`;
        CATEGORIAS_PADRAO.forEach(cat => {
            const selecionado = cat === t.categoriaSugerida ? 'selected' : '';
            selectCategorias += `<option value="${cat}" ${selecionado}>${cat}</option>`;
        });
        selectCategorias += `</select>`;
        
        html += `
            <tr style="border-bottom: 1px solid #eceff1;">
                <td style="padding: 10px 5px; color: #455a64; white-space: nowrap;">${t.data}</td>
                <td style="padding: 10px 5px; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #37474f; font-weight: 500;" title="${t.descricao}">
                    ${t.descricao}
                </td>
                <td style="padding: 10px 5px; text-align:right; font-weight: bold; color: ${corValor}; white-space: nowrap;">
                    ${iconTipo} R$ ${Math.abs(t.valor).toFixed(2)}
                </td>
                <td style="padding: 6px 5px; text-align:center;">
                    ${t.tipo === 'debito' ? selectCategorias : '<span style="color:#78909c; font-size: 11px; font-weight: bold;">(Entrada)</span>'}
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
        </div>
        <button class="btn-action btn-green" style="margin-top: 20px; font-size: 16px; padding: 15px;" onclick="window.salvarEConciliarExtrato()">💾 Salvar e Conciliar Despesas</button>
    `;

    container.innerHTML = html;
    window.mostrarToast(`Sucesso! ${transacoes.length} transações prontas para salvar.`);
}

window.salvarEConciliarExtrato = async () => {
    const bancoId = document.getElementById('bancoExtratoUpload').value;
    if (!bancoId) return alert("Selecione a conta bancária de origem.");
    if (!window.transacoesExtratoAtual || window.transacoesExtratoAtual.length === 0) return alert("Nenhuma transação para salvar.");
    if (!confirm(`Deseja salvar e conciliar estas ${window.transacoesExtratoAtual.length} transações?`)) return;

    window.mostrarToast("Salvando transações no Firebase...");
    const linhasTabela = document.querySelectorAll('#tabela-conciliacao-container tbody tr');

    try {
        for (let i = 0; i < window.transacoesExtratoAtual.length; i++) {
            const t = window.transacoesExtratoAtual[i];
            let categoriaFinal = 'Entrada';
            if (t.tipo === 'debito') {
                if (linhasTabela[i]) {
                    const selectCat = linhasTabela[i].querySelector('.select-categoria');
                    if (selectCat) categoriaFinal = selectCat.value;
                } else {
                    categoriaFinal = t.categoriaSugerida || 'Outros';
                }
            }

            const idTransacao = `TRANS-${Date.now()}-${i}`;
            const transacaoObj = {
                id: idTransacao,
                idBanco: bancoId,
                data: t.data,
                descricao: t.descricao,
                valor: t.valor,
                tipo: t.tipo,
                categoria: categoriaFinal,
                timestamp: Date.now()
            };

            await setDoc(doc(db, "extratos_lancamentos", idTransacao), transacaoObj);
        }

        window.mostrarToast("✅ Todas as transações foram salvas com sucesso!");
        document.getElementById('tabela-conciliacao-container').innerHTML = `
            <div style="background: #e8f5e9; border: 1px solid #a5d6a7; padding: 20px; border-radius: 8px; text-align: center; margin-top: 20px;">
                <h4 style="color: #2e7d32; margin-bottom: 5px;">🎉 Conciliação Concluída com Sucesso!</h4>
                <p style="font-size: 13px; color: #555;">As despesas e entradas foram gravadas e já estão visíveis nos Relatórios Consolidados.</p>
            </div>
        `;
        if (window.carregarLancamentosExtratos) await window.carregarLancamentosExtratos();

    } catch (e) {
        console.error("Erro ao salvar no Firebase:", e);
        alert("Ocorreu um erro ao salvar as transações.");
    }
};

// =====================================================================
// 3. O CORAÇÃO DA ABA 3: RELATÓRIOS CONSOLIDADOS E A LUPA
// =====================================================================
window.renderizarRelatoriosConsolidados = () => {
    const elSaldoRemanescente = document.getElementById('relatorio-saldo-total');
    const tabelaContainer = document.getElementById('tabela-categorias-detalhe');
    const bancosContainer = document.getElementById('relatorio-por-banco-container');

    if (!elSaldoRemanescente) return;

    let saldoInicialGeral = 0;
    window.mapaNomesBancos = {}; 

    const resumoPorBanco = {};
    if (window.listaBancos && Array.isArray(window.listaBancos)) {
        window.listaBancos.forEach(b => {
            const si = parseFloat(b.saldoInicial) || 0;
            saldoInicialGeral += si;
            window.mapaNomesBancos[b.id] = b.nome;
            resumoPorBanco[b.id] = { nome: b.nome, saldoInicial: si, entradas: 0, saidas: 0, saldoFinal: si };
        });
    }

    let totalCreditosGeral = 0;
    let totalDebitosGeral = 0;
    const gastosPorCategoria = {};
    CATEGORIAS_PADRAO.forEach(c => { gastosPorCategoria[c] = 0; });

    window.listaLancamentosExtratos.forEach(lanc => {
        const val = parseFloat(lanc.valor) || 0;
        const bId = lanc.idBanco;
        const ehDebito = lanc.tipo === 'debito' || val < 0;
        const valAbs = Math.abs(val);

        if (ehDebito) {
            totalDebitosGeral += valAbs;
            const cat = lanc.categoria || 'Outros';
            gastosPorCategoria[cat] = (gastosPorCategoria[cat] || 0) + valAbs;
        } else {
            totalCreditosGeral += valAbs;
        }

        if (bId && resumoPorBanco[bId]) {
            if (ehDebito) {
                resumoPorBanco[bId].saidas += valAbs;
                resumoPorBanco[bId].saldoFinal -= valAbs;
            } else {
                resumoPorBanco[bId].entradas += valAbs;
                resumoPorBanco[bId].saldoFinal += valAbs;
            }
        }
    });

    // 3.1 O PULSO DA CONTA (Saldos)
    const saldoRemanescenteGeral = saldoInicialGeral + totalCreditosGeral - totalDebitosGeral;
    elSaldoRemanescente.innerText = saldoRemanescenteGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    if (bancosContainer) {
        const idsBancosAtivos = Object.keys(resumoPorBanco).filter(id => resumoPorBanco[id].entradas > 0 || resumoPorBanco[id].saidas > 0 || resumoPorBanco[id].saldoInicial !== 0);
        
        if (idsBancosAtivos.length === 0) {
            bancosContainer.innerHTML = "<p style='text-align:center; color:#999; font-size:12px;'>Nenhum banco possui lançamentos ainda.</p>";
        } else {
            let htmlBancos = '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px;">';
            idsBancosAtivos.forEach(id => {
                const b = resumoPorBanco[id];
                const corSaldo = b.saldoFinal < 0 ? '#c62828' : '#0d47a1';
                htmlBancos += `
                <div style="background: white; border: 1px solid #cfd8dc; border-radius: 6px; padding: 10px; text-align: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                    <div style="font-size: 11px; color: #546e7a; font-weight: bold; margin-bottom: 5px;">${b.nome}</div>
                    <div class="esconder-valor" style="font-size: 16px; font-weight: bold; color: ${corSaldo};">R$ ${b.saldoFinal.toFixed(2)}</div>
                    <div class="esconder-valor" style="font-size: 9px; color: #90a4ae; margin-top: 5px;">Inic: R$ ${b.saldoInicial.toFixed(2)} | Ent: R$ ${b.entradas.toFixed(2)} | Sai: R$ ${b.saidas.toFixed(2)}</div>
                </div>
                `;
            });
            htmlBancos += '</div>';
            bancosContainer.innerHTML = htmlBancos;
        }
    }

    // 3.2 O GRÁFICO DE PIZZA
    const ctxPizza = document.getElementById('grafico-despesas-pizza');
    if (ctxPizza) {
        if (window.chartPizzaInstance) window.chartPizzaInstance.destroy();
        const categoriasComGasto = Object.keys(gastosPorCategoria).filter(k => gastosPorCategoria[k] > 0);
        const valoresComGasto = categoriasComGasto.map(k => gastosPorCategoria[k]);
        const cores = ['#e53935', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#00acc1', '#3949ab', '#d81b60', '#7cb342', '#6d4c41'];
        if (valoresComGasto.length > 0) {
            window.chartPizzaInstance = new Chart(ctxPizza, {
                type: 'doughnut',
                data: { labels: categoriasComGasto, datasets: [{ data: valoresComGasto, backgroundColor: cores.slice(0, categoriasComGasto.length), borderWidth: 2 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } } }
            });
        }
    }

    if (tabelaContainer) {
        let htmlTab = `<table style="width: 100%; font-size: 12px; border-collapse: collapse; margin-top: 15px;"><thead><tr style="background: #fff3e0; border-bottom: 2px solid #ffb74d;"><th style="padding: 8px; text-align: left; color:#e65100;">Categoria</th><th style="padding: 8px; text-align: right; color:#e65100;">Total Gasto</th><th style="padding: 8px; text-align: right; color:#e65100;">%</th></tr></thead><tbody>`;
        Object.keys(gastosPorCategoria).sort((a,b) => gastosPorCategoria[b] - gastosPorCategoria[a]).forEach(cat => {
            const gasto = gastosPorCategoria[cat];
            if (gasto > 0) {
                const pct = totalDebitosGeral > 0 ? ((gasto / totalDebitosGeral) * 100).toFixed(1) : 0;
                htmlTab += `<tr style="border-bottom: 1px solid #fff3e0;"><td style="padding: 8px; font-weight: bold; color: #455a64;">${cat}</td><td class="esconder-valor" style="padding: 8px; text-align: right; color: #d32f2f; font-weight: bold;">R$ ${gasto.toFixed(2)}</td><td style="padding: 8px; text-align: right; color: #666;">${pct}%</td></tr>`;
            }
        });
        htmlTab += `</tbody></table>`;
        tabelaContainer.innerHTML = htmlTab;
    }

    // 3.3 A LUPA (Prepara Dropdowns e Ativa Filtro)
    window.preencherFiltrosLupa();
    window.filtrarLancamentosLupa();
};

window.preencherFiltrosLupa = () => {
    const selBanco = document.getElementById('filtroBancoLupa');
    const selCat = document.getElementById('filtroCategoriaLupa');
    if(!selBanco || !selCat) return;

    let hBancos = '<option value="TODOS">🏦 Todos os Bancos</option>';
    if (window.listaBancos) {
        window.listaBancos.forEach(b => { hBancos += `<option value="${b.id}">${b.nome}</option>`; });
    }
    selBanco.innerHTML = hBancos;

    let hCats = '<option value="TODAS">🏷️ Todas as Categorias / Entradas</option><option value="Entrada">🟢 Entradas (Créditos)</option>';
    CATEGORIAS_PADRAO.forEach(c => { hCats += `<option value="${c}">${c}</option>`; });
    selCat.innerHTML = hCats;
};

window.filtrarLancamentosLupa = () => {
    const bId = document.getElementById('filtroBancoLupa')?.value || 'TODOS';
    const cat = document.getElementById('filtroCategoriaLupa')?.value || 'TODAS';
    const listaContainer = document.getElementById('lista-lancamentos-conciliados');
    if (!listaContainer) return;

    let filtrados = window.listaLancamentosExtratos || [];

    if (bId !== 'TODOS') filtrados = filtrados.filter(t => t.idBanco === bId);
    if (cat !== 'TODAS') filtrados = filtrados.filter(t => t.categoria === cat);

    if (filtrados.length === 0) {
        listaContainer.innerHTML = "<p style='text-align:center; color:#999; font-size:13px; padding: 20px; background: white; border-radius: 8px; border: 1px solid #ddd;'>Nenhum lançamento encontrado para estes filtros 🔍</p>";
        return;
    }

    let totalFiltradoDinheiro = 0;
    let htmlList = `<div style="background: white; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;"><table style="width:100%; font-size:12px; border-collapse:collapse;"><tbody>`;
    
    filtrados.slice().sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).forEach(item => {
        const ehDebito = item.tipo === 'debito' || parseFloat(item.valor) < 0;
        const val = Math.abs(item.valor);
        const cor = ehDebito ? '#d32f2f' : '#2e7d32';
        const icon = ehDebito ? '🔻' : '🟢';
        const nomeDoBanco = window.mapaNomesBancos[item.idBanco] || 'Banco Desconhecido';
        
        if(ehDebito) totalFiltradoDinheiro -= val; else totalFiltradoDinheiro += val;

        htmlList += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px; color: #666; width: 60px;">${item.data}</td>
                <td style="padding: 8px; color: #333; max-width: 150px;">
                    <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: bold;">${item.descricao}</div>
                    <div style="font-size: 10px; color: #999; margin-top: 2px;">${item.categoria} • ${nomeDoBanco}</div>
                </td>
                <td style="padding: 8px; text-align: right; font-weight: bold; color: ${cor}; width: 90px;" class="esconder-valor">${icon} R$ ${val.toFixed(2)}</td>
                <td style="padding: 8px; text-align: center; color: #f57c00; font-size: 14px; width: 30px; cursor: pointer;" title="Excluir Lançamento" onclick="window.excluirLancamentoExtrato('${item.id}')">🗑️</td>
            </tr>
        `;
    });

    htmlList += `</tbody></table></div>`;
    
    const corTotalFiltrado = totalFiltradoDinheiro < 0 ? '#d32f2f' : '#2e7d32';
    const txtPesquisa = `<div style="text-align: right; padding: 10px; font-size: 12px; color: #666;">Soma do filtro atual: <strong class="esconder-valor" style="color: ${corTotalFiltrado}; font-size: 14px;">R$ ${totalFiltradoDinheiro.toFixed(2)}</strong></div>`;

    listaContainer.innerHTML = htmlList + txtPesquisa;
};

window.excluirLancamentoExtrato = async (id) => {
    if (!confirm("Excluir esta transação dos relatórios permanentemente?")) return;
    try {
        await deleteDoc(doc(db, "extratos_lancamentos", id));
        window.mostrarToast("Transação excluída!");
        await window.carregarLancamentosExtratos();
    } catch(e) { alert("Erro ao excluir transação."); }
};

window.atualizarSelectBancosUpload = () => {
    const selectUpload = document.getElementById('bancoExtratoUpload');
    if (!selectUpload) return;
    if (window.listaBancos.length === 0) { selectUpload.innerHTML = `<option value="">Aguardando Cadastro de Bancos...</option>`; return; }
    selectUpload.innerHTML = `<option value="">Selecione a Conta do Extrato...</option>`;
    window.listaBancos.forEach(b => { selectUpload.innerHTML += `<option value="${b.id}">${b.nome}</option>`; });
};
