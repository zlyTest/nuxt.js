import workstation from 'workstation'
import { showWorkerBanner } from './banner'

export function startNuxtWorker(name, options, count = 1) {
  const { dev, rootDir, mode, _nuxtConfigFile } = options

  const workerOptions = {
    nuxt: { dev, rootDir, mode, _nuxtConfigFile }
  }

  const entrypoint = require.resolve('@nuxt/workers/bin/' + name)

  return workstation.startMany(count, { entrypoint }, workerOptions, 'process')
}

export async function startWorkerServer(options) {
  const listener = await workstation.listen(options.server)

  showWorkerBanner(options, listener)
}
