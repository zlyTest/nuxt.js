const HTFSMiddleware = require('htfs/lib/middleware')
const { createHTTPService } = require('@workstation/utils')
const NuxtWorker = require('./nuxt')

class BuilderWorker extends NuxtWorker {
  async run() {
    await this.initNuxt({ server: false })
    this.createBuilder()

    if (this.options.dev) {
      // Publish builder hooks
      this.publishHook('build:resources')
      this.publishHook('bundler:progress', states => JSON.stringify(states))

      // Register MFS service
      const mfsService = await createHTTPService({
        name: 'mfs',
        prefix: '/_mfs',
        stripPrefix: true,
        handler: HTFSMiddleware(this.builder.bundleBuilder.mfs)
      })
      this.bridge.registerService(mfsService)

      // Register devMiddleware service
      const buildService = await createHTTPService({
        handler: (req, res) => this.builder.bundleBuilder.middleware(req, res, () => {
          res.statusCode = 404
          res.end('404')
        })
      })
      this.bridge.registerService({
        ...buildService,
        name: 'builder_middleware',
        prefix: '/_nuxt'
      })
      this.bridge.registerService({
        ...buildService,
        name: 'builder_hmr',
        prefix: '/__webpack_hmr'
      })
    }

    // Start build
    await this.builder.build()

    // Only exit after production build
    if (!this.options.dev) {
      this.bridge.close(0)
    }
  }
}

BuilderWorker.exec()
