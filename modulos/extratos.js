// === modulos/extratos.js ===

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

// O Robô de Processamento Profissional para o Bradesco Real
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

    // Inteligência de Auto-Categorização por Palavras-Chave
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
        
        // Verifica se a linha começa com uma data válida (DD/MM/YY)
        if (dataStr.match(/^\d{2}\/\d{2}\/\d{2}/)) {
            let historico = colunas[1] ? colunas[1].trim() : "Sem descrição";
            
            // CAPTURA COMPLETA DA SEGUNDA LINHA (Complemento do Bradesco, ex: "Mercado Villa")
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
                    valor: valorFinal,
                    tipo: tipoTransacao,
                    categoriaSugerida: categoriaSugerida,
                    idBanco: idBanco
                });
            }
        }
    }

    renderizarTabelaConciliacao(transacoesExtraidas);
}

// Desenha a Tabela Completa na Tela com Categoria Inteligente
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
        <button class="btn-action btn-green" style="margin-top: 20px; font-size: 16px; padding: 15px;" onclick="alert('Salvar no Firebase: Funcionalidade em construção no próximo passo!')">💾 Salvar e Conciliar Despesas</button>
    `;

    container.innerHTML = html;
    window.mostrarToast(`Sucesso! ${transacoes.length} transações completas carregadas.`);
}

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
