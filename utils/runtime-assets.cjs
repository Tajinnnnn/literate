const path = require('node:path');
// Record this compilation's assets so packaging never picks stale chunks from build/.
class RuntimeAssetsPlugin {
  apply(compiler) {
    compiler.hooks.thisCompilation.tap('RuntimeAssets', compilation => {
      compilation.hooks.processAssets.tap({ name: 'RuntimeAssets', stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_REPORT }, () => {
        const seen = new Set(), resources = new Set();
        function inspect(module) {
          if (seen.has(module)) return;
          seen.add(module);
          if (module.resource) resources.add(path.relative(compiler.context, module.resource).replaceAll('\\', '/'));
          if (module.modules) for (const child of module.modules) inspect(child);
        }
        for (const module of compilation.modules) inspect(module);
        const excluded = ['sharp', 'onnxruntime-node', 'global-agent', 'roarr', 'sprintf-js', 'braces', 'webpack-dev-server'];
        const forbidden = [...resources].filter(resource => excluded.some(name => resource.includes(`node_modules/${name}/`)));
        if (forbidden.length) compilation.errors.push(new Error(`Node/development dependencies entered the browser build: ${forbidden.join(', ')}`));
        const files = compilation.getAssets().map(asset => asset.name).sort();
        compilation.emitAsset('runtime-assets.json', new compiler.webpack.sources.RawSource(JSON.stringify({ files, excludedNodeDependencies: excluded, forbiddenBrowserModules: forbidden }, null, 2)));
      });
    });
  }
}
module.exports = RuntimeAssetsPlugin;
