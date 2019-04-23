import { common, server, worker } from '../options'
import { showBanner } from '../utils/banner'
import { startNuxtWorker, startWorkerServer } from '../utils/worker'
import { cpuCount } from './util/cpu'

export default {
  name: 'start',
  description: 'Start the application in production mode (the application should be compiled with `nuxt build` first)',
  usage: 'start <dir>',
  options: {
    ...common,
    ...server,
    ...worker
  },

  async run(cmd) {
    if (cmd.argv.worker) {
      return this.worker(cmd)
    }

    const config = await cmd.getNuxtConfig({ dev: false, _start: true })
    const nuxt = await cmd.getNuxt(config)

    // Listen and show ready banner
    await nuxt.server.listen()
    showBanner(nuxt)
  },

  async worker(cmd) {
    const config = await cmd.getNuxtConfig({ dev: false })

    const count = config._serverWorkerCount || cpuCount()
    await startNuxtWorker('server', config, count)

    await startWorkerServer(config)
  }
}
