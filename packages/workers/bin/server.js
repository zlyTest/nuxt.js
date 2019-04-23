const HTFSClient = require('htfs/lib/client')
const NuxtWorker = require('./nuxt')

class ServerWorker extends NuxtWorker {
  async run() {
    await this.initNuxt()

    // Register SSR service
    const listener = await this.nuxt.server.listen(0)
    await this.bridge.registerService({
      name: 'ssr',
      prefix: '/',
      address: listener.address,
      url: listener.url,
      ws: true
    })

    // Integrate with builder in development mode
    if (this.options.dev) {
      const httpfs = new HTFSClient({
        endpoint: 'http://localhost:3000/_mfs' // TODO: Generate me!
      })
      this.subscribeHook('build:resources', () => [httpfs])
      this.subscribeHook('bundler:progress', states => [states])
    }
  }
}

ServerWorker.exec()
