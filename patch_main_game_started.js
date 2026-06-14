const fs = require('fs');
let mainContent = fs.readFileSync('js/main.js', 'utf8');

mainContent = mainContent.replace(
    /window\.startGame = startGame;/,
    ""
);

mainContent += "\nwindow.startGame = startGame;\nwindow.gameStarted = typeof gameStarted !== 'undefined' ? gameStarted : false;";
fs.writeFileSync('js/main.js', mainContent);
