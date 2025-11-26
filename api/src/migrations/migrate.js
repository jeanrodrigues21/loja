require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const { supabase } = require('../config/database');

const SQLITE_DB_PATH = path.join(__dirname, '../../../database.sqlite');

function connectToSQLite() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(SQLITE_DB_PATH, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        reject(err);
      } else {
        console.log('Connected to SQLite database');
        resolve(db);
      }
    });
  });
}

function getAllFromSQLite(db, sql) {
  return new Promise((resolve, reject) => {
    db.all(sql, [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

async function migrateUsers(sqliteDb) {
  console.log('\nMigrating users...');

  try {
    const users = await getAllFromSQLite(sqliteDb, 'SELECT * FROM users');
    console.log(`Found ${users.length} users to migrate`);

    const userMapping = {};

    for (const user of users) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('username', user.username)
        .maybeSingle();

      if (existingUser) {
        console.log(`User ${user.username} already exists, skipping...`);
        userMapping[user.id] = existingUser.id;
        continue;
      }

      const { data: newUser, error } = await supabase
        .from('users')
        .insert([{
          username: user.username,
          password: user.password,
          name: user.name,
          email: user.email,
          role: user.role || 'user'
        }])
        .select('id')
        .single();

      if (error) {
        console.error(`Error migrating user ${user.username}:`, error.message);
        continue;
      }

      userMapping[user.id] = newUser.id;
      console.log(`Migrated user: ${user.username} (SQLite ID: ${user.id} -> Supabase ID: ${newUser.id})`);
    }

    console.log(`Successfully migrated ${Object.keys(userMapping).length} users`);
    return userMapping;
  } catch (error) {
    console.error('Error migrating users:', error);
    throw error;
  }
}

async function migrateServices(sqliteDb, userMapping) {
  console.log('\nMigrating services...');

  try {
    const services = await getAllFromSQLite(sqliteDb, 'SELECT * FROM services');
    console.log(`Found ${services.length} services to migrate`);

    let migrated = 0;
    let skipped = 0;

    for (const service of services) {
      const supabaseUserId = userMapping[service.user_id];

      if (!supabaseUserId) {
        console.log(`Skipping service ${service.id} - user not found`);
        skipped++;
        continue;
      }

      const { error } = await supabase
        .from('services')
        .insert([{
          description: service.description,
          vehicle: service.vehicle,
          price: service.price,
          status: service.status,
          user_id: supabaseUserId,
          created_at: service.created_at
        }]);

      if (error) {
        console.error(`Error migrating service ${service.id}:`, error.message);
        skipped++;
        continue;
      }

      migrated++;
      if (migrated % 50 === 0) {
        console.log(`Migrated ${migrated} services...`);
      }
    }

    console.log(`Successfully migrated ${migrated} services (${skipped} skipped)`);
  } catch (error) {
    console.error('Error migrating services:', error);
    throw error;
  }
}

async function migrateExpenses(sqliteDb, userMapping) {
  console.log('\nMigrating expenses...');

  try {
    const expenses = await getAllFromSQLite(sqliteDb, 'SELECT * FROM expenses');
    console.log(`Found ${expenses.length} expenses to migrate`);

    let migrated = 0;
    let skipped = 0;

    for (const expense of expenses) {
      const supabaseUserId = userMapping[expense.user_id];

      if (!supabaseUserId) {
        console.log(`Skipping expense ${expense.id} - user not found`);
        skipped++;
        continue;
      }

      const { error } = await supabase
        .from('expenses')
        .insert([{
          description: expense.description,
          amount: expense.amount,
          date: expense.date,
          status: expense.status || 'active',
          user_id: supabaseUserId,
          created_at: expense.created_at
        }]);

      if (error) {
        console.error(`Error migrating expense ${expense.id}:`, error.message);
        skipped++;
        continue;
      }

      migrated++;
    }

    console.log(`Successfully migrated ${migrated} expenses (${skipped} skipped)`);
  } catch (error) {
    console.error('Error migrating expenses:', error);
    throw error;
  }
}

async function migrateAppointments(sqliteDb, userMapping) {
  console.log('\nMigrating appointments...');

  try {
    const appointments = await getAllFromSQLite(sqliteDb, 'SELECT * FROM appointments');
    console.log(`Found ${appointments.length} appointments to migrate`);

    let migrated = 0;
    let skipped = 0;

    for (const appointment of appointments) {
      const supabaseUserId = userMapping[appointment.user_id];

      if (!supabaseUserId) {
        skipped++;
        continue;
      }

      const { error } = await supabase
        .from('appointments')
        .insert([{
          date: appointment.date,
          time: appointment.time,
          client: appointment.client,
          service: appointment.service,
          user_id: supabaseUserId,
          created_at: appointment.created_at
        }]);

      if (error) {
        console.error(`Error migrating appointment ${appointment.id}:`, error.message);
        skipped++;
        continue;
      }

      migrated++;
    }

    console.log(`Successfully migrated ${migrated} appointments (${skipped} skipped)`);
  } catch (error) {
    console.error('Error migrating appointments:', error);
    throw error;
  }
}

async function migrateWithdrawals(sqliteDb, userMapping) {
  console.log('\nMigrating withdrawals...');

  try {
    const withdrawals = await getAllFromSQLite(sqliteDb, 'SELECT * FROM withdrawals');
    console.log(`Found ${withdrawals.length} withdrawals to migrate`);

    let migrated = 0;
    let skipped = 0;

    for (const withdrawal of withdrawals) {
      const supabaseUserId = userMapping[withdrawal.user_id];

      if (!supabaseUserId) {
        skipped++;
        continue;
      }

      const { error } = await supabase
        .from('withdrawals')
        .insert([{
          amount: withdrawal.amount,
          part_type: withdrawal.part_type,
          description: withdrawal.description,
          user_id: supabaseUserId,
          created_at: withdrawal.created_at
        }]);

      if (error) {
        console.error(`Error migrating withdrawal ${withdrawal.id}:`, error.message);
        skipped++;
        continue;
      }

      migrated++;
    }

    console.log(`Successfully migrated ${migrated} withdrawals (${skipped} skipped)`);
  } catch (error) {
    console.error('Error migrating withdrawals:', error);
    throw error;
  }
}

async function runMigration() {
  console.log('===========================================');
  console.log('  Data Migration: SQLite -> Supabase');
  console.log('===========================================');

  let sqliteDb;

  try {
    sqliteDb = await connectToSQLite();

    const userMapping = await migrateUsers(sqliteDb);
    await migrateServices(sqliteDb, userMapping);
    await migrateExpenses(sqliteDb, userMapping);
    await migrateAppointments(sqliteDb, userMapping);
    await migrateWithdrawals(sqliteDb, userMapping);

    console.log('\n===========================================');
    console.log('  Migration completed successfully!');
    console.log('===========================================\n');

  } catch (error) {
    console.error('\nMigration failed:', error.message);
    process.exit(1);
  } finally {
    if (sqliteDb) {
      sqliteDb.close((err) => {
        if (err) {
          console.error('Error closing SQLite database:', err);
        } else {
          console.log('SQLite database connection closed');
        }
      });
    }
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
