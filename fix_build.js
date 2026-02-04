const fs = require('fs');
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
if (app.expo.plugins) {
  app.expo.plugins = app.expo.plugins.filter(p => 
    !p.includes('rnmapbox') && !p.includes('mapbox')
  );
}
fs.writeFileSync('app.json', JSON.stringify(app, null, 2));
console.log('Fixed app.json');
