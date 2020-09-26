const { worker } = require('cluster')
const { threadId } = require('worker_threads')

if (require('os').platform !== 'linux' && ((worker && worker.id === 1) || threadId === 1)) {
  console.log('Be aware that uWebSockets.js clustering only works on Linux and depends on its kernel features. See <https://github.com/uNetworking/uWebSockets.js/issues/214#issuecomment-547589050> for more info') // https://github.com/uNetworking/uWebSockets.js/issues/214#issuecomment-547589050
}
