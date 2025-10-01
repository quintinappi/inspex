const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        this.dbPath = path.join(__dirname, 'inspex.db');
        this.db = new sqlite3.Database(this.dbPath);
        this.initialize();
    }

    initialize() {
        // Read and execute schema
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        this.db.exec(schema, (err) => {
            if (err) {
                console.log('Database already exists or error:', err.message);
            } else {
                console.log('Database initialized successfully');
            }
        });
    }

    // Generic query methods
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, changes: this.changes });
            });
        });
    }

    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Door numbering system
    async getNextSerialNumber() {
        const result = await this.get('SELECT MAX(CAST(SUBSTR(drawing_number, 2) AS INTEGER)) as max_num FROM doors');
        const nextNum = (result?.max_num || 198) + 1;
        return nextNum;
    }

    generateSerialNumber(drawingNum, doorType) {
        return `MUF-S${drawingNum.toString().padStart(3, '0')}-RBD${doorType}-01-0`;
    }

    generateDrawingNumber(num) {
        return `S${num.toString().padStart(3, '0')}`;
    }

    close() {
        this.db.close();
    }
}

module.exports = Database;