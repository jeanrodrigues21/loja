const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '../../database.sqlite');

// Criar conexão com o banco
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Erro ao conectar com o banco de dados:', err.message);
  } else {
    console.log('Conectado ao banco de dados SQLite');
  }
});

// Função para executar queries com Promise
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
}

// Função para buscar dados
function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

// Função para buscar múltiplos registros
function allQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Inicializar tabelas do banco
async function initializeDatabase() {
  try {
    // Tabela de usuários
    await runQuery(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de serviços
    await runQuery(`
      CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        description TEXT NOT NULL,
        vehicle TEXT NOT NULL,
        price REAL NOT NULL,
        status TEXT DEFAULT 'active',
        user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Tabela de despesas
    await runQuery(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        date DATE NOT NULL,
        status TEXT DEFAULT 'active',
        user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Verificar se a coluna status existe na tabela expenses, se não, adicionar
    try {
      await runQuery(`ALTER TABLE expenses ADD COLUMN status TEXT DEFAULT 'active'`);
      console.log('✅ Coluna status adicionada à tabela expenses');
    } catch (error) {
      // Coluna já existe, ignorar erro
      if (!error.message.includes('duplicate column name')) {
        console.log('ℹ️ Coluna status já existe na tabela expenses');
      }
    }

    // Verificar se a coluna role existe na tabela users, se não, adicionar
    try {
      await runQuery(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`);
      console.log('✅ Coluna role adicionada à tabela users');
    } catch (error) {
      // Coluna já existe, ignorar erro
      if (!error.message.includes('duplicate column name')) {
        console.log('ℹ️ Coluna role já existe na tabela users');
      }
    }

    // Tabela de agendamentos
    await runQuery(`
      CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date DATE NOT NULL,
        time TIME NOT NULL,
        client TEXT NOT NULL,
        service TEXT NOT NULL,
        user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Tabela de períodos fechados
    await runQuery(`
      CREATE TABLE IF NOT EXISTS closed_periods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        total_services INTEGER DEFAULT 0,
        total_value REAL DEFAULT 0,
        total_expenses REAL DEFAULT 0,
        net_total REAL DEFAULT 0,
        period_start DATE,
        period_end DATE,
        user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Tabela de configurações do sistema
    await runQuery(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_key TEXT UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de retiradas
    await runQuery(`
      CREATE TABLE IF NOT EXISTS withdrawals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL NOT NULL,
        part_type TEXT NOT NULL,
        description TEXT,
        user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Criar usuário admin se não existir
    const existingAdmin = await getQuery('SELECT id FROM users WHERE username = ?', ['admin']);
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await runQuery(
        'INSERT INTO users (username, password, name, email, role) VALUES (?, ?, ?, ?, ?)',
        ['admin', hashedPassword, 'Administrador', 'admin@servicos.com', 'admin']
      );
      console.log('✅ Usuário admin criado: admin/admin123');
    } else {
      // Atualizar usuário existente para admin se necessário
      await runQuery('UPDATE users SET role = ? WHERE username = ?', ['admin', 'admin']);
    }

    // Inserir configurações padrão
    const defaultSettings = [
      ['part1_name', 'Instalador'],
      ['part2_name', 'Oficina']
    ];

    for (const [key, value] of defaultSettings) {
      const existing = await getQuery('SELECT id FROM system_settings WHERE setting_key = ?', [key]);
      if (!existing) {
        await runQuery(
          'INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?)',
          [key, value]
        );
      }
    }

    console.log('✅ Tabelas do banco de dados criadas/verificadas');
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error);
    throw error;
  }
}

module.exports = {
  db,
  runQuery,
  getQuery,
  allQuery,
  initializeDatabase
};