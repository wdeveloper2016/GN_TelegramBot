process.env["NTBA_FIX_319"] = 1;
const TelegramBot = require('node-telegram-bot-api');
const Sentiment = require('sentiment');

const sentiment = new Sentiment();

const stopWords = [
  'shit',
  'shut',
];
const WINDOWSIZE = 10;
const negativeThreshold = 5;
const scoreThreshold = 3;
const chatData = {};
// chatData = {
//   'chatId': {
//     'userId': {
//       messages: [ // list of [WINDOWSIZE] last messages
//         { text: '', sentiment: 0 }
//       ],
//       score: 0,
//     },
//     ...
//   },
//   ...
// };

const telegramToken = 'YOUR_TOKEN_HERE';
const bot = new TelegramBot(telegramToken, { polling: true });
bot.on('message', (msg) => {
  try {
    if (!msg.text) {
      return;
    }

    const messageStr = msg.text.toString();
    const chatId = msg.chat.id;
    const fromId = msg.from.id;

    if (!chatData[chatId]) {
      chatData[chatId] = {};
    }
    const chatObj = chatData[chatId];
    if (!chatObj[fromId]) {
      chatObj[fromId] = {};
    }
    const userObj = chatObj[fromId];
    const { score = 0, messages = [] } = userObj;
    messages.unshift({
      message: messageStr,
      sentiment: sentiment.analyze(messageStr),
    });
    userObj.messages = messages.slice(0, WINDOWSIZE);
    userObj.score = score + calculateScore(messageStr, userObj.messages);
    console.log(fromId, userObj.score);

    if (userObj.score >= scoreThreshold) {
      delete chatObj[fromId];
      bot.kickChatMember(chatId, fromId);
    }
  } catch (e) {
    console.log(e);
  }
});
bot.on('polling_error', (error) => {
  console.log(error);
});

function calculateScore(message, latestMessages) {
  let score = 0;

  // check if message contains external link
  const linkRegex = /(https?:\/\/[^\s]+)/g;
  if (linkRegex.test(message)) {
    score++;
  }
  const negativeMessages = latestMessages.filter(msg => (msg.sentiment < 0));
  if (negativeMessages.length >= negativeThreshold) {
    score++;
  }
  for (let i = 0; i < stopWords.length; i++) {
    if (message.includes(stopWords[i])) {
      score++;
      break;
    }
  }

  return score;
}
