import { GoogleGenerativeAI } from '@google/generative-ai';
import { SimplifiedPokemon, BattleResult } from '../types/pokemon.js';

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  async simulateBattle(pokemon1: SimplifiedPokemon, pokemon2: SimplifiedPokemon): Promise<BattleResult> {
    console.log('\n=== GEMINI BATTLE SIMULATION START ===');
    console.log('Pokemon 1:', pokemon1.name, 'Stats:', pokemon1.stats);
    console.log('Pokemon 2:', pokemon2.name, 'Stats:', pokemon2.stats);
    
    const prompt = this.buildBattlePrompt(pokemon1, pokemon2);
    console.log('Generated prompt length:', prompt.length);
    console.log('Prompt preview:', prompt.substring(0, 200) + '...');
    
    try {
      console.log('🤖 Making Gemini API call...');
      console.log('API Key available:', !!this.genAI);
      console.log('Model available:', !!this.model);
      
      const result = await this.model.generateContent(prompt);
      console.log('✅ Gemini API call successful');
      
      const response = await result.response;
      console.log('Response received, extracting text...');
      
      const battleNarrative = response.text();
      console.log('Battle narrative length:', battleNarrative.length);
      console.log('Battle narrative preview:', battleNarrative.substring(0, 300) + '...');
      
      const parsedResult = this.parseBattleResult(battleNarrative, pokemon1, pokemon2);
      console.log('✅ Battle result parsed successfully');
      console.log('Parsed result:', JSON.stringify(parsedResult, null, 2));
      
      return parsedResult;
      
    } catch (error) {
      console.error('\n❌ GEMINI API ERROR DETAILS:');
      
      // Safely handle unknown error type
      const err = error as any;
      console.error('Error type:', err?.constructor?.name || 'Unknown');
      console.error('Error message:', err?.message || 'No message');
      console.error('Error code:', err?.code || 'No code');
      console.error('Error status:', err?.status || 'No status');
      
      if (err?.response) {
        console.error('Response status:', err.response.status);
        console.error('Response statusText:', err.response.statusText);
        console.error('Response data:', err.response.data);
      }
      
      if (err?.request) {
        console.error('Request details:', err.request);
      }
      
      // Check for specific Gemini API errors
      const errorMessage = err?.message || '';
      if (errorMessage.includes('API key')) {
        console.error('🔑 API Key Issue: Check if GEMINI_API_KEY is valid');
      }
      
      if (errorMessage.includes('quota')) {
        console.error('📊 Quota Issue: Gemini API quota exceeded');
      }
      
      if (errorMessage.includes('network') || errorMessage.includes('connect')) {
        console.error('🌐 Network Issue: Check internet connection');
      }
      
      throw new Error(`Gemini API failed: ${errorMessage} (${err?.constructor?.name || 'Unknown'})`);
    }
  }

  private buildBattlePrompt(pokemon1: SimplifiedPokemon, pokemon2: SimplifiedPokemon): string {
    return `You are a Pokemon battle simulator and expert analyst. Simulate a battle between ${pokemon1.name} and ${pokemon2.name}.

**${pokemon1.name} Stats:**
- Type(s): ${pokemon1.types.join(', ')}
- HP: ${pokemon1.stats.hp}
- Attack: ${pokemon1.stats.attack}
- Defense: ${pokemon1.stats.defense}
- Special Attack: ${pokemon1.stats.specialAttack}
- Special Defense: ${pokemon1.stats.specialDefense}
- Speed: ${pokemon1.stats.speed}
- Total Base Stats: ${pokemon1.stats.total}
- Abilities: ${pokemon1.abilities.join(', ')}
- Height: ${pokemon1.height / 10}m, Weight: ${pokemon1.weight / 10}kg
- Legendary: ${pokemon1.isLegendary ? 'Yes' : 'No'}
- Mythical: ${pokemon1.isMythical ? 'Yes' : 'No'}
- Description: ${pokemon1.description}

**${pokemon2.name} Stats:**
- Type(s): ${pokemon2.types.join(', ')}
- HP: ${pokemon2.stats.hp}
- Attack: ${pokemon2.stats.attack}
- Defense: ${pokemon2.stats.defense}
- Special Attack: ${pokemon2.stats.specialAttack}
- Special Defense: ${pokemon2.stats.specialDefense}
- Speed: ${pokemon2.stats.speed}
- Total Base Stats: ${pokemon2.stats.total}
- Abilities: ${pokemon2.abilities.join(', ')}
- Height: ${pokemon2.height / 10}m, Weight: ${pokemon2.weight / 10}kg
- Legendary: ${pokemon2.isLegendary ? 'Yes' : 'No'}
- Mythical: ${pokemon2.isMythical ? 'Yes' : 'No'}
- Description: ${pokemon2.description}

Please provide:
1. **WINNER**: State clearly who wins the battle
2. **BATTLE LOG**: A detailed battle with each turn on a new line in format "Pokemon used Move!" (5 turns)
3. **STRATEGIC ANALYSIS**: Explain the key factors that determined the outcome
4. **SUMMARY**: A brief summary of why the winner prevailed

Format the BATTLE LOG as:
**BATTLE LOG:**
Turn 1: Pokemon1 used Move1!
Turn 2: Pokemon2 used Move2!
Turn 3: Pokemon1 used Move3!
Turn 4: Pokemon2 used Move4!
Turn 5: Pokemon1 used Move5!

Consider:
- Type advantages/disadvantages
- Stat comparisons (especially speed for turn order)
- Abilities and their potential effects
- Pokemon size and legendary status
- Realistic battle mechanics
- Engaging storytelling

Format your response as:
**WINNER:** [Pokemon Name]

**BATTLE LOG:**
[Detailed battle narrative]

**STRATEGIC ANALYSIS:**
[Analysis of key factors]

**SUMMARY:**
[Brief conclusion]`;
  }

  private parseBattleResult(battleNarrative: string, pokemon1: SimplifiedPokemon, pokemon2: SimplifiedPokemon): BattleResult {
    const lines = battleNarrative.split('\n');
    let winner = '';
    let loser = '';
    let battleLog: string[] = [];
    let analysis = '';
    let summary = '';

    let currentSection = '';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('**WINNER:**')) {
        currentSection = 'winner';
        winner = trimmedLine.replace('**WINNER:**', '').trim();
        loser = winner.toLowerCase() === pokemon1.name.toLowerCase() ? pokemon2.name : pokemon1.name;
      } else if (trimmedLine.startsWith('**BATTLE LOG:**')) {
        currentSection = 'battleLog';
      } else if (trimmedLine.startsWith('**STRATEGIC ANALYSIS:**')) {
        currentSection = 'analysis';
      } else if (trimmedLine.startsWith('**SUMMARY:**')) {
        currentSection = 'summary';
      } else if (trimmedLine && !trimmedLine.startsWith('**')) {
        switch (currentSection) {
          case 'battleLog':
            battleLog.push(trimmedLine);
            break;
          case 'analysis':
            analysis += (analysis ? ' ' : '') + trimmedLine;
            break;
          case 'summary':
            summary += (summary ? ' ' : '') + trimmedLine;
            break;
        }
      }
    }

    // Fallback if parsing fails
    if (!winner) {
      // Determine winner based on total stats as fallback
      winner = pokemon1.stats.total > pokemon2.stats.total ? pokemon1.name : pokemon2.name;
      loser = winner === pokemon1.name ? pokemon2.name : pokemon1.name;
    }

    if (battleLog.length === 0) {
      battleLog = [battleNarrative];
    }

    if (!analysis) {
      analysis = 'Statistical analysis determined the outcome based on overall battle capability.';
    }

    if (!summary) {
      summary = `${winner} emerged victorious in this Pokemon battle.`;
    }

    return {
      winner,
      loser,
      battleLog,
      analysis,
      summary
    };
  }

  async analyzePokemon(pokemon: SimplifiedPokemon): Promise<string> {
    const prompt = `Analyze the Pokemon ${pokemon.name} and provide insights about its battle capabilities and characteristics.

**${pokemon.name} Details:**
- Type(s): ${pokemon.types.join(', ')}
- HP: ${pokemon.stats.hp}
- Attack: ${pokemon.stats.attack}
- Defense: ${pokemon.stats.defense}
- Special Attack: ${pokemon.stats.specialAttack}
- Special Defense: ${pokemon.stats.specialDefense}
- Speed: ${pokemon.stats.speed}
- Total Base Stats: ${pokemon.stats.total}
- Abilities: ${pokemon.abilities.join(', ')}
- Height: ${pokemon.height / 10}m, Weight: ${pokemon.weight / 10}kg
- Legendary: ${pokemon.isLegendary ? 'Yes' : 'No'}
- Mythical: ${pokemon.isMythical ? 'Yes' : 'No'}
- Generation: ${pokemon.generation}
- Description: ${pokemon.description}

Please provide a comprehensive analysis covering:
1. Strengths and weaknesses
2. Best battle strategies
3. Type matchup advantages
4. Notable characteristics
5. Overall battle tier assessment

Keep the analysis informative yet engaging, around 200-300 words.`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      throw new Error(`Failed to analyze Pokemon: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async compareMultiplePokemon(pokemonList: SimplifiedPokemon[]): Promise<string> {
    if (pokemonList.length < 2) {
      throw new Error('At least 2 Pokemon are required for comparison');
    }

    const pokemonDetails = pokemonList.map(pokemon => `
**${pokemon.name}:**
- Type(s): ${pokemon.types.join(', ')}
- Total Stats: ${pokemon.stats.total} (HP:${pokemon.stats.hp}, ATK:${pokemon.stats.attack}, DEF:${pokemon.stats.defense}, SpA:${pokemon.stats.specialAttack}, SpD:${pokemon.stats.specialDefense}, SPD:${pokemon.stats.speed})
- Abilities: ${pokemon.abilities.join(', ')}
- Status: ${pokemon.isLegendary ? 'Legendary' : pokemon.isMythical ? 'Mythical' : 'Regular'}
`).join('\n');

    const prompt = `Compare and rank these Pokemon based on their battle capabilities and overall strength:

${pokemonDetails}

Please provide:
1. **RANKING**: Order them from strongest to weakest with brief reasoning
2. **ANALYSIS**: Compare their key strengths and weaknesses
3. **BATTLE PREDICTIONS**: How they might fare against each other
4. **RECOMMENDATIONS**: Best use cases for each Pokemon

Keep the comparison balanced and informative.`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      throw new Error(`Failed to compare Pokemon: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
