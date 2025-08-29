const http = require('http');
const fs = require('fs').promises;
const path = require('path');

const PORT = 3001;
const API_FILE = path.join(__dirname, 'api', 'global.json');

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

async function handleRequest(req, res) {
    // Set CORS headers
    Object.keys(corsHeaders).forEach(key => {
        res.setHeader(key, corsHeaders[key]);
    });

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const url = new URL(req.url, `http://localhost:${PORT}`);
    
    if (url.pathname === '/api/global.json') {
        if (req.method === 'GET') {
            try {
                const data = await fs.readFile(API_FILE, 'utf8');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(data);
            } catch (error) {
                if (error.code === 'ENOENT') {
                    // File doesn't exist, create default
                    const defaultData = {
                        commands: [],
                        lastUpdate: Date.now(),
                        version: "2.0",
                        status: "active"
                    };
                    await fs.writeFile(API_FILE, JSON.stringify(defaultData, null, 2));
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(defaultData));
                } else {
                    res.writeHead(500);
                    res.end('Internal Server Error');
                }
            }
        } else if (req.method === 'POST') {
            try {
                let body = '';
                req.on('data', chunk => {
                    body += chunk.toString();
                });
                
                req.on('end', async () => {
                    const command = JSON.parse(body);
                    
                    // Read current data
                    let currentData;
                    try {
                        const fileContent = await fs.readFile(API_FILE, 'utf8');
                        currentData = JSON.parse(fileContent);
                    } catch {
                        currentData = {
                            commands: [],
                            lastUpdate: Date.now(),
                            version: "2.0",
                            status: "active"
                        };
                    }
                    
                    // Add new command
                    currentData.commands.push(command);
                    
                    // Keep only last 50 commands
                    if (currentData.commands.length > 50) {
                        currentData.commands = currentData.commands.slice(-50);
                    }
                    
                    currentData.lastUpdate = Date.now();
                    
                    // Write back to file
                    await fs.writeFile(API_FILE, JSON.stringify(currentData, null, 2));
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, command }));
                    
                    console.log(`[${new Date().toLocaleTimeString()}] Command added: ${command.action} (${command.page}/${command.row}/${command.col})`);
                });
            } catch (error) {
                res.writeHead(400);
                res.end('Bad Request');
            }
        }
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
}

const server = http.createServer(handleRequest);

server.listen(PORT, () => {
    console.log(`🚀 CS2 Remote Control API Server running on http://localhost:${PORT}`);
    console.log(`📡 API Endpoint: http://localhost:${PORT}/api/global.json`);
    console.log(`📝 API File: ${API_FILE}`);
    console.log('');
    console.log('🔧 For GSI Companion configuration:');
    console.log(`   Remote Controller URL: http://localhost:${PORT}/api/global.json`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down CS2 Remote Control API Server...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});
