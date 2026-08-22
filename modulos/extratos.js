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

// O Robô de Processamento Definitivo para o Bradesco
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
            processarExtratoBradesco(results.data, bancoSelecionado);
        },
        error: function(err) {
            alert("Erro ao ler o arquivo: " + err);
        }
    });
};

function processarExtratoBradesco(linhasArray, idBanco) {
    let transacoesExtraidas = [];

    // Limpa e converte o formato monetário brasileiro para float
    const converterValor = (str) => {
        if (!str || typeof str !== 'string') return 0;
        let limpo = str.replace(/R\$/g, '').trim();
        if (limpo === "" || limpo === "-" || limpo === "0,00" || limpo === "0.00") return 0;
        
        // Remove pontos de milhares e troca vírgula por ponto
        limpo = limpo.replace(/\./g, '').replace(',', '.');
        return parseFloat(limpo) || 0;
    };

    // Expressão para validar se uma string começa com data (DD/MM/YY ou DD/MM/YYYY)
    const regexData = /^\d{2}\/\d{2}\/\d{2,4}/;

    for (let i = 0; i < linhasArray.length; i++) {
        const colunas = linhasArray[i];
        
        if (!colunas || colunas.length === 0) continue;

        // Procura em qual coluna está a data
        let colDataIndex = -1;
        for (let c = 0; c < colunas.length; c++) {
            if (colunas[c] && regexData.test(colunas[c].trim())) {
                colDataIndex = c;
                break;
            }
        }

        // Se encontrou uma linha com data
        if (colDataIndex !== -1) {
            let dataStr = colunas[colDataIndex].trim();
            
            // Ignora linhas de saldo ou cabeçalhos residuais
            if (dataStr.toUpperCase().includes('TOTAL') || dataStr.toUpperCase().includes('SALDO')) {
                continue;
            }

            // Descrição (Historico costuma estar logo após a data)
            let historico = "Sem descrição";
            if (colunas.length > colDataIndex + 1) {
                for (let d = colDataIndex + 1; d < colunas.length; d++) {
                    let texto = colunas[d] ? colunas[d].trim() : "";
                    // Se não for um número de documento puro ou valor, é a descrição
                    if (texto !== "" && isNaN(converterValor(texto))) {
                        historico = texto;
                        break;
                    }
                }
            }

            // Tratamento da linha seguinte caso exista complemento (ex: Mercado Villa)
            if (i + 1 < linhasArray.length) {
                let proximaLinha = linhasArray[i + 1];
                let temDataProxima = proximaLinha.some(el => el && regexData.test(el.trim()));
                if (!temDataProxima && proximaLinha.length >= 2) {
                    let complemento = proximaLinha[1] || proximaLinha[0];
                    if (complemento && complemento.trim() !== "" && isNaN(converterValor(complemento))) {
                        historico += " - " + complemento.trim();
                    }
                }
            }

            // Varredura de valores monetários na linha
            let valoresEncontrados = [];
            for (let j = 0; j < colunas.length; j++) {
                if (j === colDataIndex) continue;
                let valNum = converterValor(colunas[j]);
                // Ignora números que parecem ser códigos de documento (ex: 6 dígitos inteiros sem vírgula)
                let textoBruto = colunas[j] ? colunas[j].trim() : "";
                if (valNum !== 0 && !isNaN(valNum)) {
                    // No Bradesco, o Docto é um número inteiro sem vírgula. Valores monetários têm vírgula ou são decimais.
                    if (textoBruto.includes(',') || textoBruto.includes('.')) {
                        valoresEncontrados.push({ coluna: j, valor: valNum, texto: textoBruto });
                    }
                }
            }

            if (valoresEncontrados.length > 0) {
                let valorFinal = 0;
                let tipo = "credito";

                // Se houver sinal explícito de menos no texto original, é débito
                let temNegativo = valoresEncontrados.some(v => v.texto.includes('-'));
                
                // Pega o valor monetário (se houver mais de um, o último antes do saldo costuma ser o valor da transação)
                // Vamos pegar o primeiro valor válido que tenha ponto ou vírgula decimal
                let transacaoValida = valoresEncontrados[0].valor;
                
                // Se o histórico indica compra/pagamento ou se tem sinal negativo
                let histUpper = historico.toUpperCase();
                if (temNegativo || histUpper.includes('COMPRA') || histUpper.includes('PAG') || histUpper.includes('DEB') || histUpper.includes('PIX QRS') || histUpper.includes('SAQUE')) {
                    valorFinal = -Math.abs(transacaoValida);
                    tipo = "debito";
                } else {
                    valorFinal = Math.abs(transacaoValida);
                    tipo = "credito";
                }

                transacoesExtraidas.push({
                    data: dataStr,
                    descricao: historico,
                    valor: valorFinal,
                    tipo: tipo,
                    idBanco: idBanco
                });
            }
        }
    }

    renderizarTabelaConciliacao(transacoesExtraidas);
}

// Desenha a Tabela Completa na Tela
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
                    <th style="padding: 10px 5px; text-align: left;">Descrição Original</th>
                    <th style="padding: 10px 5px; text-align:right">Valor</th>
                    <th style="padding: 10px 5px; text-align:center;">Categoria</th>
                </tr>
            </thead>
            <tbody>
    `;

    let selectCategorias = `<select class="select-categoria" style="width: 100%; padding: 6px; border-radius: 4px; border: 1px solid #b0bec5; background: #fafafa;">`;
    CATEGORIAS_PADRAO.forEach(cat => {
        selectCategorias += `<option value="${cat}">${cat}</option>`;
    });
    selectCategorias += `</select>`;

    transacoes.forEach((t, index) => {
        const corValor = t.tipo === 'debito' ? '#d32f2f' : '#2e7d32'; 
        const iconTipo = t.tipo === 'debito' ? '🔻' : '🟢';
        
        html += `
            <tr style="border-bottom: 1px solid #eceff1;">
                <td style="padding: 10px 5px; color: #455a64; white-space: nowrap;">${t.data}</td>
                <td style="padding: 10px 5px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #37474f;" title="${t.descricao}">
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
    window.mostrarToast(`Sucesso! ${transacoes.length} transações carregadas com precisão.`);
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
