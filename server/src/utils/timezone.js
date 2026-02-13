/**
 * Utilitário para gerenciar timezone de Manaus - AM, Brasil
 * Timezone: America/Manaus (UTC-4)
 */

const moment = require('moment-timezone');

// Definir timezone padrão
const TIMEZONE = 'America/Manaus';

/**
 * Obt\u00e9m a data/hora atual no timezone de Manaus
 * @returns {moment.Moment} Data/hora atual em Manaus
 */
function getManausNow() {
    return moment().tz(TIMEZONE);
}

/**
 * Converte uma data para o timezone de Manaus
 * @param {string|Date} date - Data a ser convertida
 * @returns {moment.Moment} Data convertida para Manaus
 */
function toManausTime(date) {
    return moment(date).tz(TIMEZONE);
}

/**
 * Formata data no formato brasileiro (DD/MM/YYYY)
 * @param {string|Date|moment.Moment} date - Data a ser formatada
 * @returns {string} Data formatada
 */
function formatDateBR(date) {
    return moment(date).tz(TIMEZONE).format('DD/MM/YYYY');
}

/**
 * Formata data e hora no formato brasileiro (DD/MM/YYYY HH:mm:ss)
 * @param {string|Date|moment.Moment} date - Data a ser formatada
 * @returns {string} Data e hora formatadas
 */
function formatDateTimeBR(date) {
    return moment(date).tz(TIMEZONE).format('DD/MM/YYYY HH:mm:ss');
}

/**
 * Formata hora no formato brasileiro (HH:mm)
 * @param {string|Date|moment.Moment} time - Hora a ser formatada
 * @returns {string} Hora formatada
 */
function formatTimeBR(time) {
    return moment(time, ['HH:mm:ss', 'HH:mm']).format('HH:mm');
}

/**
 * Obt\u00e9m data atual em Manaus no formato SQL (YYYY-MM-DD)
 * @returns {string} Data no formato SQL
 */
function getSQLDate() {
    return getManausNow().format('YYYY-MM-DD');
}

/**
 * Obt\u00e9m hora atual em Manaus no formato SQL (HH:mm:ss)
 * @returns {string} Hora no formato SQL
 */
function getSQLTime() {
    return getManausNow().format('HH:mm:ss');
}

/**
 * Obt\u00e9m data e hora atual em Manaus no formato SQL (YYYY-MM-DD HH:mm:ss)
 * @returns {string} Data e hora no formato SQL
 */
function getSQLDateTime() {
    return getManausNow().format('YYYY-MM-DD HH:mm:ss');
}

/**
 * Verifica se uma data est\u00e1 no passado (em rela\u00e7\u00e3o a Manaus)
 * @param {string|Date} date - Data a ser verificada
 * @returns {boolean} true se a data est\u00e1 no passado
 */
function isPast(date) {
    return toManausTime(date).isBefore(getManausNow());
}

/**
 * Verifica se uma data est\u00e1 no futuro (em rela\u00e7\u00e3o a Manaus)
 * @param {string|Date} date - Data a ser verificada
 * @returns {boolean} true se a data est\u00e1 no futuro
 */
function isFuture(date) {
    return toManausTime(date).isAfter(getManausNow());
}

/**
 * Verifica se uma data \u00e9 hoje (em rela\u00e7\u00e3o a Manaus)
 * @param {string|Date} date - Data a ser verificada
 * @returns {boolean} true se a data \u00e9 hoje
 */
function isToday(date) {
    return toManausTime(date).isSame(getManausNow(), 'day');
}

/**
 * Obt\u00e9m o dia da semana em portugu\u00eas
 * @param {string|Date} date - Data
 * @returns {string} Dia da semana (segunda, terca, quarta, quinta, sexta, sabado, domingo)
 */
function getDiaSemana(date) {
    const dias = {
        0: 'domingo',
        1: 'segunda',
        2: 'terca',
        3: 'quarta',
        4: 'quinta',
        5: 'sexta',
        6: 'sabado'
    };
    return dias[toManausTime(date).day()];
}

/**
 * Verifica se o hor\u00e1rio atual est\u00e1 dentro de uma janela de tempo
 * @param {string} horarioInicio - Hor\u00e1rio de in\u00edcio (HH:mm)
 * @param {string} horarioFim - Hor\u00e1rio de fim (HH:mm)
 * @param {number} minutosTolerancia - Minutos de toler\u00e2ncia antes/depois
 * @returns {boolean} true se est\u00e1 dentro da janela
 */
function isDentroJanelaHorario(horarioInicio, horarioFim, minutosTolerancia = 30) {
    const agora = getManausNow();
    const inicio = getManausNow()
        .hour(parseInt(horarioInicio.split(':')[0]))
        .minute(parseInt(horarioInicio.split(':')[1]))
        .subtract(minutosTolerancia, 'minutes');
    const fim = getManausNow()
        .hour(parseInt(horarioFim.split(':')[0]))
        .minute(parseInt(horarioFim.split(':')[1]))
        .add(minutosTolerancia, 'minutes');

    return agora.isBetween(inicio, fim);
}

/**
 * Calcula diferen\u00e7a em dias entre duas datas
 * @param {string|Date} date1 - Data 1
 * @param {string|Date} date2 - Data 2
 * @returns {number} Diferen\u00e7a em dias
 */
function diffInDays(date1, date2) {
    return toManausTime(date1).diff(toManausTime(date2), 'days');
}

/**
 * Calcula diferen\u00e7a em meses entre duas datas
 * @param {string|Date} date1 - Data 1
 * @param {string|Date} date2 - Data 2
 * @returns {number} Diferen\u00e7a em meses
 */
function diffInMonths(date1, date2) {
    return toManausTime(date1).diff(toManausTime(date2), 'months');
}

/**
 * Adiciona dias a uma data
 * @param {string|Date} date - Data base
 * @param {number} days - N\u00famero de dias
 * @returns {moment.Moment} Nova data
 */
function addDays(date, days) {
    return toManausTime(date).add(days, 'days');
}

/**
 * Adiciona meses a uma data
 * @param {string|Date} date - Data base
 * @param {number} months - N\u00famero de meses
 * @returns {moment.Moment} Nova data
 */
function addMonths(date, months) {
    return toManausTime(date).add(months, 'months');
}

/**
 * Obt\u00e9m primeiro dia do m\u00eas
 * @param {string|Date} date - Data de refer\u00eancia
 * @returns {moment.Moment} Primeiro dia do m\u00eas
 */
function getFirstDayOfMonth(date) {
    return toManausTime(date).startOf('month');
}

/**
 * Obt\u00e9m \u00faltimo dia do m\u00eas
 * @param {string|Date} date - Data de refer\u00eancia
 * @returns {moment.Moment} \u00daltimo dia do m\u00eas
 */
function getLastDayOfMonth(date) {
    return toManausTime(date).endOf('month');
}

module.exports = {
    TIMEZONE,
    getManausNow,
    toManausTime,
    formatDateBR,
    formatDateTimeBR,
    formatTimeBR,
    getSQLDate,
    getSQLTime,
    getSQLDateTime,
    isPast,
    isFuture,
    isToday,
    getDiaSemana,
    isDentroJanelaHorario,
    diffInDays,
    diffInMonths,
    addDays,
    addMonths,
    getFirstDayOfMonth,
    getLastDayOfMonth
};
