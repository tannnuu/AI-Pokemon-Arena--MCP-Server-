import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  Pokemon, 
  PokemonSpecies, 
  PokemonList, 
  SimplifiedPokemon, 
  ApiError,
  Move
} from '../types/pokemon.js';

export class PokeApiService {
  private api: AxiosInstance;
  private cache: Map<string, any> = new Map();
  private readonly CACHE_TTL = 1000 * 60 * 30; // 30 minutes

  constructor(baseURL: string = 'https://pokeapi.co/api/v2/') {
    this.api = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Pokemon-MCP-Server/1.0.0'
      },
    });

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          throw new Error(`PokeAPI Error: ${error.response.status} - ${error.response.statusText}`);
        } else if (error.request) {
          throw new Error(`PokeAPI Error: No response received from server. Check internet connection.`);
        } else {
          throw new Error(`PokeAPI Error: ${error.message}`);
        }
      }
    );
  }

  private getCacheKey(endpoint: string): string {
    return `${endpoint}_${Date.now()}`;
  }

  private isValidCache(cacheEntry: { data: any; timestamp: number }): boolean {
    return Date.now() - cacheEntry.timestamp < this.CACHE_TTL;
  }

  private async fetchWithCache<T>(endpoint: string): Promise<T> {
    const cached = this.cache.get(endpoint);
    if (cached && this.isValidCache(cached)) {
      return cached.data;
    }

    try {
      const response: AxiosResponse<T> = await this.api.get(endpoint);
      const data = response.data;
      
      this.cache.set(endpoint, {
        data,
        timestamp: Date.now()
      });
      
      return data;
    } catch (error) {
      throw new Error(`Failed to fetch ${endpoint}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPokemon(identifier: string | number): Promise<Pokemon> {
    const endpoint = `/pokemon/${identifier.toString().toLowerCase()}`;
    return this.fetchWithCache<Pokemon>(endpoint);
  }

  async getPokemonSpecies(identifier: string | number): Promise<PokemonSpecies> {
    const endpoint = `/pokemon-species/${identifier.toString().toLowerCase()}`;
    return this.fetchWithCache<PokemonSpecies>(endpoint);
  }

  async getPokemonList(limit: number = 20, offset: number = 0): Promise<PokemonList> {
    const endpoint = `/pokemon?limit=${limit}&offset=${offset}`;
    return this.fetchWithCache<PokemonList>(endpoint);
  }

  async getMove(identifier: string | number): Promise<Move> {
    const endpoint = `/move/${identifier.toString().toLowerCase()}`;
    return this.fetchWithCache<Move>(endpoint);
  }

  async getCompletePokemonData(identifier: string | number): Promise<SimplifiedPokemon> {
    try {
      const [pokemon, species] = await Promise.all([
        this.getPokemon(identifier),
        this.getPokemonSpecies(identifier)
      ]);

      return this.transformToSimplifiedPokemon(pokemon, species);
    } catch (error) {
      throw new Error(`Failed to get complete Pokemon data for ${identifier}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private transformToSimplifiedPokemon(pokemon: Pokemon, species: PokemonSpecies): SimplifiedPokemon {
    // Extract stats
    const stats = {
      hp: pokemon.stats.find(s => s.stat.name === 'hp')?.base_stat || 0,
      attack: pokemon.stats.find(s => s.stat.name === 'attack')?.base_stat || 0,
      defense: pokemon.stats.find(s => s.stat.name === 'defense')?.base_stat || 0,
      specialAttack: pokemon.stats.find(s => s.stat.name === 'special-attack')?.base_stat || 0,
      specialDefense: pokemon.stats.find(s => s.stat.name === 'special-defense')?.base_stat || 0,
      speed: pokemon.stats.find(s => s.stat.name === 'speed')?.base_stat || 0,
      total: 0
    };
    stats.total = stats.hp + stats.attack + stats.defense + stats.specialAttack + stats.specialDefense + stats.speed;

    // Extract types
    const types = pokemon.types
      .sort((a, b) => a.slot - b.slot)
      .map(t => t.type.name);

    // Extract abilities
    const abilities = pokemon.abilities
      .sort((a, b) => a.slot - b.slot)
      .map(a => a.ability.name);

    // Get English description
    const englishFlavorText = species.flavor_text_entries
      .find(entry => entry.language.name === 'en')?.flavor_text
      .replace(/\f/g, ' ') // Replace form feed characters
      .replace(/\n/g, ' ') // Replace newlines
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim() || 'No description available.';

    return {
      id: pokemon.id,
      name: pokemon.name,
      types,
      stats,
      abilities,
      height: pokemon.height,
      weight: pokemon.weight,
      baseExperience: pokemon.base_experience,
      isLegendary: species.is_legendary,
      isMythical: species.is_mythical,
      description: englishFlavorText,
      generation: species.generation.name
    };
  }

  async searchPokemon(query: string): Promise<SimplifiedPokemon[]> {
    // First try exact match
    try {
      const pokemon = await this.getCompletePokemonData(query);
      return [pokemon];
    } catch {
      // If exact match fails, search through the list
      try {
        const list = await this.getPokemonList(1000, 0); // Get more for search
        const matches = list.results.filter(p => 
          p.name.toLowerCase().includes(query.toLowerCase())
        );

        // Limit to first 5 matches to avoid too many API calls
        const limitedMatches = matches.slice(0, 5);
        
        const pokemonData = await Promise.all(
          limitedMatches.map(match => this.getCompletePokemonData(match.name))
        );

        return pokemonData;
      } catch (error) {
        throw new Error(`Failed to search for Pokemon: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  async validatePokemonExists(identifier: string | number): Promise<boolean> {
    try {
      await this.getPokemon(identifier);
      return true;
    } catch {
      return false;
    }
  }

  // Type effectiveness data (simplified version)
  getTypeEffectiveness(): Record<string, Record<string, number>> {
    return {
      normal: { rock: 0.5, ghost: 0, steel: 0.5 },
      fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
      water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
      electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
      grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, flying: 0.5, bug: 0.5, rock: 2, ground: 2, dragon: 0.5, steel: 0.5 },
      ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
      fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
      poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
      ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
      flying: { electric: 0.5, grass: 2, ice: 0.5, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
      psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
      bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
      rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
      ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
      dragon: { dragon: 2, steel: 0.5, fairy: 0 },
      dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
      steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
      fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 }
    };
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }
}
