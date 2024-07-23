import ElegantRouter from '@elegant-router/core';
import type { ViteDevServer } from 'vite';
import type { ElegantReactRouterOption } from '../types';
import { createPluginOptions } from './options';
import { genImportsFile } from './imports';
import { genDtsFile } from './dts';
import { genConstFile } from './const';
import { genTransformFile } from './transform';
export default class ElegantReactRouter {
  options: ElegantReactRouterOption;

  elegantRouter: ElegantRouter;

  viteServer?: ViteDevServer;

  constructor(options: Partial<ElegantReactRouterOption> = {}) {
    this.elegantRouter = new ElegantRouter(options);

    this.options = createPluginOptions(this.elegantRouter.options, options);

    this.generate();
  }

  async generate() {
    const { files, entries, trees } = this.elegantRouter;

    genTransformFile(this.options, entries);
    await genDtsFile(files, entries, this.options);
    await genImportsFile(files, this.options);
    await genConstFile(trees, this.options);
  }
}
