import consola from 'consola'
import chalk from 'chalk'
import opener from 'opener'
import workstation from 'workstation'
import { waitFor } from '@nuxt/utils'
import { common, server, worker } from '../options'
import { eventsMapping, formatPath } from '../utils'
import { showBanner } from '../utils/banner'
import { showMemoryUsage } from '../utils/memory'
import { startNuxtWorker, startWorkerServer } from '../utils/worker'

export default {
  name: 'dev',
  description: 'Start the application in development mode (e.g. hot-code reloading, error reporting)',
  usage: 'dev <dir>',
  options: {
    ...common,
    ...server,
    ...worker,
    open: {
      alias: 'o',
      type: 'boolean',
      description: 'Opens the server listeners url in the default browser'
    }
  },

  async run(cmd) {
    if (cmd.argv.worker) {
      return this.worker(cmd)
    }

    const { argv } = cmd

    await this.startDev(cmd, argv, argv.open)
  },

  async startDev(cmd, argv) {
    try {
      const nuxt = await this._startDev(cmd, argv)

      return nuxt
    } catch (error) {
      consola.error(error)
    }
  },

  async _startDev(cmd, argv) {
    const config = await cmd.getNuxtConfig({ dev: true, _build: true })
    const nuxt = await cmd.getNuxt(config)

    // Setup hooks
    nuxt.hook('watch:restart', payload => this.onWatchRestart(payload, { nuxt, builder, cmd, argv }))
    nuxt.hook('bundler:change', changedFileName => this.onBundlerChange(changedFileName))

    // Wait for nuxt to be ready
    await nuxt.ready()

    // Start listening
    await nuxt.server.listen()

    // Show banner when listening
    showBanner(nuxt, false)

    // Opens the server listeners url in the default browser (only once)
    if (argv.open) {
      argv.open = false
      const openerPromises = nuxt.server.listeners.map(listener => opener(listener.url))
      await Promise.all(openerPromises)
    }

    // Create builder instance
    const builder = await cmd.getBuilder(nuxt)

    // Start Build
    await builder.build()

    // Print memory usage
    showMemoryUsage()

    // Return instance
    return nuxt
  },

  logChanged({ event, path }) {
    const { icon, color, action } = eventsMapping[event] || eventsMapping.change

    consola.log({
      type: event,
      icon: chalk[color].bold(icon),
      message: `${action} ${chalk.cyan(formatPath(path))}`
    })
  },

  async onWatchRestart({ event, path }, { nuxt, cmd, argv }) {
    this.logChanged({ event, path })

    await nuxt.close()

    await this.startDev(cmd, argv)
  },

  onBundlerChange(path) {
    this.logChanged({ event: 'change', path })
  },

  async worker(cmd) {
    // Keep config for server and cli args
    let config

    // Keep old instance of each worker
    const workers = {}
    const replaceWorker = (name, wait) => async (newWorker) => {
      if (wait) {
        await waitFor(wait)
      }
      if (workers[name]) {
        await workers[name].stop()
      }
      workers[name] = newWorker
    }

    // Only start once in a time
    let semaphore = false
    const start = async () => {
      if (semaphore) {
        return
      }
      semaphore = true

      try {
        // Load config
        config = await cmd.getNuxtConfig({ dev: true }).catch((error) => {
          error = new Error(error)
          error.message = 'Unable to load nuxt config: ' + error.message.replace(/^Error:/, '')
          throw error
        })

        // Start workers
        await Promise.all([
          startNuxtWorker('server', config).then(replaceWorker('server', 1500)),
          startNuxtWorker('builder', config).then(replaceWorker('builder'))
        ])
      } finally {
        semaphore = false
      }
    }

    // Initial start
    await start()

    // Full restart on watch:restart
    workstation.on('message:hook:watch:restart', (payload) => {
      this.logChanged(payload)
      start()
    })

    await startWorkerServer(config)
  }
}
