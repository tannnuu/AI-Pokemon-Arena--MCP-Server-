#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { PokeApiService } from './services/pokeapi.js';
import { GeminiService } from './services/gemini.js';
import { PokemonTools, pokemonToolSchemas } from './tools/pokemon-tools.js';
import { loadConfig, log, handleError } from './utils/helpers.js';

class PokemonMCPServer {
  private server: Server;
  private pokeApi: PokeApiService;
  private gemini: GeminiService;
  private tools: PokemonTools;

  constructor() {
    this.server = new Server(
      {
        name: 'pokemon-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    // Initialize services
    const config = loadConfig();
    this.pokeApi = new PokeApiService();
    this.gemini = new GeminiService(config.geminiApiKey);
    this.tools = new PokemonTools(this.pokeApi, this.gemini);

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_pokemon_data',
            description: pokemonToolSchemas.get_pokemon_data.description,
            inputSchema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Pokemon name or Pokedex number (e.g., "pikachu", "25", "charizard")'
                }
              },
              required: ['name']
            }
          },
          {
            name: 'battle_simulation',
            description: pokemonToolSchemas.battle_simulation.description,
            inputSchema: {
              type: 'object',
              properties: {
                pokemon1: {
                  type: 'string',
                  description: 'First Pokemon name or Pokedex number'
                },
                pokemon2: {
                  type: 'string',
                  description: 'Second Pokemon name or Pokedex number'
                }
              },
              required: ['pokemon1', 'pokemon2']
            }
          },
          {
            name: 'get_pokemon_list',
            description: pokemonToolSchemas.get_pokemon_list.description,
            inputSchema: {
              type: 'object',
              properties: {
                limit: {
                  type: 'number',
                  description: 'Number of Pokemon to return (max 100, default 20)',
                  minimum: 1,
                  maximum: 100
                },
                offset: {
                  type: 'number',
                  description: 'Number of Pokemon to skip (default 0)',
                  minimum: 0
                }
              }
            }
          },
          {
            name: 'search_pokemon',
            description: pokemonToolSchemas.search_pokemon.description,
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query (minimum 2 characters)',
                  minLength: 2
                }
              },
              required: ['query']
            }
          },
          {
            name: 'analyze_pokemon',
            description: pokemonToolSchemas.analyze_pokemon.description,
            inputSchema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Pokemon name or Pokedex number to analyze'
                }
              },
              required: ['name']
            }
          }
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        switch (name) {
          case 'get_pokemon_data':
            return await this.tools.getPokemonData(args as { name: string });

          case 'battle_simulation':
            return await this.tools.battleSimulation(args as { pokemon1: string; pokemon2: string });

          case 'get_pokemon_list':
            return await this.tools.getPokemonList(args as { limit?: number; offset?: number });

          case 'search_pokemon':
            return await this.tools.searchPokemon(args as { query: string });

          case 'analyze_pokemon':
            return await this.tools.analyzePokemon(args as { name: string });

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const handledError = handleError(error, `callTool:${request.params.name}`);
        return {
          content: [{
            type: 'text',
            text: `Error: ${handledError.message}`
          }],
          isError: true
        };
      }
    });

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'pokemon://popular',
            mimeType: 'text/plain',
            name: 'Popular Pokemon List',
            description: 'A list of popular Pokemon for quick reference'
          },
          {
            uri: 'pokemon://legendary',
            mimeType: 'text/plain',
            name: 'Legendary Pokemon',
            description: 'Information about legendary Pokemon'
          },
          {
            uri: 'pokemon://starter',
            mimeType: 'text/plain',
            name: 'Starter Pokemon',
            description: 'Information about starter Pokemon from all generations'
          }
        ],
      };
    });

    // Handle resource reading
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      try {
        switch (uri) {
          case 'pokemon://popular':
            return await this.getPopularPokemonResource();

          case 'pokemon://legendary':
            return await this.getLegendaryPokemonResource();

          case 'pokemon://starter':
            return await this.getStarterPokemonResource();

          default:
            throw new Error(`Unknown resource: ${uri}`);
        }
      } catch (error) {
        const handledError = handleError(error, `readResource:${uri}`);
        return {
          contents: [{
            uri,
            mimeType: 'text/plain',
            text: `Error loading resource: ${handledError.message}`
          }]
        };
      }
    });
  }

  private async getPopularPokemonResource() {
    const popularNames = [
      'pikachu', 'charizard', 'blastoise', 'venusaur', 'mewtwo',
      'mew', 'lugia', 'rayquaza', 'arceus', 'lucario'
    ];

    try {
      const popularPokemon = await Promise.allSettled(
        popularNames.map(name => this.pokeApi.getCompletePokemonData(name))
      );

      const successful = popularPokemon
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value);

      const content = successful.map(pokemon => 
        `**${pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}** (#${pokemon.id})
- Types: ${pokemon.types.join(', ')}
- Total Stats: ${pokemon.stats.total}
- Status: ${pokemon.isLegendary ? 'Legendary' : 'Regular'}`
      ).join('\n\n');

      return {
        contents: [{
          uri: 'pokemon://popular',
          mimeType: 'text/plain',
          text: `# Popular Pokemon\n\n${content}\n\n*Use the get_pokemon_data tool for detailed information about any Pokemon*`
        }]
      };
    } catch (error) {
      log('Error fetching popular Pokemon', { error });
      return {
        contents: [{
          uri: 'pokemon://popular',
          mimeType: 'text/plain',
          text: 'Error loading popular Pokemon data. Please try again later.'
        }]
      };
    }
  }

  private async getLegendaryPokemonResource() {
    const legendaryNames = [
      'articuno', 'zapdos', 'moltres', 'mewtwo', 'mew',
      'lugia', 'ho-oh', 'rayquaza', 'dialga', 'palkia', 'arceus'
    ];

    try {
      const legendaryPokemon = await Promise.allSettled(
        legendaryNames.map(name => this.pokeApi.getCompletePokemonData(name))
      );

      const successful = legendaryPokemon
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value);

      const content = successful.map(pokemon => 
        `**${pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}** (#${pokemon.id})
- Types: ${pokemon.types.join(', ')}
- Total Stats: ${pokemon.stats.total}
- Generation: ${pokemon.generation.replace('generation-', '').toUpperCase()}`
      ).join('\n\n');

      return {
        contents: [{
          uri: 'pokemon://legendary',
          mimeType: 'text/plain',
          text: `# Legendary Pokemon\n\n${content}\n\n*Use the analyze_pokemon tool to get detailed analysis of legendary Pokemon*`
        }]
      };
    } catch (error) {
      log('Error fetching legendary Pokemon', { error });
      return {
        contents: [{
          uri: 'pokemon://legendary',
          mimeType: 'text/plain',
          text: 'Error loading legendary Pokemon data. Please try again later.'
        }]
      };
    }
  }

  private async getStarterPokemonResource() {
    const startersByGeneration = {
      'Generation I': ['bulbasaur', 'charmander', 'squirtle'],
      'Generation II': ['chikorita', 'cyndaquil', 'totodile'],
      'Generation III': ['treecko', 'torchic', 'mudkip'],
      'Generation IV': ['turtwig', 'chimchar', 'piplup']
    };

    try {
      const allStarters = Object.values(startersByGeneration).flat();
      const starterPokemon = await Promise.allSettled(
        allStarters.map(name => this.pokeApi.getCompletePokemonData(name))
      );

      const successful = starterPokemon
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value);

      let content = '';
      for (const [generation, starters] of Object.entries(startersByGeneration)) {
        content += `## ${generation}\n\n`;
        const genPokemon = successful.filter(p => starters.includes(p.name.toLowerCase()));
        content += genPokemon.map(pokemon => 
          `**${pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}** (#${pokemon.id})
- Type: ${pokemon.types.join(', ')}
- Total Stats: ${pokemon.stats.total}`
        ).join('\n\n');
        content += '\n\n';
      }

      return {
        contents: [{
          uri: 'pokemon://starter',
          mimeType: 'text/plain',
          text: `# Starter Pokemon\n\n${content}*Use the battle_simulation tool to compare starters from different generations*`
        }]
      };
    } catch (error) {
      log('Error fetching starter Pokemon', { error });
      return {
        contents: [{
          uri: 'pokemon://starter',
          mimeType: 'text/plain',
          text: 'Error loading starter Pokemon data. Please try again later.'
        }]
      };
    }
  }

  async run(): Promise<void> {
    const config = loadConfig();
    
    if (!config.geminiApiKey) {
      console.error('Error: GEMINI_API_KEY is required. Please set it in your .env file or environment variables.');
      process.exit(1);
    }

    const transport = new StdioServerTransport();
    
    log('Starting Pokemon MCP Server', { 
      version: '1.0.0',
      hasGeminiKey: !!config.geminiApiKey
    });

    await this.server.connect(transport);
    
    log('Pokemon MCP Server connected and ready');
  }
}

// Error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if this module is being run directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('index.js')) {
  const server = new PokemonMCPServer();
  server.run().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}
