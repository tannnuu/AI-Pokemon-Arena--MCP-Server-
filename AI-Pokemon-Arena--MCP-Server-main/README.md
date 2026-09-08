# AI Pokemon Arena MCP

A web-based Pokemon battle simulation application powered by AI, featuring both a user-friendly web interface and MCP (Model Context Protocol) server integration for advanced interactions.

**Live Demo:**  
[https://ai-pokemon-arena-mcp-server.vercel.app/](https://ai-pokemon-arena-mcp-server.vercel.app/)

## Features

- **Interactive Web Interface**: Select Pokemon and simulate battles through a clean, responsive web UI
- **AI-Powered Battle Simulation**: Uses Gemini AI for intelligent battle analysis and realistic outcomes
- **Comprehensive Pokemon Database**: Access detailed Pokemon information via PokeAPI integration
- **MCP Server Support**: Connect to Claude Desktop for advanced Pokemon queries and battle simulations
- **Real-time API**: RESTful endpoints for Pokemon data and battle results

## Project Structure

```
src/                    # Source TypeScript files
├── index.ts            # MCP server entry point
├── services/
│   ├── pokeapi.ts      # PokeAPI integration
│   └── gemini.ts       # Gemini AI service
├── tools/
│   └── pokemon-tools.ts # MCP tool implementations
├── types/
│   └── pokemon.ts      # TypeScript definitions
└── utils/
    └── helpers.ts      # Utility functions

build/                  # Compiled JavaScript files
simple-battle.html      # Main web interface
server.js               # Express web server
styles.css              # CSS styles for the web app
script.js               # Frontend JavaScript
package.json            # Dependencies and scripts
tsconfig.json           # TypeScript configuration
```

## Setup

### Prerequisites
- Node.js 18+
- Gemini API key

### Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Set up environment:**
Create a `.env` file with your Gemini API key:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

3. **Build the project:**
```bash
npm run build
```

## Usage

### Web Application

**Start the web server:**
```bash
npm run web
```

Open `http://localhost:3001/simple-battle.html` in your browser to access the battle arena.

You can also access the live demo at:  
[https://ai-pokemon-arena-mcp-server.vercel.app/](https://ai-pokemon-arena-mcp-server.vercel.app/)

**Features:**
- Search and select Pokemon for battle
- View detailed Pokemon stats and information
- Simulate battles with AI-generated narratives

### MCP Server

**Run the MCP server:**
```bash
npm start
```

**Connect to Claude Desktop:**
Add to your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "ai-pokemon-arena-mcp": {
      "command": "node",
      "args": ["C:/path/to/your/project/build/index.js"]
    }
  }
}
```

**Available MCP Tools:**
- `get_pokemon_data`: Get detailed Pokemon information
- `battle_simulation`: Simulate battles between two Pokemon
- `get_pokemon_list`: Browse Pokemon with pagination

### API Endpoints

The web server provides REST API endpoints:

- `GET /api/pokemon/:name` - Get Pokemon data
- `POST /api/battle` - Simulate a battle
- `GET /api/pokemon` - List Pokemon

## Development

**Development mode (with hot reload):**
```bash
npm run dev
```

**Test the MCP server:**
```bash
npm run test
```

## Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript
- **Backend**: Node.js, Express.js
- **AI**: Google Gemini API
- **Data**: PokeAPI
- **Protocol**: Model Context Protocol (MCP)
- **Language**: TypeScript

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License
