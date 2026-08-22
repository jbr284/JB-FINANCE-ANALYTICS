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

// O Robô de Processamento Profissional com Papa Parse
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
            analisarDadosPapaParse(results.data, bancoSelecionado);
        },
        error: function(err) {
            alert("Erro ao ler o arquivo: " + err);
        }
    });
};

function analisarDadosPapaParse(linhasArray, idBanco) {
    let transacoesExtraidas = [];

    // Função de limpeza matemática otimizada para o padrão Bradesco
    const parseValor = (val) => {
        if (!val || typeof val !== 'string') return NaN;
        let str = val.replace(/R\$/g, '').trim();
        if (str === "" || str === "-" || str === "0,00" || str === "0.00") return NaN;
        
        if (str.includes(',') && str.includes('.')) {
            str = str.replace(/\./g, '').replace(',', '.');
        } else if (str.includes(',')) {
            str = str.replace(',', '.');
        }
        return parseFloat(str);
    };

    for (let i = 0; i < linhasArray.length; i++) {
        const colunas = linhasArray[i];
        
        // Procura por qualquer coluna que tenha uma data no formato DD/MM ou DD/MM/AA(AA)
        let dataStr = null;
        let colDataIndex = -1;
        
        for (let c = 0; c < colunas.length; c++) {
            let val = colunas[c] ? colunas[c].trim() : "";
            if (val.match(/^\d{2}\/\d{2}(\/\d{2,4})?/)) {
                dataStr = val;
                colDataIndex = c;
                break;
            }
        }

        // Se encontrou uma data, esta é uma linha de transação potencial!
        if (dataStr && colDataIndex !== -1) {
            let desc = "Sem descrição";
            let valFinal = 0;

            // Ignora linhas de saldo ou totais
            if (dataStr.toUpperCase().includes('TOTAL') || dataStr.toUpperCase().includes('SALDO')) continue;

            // Pega a descrição (geralmente logo após a data)
            if (colunas.length > colDataIndex + 1) {
                for (let d = colDataIndex + 1; d < colunas.length; d++) {
                    let textoCandidato = colunas[d] ? colunas[d].trim() : "";
                    if (textoCandidato !== "" && isNaN(parseValor(textoCandidato))) {
                        desc = textoCandidato;
                        break;
                    }
                }
            }

            // Varre todas as colunas à procura de valores monetários válidos
            // No Bradesco, as colunas de Crédito e Débito ficam mais à direita
            let valoresEncontrados = [];
            for (let j = 0; j < colunas.length; j++) {
                if (j === colDataIndex) continue;
                let num = parseValor(colunas[j]);
                if (!isNaN(num) && num !== 0) {
                    valoresEncontrados.push({ index: j, valor: num });
                }
            }

            if (valoresEncontrados.length > 0) {
                // No Bradesco, se houver duas colunas de valores preenchidas na mesma linha (uma crédito, outra débito), 
                // geralmente a mais à esquerda é crédito e a outra débito, ou temos uma indicação explícita.
                // Vamos pegar o último valor numérico válido antes do saldo (o saldo costuma ser a última coluna).
                let transacaoValida = null;
                
                // Se tivermos mais de um valor (ex: Crédito/Débito e Saldo acumulado)
                // O valor da transação é o penúltimo ou o que não for saldo.
                if (valoresEncontrados.length >= 2) {
                    // Pega o valor que não é o saldo final da conta (vamos assumir o penúltimo se houver 2 ou mais)
                    transacaoValida = valoresEncontrados[valoresEncontrados.length - 2].valor;
                } else {
                    transacaoValida = valoresEncontrados[0].valor;
                }

                // Identifica se é débito ou crédito olhando o texto da linha ou o sinal
                let linhaCompletaTexto = colunas.join(' ').toUpperCase();
                if (linhaCompletaTexto.includes('DEBITO') || linhaCompletaTexto.includes('PAGTO') || linhaCompletaTexto.includes('COMPRA') || linhaCompletaTexto.includes('PIX QRS') || linhaCompletaTexto.includes('SAQUE')) {
                    valFinal = -Math.abs(transacaoValida);
                } else {
                    valFinal = transacaoValida; // Mantém positivo se for entrada
                }

                transacoesExtraidas.push({
                    data: dataStr,
                    descricao: desc,
                    valor: valFinal,
                    tipo: valFinal < 0 ? 'debito' : 'credito',
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
                <td style="padding: 10px 5px; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #37474f;" title="${t.descricao}">
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
    window.mostrarToast(`Sucesso! ${transacoes.length} transações carregadas.`);
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
