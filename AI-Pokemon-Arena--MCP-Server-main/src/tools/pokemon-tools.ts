import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { PokeApiService } from '../services/pokeapi.js';
import { GeminiService } from '../services/gemini.js';
import { 
  validatePokemonIdentifier, 
  handleError, 
  log, 
  formatPokemonName,
  getTierRating,
  formatStatValue,
  capitalizeFirst
} from '../utils/helpers.js';

export class PokemonTools {
  constructor(
    private pokeApi: PokeApiService,
    private gemini: GeminiService
  ) {}

  async getPokemonData(args: { name: string }): Promise<CallToolResult> {
    try {
      log('Getting Pokemon data', { name: args.name });
      
      const validation = validatePokemonIdentifier(args.name);
      if (!validation.isValid) {
        return {
          content: [{
            type: 'text',
            text: `Invalid Pokemon identifier: "${args.name}". Please provide a valid Pokemon name or Pokedex number.`
          }],
          isError: true
        };
      }

      const pokemon = await this.pokeApi.getCompletePokemonData(validation.sanitized);
      
      const formattedData = this.formatPokemonData(pokemon);
      
      return {
        content: [{
          type: 'text',
          text: formattedData
        }]
      };
    } catch (error) {
      const handledError = handleError(error, 'getPokemonData');
      return {
        content: [{
          type: 'text',
          text: `Error retrieving Pokemon data: ${handledError.message}`
        }],
        isError: true
      };
    }
  }

  async battleSimulation(args: { pokemon1: string; pokemon2: string }): Promise<CallToolResult> {
    try {
      log('Simulating battle', { pokemon1: args.pokemon1, pokemon2: args.pokemon2 });
      
      const validation1 = validatePokemonIdentifier(args.pokemon1);
      const validation2 = validatePokemonIdentifier(args.pokemon2);
      
      if (!validation1.isValid || !validation2.isValid) {
        return {
          content: [{
            type: 'text',
            text: `Invalid Pokemon identifiers. Please provide valid Pokemon names or Pokedex numbers.`
          }],
          isError: true
        };
      }

      // Fetch both Pokemon data
      const [pokemon1, pokemon2] = await Promise.all([
        this.pokeApi.getCompletePokemonData(validation1.sanitized),
        this.pokeApi.getCompletePokemonData(validation2.sanitized)
      ]);

      // Simulate battle using Gemini AI
      const battleResult = await this.gemini.simulateBattle(pokemon1, pokemon2);
      
      const formattedResult = this.formatBattleResult(battleResult, pokemon1, pokemon2);
      
      return {
        content: [{
          type: 'text',
          text: formattedResult
        }]
      };
    } catch (error) {
      const handledError = handleError(error, 'battleSimulation');
      return {
        content: [{
          type: 'text',
          text: `Error simulating battle: ${handledError.message}`
        }],
        isError: true
      };
    }
  }

  async getPokemonList(args: { limit?: number; offset?: number }): Promise<CallToolResult> {
    try {
      const limit = Math.min(args.limit || 20, 100); // Cap at 100 to avoid overwhelming responses
      const offset = args.offset || 0;
      
      log('Getting Pokemon list', { limit, offset });
      
      const pokemonList = await this.pokeApi.getPokemonList(limit, offset);
      
      const formattedList = this.formatPokemonList(pokemonList, offset);
      
      return {
        content: [{
          type: 'text',
          text: formattedList
        }]
      };
    } catch (error) {
      const handledError = handleError(error, 'getPokemonList');
      return {
        content: [{
          type: 'text',
          text: `Error retrieving Pokemon list: ${handledError.message}`
        }],
        isError: true
      };
    }
  }

  async searchPokemon(args: { query: string }): Promise<CallToolResult> {
    try {
      log('Searching Pokemon', { query: args.query });
      
      if (!args.query || args.query.trim().length < 2) {
        return {
          content: [{
            type: 'text',
            text: 'Search query must be at least 2 characters long.'
          }],
          isError: true
        };
      }

      const results = await this.pokeApi.searchPokemon(args.query.trim());
      
      if (results.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `No Pokemon found matching "${args.query}". Please try a different search term.`
          }]
        };
      }
      
      const formattedResults = this.formatSearchResults(results, args.query);
      
      return {
        content: [{
          type: 'text',
          text: formattedResults
        }]
      };
    } catch (error) {
      const handledError = handleError(error, 'searchPokemon');
      return {
        content: [{
          type: 'text',
          text: `Error searching Pokemon: ${handledError.message}`
        }],
        isError: true
      };
    }
  }

  async analyzePokemon(args: { name: string }): Promise<CallToolResult> {
    try {
      log('Analyzing Pokemon', { name: args.name });
      
      const validation = validatePokemonIdentifier(args.name);
      if (!validation.isValid) {
        return {
          content: [{
            type: 'text',
            text: `Invalid Pokemon identifier: "${args.name}". Please provide a valid Pokemon name or Pokedex number.`
          }],
          isError: true
        };
      }

      const pokemon = await this.pokeApi.getCompletePokemonData(validation.sanitized);
      const analysis = await this.gemini.analyzePokemon(pokemon);
      
      const formattedAnalysis = `# ${formatPokemonName(pokemon.name)} Analysis\n\n${analysis}`;
      
      return {
        content: [{
          type: 'text',
          text: formattedAnalysis
        }]
      };
    } catch (error) {
      const handledError = handleError(error, 'analyzePokemon');
      return {
        content: [{
          type: 'text',
          text: `Error analyzing Pokemon: ${handledError.message}`
        }],
        isError: true
      };
    }
  }

  private formatPokemonData(pokemon: any): string {
    const formattedName = formatPokemonName(pokemon.name);
    const types = pokemon.types.map((type: string) => capitalizeFirst(type)).join(', ');
    const abilities = pokemon.abilities.map((ability: string) => formatPokemonName(ability)).join(', ');
    
    return `# ${formattedName} (#${pokemon.id})

## Basic Information
- **Type(s):** ${types}
- **Height:** ${pokemon.height / 10}m
- **Weight:** ${pokemon.weight / 10}kg
- **Base Experience:** ${pokemon.baseExperience}
- **Generation:** ${capitalizeFirst(pokemon.generation.replace('generation-', ''))}
- **Status:** ${pokemon.isLegendary ? 'Legendary' : pokemon.isMythical ? 'Mythical' : 'Regular'} Pokemon

## Description
${pokemon.description}

## Base Stats
- **HP:** ${pokemon.stats.hp} (${formatStatValue(pokemon.stats.hp)})
- **Attack:** ${pokemon.stats.attack} (${formatStatValue(pokemon.stats.attack)})
- **Defense:** ${pokemon.stats.defense} (${formatStatValue(pokemon.stats.defense)})
- **Special Attack:** ${pokemon.stats.specialAttack} (${formatStatValue(pokemon.stats.specialAttack)})
- **Special Defense:** ${pokemon.stats.specialDefense} (${formatStatValue(pokemon.stats.specialDefense)})
- **Speed:** ${pokemon.stats.speed} (${formatStatValue(pokemon.stats.speed)})
- **Total:** ${pokemon.stats.total} (${getTierRating(pokemon.stats.total)})

## Abilities
${abilities}

---
*Data retrieved from PokeAPI*`;
  }

  private formatBattleResult(result: any, pokemon1: any, pokemon2: any): string {
    const formattedName1 = formatPokemonName(pokemon1.name);
    const formattedName2 = formatPokemonName(pokemon2.name);
    const formattedWinner = formatPokemonName(result.winner);
    
    return `# Battle Simulation: ${formattedName1} vs ${formattedName2}

## Battle Result
🏆 **Winner:** ${formattedWinner}

## Battle Narrative
${result.battleLog.join('\n\n')}

## Strategic Analysis
${result.analysis}

## Summary
${result.summary}

---
*Battle simulation powered by Gemini AI*`;
  }

  private formatPokemonList(list: any, offset: number): string {
    const startIndex = offset + 1;
    const endIndex = offset + list.results.length;
    
    const pokemonItems = list.results.map((pokemon: any, index: number) => {
      const number = offset + index + 1;
      const formattedName = formatPokemonName(pokemon.name);
      return `${number}. ${formattedName}`;
    }).join('\n');

    return `# Pokemon List (${startIndex}-${endIndex} of ${list.count})

${pokemonItems}

---
*Use "get_pokemon_data" with a specific name or number to get detailed information*
*Use "get_pokemon_list" with different offset values to see more Pokemon*`;
  }

  private formatSearchResults(results: any[], query: string): string {
    const formattedResults = results.map(pokemon => {
      const formattedName = formatPokemonName(pokemon.name);
      const types = pokemon.types.map((type: string) => capitalizeFirst(type)).join(', ');
      return `**${formattedName}** (#${pokemon.id})
- Types: ${types}
- Total Stats: ${pokemon.stats.total}
- Status: ${pokemon.isLegendary ? 'Legendary' : pokemon.isMythical ? 'Mythical' : 'Regular'}`;
    }).join('\n\n');

    return `# Search Results for "${query}"

Found ${results.length} Pokemon:

${formattedResults}

---
*Use "get_pokemon_data" with a specific name to get detailed information*`;
  }
}

// Tool schemas for MCP registration
export const pokemonToolSchemas = {
  get_pokemon_data: {
    description: 'Get comprehensive data about a specific Pokemon including stats, types, abilities, and description',
    inputSchema: {
      name: z.string().describe('Pokemon name or Pokedex number (e.g., "pikachu", "25", "charizard")')
    }
  },
  
  battle_simulation: {
    description: 'Simulate a battle between two Pokemon using AI analysis of their stats, types, and abilities',
    inputSchema: {
      pokemon1: z.string().describe('First Pokemon name or Pokedex number'),
      pokemon2: z.string().describe('Second Pokemon name or Pokedex number')
    }
  },
  
  get_pokemon_list: {
    description: 'Get a list of Pokemon with optional pagination',
    inputSchema: {
      limit: z.number().optional().describe('Number of Pokemon to return (max 100, default 20)'),
      offset: z.number().optional().describe('Number of Pokemon to skip (default 0)')
    }
  },
  
  search_pokemon: {
    description: 'Search for Pokemon by name with partial matching',
    inputSchema: {
      query: z.string().describe('Search query (minimum 2 characters)')
    }
  },
  
  analyze_pokemon: {
    description: 'Get AI-powered analysis of a Pokemon\'s battle capabilities and characteristics',
    inputSchema: {
      name: z.string().describe('Pokemon name or Pokedex number to analyze')
    }
  }
};
