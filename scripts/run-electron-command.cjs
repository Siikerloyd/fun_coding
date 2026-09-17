const { spawn } = require('node:child_process')

const [command, ...args] = process.argv.slice(2)

if (!command) {
  console.error('Usage: node scripts/run-electron-command.cjs <command> [...args]')
  process.exit(1)
}

// ELECTRON_RUN_AS_NODE makes Electron behave like Node, so the main process
// receives a string from require('electron') instead of the Electron API.
delete process.env.ELECTRON_RUN_AS_NODE

const isWindows = process.platform === 'win32'
const quoteWindowsArg = (value) => {
  const text = String(value)
  return /[&|<>^"%\s]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}
const child = isWindows
  ? spawn([command, ...args].map(quoteWindowsArg).join(' '), {
      stdio: 'inherit',
      env: process.env,
      shell: true
    })
  : spawn(command, args, {
      stdio: 'inherit',
      env: process.env,
      shell: false
    })

child.on('error', (error) => {
  console.error(`Failed to start ${command}:`, error.message)
  process.exit(1)
})

child.on('exit', (code) => {
  process.exit(code ?? 1)
})
