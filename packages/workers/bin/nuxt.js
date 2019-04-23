const esm = require('esm')
const { Worker } = require('@workstation/worker')

class NuxtWorker extends Worker {
  _import(name) {
    return require(name)
  }

  _getConfig(_options) {
    const { _nuxtConfigFile } = this.options.nuxt
    let config = {}
    if (_nuxtConfigFile) {
      config = esm(module)(_nuxtConfigFile)
      config = config.default || config
    }

    Object.assign(config, this.options.nuxt, _options)

    return config
  }

  async initNuxt(_options) {
    const options = this._getConfig(_options)

    const { Nuxt } = this._import('@nuxt/core')

    this.nuxt = new Nuxt(options)
    this.options = this.nuxt.options

    await this.nuxt.ready()

    return this.nuxt
  }

  createBuilder() {
    const { Builder } = this._import('@nuxt/builder')
    this.builder = new Builder(this.nuxt)
  }

  publishHook(hookName, argEncode) {
    this.nuxt.hook(hookName, (...args) => {
      const data = argEncode ? argEncode(...args) : {}
      this.bridge.send('hook:' + hookName, data)
    })
  }

  subscribeHook(hookName, argDecode) {
    this.bridge.subscribe('hook:' + hookName, (payload) => {
      const args = argDecode ? argDecode(payload) : {}
      this.nuxt.callHook(hookName, ...args)
    })
  }
}

module.exports = NuxtWorker
