import { config } from 'dotenv';
import { Config } from '../types/pokemon.js';

// Load environment variables from .env file
config();

export function loadConfig(): Config {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }

  return {
    geminiApiKey,
    pokeApiBaseUrl: process.env.POKEAPI_BASE_URL || 'https://pokeapi.co/api/v2/',
    debug: process.env.DEBUG === 'pokemon-mcp' || process.env.DEBUG === 'true'
  };
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function formatPokemonName(name: string): string {
  return name.split('-').map(capitalizeFirst).join(' ');
}

export function isNumeric(str: string): boolean {
  return !isNaN(Number(str)) && !isNaN(parseFloat(str));
}

export function sanitizeInput(input: string): string {
  return input.trim().toLowerCase().replace(/[^a-z0-9\-]/g, '');
}

export function log(message: string, data?: any): void {
  if (process.env.DEBUG === 'pokemon-mcp' || process.env.DEBUG === 'true') {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [Pokemon MCP] ${message}`);
    if (data) {
      console.error(JSON.stringify(data, null, 2));
    }
  }
}

export function handleError(error: unknown, context: string): Error {
  log(`Error in ${context}:`, error);
  
  if (error instanceof Error) {
    return new Error(`${context}: ${error.message}`);
  }
  
  return new Error(`${context}: Unknown error occurred`);
}

export function validatePokemonIdentifier(identifier: string): { isValid: boolean; sanitized: string } {
  const sanitized = sanitizeInput(identifier);
  const isValid = sanitized.length > 0 && (isNumeric(sanitized) || /^[a-z\-]+$/.test(sanitized));
  
  return { isValid, sanitized };
}

export function formatTypeEffectiveness(multiplier: number): string {
  if (multiplier === 0) return 'No effect';
  if (multiplier === 0.5) return 'Not very effective';
  if (multiplier === 1) return 'Normal effectiveness';
  if (multiplier === 2) return 'Super effective';
  return `${multiplier}x effectiveness`;
}

export function calculateTypeMatchup(attackingTypes: string[], defendingTypes: string[]): { overall: number; details: string[] } {
  const typeChart: Record<string, Record<string, number>> = {
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

  let overallMultiplier = 1;
  const details: string[] = [];

  for (const attackingType of attackingTypes) {
    for (const defendingType of defendingTypes) {
      const multiplier = typeChart[attackingType]?.[defendingType] ?? 1;
      overallMultiplier *= multiplier;
      
      if (multiplier !== 1) {
        details.push(`${capitalizeFirst(attackingType)} vs ${capitalizeFirst(defendingType)}: ${formatTypeEffectiveness(multiplier)}`);
      }
    }
  }

  return {
    overall: overallMultiplier,
    details
  };
}

export function formatStatValue(stat: number): string {
  if (stat <= 30) return 'Very Low';
  if (stat <= 50) return 'Low';
  if (stat <= 70) return 'Average';
  if (stat <= 90) return 'Good';
  if (stat <= 110) return 'High';
  if (stat <= 130) return 'Very High';
  return 'Exceptional';
}

export function getTierRating(totalStats: number): string {
  if (totalStats >= 680) return 'Legendary Tier';
  if (totalStats >= 600) return 'Pseudo-Legendary Tier';
  if (totalStats >= 550) return 'High Tier';
  if (totalStats >= 500) return 'Mid-High Tier';
  if (totalStats >= 450) return 'Mid Tier';
  if (totalStats >= 400) return 'Low-Mid Tier';
  if (totalStats >= 350) return 'Low Tier';
  return 'Very Low Tier';
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    for (let i = 0; i <= maxRetries; i++) {
      try {
        const result = await fn();
        resolve(result);
        return;
      } catch (error) {
        if (i === maxRetries) {
          reject(error);
          return;
        }
        
        const delayTime = baseDelay * Math.pow(2, i);
        log(`Retry attempt ${i + 1}/${maxRetries + 1} after ${delayTime}ms`);
        await delay(delayTime);
      }
    }
  });
}
