#!/usr/bin/env node

/**
 * Pokemon Battle Arena Web Server
 * Serves the web interface and handles API requests
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { PokeApiService } from './build/services/pokeapi.js';
import { GeminiService } from './build/services/gemini.js';
import { loadConfig } from './build/utils/helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Debug middleware
app.use((req, res, next) => {
    console.log(`📡 ${req.method} ${req.url}`);
    next();
});

// Initialize services
let pokeApi;
let gemini;

async function initializeServices() {
    try {
        console.log('🔧 Initializing services...');
        const config = loadConfig();
        console.log('📋 Config loaded:', { hasGeminiKey: !!config.geminiApiKey });
        
        console.log('🐾 Initializing PokeAPI service...');
        pokeApi = new PokeApiService();
        console.log('✅ PokeAPI service initialized');
        
        console.log('🤖 Initializing Gemini service...');
        gemini = new GeminiService(config.geminiApiKey);
        console.log('✅ Gemini service initialized');
        
        console.log('✅ Services initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize services:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'simple-battle.html'));
});

// Function to print battle results to terminal
function printBattleResultsToTerminal(battleResult, pokemon1, pokemon2) {
    console.log('🎯 TERMINAL OUTPUT FUNCTION STARTED');
    console.log('Battle result received:', !!battleResult);
    console.log('Pokemon 1:', pokemon1?.name);
    console.log('Pokemon 2:', pokemon2?.name);
    
    console.log('\n' + '='.repeat(60));
    console.log('🎮 POKEMON BATTLE ARENA - TERMINAL OUTPUT 🎮');
    console.log('='.repeat(60));
    
    console.log(`\n⚔️  BATTLE: ${pokemon1.name.toUpperCase()} vs ${pokemon2.name.toUpperCase()}`);
    console.log(`📊 STATS: ${pokemon1.name} (${pokemon1.stats.total}) vs ${pokemon2.name} (${pokemon2.stats.total})`);
    
    console.log('\n📜 BATTLE LOG:');
    console.log('-'.repeat(40));
    
    battleResult.battleLog.forEach((turn, index) => {
        console.log(`Turn ${index + 1}: ${turn}`);
    });
    
    console.log('\n🏆 WINNER: ' + battleResult.winner.toUpperCase());
    console.log('💔 LOSER: ' + battleResult.loser);
    
    console.log('\n📈 ANALYSIS:');
    console.log('-'.repeat(40));
    console.log(battleResult.analysis);
    
    console.log('\n📝 SUMMARY:');
    console.log('-'.repeat(40));
    console.log(battleResult.summary);
    
    if (battleResult.geminiError && battleResult.geminiError.occurred) {
        console.log('\n⚠️  NOTE: This battle used fallback simulation due to API issues');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Battle Complete! Check your browser for full details 🎉');
    console.log('='.repeat(60) + '\n');
}

// API Routes
app.get('/api/pokemon/:name', async (req, res) => {
    try {
        console.log(`📡 Pokemon endpoint called for: ${req.params.name}`);
        console.log('🔍 Checking service availability...');
        if (!pokeApi) {
            console.error('❌ PokeAPI service not initialized');
            return res.status(500).json({ error: 'Service not initialized' });
        }
        console.log('✅ PokeAPI service available');
        const pokemonName = req.params.name.toLowerCase();
        console.log(`🔍 Fetching Pokemon: ${pokemonName}`);
        const pokemonData = await pokeApi.getPokemon(pokemonName);
        console.log('✅ Pokemon data fetched successfully');

        // Transform data for frontend
        const transformedData = {
            id: pokemonData.id,
            name: pokemonData.name,
            sprites: pokemonData.sprites,
            types: pokemonData.types.map(type => type.type.name),
            stats: {
                hp: pokemonData.stats.find(stat => stat.stat.name === 'hp').base_stat,
                attack: pokemonData.stats.find(stat => stat.stat.name === 'attack').base_stat,
                defense: pokemonData.stats.find(stat => stat.stat.name === 'defense').base_stat,
                specialAttack: pokemonData.stats.find(stat => stat.stat.name === 'special-attack').base_stat,
                specialDefense: pokemonData.stats.find(stat => stat.stat.name === 'special-defense').base_stat,
                speed: pokemonData.stats.find(stat => stat.stat.name === 'speed').base_stat
            },
            abilities: pokemonData.abilities.map(ability => ability.ability.name),
            height: pokemonData.height,
            weight: pokemonData.weight
        };

        res.json(transformedData);
    } catch (error) {
        console.error('❌ Pokemon endpoint error:', error.message);
        console.error('Stack trace:', error.stack);
        res.status(404).json({ error: 'Pokemon not found', details: error.message });
    }
});

app.post('/api/battle', async (req, res) => {
    console.log('\n🎯 BATTLE ENDPOINT CALLED');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    try {
        if (!pokeApi || !gemini) {
            console.error('❌ Services not initialized:', { pokeApi: !!pokeApi, gemini: !!gemini });
            return res.status(500).json({ error: 'Services not initialized' });
        }

        const { pokemon1, pokemon2 } = req.body;

        if (!pokemon1 || !pokemon2) {
            console.log('❌ Missing Pokemon data');
            return res.status(400).json({ error: 'Both Pokemon are required' });
        }

        console.log(`🔍 Fetching complete data for ${pokemon1.name} and ${pokemon2.name}...`);
        
        // Get complete Pokemon data for battle simulation
        const [completeData1, completeData2] = await Promise.all([
            pokeApi.getCompletePokemonData(pokemon1.name),
            pokeApi.getCompletePokemonData(pokemon2.name)
        ]);

        console.log('✅ Pokemon data fetched successfully');
        console.log(`Pokemon 1 (${completeData1.name}):`, {
            stats: completeData1.stats,
            types: completeData1.types,
            abilities: completeData1.abilities
        });
        console.log(`Pokemon 2 (${completeData2.name}):`, {
            stats: completeData2.stats,
            types: completeData2.types,
            abilities: completeData2.abilities
        });

        console.log('🤖 Starting Gemini battle simulation...');
        
        let battleResult;
        let usingFallback = false;
        
        try {
            // Try Gemini API first
            console.log('Attempting Gemini API call...');
            battleResult = await gemini.simulateBattle(completeData1, completeData2);
            console.log('✅ Gemini API call successful');
            console.log('Gemini battle result:', JSON.stringify(battleResult, null, 2));
            
        } catch (geminiError) {
            console.error('❌ Gemini API Error Details:');
            console.error('Error type:', typeof geminiError);
            console.error('Error name:', geminiError.name);
            console.error('Error message:', geminiError.message);
            console.error('Error stack:', geminiError.stack);
            
            if (geminiError.response) {
                console.error('Response status:', geminiError.response.status);
                console.error('Response data:', geminiError.response.data);
            }
            
            console.log('🔄 Using fallback battle simulation...');
            usingFallback = true;

            // Enhanced fallback battle result
            const winner = completeData1.stats.total > completeData2.stats.total ? completeData1.name : completeData2.name;
            const loser = winner === completeData1.name ? completeData2.name : completeData1.name;
            const winnerData = winner === completeData1.name ? completeData1 : completeData2;
            const loserData = winner === completeData1.name ? completeData2 : completeData1;

            battleResult = {
                winner: winner,
                loser: loser,
                battleLog: [
                    `${completeData1.name} enters the battlefield with ${completeData1.stats.hp} HP!`,
                    `${completeData2.name} prepares for battle with ${completeData2.stats.speed} speed!`,
                    `${winner} used ${winnerData.types[0]}-type attack!`,
                    `${loser} counters with a defensive move!`,
                    `${winner} lands a critical hit with superior stats!`,
                    `${loser} is defeated! ${winner} emerges victorious!`
                ],
                analysis: `${winner} won due to superior total stats (${winnerData.stats.total} vs ${loserData.stats.total}). Key advantages: ${winnerData.stats.attack > loserData.stats.attack ? 'Higher Attack' : ''} ${winnerData.stats.speed > loserData.stats.speed ? 'Faster Speed' : ''} ${winnerData.stats.hp > loserData.stats.hp ? 'More HP' : ''}. Type advantage: ${winnerData.types.join('/')} vs ${loserData.types.join('/')}.`,
                summary: `${winner} dominated this Pokemon battle through statistical superiority and strategic type advantages.`,
                geminiError: {
                    occurred: true,
                    message: geminiError.message,
                    fallbackUsed: true
                }
            };
        }

        console.log('📤 Sending battle result to client...');
        console.log('Final battle result:', JSON.stringify(battleResult, null, 2));
        
        // Print battle results to terminal in a nice format
        console.log('🔍 About to print battle results to terminal...');
        printBattleResultsToTerminal(battleResult, completeData1, completeData2);
        console.log('✅ Terminal output function called successfully');
        
        // Add metadata to response
        const response = {
            ...battleResult,
            metadata: {
                timestamp: new Date().toISOString(),
                usingFallback: usingFallback,
                pokemon1: completeData1.name,
                pokemon2: completeData2.name,
                serverStatus: 'success'
            }
        };

        res.json(response);
        console.log('✅ Battle response sent successfully');

    } catch (error) {
        console.error('\n❌ CRITICAL BATTLE ERROR:');
        console.error('Error type:', typeof error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        // Send detailed error response
        res.status(500).json({ 
            error: 'Battle simulation failed', 
            details: error.message,
            timestamp: new Date().toISOString(),
            troubleshooting: {
                checkApiKey: 'Verify GEMINI_API_KEY in .env file',
                checkConnection: 'Ensure internet connection for PokeAPI',
                fallbackAvailable: 'System should provide fallback results'
            }
        });
    }
});

// Test endpoint
app.get('/api/test', (req, res) => {
    try {
        console.log('📡 Test endpoint called');
        res.json({
            message: 'Pokemon Battle Arena API is working!',
            timestamp: new Date().toISOString(),
            services: {
                pokeApi: 'initialized',
                gemini: 'initialized'
            }
        });
    } catch (error) {
        console.error('❌ Test endpoint error:', error.message);
        res.status(500).json({ error: 'Test endpoint failed', details: error.message });
    }
});

// Start server
async function startServer() {
    await initializeServices();

    app.listen(PORT, () => {
        console.log(`🎮 Pokemon Battle Arena running at http://localhost:${PORT}`);
        console.log('🌐 Open your browser and visit the URL above!');
    });
}

startServer().catch(console.error);
