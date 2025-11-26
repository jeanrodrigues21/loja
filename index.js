const express = require('express');
const session = require('express-session');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Importar configuração do banco de dados
const { initializeDatabase } = require('./src/config/database');

// Importar middleware
const { addUserInfo } = require('./src/middleware/auth');

// Importar rotas
const authRoutes = require('./src/routes/auth');
const dashboardRoutes = require('./src/routes/dashboard');
const servicesRoutes = require('./src/routes/services');
const expensesRoutes = require('./src/routes/expenses');
const appointmentsRoutes = require('./src/routes/appointments');
const settingsRoutes = require('./src/routes/settings');
const periodsRoutes = require('./src/routes/periods');
const serviceHistoryRoutes = require('./src/routes/serviceHistory');
const adminRoutes = require('./src/routes/admin');
const withdrawalsRoutes = require('./src/routes/withdrawals');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuração de segurança
app.use(helmet({
  contentSecurityPolicy: false, // Desabilitar CSP para permitir CDNs
  crossOriginEmbedderPolicy: false
}));

// Configuração de CORS
app.use(cors({
  origin: true,
  credentials: true
}));

// Middleware de logging
app.use(morgan('combined'));

// Middleware para parsing de JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configuração de sessão
app.use(session({
  secret: 'servicos-gerenciamento-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Para desenvolvimento (HTTP)
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

// Middleware para adicionar informações do usuário
app.use(addUserInfo);

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Rotas da API
app.use('/api', authRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', servicesRoutes);
app.use('/api', expensesRoutes);
app.use('/api', appointmentsRoutes);
app.use('/api', settingsRoutes);
app.use('/api', periodsRoutes);
app.use('/api', serviceHistoryRoutes);
app.use('/api', adminRoutes);
app.use('/api', withdrawalsRoutes);

// Rota principal - redireciona para index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota para versão mobile
app.get('/mobile', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'mobile.html'));
});

// Rota para login mobile
app.get('/mobile-login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'mobile-login.html'));
});

// Rota para admin desktop
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Rota para admin mobile
app.get('/mobile-admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'mobile-admin.html'));
});

// Rota para histórico de serviços
app.get('/service-history', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'service-history.html'));
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro no servidor:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor'
  });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada'
  });
});

// Função para inicializar o servidor
async function startServer() {
  try {
    console.log('🔄 Inicializando sistema...');
    
    // Inicializar banco de dados
    await initializeDatabase();
    console.log('✅ Banco de dados inicializado');
    
    // Iniciar servidor
    app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 Servidor iniciado com sucesso!');
    console.log(`📍 URL: http://<SEU_IP_LOCAL>:${PORT}`);
    console.log(`📱 Mobile: http://<SEU_IP_LOCAL>:${PORT}/mobile`);
    console.log(`🔐 Admin Desktop: http://<SEU_IP_LOCAL>:${PORT}/admin`);
    console.log(`📱 Admin Mobile: http://<SEU_IP_LOCAL>:${PORT}/mobile-admin`);
    console.log(`🔑 Login padrão: admin/admin123`);
    console.log('─'.repeat(50));
  });
    
  } catch (error) {
    console.error('❌ Erro ao inicializar servidor:', error);
    process.exit(1);
  }
}

// Tratamento de sinais do sistema
process.on('SIGINT', () => {
  console.log('\n🛑 Servidor sendo encerrado...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Servidor sendo encerrado...');
  process.exit(0);
});

// Inicializar servidor
startServer();

module.exports = app;