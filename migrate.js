const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Configurações dos servidores
const OLD_SERVER_URL = 'https://cliente.pxbetapp.win/api';
const NEW_SERVER_DB_PATH = path.join(__dirname, 'database.sqlite');

// Credenciais para autenticação no servidor antigo
const OLD_SERVER_CREDENTIALS = {
  username: 'jean',
  password: '267589'
};

// Configurar axios com interceptadores para gerenciar cookies
const axiosInstance = axios.create({
  withCredentials: true,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Variável para armazenar cookies de sessão
let sessionCookies = '';

// Interceptador para salvar cookies da resposta
axiosInstance.interceptors.response.use(
  (response) => {
    const setCookieHeader = response.headers['set-cookie'];
    if (setCookieHeader) {
      sessionCookies = setCookieHeader.map(cookie => cookie.split(';')[0]).join('; ');
    }
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptador para incluir cookies nas requisições
axiosInstance.interceptors.request.use(
  (config) => {
    if (sessionCookies) {
      config.headers['Cookie'] = sessionCookies;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Função para conectar ao banco do novo servidor
function connectToNewDB() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(NEW_SERVER_DB_PATH, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(db);
      }
    });
  });
}

// Função para executar queries no novo banco
function runQuery(db, sql, params = []) {
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

// Função para buscar dados do novo banco
function getQuery(db, sql, params = []) {
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

// Função para buscar múltiplos registros do novo banco
function allQuery(db, sql, params = []) {
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

// Função para fazer login no servidor antigo
async function loginToOldServer() {
  try {
    console.log('🔐 Fazendo login no servidor antigo...');
    console.log(`   Usuário: ${OLD_SERVER_CREDENTIALS.username}`);
    
    const response = await axiosInstance.post(`${OLD_SERVER_URL}/login`, OLD_SERVER_CREDENTIALS);
    
    if (response.data && response.data.success) {
      console.log('✅ Login realizado com sucesso');
      console.log(`   Usuário logado: ${response.data.user.name || response.data.user.username}`);
      return true;
    } else {
      throw new Error('Falha na autenticação: ' + (response.data.message || 'Resposta inválida'));
    }
  } catch (error) {
    console.error('❌ Erro no login:', error.response?.data?.message || error.message);
    if (error.response?.status === 401) {
      console.error('   Verifique as credenciais de login');
    }
    throw error;
  }
}

// Função para buscar dados do servidor antigo
async function fetchOldServerData(endpoint) {
  try {
    console.log(`📡 Buscando dados de: ${endpoint}`);
    const response = await axiosInstance.get(`${OLD_SERVER_URL}/${endpoint}`);
    
    if (response.data) {
      console.log(`✅ Dados obtidos de ${endpoint}`);
      return response.data;
    } else {
      throw new Error('Resposta vazia do servidor');
    }
  } catch (error) {
    console.error(`❌ Erro ao buscar dados de ${endpoint}:`, error.response?.data?.message || error.message);
    if (error.response?.status === 401) {
      console.error('   Sessão expirou ou não autenticado');
    }
    throw error;
  }
}

// Função para mapear status do servidor antigo para o novo (CORREÇÃO PRINCIPAL)
function mapStatus(oldStatus) {
  switch(oldStatus?.toLowerCase()) {
    case 'active':
      return 'active'; // Manter como 'active' em vez de 'Ativo'
    case 'closed':
      return 'closed'; // Manter como 'closed' em vez de 'Fechado'
    default:
      return 'active';
  }
}

// Função para converter data do formato antigo para o novo
function convertDate(dateString) {
  if (!dateString) return new Date().toISOString().replace('T', ' ').slice(0, 19);
  
  // Se já está no formato correto (YYYY-MM-DD), adiciona horário
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateString + ' 00:00:00';
  }
  
  // Se tem timestamp completo, converte
  if (dateString.includes('T') || dateString.includes(' ')) {
    const date = new Date(dateString);
    return date.toISOString().replace('T', ' ').slice(0, 19);
  }
  
  // Fallback para data atual
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

// Função para limpar dados existentes (opcional)
async function clearExistingData(db) {
  console.log('🧹 Limpando dados existentes...');
  
  try {
    await runQuery(db, 'DELETE FROM services WHERE user_id = 1');
    await runQuery(db, 'DELETE FROM expenses WHERE user_id = 1');
    console.log('✅ Dados existentes removidos');
  } catch (error) {
    console.error('⚠️ Erro ao limpar dados existentes:', error.message);
  }
}

// Função principal de migração
async function migrateData(clearData = false) {
  console.log('🚀 Iniciando migração de dados...');
  console.log(`   Servidor antigo: ${OLD_SERVER_URL}`);
  console.log(`   Banco novo: ${NEW_SERVER_DB_PATH}`);
  
  try {
    // Primeiro, fazer login no servidor antigo
    await loginToOldServer();
    
    // Conectar ao banco do novo servidor
    const newDB = await connectToNewDB();
    console.log('✅ Conectado ao banco do novo servidor');

    // Limpar dados existentes se solicitado
    if (clearData) {
      await clearExistingData(newDB);
    }

    // 1. Buscar dados do histórico de serviços do servidor antigo
    console.log('\n📥 Buscando dados do servidor antigo...');
    const oldHistoryData = await fetchOldServerData('service-history');
    const oldDashboardData = await fetchOldServerData('dashboard');
    
    if (!oldHistoryData || !oldHistoryData.services) {
      throw new Error('Dados do histórico não encontrados ou formato inválido');
    }

    console.log(`📊 Encontrados ${oldHistoryData.services.length} serviços para migrar`);
    console.log(`💰 Receita total: R$ ${oldHistoryData.totalRevenue}`);
    console.log(`💸 Despesas totais: R$ ${oldHistoryData.totalExpenses}`);
    console.log(`📈 Saldo total: R$ ${oldHistoryData.totalBalance}`);

    // 2. Migrar TODOS os serviços (incluindo fechados e ativos)
    console.log('\n🔄 Migrando serviços...');
    let migratedServices = 0;
    let errors = 0;
    
    // Primeiro migrar serviços do histórico (fechados)
    for (const service of oldHistoryData.services) {
      try {
        const newStatus = mapStatus(service.status);
        const createdAt = convertDate(service.created_at);
        
        await runQuery(newDB, `
          INSERT INTO services (description, vehicle, price, status, user_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          service.description || 'Serviço migrado',
          service.vehicle || 'Veículo não especificado',
          service.price || 0,
          newStatus,
          1, // user_id = 1 (admin)
          createdAt
        ]);
        
        migratedServices++;
        
        if (migratedServices % 50 === 0) {
          console.log(`   ✅ ${migratedServices} serviços migrados...`);
        }
      } catch (error) {
        errors++;
        console.error(`   ❌ Erro ao migrar serviço histórico ID ${service.id}:`, error.message);
      }
    }

    // Depois migrar serviços ativos do dashboard
    if (oldDashboardData && oldDashboardData.services) {
      console.log(`\n🔄 Migrando ${oldDashboardData.services.length} serviços ativos do dashboard...`);
      
      for (const service of oldDashboardData.services) {
        try {
          const newStatus = mapStatus(service.status);
          const createdAt = convertDate(service.created_at || new Date().toISOString());
          
          await runQuery(newDB, `
            INSERT INTO services (description, vehicle, price, status, user_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [
            service.description || 'Serviço ativo migrado',
            service.vehicle || 'Veículo não especificado',
            service.price || 0,
            newStatus,
            1, // user_id = 1 (admin)
            createdAt
          ]);
          
          migratedServices++;
          
        } catch (error) {
          errors++;
          console.error(`   ❌ Erro ao migrar serviço ativo ID ${service.id}:`, error.message);
        }
      }
    }

    // 3. Migrar despesas baseadas no total
    console.log('\n💸 Migrando despesas...');
    try {
      if (oldHistoryData.totalExpenses && oldHistoryData.totalExpenses > 0) {
        await runQuery(newDB, `
          INSERT INTO expenses (description, amount, date, status, user_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          'Despesas migradas do servidor antigo',
          oldHistoryData.totalExpenses,
          new Date().toISOString().split('T')[0],
          'active', // Manter como 'active'
          1,
          new Date().toISOString().replace('T', ' ').slice(0, 19)
        ]);
        
        console.log('   ✅ Despesas migradas com sucesso');
      }
    } catch (error) {
      console.error('   ❌ Erro ao migrar despesas:', error.message);
    }

    // 4. Verificar resultados da migração
    console.log('\n📊 Verificando resultados da migração...');
    
    const serviceCount = await getQuery(newDB, 'SELECT COUNT(*) as count FROM services');
    const activeServiceCount = await getQuery(newDB, 'SELECT COUNT(*) as count FROM services WHERE status = "active"');
    const closedServiceCount = await getQuery(newDB, 'SELECT COUNT(*) as count FROM services WHERE status = "closed"');
    const expenseCount = await getQuery(newDB, 'SELECT COUNT(*) as count FROM expenses');
    const totalRevenue = await getQuery(newDB, 'SELECT SUM(price) as total FROM services');
    const totalExpenses = await getQuery(newDB, 'SELECT SUM(amount) as total FROM expenses');

    console.log('\n🎉 Migração concluída!');
    console.log('=====================================');
    console.log(`📈 Resumo da migração:`);
    console.log(`   - Serviços migrados: ${migratedServices}`);
    console.log(`   - Erros: ${errors}`);
    console.log(`   - Total de serviços no novo banco: ${serviceCount.count}`);
    console.log(`   - Serviços ativos: ${activeServiceCount.count}`);
    console.log(`   - Serviços fechados: ${closedServiceCount.count}`);
    console.log(`   - Total de despesas no novo banco: ${expenseCount.count}`);
    console.log(`   - Receita total migrada: R$ ${totalRevenue.total || 0}`);
    console.log(`   - Despesas totais migradas: R$ ${totalExpenses.total || 0}`);
    console.log(`   - Lucro calculado: R$ ${(totalRevenue.total || 0) - (totalExpenses.total || 0)}`);
    console.log('=====================================');
    
    // Fechar conexão com o banco
    newDB.close();
    
  } catch (error) {
    console.error('\n❌ Erro durante a migração:', error.message);
    throw error;
  }
}

// Função para verificar dados migrados
async function verifyMigration() {
  console.log('\n🔍 Verificando dados migrados...');
  
  try {
    const newDB = await connectToNewDB();
    
    // Verificar alguns registros
    const services = await allQuery(newDB, 'SELECT * FROM services ORDER BY created_at DESC LIMIT 10');
    
    const statusCount = await allQuery(newDB, 'SELECT status, COUNT(*) as count FROM services GROUP BY status');
    
    const financialSummary = await getQuery(newDB, `
      SELECT 
        (SELECT COUNT(*) FROM services WHERE status = 'active') as active_services,
        (SELECT SUM(price) FROM services) as total_revenue,
        (SELECT SUM(amount) FROM expenses) as total_expenses,
        (SELECT SUM(price) FROM services) - (SELECT SUM(amount) FROM expenses) as total_profit
    `);
    
    console.log('📋 Últimos 10 serviços migrados:');
    services.forEach((service, index) => {
      console.log(`   ${index + 1}. ${service.description} - ${service.vehicle} - R$${service.price} - ${service.status} - ${service.created_at}`);
    });
    
    console.log('\n📊 Contagem por status:');
    statusCount.forEach(item => {
      console.log(`   ${item.status}: ${item.count} serviços`);
    });
    
    console.log('\n💰 Resumo financeiro:');
    console.log(`   Serviços ativos: ${financialSummary.active_services || 0}`);
    console.log(`   Receita total: R$ ${financialSummary.total_revenue || 0}`);
    console.log(`   Despesas totais: R$ ${financialSummary.total_expenses || 0}`);
    console.log(`   Lucro total: R$ ${financialSummary.total_profit || 0}`);
    
    newDB.close();
    
  } catch (error) {
    console.error('❌ Erro ao verificar migração:', error.message);
  }
}

// Função para corrigir status existentes
async function fixExistingStatuses() {
  console.log('\n🔧 Corrigindo status dos registros existentes...');
  
  try {
    const newDB = await connectToNewDB();
    
    // Corrigir status dos serviços
    await runQuery(newDB, `UPDATE services SET status = 'active' WHERE status = 'Ativo'`);
    await runQuery(newDB, `UPDATE services SET status = 'closed' WHERE status = 'Fechado'`);
    
    // Corrigir status das despesas
    await runQuery(newDB, `UPDATE expenses SET status = 'active' WHERE status = 'Ativo'`);
    await runQuery(newDB, `UPDATE expenses SET status = 'closed' WHERE status = 'Fechado'`);
    
    console.log('✅ Status corrigidos com sucesso');
    
    newDB.close();
    
  } catch (error) {
    console.error('❌ Erro ao corrigir status:', error.message);
  }
}

// Executar migração
if (require.main === module) {
  const args = process.argv.slice(2);
  const clearData = args.includes('--clear');
  const fixStatus = args.includes('--fix-status');
  
  if (fixStatus) {
    fixExistingStatuses()
      .then(() => {
        console.log('\n✅ Correção de status executada com sucesso!');
        return verifyMigration();
      })
      .catch((error) => {
        console.error('\n❌ Falha na correção:', error.message);
        process.exit(1);
      });
  } else {
    migrateData(clearData)
      .then(() => {
        console.log('\n✅ Migração executada com sucesso!');
        return verifyMigration();
      })
      .catch((error) => {
        console.error('\n❌ Falha na migração:', error.message);
        process.exit(1);
      });
  }
}

module.exports = {
  migrateData,
  verifyMigration,
  fixExistingStatuses
};