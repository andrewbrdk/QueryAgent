# Data Agents
Automate data analytics with LLM.

The service starts at http://localhost:8080/ after the following commands:
```bash
git clone https://github.com/andrewbrdk/DataAgents
cd ./DataAgents
npm ci
npm run build
go get dagents
go build
OPENROUTER_API_KEY=your-api-key OPENROUTER_MODEL=your/model DAGENTS_CONTEXT_PATH=./context_examples/ DAGENTS_LOG_FILE=logs/q.log ./dagents
```

Docker compose starts the service, Postgres, and Pgweb.
```bash
OPENROUTER_API_KEY=your-api-key OPENROUTER_MODEL=your/model docker compose up --build

# Run once to populate the database
psql postgres://pguser:password123@localhost:5432/dagents -f context_examples/example.sql
```
http://localhost:8080/ - Data Agents  
localhost:5432 - Postgres  
http://localhost:8081/ - Pgweb  
  
Env. variables
```bash
OPENROUTER_API_KEY            # (required) API key for OpenRouter
OPENROUTER_MODEL              # (required) Model to use
DAGENTS_EXEC_DB               # Postgres connection string for SQL execution
DAGENTS_CONTEXT_PATH          # Path to a file or directory with SQL context examples
DAGENTS_LOG_FILE              # Path to a log file for LLM queries
DAGENTS_PASSWORD              # Password for the web UI
DAGENTS_PORT                  # HTTP port (default: `8080`)
DAGENTS_SLACK_SIGNING_SECRET  # Slack signing secret for the `/slack/slash` endpoint  
```