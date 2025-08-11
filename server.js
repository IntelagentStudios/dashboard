const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')

const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0'
const port = process.env.PORT || 3001
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  const io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://dashboard.intelagentstudios.com', 'https://*.up.railway.app']
        : ['http://localhost:3001', 'http://localhost:3000'],
      methods: ['GET', 'POST'],
    },
  })

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id)

    socket.on('join-room', (licenseKey) => {
      socket.join(licenseKey)
      console.log(`Socket ${socket.id} joined room: ${licenseKey}`)
    })

    socket.on('leave-room', (licenseKey) => {
      socket.leave(licenseKey)
      console.log(`Socket ${socket.id} left room: ${licenseKey}`)
    })

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id)
    })
  })

  setInterval(() => {
    io.emit('data-update', { 
      timestamp: new Date().toISOString(),
      type: 'stats',
    })
  }, 5000)

  server.listen(port, hostname, (err) => {
    if (err) throw err
    console.log(`> Ready on http://${hostname}:${port}`)
  })
})