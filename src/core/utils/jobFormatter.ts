/**
 * Utilitário para formatação de dados de vagas
 */

/**
 * Formata um valor numérico para moeda brasileira (BRL)
 */
export const formatCurrency = (value: number | string | null | undefined): string => {
    if (value === null || value === undefined) return '';
    
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '';

    return num.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });
};

/**
 * Formata a remuneração da vaga de forma inteligente:
 * - Se min e max forem iguais: exibe apenas um
 * - Se apenas min ou apenas max for informado: exibe apenas ele
 * - Se houver um intervalo: exibe "Min - Max"
 */
export const formatSalary = (
    min: number | string | null | undefined,
    max: number | string | null | undefined
): string => {
    const minVal = min !== null && min !== undefined ? (typeof min === 'string' ? parseFloat(min) : min) : null;
    const maxVal = max !== null && max !== undefined ? (typeof max === 'string' ? parseFloat(max) : max) : null;

    // Se nenhum valor for válido
    if ((minVal === null || isNaN(minVal)) && (maxVal === null || isNaN(maxVal))) {
        return '';
    }

    // Se forem iguais
    if (minVal === maxVal) {
        return formatCurrency(minVal);
    }

    // Se apenas um existir
    if (minVal !== null && !isNaN(minVal) && (maxVal === null || isNaN(maxVal) || maxVal === 0)) {
        return formatCurrency(minVal);
    }

    if (maxVal !== null && !isNaN(maxVal) && (minVal === null || isNaN(minVal) || minVal === 0)) {
        return formatCurrency(maxVal);
    }

    // Se ambos existirem e forem diferentes
    return `${formatCurrency(minVal)} - ${formatCurrency(maxVal)}`;
};
