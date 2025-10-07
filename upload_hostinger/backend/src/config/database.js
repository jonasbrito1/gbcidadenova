const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'gb_user',
    password: process.env.DB_PASSWORD || 'gb_password_2024',
    database: process.env.DB_NAME || 'gracie_barra_db',
    charset: 'utf8mb4',
    multipleStatements: false,
    connectionLimit: 10,
    connectTimeout: 60000
};

// Pool de conexões
const pool = mysql.createPool(dbConfig);

// Configurar charset UTF-8 para todas as conexões
pool.on('connection', function (connection) {
    connection.query('SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci');
});

// Função para testar conexão
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        // Configurar charset UTF-8 na conexão de teste
        await connection.execute('SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci');
        await connection.ping();
        connection.release();
        logger.info('Conexão com MySQL estabelecida com sucesso');
        return true;
    } catch (error) {
        logger.error('Erro ao conectar com MySQL:', error);
        throw error;
    }
};

// Função para executar queries
const query = async (sql, params = []) => {
    const connection = await pool.getConnection();
    try {
        // Configurar charset para a conexão
        await connection.execute('SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci');
        const [rows] = await connection.execute(sql, params);
        return rows;
    } catch (error) {
        logger.error('Erro na query:', { sql, params, error: error.message });
        throw error;
    } finally {
        connection.release();
    }
};

// Função para executar transações
const transaction = async (callback) => {
    const connection = await pool.getConnection();
    try {
        // Configurar charset para a conexão
        await connection.execute('SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci');
        await connection.beginTransaction();

        const result = await callback(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

// Função para escape de strings
const escape = (value) => mysql.escape(value);

// Função para format de queries
const format = (sql, params) => mysql.format(sql, params);

// Função para obter uma conexão do pool
const getConnection = async () => {
    return await pool.getConnection();
};

module.exports = {
    pool,
    query,
    transaction,
    testConnection,
    escape,
    format,
    getConnection
};
