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

// Variáveis globais para armazenar os dados exatos na memória
window.transacoesExtratoAtual = [];
window.listaLancamentosExtratos = [];
window.chartPizzaInstance = null;

// Carrega os lançamentos salvos do Firestore para a Aba 3
window.carregarLancamentosExtratos = async () => {
    try {
        const snap = await getDocs(collection(db, "extratos_lancamentos"));
        window.listaLancamentosExtratos = snap.docs.map(d => d.data());
        if (window.renderizarRelatoriosConsolidados) window.renderizarRelatoriosConsolidados();
    } catch (e) {
        console.error("Erro ao carregar extratos_lancamentos:", e);
    }
};

// O Robô de Processamento Profissional
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
            analisarDadosBradescoReal(results.data, bancoSelecionado);
        },
        error: function(err) {
            alert("Erro ao ler o arquivo: " + err);
        }
    });
};

function analisarDadosBradescoReal(linhasArray, idBanco) {
    let transacoesExtraidas = [];

    const parseValorBradesco = (val) => {
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

            let valCredito = parseValorBradesco(colunas[3]);
            let valDebito = parseValorBradesco(colunas[4]);

            let valorFinal = 0;
            let tipoTransacao = "credito";

            if (valCredito > 0) {
                valorFinal = valCredito;
                tipoTransacao = "credito";
            } else if (valDebito !== 0) {
                valorFinal = -Math.abs(valDebito);
                tipoTransacao = "debito";
            }

            if (valorFinal !== 0) {
                let categoriaSugerida = tipoTransacao === 'debito' ? autoCategorizar(historico) : 'Entrada';
                transacoesExtraidas.push({
                    data: dataStr,
                    descricao: historico,
                    valor: valorFinal, // O número real puro e correto!
                    tipo: tipoTransacao,
                    categoriaSugerida: categoriaSugerida,
                    idBanco: idBanco
                });
            }
        }
    }

    // Salva na memória do sistema para usarmos na hora de gravar no Firebase
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

    transacoes.forEach((t, index) => {
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

// A Função Real de Gravação no Firebase (Lê da memória e não da tela!)
window.salvarEConciliarExtrato = async () => {
    const bancoId = document.getElementById('bancoExtratoUpload').value;
    if (!bancoId) return alert("Selecione a conta bancária de origem.");

    if (!window.transacoesExtratoAtual || window.transacoesExtratoAtual.length === 0) {
        return alert("Nenhuma transação para salvar.");
    }

    if (!confirm(`Deseja salvar e conciliar estas ${window.transacoesExtratoAtual.length} transações no banco de dados?`)) return;

    window.mostrarToast("Salvando transações no Firebase...");

    // Pega as linhas da tabela apenas para descobrir qual categoria o utilizador escolheu
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
                valor: t.valor, // Puxa o float perfeito gravado na memória (-15.01)
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

        if (window.carregarLancamentosExtratos) {
            await window.carregarLancamentosExtratos();
        }

    } catch (e) {
        console.error("Erro ao salvar no Firebase:", e);
        alert("Ocorreu um erro ao salvar as transações. Verifique a consola.");
    }
};

// Motor de Cálculo e Renderização dos Relatórios Consolidados (Aba 3)
window.renderizarRelatoriosConsolidados = () => {
    const elSaldo = document.getElementById('relatorio-saldo-total');
    const elDespesas = document.getElementById('relatorio-total-despesas');
    const tabelaContainer = document.getElementById('tabela-categorias-detalhe');
    const listaContainer = document.getElementById('lista-lancamentos-conciliados');

    if (!elSaldo || !elDespesas) return;

    let saldoInicialTotal = 0;
    if (window.listaBancos && Array.isArray(window.listaBancos)) {
        saldoInicialTotal = window.listaBancos.reduce((acc, b) => acc + (parseFloat(b.saldoInicial) || 0), 0);
    }

    let totalCreditos = 0;
    let totalDebitos = 0;
    const gastosPorCategoria = {};

    CATEGORIAS_PADRAO.forEach(c => { gastosPorCategoria[c] = 0; });

    window.listaLancamentosExtratos.forEach(lanc => {
        const val = parseFloat(lanc.valor) || 0;
        if (lanc.tipo === 'debito' || val < 0) {
            const valAbs = Math.abs(val);
            totalDebitos += valAbs;
            const cat = lanc.categoria || 'Outros';
            gastosPorCategoria[cat] = (gastosPorCategoria[cat] || 0) + valAbs;
        } else {
            totalCreditos += val;
        }
    });

    const saldoRemanescente = saldoInicialTotal + totalCreditos - totalDebitos;

    elSaldo.innerText = saldoRemanescente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    elDespesas.innerText = totalDebitos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Renderiza Gráfico de Pizza (Chart.js)
    const ctxPizza = document.getElementById('grafico-despesas-pizza');
    if (ctxPizza) {
        if (window.chartPizzaInstance) {
            window.chartPizzaInstance.destroy();
        }

        const categoriasComGasto = Object.keys(gastosPorCategoria).filter(k => gastosPorCategoria[k] > 0);
        const valoresComGasto = categoriasComGasto.map(k => gastosPorCategoria[k]);
        
        const cores = [
            '#e53935', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa', 
            '#00acc1', '#3949ab', '#d81b60', '#7cb342', '#6d4c41'
        ];

        if (valoresComGasto.length > 0) {
            window.chartPizzaInstance = new Chart(ctxPizza, {
                type: 'doughnut',
                data: {
                    labels: categoriasComGasto,
                    datasets: [{
                        data: valoresComGasto,
                        backgroundColor: cores.slice(0, categoriasComGasto.length),
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const val = context.parsed || 0;
                                    const pct = totalDebitos > 0 ? ((val / totalDebitos) * 100).toFixed(1) : 0;
                                    return ` ${context.label}: R$ ${val.toFixed(2)} (${pct}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    // Tabela Detalhada de Categorias
    if (tabelaContainer) {
        let htmlTab = `
            <table style="width: 100%; font-size: 12px; border-collapse: collapse; margin-top: 15px;">
                <thead>
                    <tr style="background: #f3e5f5; border-bottom: 2px solid #ce93d8;">
                        <th style="padding: 8px; text-align: left;">Categoria</th>
                        <th style="padding: 8px; text-align: right;">Total Gasto</th>
                        <th style="padding: 8px; text-align: right;">%</th>
                    </tr>
                </thead>
                <tbody>
        `;

        Object.keys(gastosPorCategoria).sort((a,b) => gastosPorCategoria[b] - gastosPorCategoria[a]).forEach(cat => {
            const gasto = gastosPorCategoria[cat];
            if (gasto > 0) {
                const pct = totalDebitos > 0 ? ((gasto / totalDebitos) * 100).toFixed(1) : 0;
                htmlTab += `
                    <tr style="border-bottom: 1px solid #f3e5f5;">
                        <td style="padding: 8px; font-weight: bold; color: #455a64;">${cat}</td>
                        <td class="esconder-valor" style="padding: 8px; text-align: right; color: #d32f2f; font-weight: bold;">R$ ${gasto.toFixed(2)}</td>
                        <td style="padding: 8px; text-align: right; color: #666;">${pct}%</td>
                    </tr>
                `;
            }
        });

        htmlTab += `</tbody></table>`;
        tabelaContainer.innerHTML = htmlTab;
    }

    // Lista de Lançamentos Gravados
    if (listaContainer) {
        if (window.listaLancamentosExtratos.length === 0) {
            listaContainer.innerHTML = "<p style='text-align:center; color:#999; font-size:13px;'>Nenhum lançamento conciliado ainda.</p>";
            return;
        }

        let htmlList = `<div style="background: white; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;"><table style="width:100%; font-size:12px; border-collapse:collapse;"><tbody>`;
        
        window.listaLancamentosExtratos.slice().reverse().forEach(item => {
            const ehDebito = item.tipo === 'debito' || parseFloat(item.valor) < 0;
            const cor = ehDebito ? '#d32f2f' : '#2e7d32';
            const icon = ehDebito ? '🔻' : '🟢';
            htmlList += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 8px; color: #666;">${item.data}</td>
                    <td style="padding: 8px; color: #333; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.descricao}</td>
                    <td style="padding: 8px; text-align: right; font-weight: bold; color: ${cor};" class="esconder-valor">${icon} R$ ${Math.abs(item.valor).toFixed(2)}</td>
                    <td style="padding: 8px; text-align: center; color: #888; font-size: 11px;">${item.categoria}</td>
                </tr>
            `;
        });

        htmlList += `</tbody></table></div>`;
        listaContainer.innerHTML = htmlList;
    }
};

window.atualizarSelectBancosUpload = () => {
    const selectUpload = document.getElementById('bancoExtratoUpload');
    if (!selectUpload) return;

    if (window.listaBancos.length === 0) {
        selectUpload.innerHTML = `<option value="">Aguardando Cadastro de Bancos...</option>`;
        return;
    }

    selectUpload.innerHTML = `<option value="">Selecione a Conta do Extrato...</option>`;
    window.listaBancos.forEach(b => {
        selectUpload.innerHTML += `<option value="${b.id}">${b.nome}</option>`;
    });
};
