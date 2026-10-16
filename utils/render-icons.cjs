// Export the editable SVG master at Chrome's toolbar/store icon sizes.
const path = require('node:path');
const sharp = require('sharp');
const folder = path.join(__dirname, '../src/assets/img');
Promise.all([16, 32, 34, 48, 128].map(size => (size === 128 ? sharp(path.join(folder, 'logo.svg')).resize(96, 96).extend({ top: 16, bottom: 16, left: 16, right: 16, background: { r: 0, g: 0, b: 0, alpha: 0 } }) : sharp(path.join(folder, 'logo.svg')).resize(size, size)).png().toFile(path.join(folder, `icon-${size}.png`))))
  .catch(error => { console.error(error.message); process.exitCode = 1; });
