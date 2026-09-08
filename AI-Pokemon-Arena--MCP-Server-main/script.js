// Pokemon Battle Arena JavaScript
let selectedPokemon1 = null;
let selectedPokemon2 = null;

async function selectPokemon(playerNumber) {
    const input = document.getElementById(`pokemon${playerNumber}-input`);
    const pokemonName = input.value.trim().toLowerCase();

    if (!pokemonName) {
        showError('Please enter a Pokemon name!', `pokemon${playerNumber}-card`);
        return;
    }

    // Show loading state
    const selectBtn = document.getElementById(`pokemon${playerNumber}-input`).nextElementSibling;
    const originalText = selectBtn.textContent;
    selectBtn.textContent = '🔍 Searching...';
    selectBtn.disabled = true;

    try {
        // Fetch Pokemon data from our API
        const response = await fetch(`/api/pokemon/${pokemonName}`);
        if (!response.ok) {
            throw new Error(`Pokemon "${pokemonName}" not found! Please check the spelling.`);
        }

        const pokemonData = await response.json();

        // Update UI with animation
        updatePokemonDisplay(playerNumber, pokemonData);

        // Store selected Pokemon
        if (playerNumber === 1) {
            selectedPokemon1 = pokemonData;
        } else {
            selectedPokemon2 = pokemonData;
        }

        // Enable battle button if both Pokemon are selected
        checkBattleReady();

        // Clear any previous errors
        clearError(`pokemon${playerNumber}-card`);

        // Success feedback
        showSuccess(`✅ ${pokemonData.name.charAt(0).toUpperCase() + pokemonData.name.slice(1)} selected!`, `pokemon${playerNumber}-card`);

    } catch (error) {
        console.error('Error fetching Pokemon:', error);
        showError(`❌ ${error.message}`, `pokemon${playerNumber}-card`);
    } finally {
        // Reset button
        selectBtn.textContent = originalText;
        selectBtn.disabled = false;
    }
}

function updatePokemonDisplay(playerNumber, pokemonData) {
    const displayDiv = document.getElementById(`pokemon${playerNumber}-display`);
    const statsDiv = document.getElementById(`pokemon${playerNumber}-stats`);

    // Get the best available sprite
    let spriteUrl = null;
    if (pokemonData.sprites) {
        spriteUrl = pokemonData.sprites.other?.['official-artwork']?.front_default ||
                   pokemonData.sprites.other?.home?.front_default ||
                   pokemonData.sprites.front_default ||
                   pokemonData.sprites.back_default ||
                   `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonData.id}.png`;
    }

    // Update Pokemon image and info with enhanced UI
    displayDiv.innerHTML = `
        <div class="pokemon-card-content">
            <img src="${spriteUrl}"
                 alt="${pokemonData.name}"
                 class="pokemon-sprite">
            <h4 class="pokemon-name">${pokemonData.name.charAt(0).toUpperCase() + pokemonData.name.slice(1)}</h4>
            <div class="pokemon-types">
                ${pokemonData.types.map(type => `<span class="type-badge type-${type}">${type}</span>`).join('')}
            </div>
        </div>
    `;

    // Update stats with enhanced formatting
    const totalStats = pokemonData.stats.hp + pokemonData.stats.attack + pokemonData.stats.defense +
                      pokemonData.stats.specialAttack + pokemonData.stats.specialDefense + pokemonData.stats.speed;

    statsDiv.innerHTML = `
        <div class="stats-container">
            <div class="stat-row">
                <span class="stat-label">HP:</span>
                <div class="stat-bar">
                    <div class="stat-fill hp-fill" style="width: ${Math.min(pokemonData.stats.hp / 255 * 100, 100)}%"></div>
                </div>
                <span class="stat-value">${pokemonData.stats.hp}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">ATK:</span>
                <div class="stat-bar">
                    <div class="stat-fill atk-fill" style="width: ${Math.min(pokemonData.stats.attack / 255 * 100, 100)}%"></div>
                </div>
                <span class="stat-value">${pokemonData.stats.attack}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">DEF:</span>
                <div class="stat-bar">
                    <div class="stat-fill def-fill" style="width: ${Math.min(pokemonData.stats.defense / 255 * 100, 100)}%"></div>
                </div>
                <span class="stat-value">${pokemonData.stats.defense}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">SPA:</span>
                <div class="stat-bar">
                    <div class="stat-fill spa-fill" style="width: ${Math.min(pokemonData.stats.specialAttack / 255 * 100, 100)}%"></div>
                </div>
                <span class="stat-value">${pokemonData.stats.specialAttack}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">SPD:</span>
                <div class="stat-bar">
                    <div class="stat-fill spd-fill" style="width: ${Math.min(pokemonData.stats.specialDefense / 255 * 100, 100)}%"></div>
                </div>
                <span class="stat-value">${pokemonData.stats.specialDefense}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">SPE:</span>
                <div class="stat-bar">
                    <div class="stat-fill spe-fill" style="width: ${Math.min(pokemonData.stats.speed / 255 * 100, 100)}%"></div>
                </div>
                <span class="stat-value">${pokemonData.stats.speed}</span>
            </div>
            <div class="total-stats">
                <strong>Total: ${totalStats}</strong>
            </div>
        </div>
    `;

    // Add entrance animation
    displayDiv.style.animation = 'pokemonEnter 0.6s ease-out';
}

function checkBattleReady() {
    const battleBtn = document.getElementById('battle-btn');
    if (selectedPokemon1 && selectedPokemon2) {
        battleBtn.disabled = false;
        battleBtn.style.background = 'linear-gradient(45deg, #ff4757, #ff3838)';
    }
}

async function startBattle() {
    if (!selectedPokemon1 || !selectedPokemon2) {
        showError('Please select both Pokemon first!', 'battle-controls');
        return;
    }

    console.log('Starting battle with:', selectedPokemon1.name, 'vs', selectedPokemon2.name);

    // Enhanced loading overlay with progress
    showLoadingOverlay();

    try {
        // Start battle animation
        await animateBattleStart();

        // Simulate battle with progress updates
        console.log('Calling simulateBattleWithProgress...');
        const battleResult = await simulateBattleWithProgress();
        console.log('Battle result received, calling displayBattleResults...');

        // Display battle results with enhanced animations
        await displayBattleResults(battleResult);
        console.log('Battle display completed');

    } catch (error) {
        console.error('Battle error in startBattle:', error);
        showError(`❌ Battle failed: ${error.message}`, 'battle-arena');
    } finally {
        // Hide loading overlay
        console.log('Hiding loading overlay');
        hideLoadingOverlay();
    }
}

function showLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    overlay.style.display = 'flex';

    // Add loading phases
    const phases = [
        '🤖 Initializing AI Battle Engine...',
        '📊 Analyzing Pokemon Statistics...',
        '⚡ Calculating Battle Strategies...',
        '🎯 Simulating Battle Scenarios...',
        '🏆 Determining Battle Outcome...'
    ];

    let phaseIndex = 0;
    const phaseText = overlay.querySelector('p');

    const phaseInterval = setInterval(() => {
        if (phaseIndex < phases.length) {
            phaseText.textContent = phases[phaseIndex];
            phaseIndex++;
        } else {
            clearInterval(phaseInterval);
        }
    }, 800);
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    overlay.style.animation = 'fadeOut 0.5s ease-out';
    setTimeout(() => {
        overlay.style.display = 'none';
        overlay.style.animation = '';
    }, 500);
}

async function simulateBattleWithProgress() {
    console.log('Starting battle simulation...');
    console.log('Pokemon 1:', selectedPokemon1);
    console.log('Pokemon 2:', selectedPokemon2);

    // Simulate API call with timeout for demo purposes
    return new Promise((resolve, reject) => {
        setTimeout(async () => {
            try {
                console.log('Making API call to /api/battle...');

                const response = await fetch('/api/battle', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        pokemon1: selectedPokemon1,
                        pokemon2: selectedPokemon2
                    })
                });

                console.log('API Response status:', response.status);
                console.log('API Response ok:', response.ok);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('API Error response:', errorText);
                    throw new Error(`Battle simulation failed: ${response.status} - ${errorText}`);
                }

                const battleResult = await response.json();
                console.log('Battle result received:', battleResult);
                resolve(battleResult);
            } catch (error) {
                console.error('Battle simulation error:', error);
                reject(error);
            }
        }, 3000); // 3 second delay for loading effect
    });
}

async function displayBattleResults(battleResult) {
    console.log('Displaying battle results:', battleResult);

    try {
        const logContent = document.getElementById('log-content');
        const battleResultDiv = document.getElementById('battle-result');

        if (!logContent || !battleResultDiv) {
            console.error('Required DOM elements not found');
            return;
        }

        // Clear previous log
        logContent.innerHTML = '';

        // Validate battle result
        if (!battleResult || typeof battleResult !== 'object') {
            console.error('Invalid battle result:', battleResult);
            showError('Invalid battle result received', 'battle-log');
            return;
        }

        // Add battle start message
        const startMessage = document.createElement('div');
        startMessage.className = 'log-entry battle-start';
        startMessage.innerHTML = '<strong>🎯 BATTLE START!</strong> The arena fills with energy as the Pokemon prepare to fight!';
        logContent.appendChild(startMessage);

        // Display battle log with enhanced animations
        if (battleResult.battleLog && Array.isArray(battleResult.battleLog) && battleResult.battleLog.length > 0) {
            console.log('Processing battle log:', battleResult.battleLog);

            const fullBattleLog = battleResult.battleLog.join(' ');
            const attacks = fullBattleLog.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(used|unleashed|landed|struck with|hit with|attacked with)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi);

            if (attacks && attacks.length > 0) {
                console.log('Found attacks:', attacks);

                for (let i = 0; i < Math.min(attacks.length, 5); i++) {
                    await new Promise(resolve => setTimeout(resolve, 1200)); // Slower, more dramatic timing

                    const attack = attacks[i];
                    const parts = attack.split(/\s+(used|unleashed|landed|struck with|hit with|attacked with)\s+/i);

                    if (parts.length >= 3) {
                        const pokemon = parts[0].trim();
                        const move = parts[2].trim();

                        const logEntry = document.createElement('div');
                        logEntry.className = 'log-entry';
                        logEntry.innerHTML = `
                            <strong>🔄 Turn ${i + 1}:</strong> ⚡ ${pokemon} used ${move}!
                        `;
                        logContent.appendChild(logEntry);

                        // Scroll to bottom with smooth animation
                        logContent.scrollTo({
                            top: logContent.scrollHeight,
                            behavior: 'smooth'
                        });

                        // Add attack animation
                        await animateAttack(pokemon === selectedPokemon1.name ? 1 : 2, move);
                    }
                }
            } else {
                // Fallback: show basic battle log
                console.log('No attacks found, showing fallback log');
                for (let i = 0; i < Math.min(battleResult.battleLog.length, 5); i++) {
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    const logEntry = document.createElement('div');
                    logEntry.className = 'log-entry';
                    logEntry.innerHTML = `<strong>Turn ${i + 1}:</strong> ${battleResult.battleLog[i]}`;
                    logContent.appendChild(logEntry);

                    logContent.scrollTo({
                        top: logContent.scrollHeight,
                        behavior: 'smooth'
                    });
                }
            }
        } else {
            // No battle log available, create a basic one
            console.log('No battle log available, creating basic log');
            const basicTurns = [
                `${selectedPokemon1.name} enters the battlefield!`,
                `${selectedPokemon2.name} prepares for battle!`,
                `${selectedPokemon1.name} makes the first move!`,
                `${selectedPokemon2.name} counters the attack!`,
                `The battle concludes with ${battleResult.winner || selectedPokemon1.name} victorious!`
            ];

            for (let i = 0; i < basicTurns.length; i++) {
                await new Promise(resolve => setTimeout(resolve, 1000));

                const logEntry = document.createElement('div');
                logEntry.className = 'log-entry';
                logEntry.innerHTML = `<strong>Turn ${i + 1}:</strong> ${basicTurns[i]}`;
                logContent.appendChild(logEntry);

                logContent.scrollTo({
                    top: logContent.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }

        // Add battle end message
        setTimeout(() => {
            const endMessage = document.createElement('div');
            endMessage.className = 'log-entry battle-end';
            endMessage.innerHTML = '<strong>🏁 BATTLE END!</strong> The dust settles as the winner emerges...';
            logContent.appendChild(endMessage);
            logContent.scrollTo({
                top: logContent.scrollHeight,
                behavior: 'smooth'
            });
        }, 1000);

        // Show battle result after a dramatic pause
        setTimeout(() => {
            console.log('Showing battle result section');
            battleResultDiv.style.display = 'block';

            // Animate result appearance
            battleResultDiv.style.animation = 'resultAppear 1s ease-out';

            const winner = battleResult.winner || selectedPokemon1.name;
            const winnerEmoji = winner.toLowerCase() === selectedPokemon1.name.toLowerCase() ? '🔥' : '💧';

            document.getElementById('winner-announcement').innerHTML = `
                <div class="winner-celebration">
                    <h2>${winnerEmoji} 🏆 ${winner.toUpperCase()} WINS! 🏆 ${winnerEmoji}</h2>
                    <div class="celebration-effects">🎉✨🎊</div>
                </div>
            `;

            document.getElementById('scenario-description').innerHTML = `
                <h4>🎭 Battle Scenario:</h4>
                <p>In this epic Pokemon battle between ${selectedPokemon1.name} and ${selectedPokemon2.name},
                the ${winner} emerged victorious through strategic superiority.
                The battle showcased the clash between ${selectedPokemon1.types.join('/')} and ${selectedPokemon2.types.join('/')} type Pokemon,
                with ${winner}'s skills determining the outcome.</p>
            `;

            document.getElementById('key-factors').innerHTML = `
                <h4>💡 Key Factors:</h4>
                <p>${battleResult.analysis || 'The battle was determined by the Pokemon\'s stats, abilities, and strategic moves.'}</p>
            `;

            // Scroll to result with smooth animation
            battleResultDiv.scrollIntoView({ behavior: 'smooth' });

            // Add victory celebration
            celebrateVictory(winner === selectedPokemon1.name ? 1 : 2);

        }, 3000);

    } catch (error) {
        console.error('Error in displayBattleResults:', error);
        showError('Failed to display battle results: ' + error.message, 'battle-log');
    }
}

async function animateAttack(attackerNumber, move) {
    const battler = document.getElementById(`battler${attackerNumber}`);
    const effects = document.getElementById('battle-effects');

    // Different effects based on move type
    const moveEffects = {
        thunder: '⚡⚡⚡',
        fire: '🔥🔥🔥',
        water: '💧💧💧',
        grass: '🌿🌿🌿',
        default: '💥💥💥'
    };

    const effect = move.toLowerCase().includes('thunder') ? moveEffects.thunder :
                  move.toLowerCase().includes('fire') ? moveEffects.fire :
                  move.toLowerCase().includes('water') ? moveEffects.water :
                  move.toLowerCase().includes('grass') ? moveEffects.grass :
                  moveEffects.default;

    // Add attack effect
    effects.innerHTML = `<div class="attack-effect">${effect}</div>`;
    setTimeout(() => {
        effects.innerHTML = '';
    }, 800);

    // Shake animation for defender
    const defenderNumber = attackerNumber === 1 ? 2 : 1;
    const defender = document.getElementById(`battler${defenderNumber}`);
    defender.style.animation = 'shake 0.6s ease-in-out';
    setTimeout(() => {
        defender.style.animation = '';
    }, 600);

    // Flash the attacker
    battler.style.animation = 'attackFlash 0.4s ease-in-out';
    setTimeout(() => {
        battler.style.animation = '';
    }, 400);
}

function celebrateVictory(winnerNumber) {
    const winner = document.getElementById(`battler${winnerNumber}`);
    const winnerImg = winner.querySelector('img');

    // Victory animation sequence
    setTimeout(() => {
        winnerImg.style.animation = 'victoryDance 2s ease-in-out infinite';
        winnerImg.style.filter = 'drop-shadow(0 0 30px rgba(255, 215, 0, 1))';

        // Add celebration particles
        createCelebrationParticles(winner);
    }, 500);
}

function createCelebrationParticles(container) {
    const particlesContainer = document.createElement('div');
    particlesContainer.className = 'celebration-particles';
    particlesContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 10;
    `;

    // Create multiple particles
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.textContent = ['✨', '⭐', '🎉', '🎊'][Math.floor(Math.random() * 4)];
        particle.style.cssText = `
            position: absolute;
            font-size: ${20 + Math.random() * 20}px;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation: particleFloat ${2 + Math.random() * 2}s ease-out forwards;
            opacity: 0;
        `;
        particlesContainer.appendChild(particle);
    }

    container.appendChild(particlesContainer);

    // Remove particles after animation
    setTimeout(() => {
        if (particlesContainer.parentNode) {
            particlesContainer.remove();
        }
    }, 4000);
}

// Utility functions for error handling and UI feedback
function showError(message, targetElementId) {
    const element = document.getElementById(targetElementId);
    if (!element) return;

    // Remove any existing error messages
    const existingError = element.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }

    // Create error message element
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = message;
    errorDiv.style.cssText = `
        color: #e74c3c;
        background: #fdf2f2;
        border: 1px solid #f5c6cb;
        border-radius: 4px;
        padding: 8px 12px;
        margin: 8px 0;
        font-size: 14px;
        animation: fadeIn 0.3s ease-in;
    `;

    element.appendChild(errorDiv);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 5000);
}

function clearError(targetElementId) {
    const element = document.getElementById(targetElementId);
    if (!element) return;

    const errorMessage = element.querySelector('.error-message');
    if (errorMessage) {
        errorMessage.remove();
    }
}

function showSuccess(message, targetElementId) {
    const element = document.getElementById(targetElementId);
    if (!element) return;

    // Remove any existing success messages
    const existingSuccess = element.querySelector('.success-message');
    if (existingSuccess) {
        existingSuccess.remove();
    }

    // Create success message element
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = message;
    successDiv.style.cssText = `
        color: #27ae60;
        background: #d5f4e6;
        border: 1px solid #a8e6cf;
        border-radius: 4px;
        padding: 8px 12px;
        margin: 8px 0;
        font-size: 14px;
        animation: fadeIn 0.3s ease-in;
    `;

    element.appendChild(successDiv);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.remove();
        }
    }, 3000);
}

function animateBattleStart() {
    const battleArena = document.getElementById('battle-arena');
    if (!battleArena) return;

    // Add battle start animation
    battleArena.style.animation = 'battleStart 1s ease-out';

    // Create battle start effect
    const effect = document.createElement('div');
    effect.innerHTML = '⚡ BATTLE START! ⚡';
    effect.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 2rem;
        font-weight: bold;
        color: #f39c12;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
        z-index: 1000;
        animation: battleFlash 1s ease-out forwards;
        pointer-events: none;
    `;

    battleArena.appendChild(effect);

    // Remove effect after animation
    setTimeout(() => {
        if (effect.parentNode) {
            effect.remove();
        }
    }, 1000);
}

// Add some CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
    }

    @keyframes battleFlash {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
        50% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(1); }
    }

    @keyframes battleStart {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }

    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }

    .attack-effect {
        font-size: 3rem;
        animation: explode 0.5s ease-out;
    }

    @keyframes explode {
        0% { transform: scale(0); opacity: 1; }
        50% { transform: scale(1.5); opacity: 0.8; }
        100% { transform: scale(2); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('Pokemon Battle Arena loaded!');
});
