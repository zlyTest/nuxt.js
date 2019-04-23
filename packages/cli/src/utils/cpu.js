import { cpus } from 'os'

export function cpuCount() {
  return cpus().length
}
