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

// O Robô de Processamento Profissional
window.processarCSV = () => {
    const bancoSelecionado = document.getElementById('bancoExtratoUpload').value;
    const fileInput = document.getElementById('arquivoCSV');

    if (!bancoSelecionado) return alert("Por favor, selecione para qual banco este extrato pertence.");
    if (!fileInput.files.length) return alert("Por favor, selecione um arquivo CSV do seu banco.");

    const file = fileInput.files[0];

    // O Papa Parse entra em ação! Ele resolve os problemas de colunas bagunçadas automaticamente.
    Papa.parse(file, {
        encoding: "ISO-8859-1", // Mantém os acentos brasileiros do Bradesco
        skipEmptyLines: true,
        complete: function(results) {
            analisarDadosPapaParse(results.data, bancoSelecionado);
        },
        error: function(err) {
            alert("Erro fatal ao ler o arquivo: " + err);
        }
    });
};

function analisarDadosPapaParse(linhasArray, idBanco) {
    let transacoesExtraidas = [];
    let indexData = -1, indexDesc = -1, indexCredito = -1, indexDebito = -1, indexValor = -1;
    let dadosIniciaram = false;

    // Função de limpeza matemática
    const parseValor = (val) => {
        if (!val || typeof val !== 'string') return NaN;
        let str = val.replace(/R\$/g, '').trim();
        if (str === "") return NaN;
        // Transforma a matemática do Brasil na matemática do Computador
        if (str.includes(',') && str.includes('.')) {
            str = str.replace(/\./g, '').replace(',', '.');
        } else if (str.includes(',')) {
            str = str.replace(',', '.');
        }
        return parseFloat(str);
    };

    for (let i = 0; i < linhasArray.length; i++) {
        const colunas = linhasArray[i];
        
        if (!dadosIniciaram) {
            // Mapeamento Inteligente: Tenta entender como o banco chamou as colunas
            const linhaUpper = colunas.map(c => c ? c.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : "");
            
            if (linhaUpper.some(c => c.includes('DATA'))) {
                indexData = linhaUpper.findIndex(c => c.includes('DATA'));
                indexDesc = linhaUpper.findIndex(c => c.includes('HIST') || c.includes('DESC') || c.includes('LANC'));
                indexCredito = linhaUpper.findIndex(c => c === 'CREDITO' || c.includes('CREDITO (R$)') || c.includes('CREDITO'));
                indexDebito = linhaUpper.findIndex(c => c === 'DEBITO' || c.includes('DEBITO (R$)') || c.includes('DEBITO'));
                indexValor = linhaUpper.findIndex(c => c === 'VALOR' || c.includes('VALOR (R$)'));
                dadosIniciaram = true;
            }
            continue;
        }

        // FASE 2: Leitura das Transações
        // Verifica se a linha realmente tem uma data no padrão 15/08
        if (indexData !== -1 && colunas[indexData] && typeof colunas[indexData] === 'string' && colunas[indexData].match(/^\d{2}\/\d{2}/)) {
            
            let dataStr = colunas[indexData];
            let desc = indexDesc !== -1 ? colunas[indexDesc] : (colunas[indexData + 1] || 'Sem descrição');
            let valFinal = 0;

            // Ignora falsos positivos do Bradesco (Saldos de final de dia)
            if (dataStr.toUpperCase().includes('TOTAL') || dataStr.toUpperCase().includes('SALDO') || desc.toUpperCase().includes('SALDO')) {
                continue;
            }

            // Descobre o valor da transação baseado no mapeamento do banco
            if (indexCredito !== -1 && indexDebito !== -1) {
                let cVal = parseValor(colunas[indexCredito]);
                let dVal = parseValor(colunas[indexDebito]);
                if (!isNaN(cVal) && cVal > 0) valFinal = cVal;
                else if (!isNaN(dVal) && dVal > 0) valFinal = -Math.abs(dVal);
            } 
            else if (indexValor !== -1) {
                let v = parseValor(colunas[indexValor]);
                if (!isNaN(v)) valFinal = v;
            } 
            else {
                // Modo "Força Bruta" caso o cabeçalho seja bizarro: Pega o primeiro número após a descrição
                let valsPosiveis = colunas.slice(indexData + 2).map(parseValor).filter(v => !isNaN(v) && v !== 0);
                if (valsPosiveis.length > 0) valFinal = valsPosiveis[0];
            }

            // Grava a transação se tiver um valor real
            if (valFinal !== 0) {
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

// A Interface Homem-Máquina (Desenha na Tela para o Usuário)
function renderizarTabelaConciliacao(transacoes) {
    const container = document.getElementById('tabela-conciliacao-container');
    
    if (transacoes.length === 0) {
        container.innerHTML = `<p style="color: red; text-align: center; font-weight: bold; background: #ffebee; padding: 15px; border-radius: 8px;">Nenhuma transação válida encontrada. Verifique se o arquivo tem movimentos no período.</p>`;
        return;
    }

    let html = `
        <h4 style="color:#002f6c; margin-bottom: 10px; margin-top: 20px;">Pré-visualização do Extrato</h4>
        <p style="font-size: 12px; color: #666; margin-bottom: 15px;">Os <b>Créditos</b> serão conciliados com a Aba 1. Classifique os seus <b>Débitos</b> abaixo.</p>
        <div style="background: white; border: 1px solid #cfd8dc; border-radius: 8px; overflow: hidden;">
        <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
            <thead>
                <tr style="background: #eceff1; border-bottom: 2px solid #b0bec5;">
                    <th style="padding: 10px 5px; text-align: left;">Data</th>
                    <th style="padding: 10px 5px; text-align: left;">Descrição Original</th>
                    <th style="padding: 10px 5px; text-align:right">Valor</th>
                    <th style="padding: 10px 5px; text-align:center;">Categoria (Aprendizado)</th>
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
                <td style="padding: 12px 5px; color: #455a64;">${t.data}</td>
                <td style="padding: 12px 5px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #37474f;" title="${t.descricao}">
                    ${t.descricao}
                </td>
                <td style="padding: 12px 5px; text-align:right; font-weight: bold; color: ${corValor}; white-space: nowrap;">
                    ${iconTipo} R$ ${Math.abs(t.valor).toFixed(2)}
                </td>
                <td style="padding: 8px 5px; text-align:center;">
                    ${t.tipo === 'debito' ? selectCategorias : '<span style="color:#78909c; font-size: 11px; font-weight: bold;">(Entrada/Conciliação)</span>'}
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
    window.mostrarToast("Extrato processado com o Papa Parse!");
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
