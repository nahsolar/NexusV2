// wrapText.js
function wrapText(ctx, text, maxWidth, maxLines) {
    let words = text.split(' ');
    let lines = [];
    let currentLine = words[0];
  
    for (let i = 1; i < words.length; i++) {
      let word = words[i];
      let width = ctx.measureText(currentLine + ' ' + word).width;
  
      if (width < maxWidth) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
        if (lines.length >= maxLines) {
          break;
        }
      }
    }
  
    lines.push(currentLine);
    return lines;
  }
  
  module.exports = wrapText;
  