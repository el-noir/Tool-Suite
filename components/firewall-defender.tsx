<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Firewall Defender</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Courier New', monospace;
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
            color: #00ff00;
            overflow: hidden;
            height: 100vh;
        }

        .container {
            display: grid;
            grid-template-columns: 300px 1fr;
            height: 100vh;
            gap: 10px;
            padding: 10px;
        }

        .sidebar {
            background: rgba(0, 20, 40, 0.9);
            border: 2px solid #00ff00;
            border-radius: 10px;
            padding: 15px;
            overflow-y: auto;
            backdrop-filter: blur(10px);
        }

        .game-area {
            background: rgba(0, 10, 30, 0.8);
            border: 2px solid #00ff00;
            border-radius: 10px;
            position: relative;
            overflow: hidden;
            backdrop-filter: blur(5px);
        }

        .stats {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 20px;
        }

        .stat-item {
            background: rgba(0, 255, 0, 0.1);
            padding: 10px;
            border-radius: 5px;
            text-align: center;
            border: 1px solid #00ff00;
        }

        .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #00ff00;
        }

        .controls {
            margin-bottom: 20px;
        }

        .btn {
            background: linear-gradient(45deg, #00ff00, #00cc00);
            color: #000;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
            margin: 5px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0, 255, 0, 0.3);
        }

        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0, 255, 0, 0.5);
        }

        .btn:disabled {
            background: #333;
            color: #666;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }

        .rule-form {
            background: rgba(0, 255, 0, 0.05);
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
            border: 1px solid #00ff00;
        }

        .form-group {
            margin-bottom: 10px;
        }

        .form-group label {
            display: block;
            margin-bottom: 5px;
            color: #00ff00;
            font-size: 12px;
        }

        .form-group input, .form-group select {
            width: 100%;
            padding: 8px;
            background: rgba(0, 0, 0, 0.7);
            border: 1px solid #00ff00;
            border-radius: 3px;
            color: #00ff00;
            font-family: 'Courier New', monospace;
        }

        .rules-list {
            max-height: 200px;
            overflow-y: auto;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 5px;
            padding: 10px;
        }

        .rule-item {
            background: rgba(0, 255, 0, 0.1);
            padding: 8px;
            margin-bottom: 5px;
            border-radius: 3px;
            border-left: 3px solid #00ff00;
            font-size: 11px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .rule-delete {
            background: #ff4444;
            color: white;
            border: none;
            padding: 2px 6px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 10px;
        }

        .packet {
            position: absolute;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: bold;
            color: white;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
            transition: all 0.1s linear;
            box-shadow: 0 0 15px currentColor;
            z-index: 10;
        }

        .packet.malicious {
            background: radial-gradient(circle, #ff4444, #cc0000);
            border: 2px solid #ff6666;
        }

        .packet.benign {
            background: radial-gradient(circle, #4444ff, #0000cc);
            border: 2px solid #6666ff;
        }

        .packet.blocked {
            background: radial-gradient(circle, #888, #444);
            border: 2px solid #aaa;
            animation: blockEffect 0.5s ease-out;
        }

        @keyframes blockEffect {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.5); opacity: 0.7; }
            100% { transform: scale(0); opacity: 0; }
        }

        .server {
            position: absolute;
            right: 50px;
            top: 50%;
            transform: translateY(-50%);
            width: 80px;
            height: 100px;
            background: linear-gradient(45deg, #00ff00, #00cc00);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            color: #000;
            box-shadow: 0 0 30px rgba(0, 255, 0, 0.5);
            z-index: 5;
        }

        .server.damaged {
            animation: damage 0.3s ease-in-out;
        }

        @keyframes damage {
            0%, 100% { transform: translateY(-50%); }
            25% { transform: translateY(-50%) translateX(-5px); }
            75% { transform: translateY(-50%) translateX(5px); }
        }

        .packet-info {
            position: absolute;
            background: rgba(0, 0, 0, 0.9);
            color: #00ff00;
            padding: 5px;
            border-radius: 3px;
            font-size: 10px;
            border: 1px solid #00ff00;
            pointer-events: none;
            z-index: 20;
            max-width: 200px;
        }

        .game-over {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.95);
            padding: 30px;
            border-radius: 10px;
            border: 2px solid #ff4444;
            text-align: center;
            z-index: 100;
            display: none;
        }

        .game-over h2 {
            color: #ff4444;
            margin-bottom: 20px;
            font-size: 24px;
        }

        .log {
            background: rgba(0, 0, 0, 0.5);
            height: 150px;
            overflow-y: auto;
            padding: 10px;
            border-radius: 5px;
            font-size: 11px;
            border: 1px solid #00ff00;
        }

        .log-entry {
            margin-bottom: 5px;
            padding: 2px;
        }

        .log-entry.blocked {
            color: #ff4444;
        }

        .log-entry.allowed {
            color: #4444ff;
        }

        .log-entry.malicious {
            color: #ff6666;
            font-weight: bold;
        }

        h3 {
            color: #00ff00;
            margin-bottom: 10px;
            font-size: 14px;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .difficulty {
            display: flex;
            gap: 5px;
            margin-bottom: 15px;
        }

        .difficulty .btn {
            flex: 1;
            padding: 5px;
            font-size: 11px;
        }

        .difficulty .btn.active {
            background: linear-gradient(45deg, #ff4444, #cc0000);
        }

        @media (max-width: 768px) {
            .container {
                grid-template-columns: 1fr;
                grid-template-rows: auto 1fr;
            }
            
            .sidebar {
                height: 200px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="sidebar">
            <h3>🛡️ Firewall Control</h3>
            
            <div class="stats">
                <div class="stat-item">
                    <div>Health</div>
                    <div class="stat-value" id="health">100</div>
                </div>
                <div class="stat-item">
                    <div>Score</div>
                    <div class="stat-value" id="score">0</div>
                </div>
            </div>

            <div class="difficulty">
                <button class="btn active" onclick="setDifficulty('easy')">Easy</button>
                <button class="btn" onclick="setDifficulty('medium')">Medium</button>
                <button class="btn" onclick="setDifficulty('hard')">Hard</button>
            </div>

            <div class="controls">
                <button class="btn" id="startBtn" onclick="startGame()">Start Defense</button>
                <button class="btn" id="stopBtn" onclick="stopGame()" disabled>Stop</button>
                <button class="btn" onclick="resetGame()">Reset</button>
            </div>

            <div class="rule-form">
                <h3>Add Firewall Rule</h3>
                <div class="form-group">
                    <label>IP Address (optional)</label>
                    <input type="text" id="ruleIP" placeholder="192.168.1.10">
                </div>
                <div class="form-group">
                    <label>Port (optional)</label>
                    <input type="number" id="rulePort" placeholder="22">
                </div>
                <div class="form-group">
                    <label>Protocol</label>
                    <select id="ruleProtocol">
                        <option value="">Any</option>
                        <option value="TCP">TCP</option>
                        <option value="UDP">UDP</option>
                        <option value="ICMP">ICMP</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Action</label>
                    <select id="ruleAction">
                        <option value="deny">Deny</option>
                        <option value="allow">Allow</option>
                    </select>
                </div>
                <button class="btn" onclick="addRule()">Add Rule</button>
            </div>

            <div class="rules-list" id="rulesList">
                <h3>Active Rules</h3>
                <div id="rulesContainer"></div>
            </div>
        </div>

        <div class="game-area" id="gameArea">
            <div class="server" id="server">
                <div>SERVER</div>
            </div>
            
            <div class="game-over" id="gameOver">
                <h2>SYSTEM COMPROMISED!</h2>
                <p>Your server has been breached.</p>
                <p>Final Score: <span id="finalScore">0</span></p>
                <button class="btn" onclick="resetGame()">Try Again</button>
            </div>

            <div class="log" id="log" style="position: absolute; bottom: 10px; left: 10px; width: 300px;">
                <div class="log-entry">Firewall Defense System Online</div>
                <div class="log-entry">Monitoring network traffic...</div>
            </div>
        </div>
    </div>

    <script>
        // Game state
        let gameState = {
            running: false,
            health: 100,
            score: 0,
            packets: [],
            rules: [],
            difficulty: 'easy',
            packetInterval: null,
            animationInterval: null,
            packetId: 0
        };

        // Difficulty settings
        const difficulties = {
            easy: { spawnRate: 2000, maliciousChance: 0.3, packetSpeed: 1 },
            medium: { spawnRate: 1500, maliciousChance: 0.5, packetSpeed: 1.5 },
            hard: { spawnRate: 1000, maliciousChance: 0.7, packetSpeed: 2 }
        };

        // Common network data for realistic simulation
        const networkData = {
            ips: [
                '192.168.1.10', '192.168.1.20', '10.0.0.5', '172.16.0.100',
                '203.0.113.25', '198.51.100.50', '8.8.8.8', '1.1.1.1',
                '185.199.108.153', '140.82.112.4'
            ],
            ports: [22, 23, 25, 53, 80, 110, 143, 443, 993, 995, 3389, 5432, 8080],
            protocols: ['TCP', 'UDP', 'ICMP'],
            maliciousPatterns: [
                { port: 22, description: 'SSH Brute Force' },
                { port: 23, description: 'Telnet Attack' },
                { port: 3389, description: 'RDP Exploit' },
                { port: 80, description: 'HTTP Flood' },
                { port: 443, description: 'SSL Attack' }
            ]
        };

        function setDifficulty(level) {
            gameState.difficulty = level;
            document.querySelectorAll('.difficulty .btn').forEach(btn => {
                btn.classList.remove('active');
            });
            event.target.classList.add('active');
            log(`Difficulty set to ${level.toUpperCase()}`);
        }

        function startGame() {
            if (gameState.running) return;
            
            gameState.running = true;
            document.getElementById('startBtn').disabled = true;
            document.getElementById('stopBtn').disabled = false;
            
            log('🚨 Network defense activated!');
            
            // Start packet generation
            const settings = difficulties[gameState.difficulty];
            gameState.packetInterval = setInterval(generatePacket, settings.spawnRate);
            
            // Start animation loop
            gameState.animationInterval = setInterval(updatePackets, 50);
        }

        function stopGame() {
            gameState.running = false;
            document.getElementById('startBtn').disabled = false;
            document.getElementById('stopBtn').disabled = true;
            
            clearInterval(gameState.packetInterval);
            clearInterval(gameState.animationInterval);
            
            log('Defense system paused');
        }

        function resetGame() {
            stopGame();
            gameState.health = 100;
            gameState.score = 0;
            gameState.packets = [];
            gameState.packetId = 0;
            
            // Clear all packets from DOM
            document.querySelectorAll('.packet').forEach(packet => packet.remove());
            document.getElementById('gameOver').style.display = 'none';
            
            updateDisplay();
            clearLog();
            log('System reset - Ready for defense');
        }

        function generatePacket() {
            if (!gameState.running) return;

            const settings = difficulties[gameState.difficulty];
            const isMalicious = Math.random() < settings.maliciousChance;
            
            let packet = {
                id: ++gameState.packetId,
                ip: networkData.ips[Math.floor(Math.random() * networkData.ips.length)],
                port: networkData.ports[Math.floor(Math.random() * networkData.ports.length)],
                protocol: networkData.protocols[Math.floor(Math.random() * networkData.protocols.length)],
                type: isMalicious ? 'malicious' : 'benign',
                x: -50,
                y: Math.random() * (window.innerHeight - 200) + 100,
                speed: settings.packetSpeed,
                blocked: false
            };

            gameState.packets.push(packet);
            createPacketElement(packet);
        }

        function createPacketElement(packet) {
            const packetEl = document.createElement('div');
            packetEl.className = `packet ${packet.type}`;
            packetEl.id = `packet-${packet.id}`;
            packetEl.style.left = packet.x + 'px';
            packetEl.style.top = packet.y + 'px';
            packetEl.innerHTML = packet.protocol[0];
            
            // Add hover tooltip
            packetEl.addEventListener('mouseenter', (e) => showPacketInfo(e, packet));
            packetEl.addEventListener('mouseleave', hidePacketInfo);
            
            document.getElementById('gameArea').appendChild(packetEl);
        }

        function showPacketInfo(e, packet) {
            const info = document.createElement('div');
            info.className = 'packet-info';
            info.id = 'packetInfo';
            info.innerHTML = `
                IP: ${packet.ip}<br>
                Port: ${packet.port}<br>
                Protocol: ${packet.protocol}<br>
                Type: ${packet.type.toUpperCase()}
            `;
            info.style.left = (e.pageX + 10) + 'px';
            info.style.top = (e.pageY - 50) + 'px';
            
            document.body.appendChild(info);
        }

        function hidePacketInfo() {
            const info = document.getElementById('packetInfo');
            if (info) info.remove();
        }

        function updatePackets() {
            if (!gameState.running) return;

            gameState.packets = gameState.packets.filter(packet => {
                if (packet.blocked) return false;

                packet.x += packet.speed;
                const packetEl = document.getElementById(`packet-${packet.id}`);
                
                if (!packetEl) return false;

                // Check if packet should be blocked by rules
                if (!packet.processed) {
                    packet.processed = true;
                    const shouldBlock = checkRules(packet);
                    
                    if (shouldBlock) {
                        blockPacket(packet);
                        return false;
                    }
                }

                // Update position
                packetEl.style.left = packet.x + 'px';

                // Check if packet reached server
                if (packet.x >= window.innerWidth - 150) {
                    handlePacketReachedServer(packet);
                    packetEl.remove();
                    return false;
                }

                return true;
            });
        }

        function checkRules(packet) {
            for (let rule of gameState.rules) {
                if (matches(rule, packet)) {
                    log(`Rule matched: ${rule.action.toUpperCase()} ${packet.ip}:${packet.port}/${packet.protocol}`, 
                        rule.action === 'deny' ? 'blocked' : 'allowed');
                    return rule.action === 'deny';
                }
            }
            return false; // Default allow
        }

        function matches(rule, packet) {
            return (
                (!rule.ip || rule.ip === packet.ip) &&
                (!rule.port || rule.port == packet.port) &&
                (!rule.protocol || rule.protocol === packet.protocol)
            );
        }

        function blockPacket(packet) {
            packet.blocked = true;
            const packetEl = document.getElementById(`packet-${packet.id}`);
            if (packetEl) {
                packetEl.classList.add('blocked');
                setTimeout(() => packetEl.remove(), 500);
            }

            if (packet.type === 'malicious') {
                gameState.score += 10;
                log(`🛡️ Blocked malicious ${packet.protocol} packet from ${packet.ip}:${packet.port}`, 'blocked');
            } else {
                gameState.score += 1;
                log(`⚠️ Blocked benign ${packet.protocol} packet from ${packet.ip}:${packet.port}`, 'blocked');
            }
            
            updateDisplay();
        }

        function handlePacketReachedServer(packet) {
            if (packet.type === 'malicious') {
                gameState.health -= 10;
                gameState.score -= 5;
                log(`💥 BREACH! Malicious ${packet.protocol} packet reached server from ${packet.ip}:${packet.port}`, 'malicious');
                
                // Visual damage effect
                const server = document.getElementById('server');
                server.classList.add('damaged');
                setTimeout(() => server.classList.remove('damaged'), 300);
                
                if (gameState.health <= 0) {
                    gameOver();
                    return;
                }
            } else {
                gameState.score += 2;
                log(`✅ Benign ${packet.protocol} packet processed from ${packet.ip}:${packet.port}`, 'allowed');
            }
            
            updateDisplay();
        }

        function addRule() {
            const ip = document.getElementById('ruleIP').value.trim();
            const port = document.getElementById('rulePort').value.trim();
            const protocol = document.getElementById('ruleProtocol').value;
            const action = document.getElementById('ruleAction').value;

            if (!ip && !port && !protocol) {
                alert('Please specify at least one rule parameter');
                return;
            }

            const rule = {
                id: Date.now(),
                ip: ip || null,
                port: port ? parseInt(port) : null,
                protocol: protocol || null,
                action: action
            };

            gameState.rules.push(rule);
            updateRulesList();
            clearRuleForm();
            
            log(`New rule added: ${action.toUpperCase()} ${ip || '*'}:${port || '*'}/${protocol || '*'}`);
        }

        function deleteRule(ruleId) {
            gameState.rules = gameState.rules.filter(rule => rule.id !== ruleId);
            updateRulesList();
            log('Rule deleted');
        }

        function updateRulesList() {
            const container = document.getElementById('rulesContainer');
            container.innerHTML = '';

            if (gameState.rules.length === 0) {
                container.innerHTML = '<div style="color: #666; font-style: italic;">No rules configured</div>';
                return;
            }

            gameState.rules.forEach(rule => {
                const ruleEl = document.createElement('div');
                ruleEl.className = 'rule-item';
                ruleEl.innerHTML = `
                    <span>${rule.action.toUpperCase()} ${rule.ip || '*'}:${rule.port || '*'}/${rule.protocol || '*'}</span>
                    <button class="rule-delete" onclick="deleteRule(${rule.id})">×</button>
                `;
                container.appendChild(ruleEl);
            });
        }

        function clearRuleForm() {
            document.getElementById('ruleIP').value = '';
            document.getElementById('rulePort').value = '';
            document.getElementById('ruleProtocol').value = '';
            document.getElementById('ruleAction').value = 'deny';
        }

        function updateDisplay() {
            document.getElementById('health').textContent = Math.max(0, gameState.health);
            document.getElementById('score').textContent = gameState.score;
            
            // Update health color based on value
            const healthEl = document.getElementById('health');
            if (gameState.health <= 20) {
                healthEl.style.color = '#ff4444';
            } else if (gameState.health <= 50) {
                healthEl.style.color = '#ffaa00';
            } else {
                healthEl.style.color = '#00ff00';
            }
        }

        function gameOver() {
            stopGame();
            document.getElementById('finalScore').textContent = gameState.score;
            document.getElementById('gameOver').style.display = 'block';
            log('🚨 SYSTEM COMPROMISED! Server health critical!');
        }

        function log(message, type = '') {
            const logEl = document.getElementById('log');
            const entry = document.createElement('div');
            entry.className = `log-entry ${type}`;
            entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
            logEl.appendChild(entry);
            logEl.scrollTop = logEl.scrollHeight;
        }

        function clearLog() {
            document.getElementById('log').innerHTML = `
                <div class="log-entry">Firewall Defense System Online</div>
                <div class="log-entry">Monitoring network traffic...</div>
            `;
        }

        // Initialize game
        updateDisplay();
        updateRulesList();

        // Add some default rules for demonstration
        gameState.rules.push(
            { id: 1, ip: null, port: 22, protocol: 'TCP', action: 'deny' },
            { id: 2, ip: '192.168.1.10', port: null, protocol: null, action: 'deny' }
        );
        updateRulesList();
        log('Default security rules loaded');
    </script>
</body>
</html>