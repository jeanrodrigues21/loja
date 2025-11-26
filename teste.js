// api_fix_check.js - Script para verificar e sugerir correções na API

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'database.sqlite');

// Função para conectar ao banco
function connectToDB() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(db);
      }
    });
  });
}

// Função para executar queries
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

// Função para verificar os dados no banco
async function checkDatabaseData() {
  console.log('🔍 Verificando dados no banco...');
  
  try {
    const db = await connectToDB();
    
    // Verificar serviços
    const allServices = await allQuery(db, 'SELECT * FROM services ORDER BY created_at DESC');
    const activeServices = await allQuery(db, 'SELECT * FROM services WHERE status = "active"');
    const closedServices = await allQuery(db, 'SELECT * FROM services WHERE status = "closed"');
    
    // Verificar totais
    const totalRevenue = await getQuery(db, 'SELECT SUM(price) as total FROM services');
    const totalExpenses = await getQuery(db, 'SELECT SUM(amount) as total FROM expenses');
    const totalActiveRevenue = await getQuery(db, 'SELECT SUM(price) as total FROM services WHERE status = "active"');
    
    console.log('\n📊 DADOS NO BANCO:');
    console.log('===================');
    console.log(`Total de serviços: ${allServices.length}`);
    console.log(`Serviços ativos: ${activeServices.length}`);
    console.log(`Serviços fechados: ${closedServices.length}`);
    console.log(`Receita total: R$ ${totalRevenue.total || 0}`);
    console.log(`Receita de serviços ativos: R$ ${totalActiveRevenue.total || 0}`);
    console.log(`Despesas totais: R$ ${totalExpenses.total || 0}`);
    console.log(`Lucro total: R$ ${(totalRevenue.total || 0) - (totalExpenses.total || 0)}`);
    
    console.log('\n📋 ÚLTIMOS 5 SERVIÇOS:');
    allServices.slice(0, 5).forEach((service, index) => {
      console.log(`${index + 1}. ${service.description} - ${service.vehicle} - R$${service.price} - ${service.status}`);
    });
    
    console.log('\n📋 SERVIÇOS ATIVOS:');
    activeServices.slice(0, 5).forEach((service, index) => {
      console.log(`${index + 1}. ${service.description} - ${service.vehicle} - R$${service.price} - ${service.status}`);
    });
    
    db.close();
    
    return {
      totalServices: allServices.length,
      activeServices: activeServices.length,
      closedServices: closedServices.length,
      totalRevenue: totalRevenue.total || 0,
      activeRevenue: totalActiveRevenue.total || 0,
      totalExpenses: totalExpenses.total || 0,
      services: activeServices.slice(0, 10) // Primeiros 10 serviços ativos para retorno
    };
    
  } catch (error) {
    console.error('❌ Erro ao verificar dados:', error.message);
    throw error;
  }
}

// Função para gerar o código correto da API do dashboard
function generateDashboardAPICode(data) {
  return `
// Rota corrigida para /api/dashboard
app.get('/api/dashboard', async (req, res) => {
  try {
    // Buscar serviços ativos
    const activeServices = await allQuery(\`
      SELECT id, description, vehicle, price, status, user_id, created_at 
      FROM services 
      WHERE status = 'active' 
      ORDER BY created_at DESC
    \`);

    // Calcular totais
    const totalRevenueResult = await getQuery('SELECT SUM(price) as total FROM services');
    const totalExpensesResult = await getQuery('SELECT SUM(amount) as total FROM expenses WHERE status = "active"');
    
    const totalRevenue = totalRevenueResult?.total || 0;
    const totalExpenses = totalExpensesResult?.total || 0;
    const totalProfit = totalRevenue - totalExpenses;

    // Buscar agendamentos de hoje
    const today = new Date().toISOString().split('T')[0];
    const todaysAppointments = await allQuery(\`
      SELECT * FROM appointments 
      WHERE date = ? 
      ORDER BY time ASC
    \`, [today]);

    // Retornar dados no formato correto
    res.json({
      success: true,
      activeServicesCount: activeServices.length,
      totalRevenue: totalRevenue,
      totalExpenses: totalExpenses,
      totalProfit: totalProfit,
      services: activeServices.map(service => ({
        id: service.id,
        description: service.description,
        vehicle: service.vehicle,
        price: service.price,
        status: service.status,
        user_id: service.user_id,
        created_at: service.created_at
      })),
      todaysAppointments: todaysAppointments
    });

  } catch (error) {
    console.error('Erro no dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});`;
}

// Função para gerar o código correto da API do histórico
function generateHistoryAPICode() {
  return `
// Rota corrigida para /api/service-history
app.get('/api/service-history', async (req, res) => {
  try {
    // Buscar todos os serviços
    const allServices = await allQuery(\`
      SELECT id, description, vehicle, price, status, user_id, created_at 
      FROM services 
      ORDER BY created_at DESC
    \`);

    // Calcular totais
    const totalRevenueResult = await getQuery('SELECT SUM(price) as total FROM services');
    const totalExpensesResult = await getQuery('SELECT SUM(amount) as total FROM expenses');
    
    const totalRevenue = totalRevenueResult?.total || 0;
    const totalExpenses = totalExpensesResult?.total || 0;
    const totalBalance = totalRevenue - totalExpenses;

    // Contar serviços por status
    const statusCounts = await allQuery(\`
      SELECT status, COUNT(*) as count 
      FROM services 
      GROUP BY status
    \`);

    const servicesByStatus = {};
    statusCounts.forEach(item => {
      // Mapear para o formato esperado pelo frontend
      const statusMap = {
        'active': 'Ativo',
        'closed': 'Fechado'
      };
      const displayStatus = statusMap[item.status] || item.status;
      servicesByStatus[displayStatus] = item.count;
    });

    // Retornar dados no formato correto
    res.json({
      success: true,
      totalServices: allServices.length,
      totalRevenue: totalRevenue,
      totalExpenses: totalExpenses,
      totalBalance: totalBalance,
      servicesByStatus: servicesByStatus,
      services: allServices.map(service => ({
        id: service.id,
        description: service.description,
        vehicle: service.vehicle,
        price: service.price,
        status: service.status === 'active' ? 'Ativo' : 'Fechado', // Converter para exibição
        user_id: service.user_id,
        created_at: service.created_at
      }))
    });

  } catch (error) {
    console.error('Erro no histórico:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});`;
}

// Função principal de verificação e correção
async function checkAndFixAPI() {
  console.log('🔧 VERIFICAÇÃO E CORREÇÃO DA API');
  console.log('===================================');
  
  try {
    // Verificar dados no banco
    const data = await checkDatabaseData();
    
    console.log('\n🔧 PROBLEMAS IDENTIFICADOS:');
    console.log('============================');
    
    if (data.activeServices === 0 && data.totalServices > 0) {
      console.log('❌ Problema: Nenhum serviço ativo encontrado, mas existem serviços no banco');
      console.log('   Solução: Verificar se os status estão corretos (deve ser "active", não "Ativo")');
    }
    
    if (data.totalRevenue === 0 && data.totalServices > 0) {
      console.log('❌ Problema: Receita total é zero, mas existem serviços');
      console.log('   Solução: Verificar se os preços dos serviços estão sendo calculados corretamente');
    }
    
    console.log('\n📝 CÓDIGO CORRIGIDO PARA AS APIS:');
    console.log('==================================');
    
    console.log('\n1. API DASHBOARD:');
    console.log(generateDashboardAPICode(data));
    
    console.log('\n2. API HISTÓRICO:');
    console.log(generateHistoryAPICode());
    
    console.log('\n🔧 COMANDOS PARA EXECUTAR:');
    console.log('==========================');
    console.log('1. Para corrigir status existentes:');
    console.log('   node migration_script.js --fix-status');
    console.log('');
    console.log('2. Para fazer nova migração limpa:');
    console.log('   node migration_script.js --clear');
    console.log('');
    console.log('3. Para verificar dados:');
    console.log('   node api_fix_check.js');
    
  } catch (error) {
    console.error('❌ Erro durante verificação:', error.message);
  }
}

// Executar verificação
if (require.main === module) {
  checkAndFixAPI();
}

module.exports = {
  checkDatabaseData,
  generateDashboardAPICode,
  generateHistoryAPICode
};