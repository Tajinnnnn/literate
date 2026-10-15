// Export the editable SVG master at Chrome's toolbar/store icon sizes.
const path = require('node:path');
const sharp = require('sharp');
const folder = path.join(__dirname, '../src/assets/img');
Promise.all([16, 32, 34, 48, 128].map(size => sharp(path.join(folder, 'logo.svg')).resize(size, size).png().toFile(path.join(folder, `icon-${size}.png`))))
  .catch(error => { console.error(error.message); process.exitCode = 1; });
