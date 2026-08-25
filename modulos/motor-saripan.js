// === modulos/motor-saripan.js ===
import { db, collection, getDocs, setDoc, doc, deleteDoc } from './firebase-config.js';

// Função para descobrir o ano, mês, dia e quinzena a partir de uma data
export function obterPeriodo(dataStr) {
    const dateObj = new Date(dataStr);
    return { 
        ano: dateObj.getUTCFullYear(), 
        mes: dateObj.getUTCMonth(), 
        dia: dateObj.getUTCDate(), 
        quinzena: dateObj.getUTCDate() <= 15 ? 1 : 2 
    };
}

// Carrega todos os apontamentos do Firebase
export async function carregarDadosSaripan() {
    const snapSari = await getDocs(collection(db, "apontamentos"));
    return snapSari.docs.map(d => d.data());
}

// Salva um novo apontamento
export async function salvarApontamentoNoBanco(registro) {
    await setDoc(doc(db, "apontamentos", registro.id.toString()), registro);
}

// Exclui um apontamento individual
export async function excluirApontamentoNoBanco(id) {
    await deleteDoc(doc(db, "apontamentos", id.toString()));
}

// Exclui uma quinzena inteira (limpeza em lote)
export async function excluirQuinzenaNoBanco(itensParaExcluir) {
    for (const item of itensParaExcluir) { 
        await deleteDoc(doc(db, "apontamentos", item.id.toString())); 
    }
}
