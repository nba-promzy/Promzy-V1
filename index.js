import express from 'express';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(bodyParser.json());

/*
  Promzy v1 - Simulated messaging bot
  - Commands: .menu, .alive, .tagall, .tictactoe, .status
  - Simulated chat system (for testing)
*/

const PORT = process.env.PORT || 3000;
const chats = new Map();
const statuses = new Map();
let autoStatus = { enabled: false, message: "" };

function ensureChat(id) {
  if (!chats.has(id)) chats.set(id, { members: [id], messages: [] });
  return chats.get(id);
}

function sendMessage(chatId, text) {
  const chat = ensureChat(chatId);
  const msg = { id: uuidv4(), text, time: new Date().toISOString() };
  chat.messages.push(msg);
  console.log(`[OUT] -> ${chatId}: ${text}`);
  return msg;
}

async function handleCommand(from, chatId, text) {
  const args = text.trim().split(/\s+/);
  const cmd = args.shift().toLowerCase();

  if (cmd === '.menu') {
    return sendMessage(chatId, `📋 Promzy v1 Menu\n\nCommands:\n.menu\n.alive\n.tagall <msg>\n.tictactoe start\n.tictactoe join\n.tictactoe move <1-9>\n.status set <msg>\n.status auto on/off`);
  } 
  else if (cmd === '.alive') {
    return sendMessage(chatId, `✅ Promzy v1 is alive! Uptime: ${process.uptime().toFixed(0)}s`);
  } 
  else if (cmd === '.tagall') {
    const chat = ensureChat(chatId);
    const msg = args.join(' ') || 'Tagging everyone!';
    const mentions = chat.members.map(m => `@${m}`).join(' ');
    return sendMessage(chatId, `${msg}\n\n${mentions}`);
  } 
  else if (cmd === '.status') {
    const sub = args.shift();
    if (sub === 'set') {
      const msg = args.join(' ');
      statuses.set(chatId, msg);
      return sendMessage(chatId, `Status for this chat set to: "${msg}"`);
    } else if (sub === 'auto') {
      const mode = args.shift();
      if (mode === 'on') {
        autoStatus.enabled = true;
        return sendMessage(chatId, 'Auto-status enabled globally.');
      } else if (mode === 'off') {
        autoStatus.enabled = false;
        return sendMessage(chatId, 'Auto-status disabled globally.');
      }
    }
    return sendMessage(chatId, `Status: "${statuses.get(chatId) || 'not set'}"`);
  } 
  else if (cmd === '.tictactoe') {
    const sub = args.shift();
    const chat = ensureChat(chatId);
    if (!chat.ttt) chat.ttt = null;

    if (sub === 'start') {
      if (chat.ttt && chat.ttt.active) return sendMessage(chatId, 'A game is already active.');
      chat.ttt = { active: true, board: Array(9).fill(null), players: [from], turn: 0 };
      return sendMessage(chatId, `🎮 TicTacToe started. Player1: @${from}. Another player must join with ".tictactoe join".\n` + formatBoard(chat.ttt.board));
    } 
    else if (sub === 'join') {
      if (!chat.ttt || !chat.ttt.active) return sendMessage(chatId, 'No active game.');
      if (chat.ttt.players.length >= 2) return sendMessage(chatId, 'Game already has two players.');
      chat.ttt.players.push(from);
      return sendMessage(chatId, `Player @${from} joined!\n${formatBoard(chat.ttt.board)}\nNext: @${chat.ttt.players[chat.ttt.turn]}`);
    } 
    else if (sub === 'move') {
      const pos = parseInt(args.shift(), 10) - 1;
      if (!chat.ttt || !chat.ttt.active) return sendMessage(chatId, 'No active game.');
      const playerIndex = chat.ttt.players.indexOf(from);
      if (playerIndex !== chat.ttt.turn) return sendMessage(chatId, "It's not your turn.");
      if (isNaN(pos) || pos < 0 || pos > 8 || chat.ttt.board[pos]) return sendMessage(chatId, 'Invalid move.');
      chat.ttt.board[pos] = playerIndex === 0 ? 'X' : 'O';
      if (checkWin(chat.ttt.board)) {
        chat.ttt.active = false;
        return sendMessage(chatId, `${formatBoard(chat.ttt.board)}\n🏆 Winner: @${from}`);
      }
      if (chat.ttt.board.every(Boolean)) {
        chat.ttt.active = false;
        return sendMessage(chatId, `${formatBoard(chat.ttt.board)}\n🤝 Draw.`);
      }
      chat.ttt.turn = (chat.ttt.turn + 1) % chat.ttt.players.length;
      return sendMessage(chatId, `${formatBoard(chat.ttt.board)}\nNext: @${chat.ttt.players[chat.ttt.turn]}`);
    }
  }

  if (/hi|hello|hey/i.test(text)) return sendMessage(chatId, `Hello @${from} 👋`);
  return sendMessage(chatId, `I didn’t get that. Try ".menu"`);
}

function formatBoard(b) {
  return b.map((c, i) => c || (i + 1)).reduce((a, c, i) => a + c + (i % 3 === 2 ? '\n' : ' | '), '');
}

function checkWin(b) {
  const combos = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  return combos.some(([a,b1,c]) => b[a] && b[a] === b[b1] && b[a] === b[c]);
}

// Simulated webhook
app.post('/webhook', async (req, res) => {
  const { from, chatId, message } = req.body;
  if (!from || !chatId || !message) return res.status(400).json({ error: 'Missing fields' });
  ensureChat(chatId);
  console.log(`[IN] <- ${from}@${chatId}: ${message}`);
  const resp = await handleCommand(from, chatId, message.trim());
  res.json({ ok: true, reply: resp });
});

app.get('/', (req, res) => res.send(`🤖 Promzy v1 Bot is running. Use .menu to see commands.`));

app.listen(PORT, () => console.log(`Promzy v1 listening on port ${PORT}`));
