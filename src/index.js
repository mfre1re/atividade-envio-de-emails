require('dotenv').config()
const express = require('express')
const server = express()
const rotas = require('./rotas')

server.use(express.json())
server.use(rotas)

server.listen(process.env.PORT)
