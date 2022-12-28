process.on('uncaughtException', (err) => {
  console.error('There was an uncaught error', err)
  process.exit(1) //mandatory (as per the Node.js docs)
})

export const handler = () => {
  console.log('hello')
}

handler()
