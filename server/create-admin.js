const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function createAdminUser() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        port: 3309,
        user: 'gb_user',
        password: 'gb_password_2024',
        database: 'gracie_barra_db'
    });

    try {
        // Gerar hash da senha "password"
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash('password', saltRounds);

        console.log('Hash gerado:', hashedPassword);

        // Atualizar usuário admin
        const [result] = await connection.execute(
            'UPDATE usuarios SET senha = ? WHERE email = ?',
            [hashedPassword, 'admin@graciebarra.com']
        );

        console.log('✓ Usuário admin atualizado com sucesso!');
        console.log('Linhas afetadas:', result.affectedRows);

        // Verificar
        const [users] = await connection.execute(
            'SELECT id, nome, email, tipo_usuario FROM usuarios WHERE email = ?',
            ['admin@graciebarra.com']
        );

        console.log('Usuário verificado:', users[0]);

        // Testar a senha
        const [checkUsers] = await connection.execute(
            'SELECT senha FROM usuarios WHERE email = ?',
            ['admin@graciebarra.com']
        );

        const isValid = await bcrypt.compare('password', checkUsers[0].senha);
        console.log('Validação da senha:', isValid ? '✓ OK' : '✗ FALHOU');

    } catch (error) {
        console.error('Erro:', error);
    } finally {
        await connection.end();
    }
}

createAdminUser();
