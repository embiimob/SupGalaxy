const fs = require('fs');

let htmlContent = fs.readFileSync('index.html', 'utf8');
// Check if the pingSection div is closed properly!
// Look at the html...
/*
            <div style="text-align:right;">
            <div id="pingSection" style="margin-right: 15px; display: inline-block;">
                <input id="pingUserInput" placeholder="Ping User" style="width:100px; padding:2px; font-size:10px; background:#111; color:#fff; border:1px solid #333;" autocomplete="off" />
                <button id="pingUserBtn" style="padding: 2px 5px; font-size: 10px; background: #ffd166; color: #111; border: none; cursor: pointer;">Ping</button>
            </div>
*/
// And what's after that?
/*
            </div>

                <div>Score <span id="score">0</span></div>
                <div style="margin-top:6px;">HP <span id="health">20</span></div>
*/

// Wait, if <div id="hud"> is the parent of everything, and it's missing a closing tag somewhere?
// No, `#hotbar` parent is a `DIV`. The only wrapping `DIV` is `<body>` UNLESS there's an unclosed div.
// The `playwright` test evaluated `h.parentElement.tagName` and got `'DIV'` instead of `'BODY'`.
// THAT MEANS `#hotbar` IS INSIDE ANOTHER DIV!
// Wait! `index.html` structure:
// <body>
//   ...
//   <div id="hud" style="display:none;">
//     <div class="row">
//       ...
//     </div>
//     <div style="margin-top:8px;">
//        ...
//     </div>
//   </div>
//   <div id="messages"></div>
//   <div id="hotbar" style="display:none;"></div>
//
// But if there is an unclosed `<div>` *before* `<div id="hud">`, then `hud`, `messages`, `hotbar` will ALL be inside that unclosed `<div>`!
