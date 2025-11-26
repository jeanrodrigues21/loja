const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '../../database.sqlite');

console.log('🔄 Atualizando dados do usuário...');
console.log('📁 Caminho do banco:', DB_PATH);

// Criar conexão com o banco
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Erro ao conectar com o banco de dados:', err.message);
    process.exit(1);
  } else {
    console.log('✅ Conectado ao banco de dados SQLite\n');
    updateUserData();
  }
});

async function updateUserData() {
  try {
    const oldUsername = 'admin';
    const newUsername = 'jean';
    const newPassword = '267589';
    const saltRounds = 10;

    console.log('🔍 Verificando usuário atual...');
    
    // Verificar se o usuário admin existe
    db.get('SELECT id, username, name FROM users WHERE username = ?', [oldUsername], (err, user) => {
      if (err) {
        console.error('❌ Erro ao buscar usuário:', err.message);
        db.close();
        return;
      }

      if (!user) {
        console.log('⚠️ Usuário "admin" não encontrado');
        db.close();
        return;
      }

      console.log(`👤 Usuário encontrado: ${user.username} (ID: ${user.id})`);
      console.log('🔄 Iniciando atualização...\n');

      // Gerar hash da nova senha
      bcrypt.hash(newPassword, saltRounds, (err, hashedPassword) => {
        if (err) {
          console.error('❌ Erro ao gerar hash da senha:', err.message);
          db.close();
          return;
        }

        console.log(`👤 Username: "${oldUsername}" → "${newUsername}"`);
        console.log(`🔐 Nova senha: ${newPassword}`);
        console.log(`🔒 Hash gerado: ${hashedPassword.substring(0, 20)}...`);

        // Atualizar username e senha
        const updateQuery = 'UPDATE users SET username = ?, password = ? WHERE username = ?';
        
        db.run(updateQuery, [newUsername, hashedPassword, oldUsername], function(err) {
          if (err) {
            console.error('❌ Erro ao atualizar dados:', err.message);
            db.close();
            return;
          }

          if (this.changes > 0) {
            console.log('\n✅ Dados atualizados com sucesso!');
            console.log(`📊 Registros atualizados: ${this.changes}`);

            // Verificar a atualização
            console.log('\n🔍 Verificando dados atualizados...');
            db.get('SELECT id, username, name, email, created_at FROM users WHERE username = ?', [newUsername], (err, updatedUser) => {
              if (err) {
                console.error('❌ Erro ao verificar atualização:', err.message);
              } else if (updatedUser) {
                console.log('=' .repeat(50));
                console.log('✅ DADOS FINAIS:');
                console.log(`   ID: ${updatedUser.id}`);
                console.log(`   👤 Username: ${updatedUser.username}`);
                console.log(`   📝 Nome: ${updatedUser.name}`);
                console.log(`   📧 Email: ${updatedUser.email}`);
                console.log(`   🔐 Nova senha: ${newPassword}`);
                console.log(`   📅 Criado em: ${updatedUser.created_at}`);
                console.log('=' .repeat(50));
                console.log('\n🎉 Atualização concluída com sucesso!');
                console.log('💡 Agora você pode fazer login com:');
                console.log(`   Username: ${newUsername}`);
                console.log(`   Senha: ${newPassword}`);
              } else {
                console.log('⚠️ Não foi possível verificar a atualização');
              }
              
              db.close((err) => {
                if (err) {
                  console.error('❌ Erro ao fechar banco:', err.message);
                } else {
                  console.log('\n✅ Conexão com banco fechada');
                }
              });
            });
          } else {
            console.log('⚠️ Nenhum registro foi atualizado');
            db.close();
          }
        });
      });
    });

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    db.close();
  }
}