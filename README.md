# Promzy v1 Bot

A simulated bot that responds to commands like:
- `.menu`
- `.alive`
- `.tagall`
- `.tictactoe`
- `.status`

To test locally:
```bash
npm install
npm start
curl -X POST http://localhost:3000/webhook -H "Content-Type: application/json" -d '{"from":"user1","chatId":"group1","message":".menu"}'
